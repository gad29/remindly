import express from "express";
import { protect } from "../middleware/auth.js";
import groceryService from "../services/groceryService.js";

const router = express.Router();

router.get("/search", protect, async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 3) return res.json({ success: true, data: [] });
  try {
    const products = await groceryService.searchProducts(query, req.query.limit);
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(502).json({ success: false, error: "Product catalogue is temporarily unavailable" });
  }
});

router.get("/products/:barcode", protect, async (req, res) => {
  try {
    let product = await groceryService.getProduct(req.params.barcode);
    if (!product) {
      if (req.query.skipPrices === "true") {
        return res.status(404).json({ success: false, error: "Product details not found" });
      }
      const pricing = await groceryService.getIsraeliPrices(req.params.barcode, req.query);
      if (!pricing.product) return res.status(404).json({ success: false, error: "Product not found" });
      product = { barcode: req.params.barcode, name: pricing.product.name, brand: pricing.product.manufacturer || "", quantity: "", imageUrl: "", category: pricing.product.category || "", pricing };
    }
    res.json({ success: true, data: await groceryService.enrich(product, req.query) });
  } catch (error) {
    res.status(502).json({ success: false, error: "Product details are temporarily unavailable" });
  }
});

router.get("/products/:barcode/prices", protect, async (req, res) => {
  try {
    res.json({ success: true, data: await groceryService.getIsraeliPrices(req.params.barcode, req.query) });
  } catch (error) {
    res.status(502).json({ success: false, error: "Israeli prices are temporarily unavailable" });
  }
});

export default router;
