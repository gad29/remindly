import express from "express";
import { protect } from "../middleware/auth.js";
import stewardService from "../services/stewardService.js";

const router = express.Router();
router.get("/", protect, async (req, res) => res.json({ success: true, data: await stewardService.getDashboard(req.user.id) }));
router.put("/tasks/:id", protect, async (req, res) => {
  const task = await stewardService.updateGuide(req.params.id, req.user.id, req.body);
  if (!task) return res.status(404).json({ success: false, error: "Maintenance task not found" });
  res.json({ success: true, data: task });
});
router.patch("/tasks/:id/complete", protect, async (req, res) => {
  const task = await stewardService.setCompleted(req.params.id, req.user.id, req.body.completed);
  if (!task) return res.status(404).json({ success: false, error: "Maintenance task not found" });
  res.json({ success: true, data: task });
});
export default router;
