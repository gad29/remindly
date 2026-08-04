import axios from "axios";
import groceryFeedService from "./groceryFeedService.js";

const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;
const userAgent = process.env.OPEN_FOOD_FACTS_USER_AGENT || "Remindly/1.0 (https://remindly.ghsystems.work)";

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL) return null;
  return entry.value;
};
const setCached = (key, value) => {
  if (cache.size >= 500) cache.delete(cache.keys().next().value);
  cache.set(key, { value, savedAt: Date.now() });
};

const normalizeProduct = (product = {}) => ({
  barcode: String(product.code || product.barcode || ""),
  name: product.product_name_he || product.product_name || product.generic_name_he || product.generic_name || "Unknown product",
  brand: product.brands || product.manufacturer || "",
  quantity: product.quantity || product.package_quantity || "",
  imageUrl: product.image_front_small_url || product.image_front_url || product.image_url || "",
  category: product.categories_tags?.[0]?.replace(/^..:/, "") || product.category || "",
  ingredients: product.ingredients_text_he || product.ingredients_text || "",
  allergens: product.allergens_tags || [],
  nutritionGrade: product.nutrition_grades || null,
  nutriments: product.nutriments || {},
  source: "open_food_facts",
});

class GroceryService {
  async searchProducts(query, limit = 8) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return [];
    if (/^\d{8,14}$/.test(normalizedQuery)) {
      const product = await this.getProduct(normalizedQuery).catch(() => null);
      if (product) return [product];
      const pricing = await this.getIsraeliPrices(normalizedQuery).catch(() => null);
      return pricing?.product ? [normalizeProduct({ ...pricing.product, code: normalizedQuery })] : [];
    }
    const key = `search:${normalizedQuery.toLowerCase()}:${limit}`;
    const cached = getCached(key);
    if (cached) return cached;

    try {
      const localProducts = await groceryFeedService.search(normalizedQuery, limit);
      if (localProducts.length) { setCached(key, localProducts); return localProducts; }
    } catch (error) {
      console.warn("Local grocery catalogue search unavailable:", error.message);
    }

    if (process.env.APIFY_TOKEN) {
      try {
        const products = await this.searchIsraeliProducts(normalizedQuery, limit);
        if (products.length) { setCached(key, products); return products; }
      } catch (error) {
        console.warn("Israeli grocery search unavailable, falling back to Open Food Facts:", error.message);
      }
    }

