import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const GroceryStore = sequelize.define("GroceryStore", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chainId: { type: DataTypes.STRING(80), allowNull: false },
  chainName: { type: DataTypes.STRING(255), allowNull: false },
  storeId: { type: DataTypes.STRING(80), allowNull: false },
  name: DataTypes.STRING(255),
  city: DataTypes.STRING(160),
  address: DataTypes.STRING(500),
  latitude: DataTypes.DECIMAL(10, 7),
  longitude: DataTypes.DECIMAL(10, 7),
  lastSeenAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "grocery_stores",
  indexes: [{ unique: true, fields: ["chain_id", "store_id"] }, { fields: ["city"] }],
});

export { GroceryStore };
