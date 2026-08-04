import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroceryProduct = sequelize.define("GroceryProduct", {
  barcode: { type: DataTypes.STRING(32), primaryKey: true },
  name: { type: DataTypes.STRING(500), allowNull: false },
  normalizedName: { type: DataTypes.STRING(500), allowNull: false },
  manufacturer: DataTypes.STRING(255),
  quantity: DataTypes.STRING(100),
  unitOfMeasure: DataTypes.STRING(50),
  category: DataTypes.STRING(255),
  imageUrl: DataTypes.TEXT,
  source: { type: DataTypes.STRING(80), defaultValue: "israel_transparency" },
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "grocery_products",
  indexes: [{ fields: ["normalized_name"] }, { fields: ["manufacturer"] }, { fields: ["last_seen_at"] }],
});

export { GroceryProduct };
