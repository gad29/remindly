import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import "express-async-errors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import listRoutes from "./routes/lists.js";
import taskRoutes from "./routes/tasks.js";
import shoppingRoutes from "./routes/shopping.js";
import voiceRoutes from "./routes/voice.js";
import voiceRecordingRoutes from "./routes/voiceRecordings.js";
import mediaGalleryRoutes from "./routes/mediaGallery.js";
import notificationRoutes from "./routes/notifications.js";
import searchRoutes from "./routes/search.js";
import aiRoutes from "./routes/ai.js";
import reminderRoutes from "./routes/reminders.js";
import shoppingItemRoutes from "./routes/shoppingItems.js";
import priceRoutes from "./routes/prices.js";
import assistantRoutes from "./routes/assistant.js";
import stewardRoutes from "./routes/steward.js";

// Import models to initialize associations
import "./models/associations.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { logger } from "./utils/logger.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // More lenient in development
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and certain endpoints
    return req.path === "/health" || req.path === "/api/health";
  },
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/voice-recordings", voiceRecordingRoutes);
app.use("/api/media-gallery", mediaGalleryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/shopping-items", shoppingItemRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/steward", stewardRoutes);

// In production the API and Vue application are one deployable service.
const webDistPath = path.resolve(__dirname, "../web-app/dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(webDistPath, { maxAge: "1d", index: false }));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)|health$).*/, (req, res, next) => {
    res.sendFile(path.join(webDistPath, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Database synchronization and server start
import sequelize from "./config/database.js";
// Note: associations.js is already imported at the top of the file

const prepareDatabase = process.env.DB_SYNC_ALTER === "true"
  ? sequelize.sync({ alter: true })
  : sequelize.authenticate();

prepareDatabase
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
      logger.info(process.env.DB_SYNC_ALTER === "true" ? "Database synchronized" : "Database connection verified");
    });
  })
  .catch((err) => {
    logger.error("Failed to synchronize database:", err);
    logger.error("Error details:", {
      message: err.message,
      name: err.name,
      code: err.code,
      sql: err.sql
    });
    logger.warn("Continuing without database synchronization...");
    logger.warn("⚠️  Data will NOT be saved to database!");
    // Start server anyway
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
      logger.warn("⚠️  Database not synchronized - data will NOT be saved!");
    });
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
