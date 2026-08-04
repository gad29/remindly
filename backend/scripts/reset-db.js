/**
 * Database Reset Script
 * 
 * ⚠️ WARNING: This script will DROP ALL TABLES and recreate them!
 * All data will be lost!
 * 
 * Usage: node scripts/reset-db.js
 */

import dotenv from "dotenv";
import sequelize from "../config/database.js";
import "../models/associations.js";

dotenv.config();

const resetDatabase = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("⚠️  Dropping all tables...");
    await sequelize.drop({ cascade: true });
    console.log("✅ All tables dropped");

    console.log("🔄 Creating tables...");
    await sequelize.sync({ force: true });
    console.log("✅ All tables created");

    console.log("🎉 Database reset completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  }
};

// Confirm before proceeding
console.log("⚠️  WARNING: This will DELETE ALL DATA in the database!");
console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");

setTimeout(() => {
  resetDatabase();
}, 5000);

