import axios from "axios";
import cron from "node-cron";
import { gunzipSync } from "zlib";
import { XMLParser } from "fast-xml-parser";
import { Op, fn, col, where } from "sequelize";
import { GroceryProduct } from "../models/GroceryProduct.js";
import { GroceryStore } from "../models/GroceryStore.js";
import { GroceryListing } from "../models/GroceryListing.js";

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true });
const value = (row, ...names) => {
  const keys = Object.keys(row || {});
  for (const name of names) {
    const key = keys.find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key && row[key] !== undefined && row[key] !== null) return row[key];
  }
  return null;
};
const normalizeName = (text = "") => String(text).normalize("NFKC").toLowerCase().replace(/[\u0591-\u05c7]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const collectRows = (node, predicate, output = []) => {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === "object" && predicate(item)) output.push(item);
      else collectRows(item, predicate, output);
    }
  } else if (node && typeof node === "object") {
    if (predicate(node)) output.push(node);
    else for (const child of Object.values(node)) collectRows(child, predicate, output);
  }
  return output;
};
const chunks = (items, size = 500) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

class GroceryFeedService {
  parseFeeds() {
    try {
      const feeds = JSON.parse(process.env.GROCERY_FEED_URLS || "[]");
      return Array.isArray(feeds) ? feeds.filter((feed) => feed.url && feed.chainId) : [];
    } catch {
      throw new Error("GROCERY_FEED_URLS must be a valid JSON array");
    }
  }

  async download(feed) {
    const response = await axios.get(feed.url, { responseType: "arraybuffer", timeout: 120000, maxContentLength: 250 * 1024 * 1024 });
    const buffer = Buffer.from(response.data);
    const xml = (buffer[0] === 0x1f && buffer[1] === 0x8b) || /\.gz($|\?)/i.test(feed.url) ? gunzipSync(buffer) : buffer;
    return parser.parse(xml.toString("utf8").replace(/^\uFEFF/, ""));
  }

  async importFeed(feed) {
    const document = await this.download(feed);
    const now = new Date();
    const isStore = String(feed.type || "").toLowerCase().includes("store");
    const rows = collectRows(document, (row) => isStore
      ? value(row, "StoreId", "StoreID") !== null && value(row, "StoreName", "StoreAddress", "City") !== null
      : value(row, "ItemCode", "Barcode") !== null && value(row, "ItemPrice", "Price") !== null);

    if (isStore) {
      const stores = rows.map((row) => ({
        chainId: String(feed.chainId), chainName: feed.chainName || String(feed.chainId),
        storeId: String(value(row, "StoreId", "StoreID")), name: value(row, "StoreName"),
        city: value(row, "City"), address: value(row, "Address", "StoreAddress"),
        latitude: value(row, "Latitude"), longitude: value(row, "Longitude"), lastSeenAt: now,
      }));
      for (const batch of chunks(stores)) await GroceryStore.bulkCreate(batch, { updateOnDuplicate: ["chainName", "name", "city", "address", "latitude", "longitude", "lastSeenAt"] });
      return { type: "stores", rows: stores.length };
    }

    const products = new Map();
    const listings = [];
    for (const row of rows) {
      const barcode = String(value(row, "ItemCode", "Barcode") || "").trim();
      const name = String(value(row, "ItemName", "ProductName") || "").trim();
      const price = Number(value(row, "ItemPrice", "Price"));
      const storeId = String(value(row, "StoreId", "StoreID") || feed.storeId || "online");
      if (!barcode || !name || !Number.isFinite(price)) continue;
      products.set(barcode, {
        barcode, name, normalizedName: normalizeName(name), manufacturer: value(row, "ManufacturerName", "Manufacturer"),
        quantity: value(row, "Quantity"), unitOfMeasure: value(row, "UnitOfMeasure", "UnitQty"),
        category: value(row, "ItemType", "Category"), lastSeenAt: now,
      });
      listings.push({
        barcode, chainId: String(feed.chainId), storeId, price,
        unitPrice: value(row, "UnitOfMeasurePrice", "UnitPrice"), available: String(value(row, "ItemStatus") ?? "1") !== "0",
        sourceUpdatedAt: value(row, "PriceUpdateDate", "UpdateDate") || now, lastSeenAt: now,
      });
    }
    for (const batch of chunks([...products.values()])) await GroceryProduct.bulkCreate(batch, { updateOnDuplicate: ["name", "normalizedName", "manufacturer", "quantity", "unitOfMeasure", "category", "lastSeenAt"] });
    for (const batch of chunks(listings)) await GroceryListing.bulkCreate(batch, { updateOnDuplicate: ["price", "unitPrice", "available", "sourceUpdatedAt", "lastSeenAt"] });
    return { type: "prices", rows: listings.length, products: products.size };
  }

