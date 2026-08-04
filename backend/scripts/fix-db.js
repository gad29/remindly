/**
 * Database Fix Script
 * 
 * This script attempts to fix database schema issues by using ALTER mode
 * which will update existing tables without dropping data.
 * 
 * Usage: node scripts/fix-db.js
 */

import dotenv from "dotenv";
import sequelize from "../config/database.js";
import "../models/associations.js";

dotenv.config();

const fixDatabase = async () => {
  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔧 Fixing database schema (ALTER mode)...");
    await sequelize.sync({ alter: true });
    console.log("✅ Database schema updated");

    console.log("🎉 Database fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing database:", error);
    console.error("Details:", error.message);
    process.exit(1);
  }
};

fixDatabase();

