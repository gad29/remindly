import express from "express";
import { body, validationResult } from "express-validator";
import { VoiceRecording } from "../models/VoiceRecording.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import { logger } from "../utils/logger.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/voice"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `voice-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    try {
      // Log all file information for debugging - use console.log as fallback
      const logMsg = `[FILEFILTER] File upload attempt - MIME: ${file.mimetype || 'undefined'}, OriginalName: ${file.originalname || 'undefined'}, FieldName: ${file.fieldname || 'undefined'}`;
      logger.info(logMsg);
      console.log(logMsg); // Also log to console for immediate visibility
      
      // Handle MIME types that may include codecs (e.g., "audio/webm;codecs=opus")
      const mimeType = file.mimetype ? file.mimetype.split(';')[0].trim() : '';
      const extension = file.originalname ? path.extname(file.originalname).toLowerCase() : '';
      
      const parsedMsg = `[FILEFILTER] Parsed - Cleaned MIME: "${mimeType}", Extension: "${extension}"`;
      logger.info(parsedMsg);
      console.log(parsedMsg);
      
      // More permissive regex - accept any audio/* MIME type
      const isAudioMimeType = mimeType && mimeType.startsWith('audio/');
      const allowedExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|mka|opus)$/i;
      const hasValidExtension = extension && allowedExtensions.test(extension);
      
      const checksMsg = `[FILEFILTER] Checks - isAudioMimeType: ${isAudioMimeType}, hasValidExtension: ${hasValidExtension}`;
      logger.info(checksMsg);
      console.log(checksMsg);
      
      // Accept if it's an audio MIME type OR has a valid audio extension
      // Also accept if fieldname is 'audio' (fallback check)
      if (isAudioMimeType || hasValidExtension || file.fieldname === 'audio') {
        const acceptMsg = `[FILEFILTER] ✅ ACCEPTED - MIME: ${file.mimetype}, Extension: ${extension}`;
        logger.info(acceptMsg);
        console.log(acceptMsg);
        return cb(null, true);
      } else {
        // Log detailed rejection info
        const debugInfo = {
          mimetype: file.mimetype || 'undefined',
          cleanedMime: mimeType,
          extension: extension,
          originalName: file.originalname || 'undefined',
          fieldname: file.fieldname || 'undefined',
          isAudioMimeType,
          hasValidExtension
        };
        const rejectMsg = `[FILEFILTER] ❌ REJECTED - ${JSON.stringify(debugInfo)}`;
        logger.error(rejectMsg);
        console.error(rejectMsg);
        cb(new Error(`Only audio files are allowed. Received MIME: ${file.mimetype || 'unknown'}, Extension: ${extension || 'none'}`));
      }
    } catch (error) {
      const errorMsg = `[FILEFILTER] Exception in fileFilter: ${error.message}`;
      logger.error(errorMsg, error);
      console.error(errorMsg, error);
      cb(error);
    }
  },
});