  async syncAll() {
    const feeds = this.parseFeeds();
    const results = [];
    for (const feed of feeds) {
      try { results.push({ chainId: feed.chainId, url: feed.url, ...(await this.importFeed(feed)), ok: true }); }
      catch (error) { results.push({ chainId: feed.chainId, url: feed.url, ok: false, error: error.message }); }
    }
    return results;
  }

  async search(query, limit = 8) {
    const term = normalizeName(query);
    if (!term) return [];
    const products = await GroceryProduct.findAll({
      where: where(fn("lower", col("normalized_name")), { [Op.like]: `%${term}%` }),
      limit: Math.min(Number(limit) || 8, 20), order: [["lastSeenAt", "DESC"]], raw: true,
    });
    return Promise.all(products.map(async (product) => ({ ...product, imageUrl: product.imageUrl || "", source: "israel_transparency_local", pricing: await this.getPrices(product.barcode) })));
  }

  async getPrices(barcode, { city } = {}) {
    const rows = await GroceryListing.findAll({
      where: { barcode: String(barcode), available: true },
      order: [["price", "ASC"]], limit: 100,
    });
    const stores = await GroceryStore.findAll({ where: city ? { city: { [Op.iLike]: `%${city}%` } } : {}, raw: true });
    const storeMap = new Map(stores.map((store) => [`${store.chainId}:${store.storeId}`, store]));
    const prices = rows.map((entry) => ({ entry, store: storeMap.get(`${entry.chainId}:${entry.storeId}`) }))
      .filter(({ store }) => !city || store)
      .map(({ entry, store }) => ({
      price: Number(entry.price), unitPrice: entry.unitPrice ? Number(entry.unitPrice) : null,
      chain: { id: entry.chainId, name: store?.chainName || entry.chainId },
      branch: { id: entry.storeId, name: store?.name || entry.storeId, city: store?.city, address: store?.address },
      updatedAt: entry.sourceUpdatedAt, promotion: entry.promotion,
    }));
    const values = prices.map((entry) => entry.price);
    return { configured: this.parseFeeds().length > 0, provider: "israel_transparency_local", prices, summary: values.length ? { cheapest: values[0], mostExpensive: values.at(-1), average: values.reduce((sum, item) => sum + item, 0) / values.length, storeCount: values.length, cheapestChain: prices[0].chain } : null };
  }

  startScheduler() {
    if (process.env.GROCERY_SYNC_ENABLED !== "true" || !this.parseFeeds().length) return;
    const expression = process.env.GROCERY_SYNC_CRON || "17 */6 * * *";
    cron.schedule(expression, () => this.syncAll().then((results) => console.log("Grocery feeds synchronized", results)).catch((error) => console.error("Grocery feed synchronization failed", error.message)));
  }

  async status() {
    const [products, stores, listings, latestProduct, latestListing] = await Promise.all([
      GroceryProduct.count(), GroceryStore.count(), GroceryListing.count(),
      GroceryProduct.max("lastSeenAt"), GroceryListing.max("lastSeenAt"),
    ]);
    return { configuredFeeds: this.parseFeeds().length, syncEnabled: process.env.GROCERY_SYNC_ENABLED === "true", products, stores, listings, lastProductSync: latestProduct, lastPriceSync: latestListing };
  }
}

export default new GroceryFeedService();
