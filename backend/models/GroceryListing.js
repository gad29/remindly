import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroceryListing = sequelize.define("GroceryListing", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  barcode: { type: DataTypes.STRING(32), allowNull: false },
  chainId: { type: DataTypes.STRING(80), allowNull: false },
  storeId: { type: DataTypes.STRING(80), allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unitPrice: DataTypes.DECIMAL(10, 2),
  available: { type: DataTypes.BOOLEAN, defaultValue: true },
  promotion: { type: DataTypes.JSONB, defaultValue: null },
  sourceUpdatedAt: DataTypes.DATE,
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "grocery_listings",
  indexes: [
    { unique: true, fields: ["barcode", "chain_id", "store_id"] },
    { fields: ["barcode", "price"] },
    { fields: ["chain_id", "store_id"] },
    { fields: ["last_seen_at"] },
  ],
});

export { GroceryListing };
