import axios from "axios";
import { Price } from "../models/Price.js";
import { Category } from "../models/Category.js";
import groceryService from "./groceryService.js";

class PriceService {
  /**
   * Search for product prices
   */
  async searchPrices(productName, options = {}) {
    try {
      const {
        limit = 10,
        minPrice = null,
        maxPrice = null,
        category = null,
        store = null,
      } = options;

      // First check if we have recent prices in database
      const recentPrices = await this.getRecentPrices(productName, {
        limit,
        minPrice,
        maxPrice,
        category,
        store,
      });

      if (recentPrices.length > 0) {
        return recentPrices;
      }

      // If no recent prices, search external APIs
      const externalPrices = await this.searchExternalAPIs(
        productName,
        options
      );

      // Save new prices to database
      for (const priceData of externalPrices) {
        await this.savePrice(priceData);
      }

      return externalPrices;
    } catch (error) {
      console.error("Price search error:", error);
      throw error;
    }
  }

  /**
   * Get recent prices from database
   */
  async getRecentPrices(productName, options = {}) {
    const {
      limit = 10,
      minPrice = null,
      maxPrice = null,
      category = null,
      store = null,
      maxAge = 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    } = options;

    const whereClause = {
      productName: {
        [require("sequelize").Op.iLike]: `%${productName}%`,
      },
      isActive: true,
      lastChecked: {
        [require("sequelize").Op.gte]: new Date(Date.now() - maxAge),
      },
    };

    if (minPrice) {
      whereClause.price = {
        ...whereClause.price,
        [require("sequelize").Op.gte]: minPrice,
      };
    }

    if (maxPrice) {
      whereClause.price = {
        ...whereClause.price,
        [require("sequelize").Op.lte]: maxPrice,
      };
    }

    if (category) {
      whereClause.category = category;
    }

    if (store) {
      whereClause.storeName = {
        [require("sequelize").Op.iLike]: `%${store}%`,
      };
    }

    const prices = await Price.findAll({
      where: whereClause,
      order: [
        ["confidence", "DESC"],
        ["price", "ASC"],
      ],
      limit: limit,
    });

    return prices;
  }

  /**
   * Search external price APIs
   */
  async searchExternalAPIs(productName, options = {}) {
    const results = [];

    try {
      if (options.barcode) {
        const pricing = await groceryService.getIsraeliPrices(options.barcode, options);
        results.push(...pricing.prices.map((entry) => ({
          productName: pricing.product?.name || productName,
          productId: options.barcode,
          price: entry.promo?.promoPrice || entry.price,
          currency: "ILS",
          source: "israel_transparency",
          storeName: entry.chain?.name || entry.storeName,
          storeLocation: entry.branch?.city || entry.branch?.address,
          availability: "in_stock",
          unitPrice: entry.unitPrice,
          confidence: 1,
          metadata: { branch: entry.branch, promotion: entry.promo },
        })));
      }

      return results;
    } catch (error) {
      console.error("External API search error:", error);
      return [];
    }
  }

  /**
   * Search Google Shopping API
   */
  async searchGoogleShopping(productName, options = {}) {
    try {
      return [];
    } catch (error) {
      console.error("Google Shopping search error:", error);
      return [];
    }
  }

  /**
   * Search Israeli supermarket APIs
   */
  async searchSupermarketAPIs(productName, options = {}) {
    const results = [];

    try {
      return results;
    } catch (error) {
      console.error("Supermarket API search error:", error);
      return [];
    }
  }

  /**
   * Search Shufersal
   */
  async searchShufersal(productName) {
    try {
      return [];
    } catch (error) {
      console.error("Shufersal search error:", error);
      return [];
    }
  }

  /**
   * Search Rami Levy
   */
  async searchRamiLevy(productName) {
    try {
      return [];
    } catch (error) {
      console.error("Rami Levy search error:", error);
      return [];
    }
  }

  /**
   * Search Victory
   */
  async searchVictory(productName) {
    try {
      return [];
    } catch (error) {
      console.error("Victory search error:", error);
      return [];
    }
  }

  /**
   * Web scraping fallback
   */
  async scrapePrices(productName, options = {}) {
    try {
      return [];
    } catch (error) {
      console.error("Web scraping error:", error);
      return [];
    }
  }

  /**
   * Save price to database
   */
  async savePrice(priceData) {
    try {
      const price = await Price.create({
        productName: priceData.productName,
        productId: priceData.productId,
        price: priceData.price,
        currency: priceData.currency || "ILS",
        source: priceData.source,
        sourceUrl: priceData.sourceUrl,
        storeName: priceData.storeName,
        storeLocation: priceData.storeLocation,
        availability: priceData.availability || "unknown",
        unit: priceData.unit || "pcs",
        unitPrice: priceData.unitPrice,
        brand: priceData.brand,
        category: priceData.category,
        imageUrl: priceData.imageUrl,
        description: priceData.description,
        confidence: priceData.confidence || 0.5,
        metadata: priceData.metadata || {},
      });

      return price;
    } catch (error) {
      console.error("Error saving price:", error);
      throw error;
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productName, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const prices = await Price.findAll({
        where: {
          productName: {
            [require("sequelize").Op.iLike]: `%${productName}%`,
          },
          lastChecked: {
            [require("sequelize").Op.gte]: startDate,
          },
        },
        order: [["lastChecked", "DESC"]],
      });

      return prices;
    } catch (error) {
      console.error("Error getting price history:", error);
      throw error;
    }
  }

  /**
   * Get price statistics
   */
  async getPriceStats(productName) {
    try {
      const stats = await Price.findAll({
        where: {
          productName: {
            [require("sequelize").Op.iLike]: `%${productName}%`,
          },
          isActive: true,
        },
        attributes: [
          [
            require("sequelize").fn("AVG", require("sequelize").col("price")),
            "averagePrice",
          ],
          [
            require("sequelize").fn("MIN", require("sequelize").col("price")),
            "minPrice",
          ],
          [
            require("sequelize").fn("MAX", require("sequelize").col("price")),
            "maxPrice",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "totalResults",
          ],
        ],
      });

      return stats[0];
    } catch (error) {
      console.error("Error getting price stats:", error);
      throw error;
    }
  }

  /**
   * Update stale prices
   */
  async updateStalePrices() {
    try {
      const staleThreshold = new Date();
      staleThreshold.setHours(staleThreshold.getHours() - 24);

      const stalePrices = await Price.findAll({
        where: {
          lastChecked: {
            [require("sequelize").Op.lt]: staleThreshold,
          },
          isActive: true,
        },
        limit: 100,
      });

      console.log(`Updating ${stalePrices.length} stale prices`);

      for (const price of stalePrices) {
        try {
          const newPrices = await this.searchExternalAPIs(price.productName);
          if (newPrices.length > 0) {
            // Update the existing price or create new ones
            await price.update({
              lastChecked: new Date(),
            });
          }
        } catch (error) {
          console.error(`Error updating price ${price.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating stale prices:", error);
    }
  }
}

export default new PriceService();
