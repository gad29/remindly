import axios from "axios";

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
    if (normalizedQuery.length < 2) return [];
    if (/^\d{8,14}$/.test(normalizedQuery)) {
      const product = await this.getProduct(normalizedQuery).catch(() => null);
      if (product) return [product];
      const pricing = await this.getIsraeliPrices(normalizedQuery).catch(() => null);
      return pricing?.product ? [normalizeProduct({ ...pricing.product, code: normalizedQuery })] : [];
    }
    const key = `search:${normalizedQuery.toLowerCase()}:${limit}`;
    const cached = getCached(key);
    if (cached) return cached;

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
    if (!process.env.ISRAEL_GROCERY_API_KEY) return { configured: false, prices: [], summary: null };
    const baseUrl = process.env.ISRAEL_GROCERY_API_URL || "https://api.cheapersal.co.il/api/v1";
    const response = await axios.get(`${baseUrl}/products/${encodeURIComponent(barcode)}/prices`, {
      headers: { "X-API-Key": process.env.ISRAEL_GROCERY_API_KEY },
      timeout: 12000,
      params: { city: options.city || undefined, radius: options.radius || undefined },
    });
    const data = response.data.data || response.data;
    return { configured: true, prices: data.prices || [], summary: data.summary || null, product: data.product || null };
  }

  async enrich(product, options = {}) {
    const [details, pricing] = await Promise.all([
      product.barcode ? this.getProduct(product.barcode).catch(() => product) : Promise.resolve(product),
      product.barcode ? this.getIsraeliPrices(product.barcode, options).catch(() => ({ configured: true, prices: [], summary: null })) : Promise.resolve({ configured: false, prices: [], summary: null }),
    ]);
    return { ...details, pricing };
  }
}

export default new GroceryService();
