import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ShoppingItem = sequelize.define(
  "ShoppingItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    listId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lists",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: "pcs", // pieces, kg, liter, etc.
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    estimatedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    priceSource: {
      type: DataTypes.ENUM("manual", "api", "scraped"),
      defaultValue: "manual",
    },
    priceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priceUpdatedAt: {
      type: DataTypes.DATE,
    },
    checked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkedAt: {
      type: DataTypes.DATE,
    },
    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    tableName: "shopping_items",
    indexes: [
      {
        fields: ["list_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["checked"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["category_id"],
      },
      {
        fields: ["barcode"],
      },
    ],
  }
);

export { ShoppingItem };