    const response = await axios.get("https://world.openfoodfacts.org/cgi/search.pl", {
      headers: { "User-Agent": userAgent },
      timeout: 10000,
      params: {
        search_terms: normalizedQuery,
        search_simple: 1,
        action: "process",
        json: 1,
        page_size: Math.min(Number(limit) || 8, 12),
        fields: "code,product_name,product_name_he,generic_name,generic_name_he,brands,quantity,image_front_small_url,image_front_url,image_url,categories_tags,ingredients_text,ingredients_text_he,allergens_tags,nutrition_grades,nutriments",
      },
    });
    const products = (response.data.products || []).map(normalizeProduct).filter((product) => product.barcode && product.name !== "Unknown product");
    setCached(key, products);
    return products;
  }

  async searchIsraeliProducts(query, limit = 8) {
    const response = await axios.post(
      "https://api.apify.com/v2/acts/swerve~supermarket-prices/run-sync-get-dataset-items",
      { mode: "compareProducts", productQueries: [query], oneStorePerChain: true },
      { params: { token: process.env.APIFY_TOKEN }, timeout: 120000, maxContentLength: 8 * 1024 * 1024 }
    );
    const rows = Array.isArray(response.data) ? response.data : [];
    const grouped = new Map();
    for (const row of rows) {
      const barcode = String(row.barcode || row.itemCode || "");
      if (!barcode) continue;
      const price = Number(row.price);
      const existing = grouped.get(barcode) || { barcode, name: row.itemName || query, brand: row.manufacturer || "", quantity: [row.quantity, row.unitOfMeasure].filter(Boolean).join(" "), imageUrl: "", category: row.category || "", source: "israel_transparency", priceRows: [] };
      if (Number.isFinite(price)) existing.priceRows.push({ price, unitPrice: row.unitPrice ? Number(row.unitPrice) : null, chain: { id: row.chainId || row.chainName, name: row.chainName }, branch: { id: row.storeId, name: row.storeName || row.storeId, city: row.city, address: row.address }, updatedAt: row.priceUpdateDate });
      grouped.set(barcode, existing);
    }
    return [...grouped.values()].slice(0, Math.min(Number(limit) || 8, 12)).map(({ priceRows, ...product }) => {
      const prices = priceRows.sort((a, b) => a.price - b.price);
      const values = prices.map((entry) => entry.price);
      return { ...product, pricing: { configured: true, provider: "apify", prices, summary: values.length ? { cheapest: Math.min(...values), mostExpensive: Math.max(...values), average: values.reduce((sum, value) => sum + value, 0) / values.length, storeCount: values.length, cheapestChain: prices[0]?.chain } : null } };
    });
  }

  async getProduct(barcode) {
    const cleanBarcode = String(barcode).replace(/\D/g, "");
    const key = `product:${cleanBarcode}`;
    const cached = getCached(key);
    if (cached) return cached;
    const response = await axios.get(`https://world.openfoodfacts.org/api/v3/product/${cleanBarcode}.json`, {
      headers: { "User-Agent": userAgent }, timeout: 10000, validateStatus: (status) => status === 200 || status === 404,
    });
    if (!response.data.product) return null;
    const product = normalizeProduct({ ...response.data.product, code: cleanBarcode });
    setCached(key, product);
    return product;
  }

  async getIsraeliPrices(barcode, options = {}) {
    try {
      const localPricing = await groceryFeedService.getPrices(barcode, options);
      if (localPricing.prices.length) return localPricing;
    } catch (error) {
      console.warn("Local grocery price lookup unavailable:", error.message);
    }
    if (!process.env.APIFY_TOKEN) return { configured: false, provider: "apify", prices: [], summary: null };
    const key = `israel-prices:${barcode}`;
    const cached = getCached(key);
    if (cached) return cached;
    const response = await axios.post(
      "https://api.apify.com/v2/acts/swerve~supermarket-prices/run-sync-get-dataset-items",
      { mode: "compareProducts", barcodes: [String(barcode)], oneStorePerChain: true },
      { params: { token: process.env.APIFY_TOKEN }, timeout: 120000, maxContentLength: 5 * 1024 * 1024 }
    );
    const rows = Array.isArray(response.data) ? response.data : [];
    const prices = rows
      .filter((row) => Number.isFinite(Number(row.price)))
      .map((row) => ({
        price: Number(row.price), unitPrice: row.unitPrice ? Number(row.unitPrice) : null,
        chain: { id: row.chainId || row.chainName, name: row.chainName },
        branch: { id: row.storeId, name: row.storeName || row.storeId, city: row.city, address: row.address },
        updatedAt: row.priceUpdateDate, sourceFile: row.sourceFile,
      }))
      .sort((a, b) => a.price - b.price);
    const values = prices.map((entry) => entry.price);
    const result = {
      configured: true, provider: "apify", prices,
      summary: values.length ? { cheapest: Math.min(...values), mostExpensive: Math.max(...values), average: values.reduce((sum, value) => sum + value, 0) / values.length, storeCount: values.length, cheapestChain: prices[0]?.chain } : null,
      product: rows[0] ? { barcode: String(barcode), name: rows[0].itemName, manufacturer: rows[0].manufacturer, category: rows[0].category } : null,
    };
    setCached(key, result);
    return result;
  }

  async enrich(product, options = {}) {
    const [details, pricing] = await Promise.all([
      product.barcode ? this.getProduct(product.barcode).catch(() => product) : Promise.resolve(product),
      options.skipPrices === "true" ? Promise.resolve(product.pricing || { configured: Boolean(process.env.APIFY_TOKEN), prices: [], summary: null }) : product.barcode ? this.getIsraeliPrices(product.barcode, options).catch(() => ({ configured: true, prices: [], summary: null })) : Promise.resolve({ configured: false, prices: [], summary: null }),
    ]);
    return { ...details, pricing };
  }
}

export default new GroceryService();
