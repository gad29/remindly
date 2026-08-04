import express from "express";
import { body, validationResult } from "express-validator";
import { protect } from "../middleware/auth.js";
import openRouterService from "../services/openRouterService.js";

const router = express.Router();
const validationError = (res, errors) => res.status(400).json({ success: false, error: "Validation failed", details: errors.array() });

router.get("/status", protect, (req, res) => res.json({ success: true, data: openRouterService.status() }));

router.post("/preview", protect, [
  body("text").trim().isLength({ min: 1, max: 3000 }),
  body("language").optional().isIn(["he", "en"])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationError(res, errors);
  try {
    const data = await openRouterService.preview(req.body.text, req.user.id, req.body.language || "en");
    res.json({ success: true, data });
  } catch (error) {
    const notConfigured = error.code === "OPENROUTER_NOT_CONFIGURED";
    res.status(notConfigured ? 503 : 502).json({ success: false, error: notConfigured ? "OpenRouter is not configured on the server" : "The AI request could not be completed" });
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
