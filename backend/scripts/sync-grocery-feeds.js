import "../config/env.js";
import sequelize from "../config/database.js";
import "../models/associations.js";
import groceryFeedService from "../services/groceryFeedService.js";

try {
  await sequelize.sync();
  const results = await groceryFeedService.syncAll();
  console.table(results.map(({ url, ...result }) => result));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
} finally {
  await sequelize.close();
}
