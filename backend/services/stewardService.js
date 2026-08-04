import { List } from "../models/List.js";
import { Task } from "../models/Task.js";

const routines = [
  ["inventory", "Create your server inventory", "Set up once", 0, ["Open the Server Steward page and edit all three server cards.", "Record each provider, role, IP or hostname, and what it hosts.", "Keep credentials in a password manager, never in task notes."], "Do not save passwords, API tokens, private keys, or recovery codes in Remindly."],
  ["mfa", "Enable two-factor authentication everywhere", "Set up once", 1, ["Enable 2FA for Hostinger and VPSserver.", "Enable 2FA for CloudPanel, Coolify, DNS, registrar, and backup storage.", "Store recovery codes outside the VPSs and test one login."], "Test sign-in before closing your current authenticated session."],
  ["firewall", "Review firewall rules", "Quarterly", 3, ["Keep public web ports 80 and 443 open.", "Restrict SSH and CloudPanel port 8443 to your IP or private VPN where practical.", "Confirm MySQL, PostgreSQL, Redis, and Docker ports are not public.", "Test a fresh SSH connection before closing the provider console."], "Keep the provider console open. One wrong rule can lock you out."],
  ["backups", "Check off-server backups", "Daily", 0, ["Check the latest database backup result.", "Check application volumes and uploaded files.", "Check the Coolify instance backup separately.", "Confirm copies exist in independent S3-compatible storage."], "A provider snapshot is useful, but it is not your only backup."],
  ["health", "Review server health", "Weekly", 0, ["Run: uptime", "Run: df -h and investigate filesystems above 80%.", "Run: free -h", "Run: systemctl --failed", "Review: journalctl -p err --since \"7 days ago\"", "On Coolify, inspect docker ps and docker system df without pruning automatically."], "These commands inspect state. Do not restart a production server just because an alert is unclear."],
  ["cloudpanel", "Update CloudPanel safely", "Monthly", 7, ["Confirm remote backups and create a provider snapshot.", "Confirm emergency-console access.", "Run as root: clp-update", "Test CloudPanel, a website, database access, and HTTPS."], "Take a snapshot and test backups before updating."],
  ["coolify", "Update Coolify safely", "Monthly", 9, ["Read the offered version's release notes.", "Confirm the Coolify instance and application-data backups.", "Create a provider snapshot.", "Update manually from Coolify settings.", "Test the dashboard, proxy, certificates, Git integration, and one harmless deployment."], "Do not combine this with an OS upgrade or migration."],
  ["os", "Install operating-system updates", "Monthly", 11, ["Update one server at a time.", "Run: sudo apt update", "Review packages, then run: sudo apt upgrade", "Check /var/run/reboot-required.", "If a reboot is needed, schedule it and verify every application afterward."], "Major OS-version upgrades need a separate compatibility plan."],
  ["restore", "Test a backup restoration", "Quarterly", 14, ["Choose a noncritical site or database.", "Restore into an isolated temporary destination.", "Verify content and important records.", "Record recovery time and missing instructions.", "Remove only the verified temporary copy."], "Never restore over production during a drill."],
  ["disaster", "Practice losing one server", "Yearly", 30, ["Choose a noncritical application.", "Provision a clean temporary VPS.", "Restore platform, configuration, database, and files.", "Test with a temporary hostname.", "Update these instructions with what you learned."], "Confirm the temporary VPS identity before deleting it."]
];

const nextDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

class StewardService {
  async getDashboard(userId) {
    const [list] = await List.findOrCreate({
      where: { userId, name: "Server maintenance" },
      defaults: { description: "CloudPanel, Coolify and VPS maintenance", icon: "mdi-server-security", color: "#245B55", isDefault: false, settings: { kind: "server-steward" } }
    });

    const existing = await Task.findAll({ where: { userId, listId: list.id } });
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all(existing.filter(task => task.completed && task.isRecurring && task.dueDate && task.dueDate <= today).map(task => task.update({ completed: false })));
    const keys = new Set(existing.map(task => task.metadata?.stewardKey).filter(Boolean));
    const missing = routines.filter(([key]) => !keys.has(key));
    if (missing.length) {
      await Task.bulkCreate(missing.map(([key, title, frequency, days, steps, safety], position) => ({
        userId, listId: list.id, title, description: frequency, dueDate: nextDate(days), priority: safety.includes("Never") ? "high" : "medium", position: existing.length + position,
        isRecurring: !frequency.includes("once"), recurringPattern: { frequency }, metadata: { stewardKey: key, frequency, steps, safety, notes: "" }
      })));
    }
    return { list, tasks: await Task.findAll({ where: { userId, listId: list.id }, order: [["position", "ASC"]] }) };
  }

  async setCompleted(taskId, userId, completed) {
    const task = await Task.findOne({ where: { id: taskId, userId } });
    if (!task || !task.metadata?.stewardKey) return null;
    const daysByFrequency = { Daily: 1, Weekly: 7, Monthly: 30, Quarterly: 90, Yearly: 365 };
    const updates = { completed: Boolean(completed) };
    const days = daysByFrequency[task.metadata.frequency];
    if (completed && days) updates.dueDate = nextDate(days);
    await task.update(updates);
    return task;
  }

  async updateGuide(taskId, userId, payload) {
    const task = await Task.findOne({ where: { id: taskId, userId } });
    if (!task || !task.metadata?.stewardKey) return null;
    const metadata = { ...task.metadata };
    if (Array.isArray(payload.steps)) metadata.steps = payload.steps.filter(Boolean).slice(0, 20);
    if (typeof payload.safety === "string") metadata.safety = payload.safety.slice(0, 1000);
    if (typeof payload.notes === "string") metadata.notes = payload.notes.slice(0, 3000);
    await task.update({
      title: payload.title?.trim().slice(0, 255) || task.title,
      description: payload.description?.trim().slice(0, 1000) ?? task.description,
      dueDate: payload.dueDate || task.dueDate,
      metadata
    });
    return task;
  }
}

export default new StewardService();
