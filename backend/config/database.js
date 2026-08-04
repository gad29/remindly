import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// PostgreSQL Database Configuration
// This application uses PostgreSQL ONLY - SQLite is NOT supported
// If PostgreSQL connection fails, the application will NOT fallback to SQLite

// Validate required environment variables
if (!process.env.DB_HOST && !process.env.DB_NAME) {
  console.warn("⚠️  Database environment variables not set. Using defaults.");
  console.warn(
    "⚠️  Make sure PostgreSQL is running and .env file is configured."
  );
}

const sequelize = new Sequelize({
  dialect: "postgres", // FORCE PostgreSQL - no SQLite support
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "remindly",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  // PostgreSQL specific options
  dialectOptions: {
    // SSL configuration (if needed for production)
    // ssl: process.env.DB_SSL === "true" ? {
    //   require: true,
    //   rejectUnauthorized: false
    // } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Test connection on initialization
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ PostgreSQL connection established successfully");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed:", err.message);
    console.error(
      "⚠️  Make sure PostgreSQL is running and credentials are correct"
    );
    console.error(
      "⚠️  This application requires PostgreSQL - SQLite is NOT supported"
    );
  });

export default sequelize;