// @desc    Get all voice recordings for user
// @route   GET /api/voice-recordings
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { limit = 20, offset = 0, search, archived = false } = req.query;

    const whereClause = {
      userId: req.user.id,
      isArchived: archived === "true",
    };

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { transcription: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const recordings = await VoiceRecording.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: recordings,
    });
  } catch (error) {
    logger.error("Get voice recordings error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @desc    Get single voice recording
// @route   GET /api/voice-recordings/:id
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const recording = await VoiceRecording.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: "Voice recording not found",
      });
    }

    res.json({
      success: true,
      data: recording,
    });
  } catch (error) {
    logger.error("Get voice recording error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @desc    Create new voice recording
// @route   POST /api/voice-recordings
// @access  Private
router.post(
  "/",
  protect,
  upload.single("audio"),
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title must be between 1 and 255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),
    body("language")
      .optional()
      .isIn(["he", "en", "auto"])
      .withMessage("Language must be he, en, or auto"),
  ],
  async (req, res) => {
    try {
      // Log request details for debugging
      logger.info(`Voice recording upload request - User: ${req.user?.id}, Has file: ${!!req.file}, Body keys: ${Object.keys(req.body).join(', ')}`);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(`Validation errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      if (!req.file) {
        logger.error('No file received in request');
        return res.status(400).json({
          success: false,
          error: "Audio file is required",
        });
      }
      
      // Log file details
      logger.info(`File received - MIME: ${req.file.mimetype}, Size: ${req.file.size}, OriginalName: ${req.file.originalname}, Filename: ${req.file.filename}`);

      const { title, description, language = "auto", tags = [] } = req.body;

      // Convert audio to MP3
      const originalFilePath = req.file.path;
      const mp3FileName = req.file.filename.replace(/\.[^.]+$/, '.mp3');
      const mp3FilePath = path.join(path.dirname(originalFilePath), mp3FileName);
      
      logger.info(`Converting audio to MP3: ${originalFilePath} -> ${mp3FilePath}`);
      
      let finalFileName = req.file.filename;
      let finalFileSize = req.file.size;
      
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(originalFilePath)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .audioChannels(1)
            .audioFrequency(44100)
            .format('mp3')
            .on('end', () => {
              logger.info(`Audio converted successfully to MP3: ${mp3FilePath}`);
              resolve();
            })
            .on('error', (err) => {
              logger.error(`FFmpeg conversion error: ${err.message}`, err);
              reject(err);
            })
            .save(mp3FilePath);
        });
        
        // Get MP3 file size
        const stats = await fs.stat(mp3FilePath);
        finalFileName = mp3FileName;
        finalFileSize = stats.size;
        
        // Delete original file if conversion successful
        try {
          await fs.unlink(originalFilePath);
          logger.info(`Deleted original file: ${originalFilePath}`);
        } catch (deleteError) {
          logger.warn(`Could not delete original file: ${deleteError.message}`);
        }
      } catch (conversionError) {
        logger.error(`Failed to convert audio to MP3: ${conversionError.message}`);
        // Continue with original file if conversion fails
        logger.warn(`Using original file format instead of MP3`);
      }

      const recording = await VoiceRecording.create({
        title: title || `Recording ${new Date().toLocaleDateString()}`,
        description,
        audioUrl: `/uploads/voice/${finalFileName}`,
        duration: req.body.duration || 0,
        fileSize: finalFileSize,
        language,
        tags: Array.isArray(tags) ? tags : [],
        userId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: recording,
      });
    } catch (error) {
      logger.error("Create voice recording error:", error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @desc    Update voice recording
// @route   PUT /api/voice-recordings/:id
// @access  Private
router.put(
  "/:id",
  protect,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title must be between 1 and 255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),
    body("transcription")
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage("Transcription must be less than 10000 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const recording = await VoiceRecording.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!recording) {
        return res.status(404).json({
          success: false,
          error: "Voice recording not found",
        });
      }

      const { title, description, transcription, tags } = req.body;
      const updateData = {};

      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (transcription !== undefined) {
        updateData.transcription = transcription;
        updateData.isTranscribed = true;
      }
      if (tags) updateData.tags = Array.isArray(tags) ? tags : [];

      await recording.update(updateData);

      res.json({
        success: true,
        data: recording,
      });
    } catch (error) {
      logger.error("Update voice recording error:", error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @desc    Delete voice recording
// @route   DELETE /api/voice-recordings/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const recording = await VoiceRecording.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: "Voice recording not found",
      });
    }

    // Delete the audio file
    const fs = await import("fs");
    const filePath = path.join(__dirname, "..", recording.audioUrl);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      logger.warn("Could not delete audio file:", fileError);
    }

    await recording.destroy();

    res.json({
      success: true,
      message: "Voice recording deleted successfully",
    });
  } catch (error) {
    logger.error("Delete voice recording error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// @desc    Archive/Unarchive voice recording
// @route   PATCH /api/voice-recordings/:id/archive
// @access  Private
router.patch(
  "/:id/archive",
  protect,
  [body("archived").isBoolean().withMessage("Archived must be boolean")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { archived } = req.body;

      const recording = await VoiceRecording.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id,
        },
      });

      if (!recording) {
        return res.status(404).json({
          success: false,
          error: "Voice recording not found",
        });
      }

      await recording.update({ isArchived: archived });

      res.json({
        success: true,
        data: recording,
      });
    } catch (error) {
      logger.error("Archive voice recording error:", error);
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// @desc    Process voice recording (transcription)
// @route   POST /api/voice-recordings/:id/process
// @access  Private
router.post("/:id/process", protect, async (req, res) => {
  try {
    const recording = await VoiceRecording.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: "Voice recording not found",
      });
    }

    // This would integrate with OpenAI Whisper or other transcription service
    // For now, we'll just mark it as processed
    await recording.update({
      isProcessed: true,
      isTranscribed: true,
      transcription: "Transcription will be processed by AI service",
    });

    res.json({
      success: true,
      data: recording,
    });
  } catch (error) {
    logger.error("Process voice recording error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;
