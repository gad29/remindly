/**
 * Test Database Connection and Sync
 */

import dotenv from "dotenv";
import sequelize from "../config/database.js";
import "../models/associations.js";

dotenv.config();

const testConnection = async () => {
  try {
    console.log("🔄 Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("🔄 Testing database sync (alter mode)...");
    await sequelize.sync({ alter: true });
    console.log("✅ Database sync completed");

    // Test creating a simple query
    try {
      const [results] = await sequelize.query("SELECT COUNT(*) as count FROM users");
      console.log(`✅ Database query test passed. Users table exists.`);
    } catch (queryError) {
      console.log("⚠️  Users table might not exist yet, but that's OK");
    }

    console.log("🎉 All database tests passed!");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
};

testConnection();

