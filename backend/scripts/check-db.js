/**
 * Check Database Connection and Data
 * 
 * This script connects to PostgreSQL and shows all lists and tasks
 * 
 * Usage: node scripts/check-db.js
 */

import sequelize from "../config/database.js";

const checkDatabase = async () => {
  try {
    console.log("🔄 Connecting to PostgreSQL...");
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL successfully\n");

    // Check lists
    const [lists] = await sequelize.query("SELECT * FROM lists ORDER BY created_at DESC");
    console.log(`📋 Lists (${lists.length} total):`);
    if (lists.length === 0) {
      console.log("   No lists found");
    } else {
      lists.forEach((list, index) => {
        console.log(`   ${index + 1}. ${list.name} (ID: ${list.id})`);
        console.log(`      Description: ${list.description || "N/A"}`);
        console.log(`      Created: ${list.created_at}`);
      });
    }

    // Check tasks
    const [tasks] = await sequelize.query("SELECT * FROM tasks ORDER BY created_at DESC");
    console.log(`\n✅ Tasks (${tasks.length} total):`);
    if (tasks.length === 0) {
      console.log("   No tasks found");
    } else {
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} (ID: ${task.id})`);
        console.log(`      List ID: ${task.list_id}`);
        console.log(`      Completed: ${task.completed ? "Yes" : "No"}`);
        console.log(`      Created: ${task.created_at}`);
      });
    }

    // Check users
    const [users] = await sequelize.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC");
    console.log(`\n👤 Users (${users.length} total):`);
    if (users.length === 0) {
      console.log("   No users found");
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Created: ${user.created_at}`);
      });
    }

    await sequelize.close();
    console.log("\n✅ Database check completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.original) {
      console.error("   Original error:", error.original.message);
    }
    console.error("\n💡 Tips:");
    console.error("   - Make sure PostgreSQL is running");
    console.error("   - Check your .env file for correct database credentials");
    console.error("   - Run: npm run db:fix");
    process.exit(1);
  }
};

checkDatabase();

