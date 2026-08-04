import express from "express";
import { body, validationResult } from "express-validator";
import { protect } from "../middleware/auth.js";
import openRouterService from "../services/openRouterService.js";
import { User } from "../models/User.js";

const router = express.Router();
const validationError = (res, errors) => res.status(400).json({ success: false, error: "Validation failed", details: errors.array() });

router.get("/status", protect, async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ["settings"] });
  res.json({ success: true, data: { ...openRouterService.status(), provider: user?.settings?.ai?.provider || "auto" } });
});

router.put("/preferences", protect, [body("provider").isIn(["auto", "openrouter", "openai"])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationError(res, errors);
  const user = await User.findByPk(req.user.id);
  const settings = { ...(user.settings || {}), ai: { ...(user.settings?.ai || {}), provider: req.body.provider } };
  await user.update({ settings });
  res.json({ success: true, data: { provider: req.body.provider } });
});

router.post("/preview", protect, [
  body("text").trim().isLength({ min: 1, max: 3000 }),
  body("language").optional().isIn(["he", "en"])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationError(res, errors);
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["settings"] });
    const provider = user?.settings?.ai?.provider || "auto";
    const data = await openRouterService.preview(req.body.text, req.user.id, req.body.language || "en", provider);
    res.json({ success: true, data });
  } catch (error) {
    const notConfigured = ["OPENROUTER_NOT_CONFIGURED", "OPENAI_NOT_CONFIGURED"].includes(error.code);
    res.status(notConfigured ? 503 : 502).json({ success: false, error: notConfigured ? error.message : "The AI request could not be completed" });
  }
});

router.post("/apply", protect, [body("actions").isArray({ max: 10 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationError(res, errors);
  try {
    const data = await openRouterService.apply(req.body.actions, req.user.id);
    res.json({ success: true, data, message: `${data.length} change${data.length === 1 ? "" : "s"} applied` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || "The proposed changes could not be applied" });
  }
});

export default router;
