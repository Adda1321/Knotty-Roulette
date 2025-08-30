import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import themePackService from "./themePackService";
import upsellService from "./upsellService";
import userService from "./userService";

// Simple check: Are we in production?
const isProduction = () => Constants.expoConfig?.extra?.eas?.buildProfile === 'production';

// Helper: Should we show mock data?
const shouldShowMockData = () => !isProduction();

// Storage keys for persistence
const STORAGE_KEYS = {
  PURCHASED_PRODUCTS: 'knotty_roulette_purchased_products',
  PRODUCT_CACHE: 'knotty_roulette_product_cache',
  LAST_PRODUCT_FETCH: 'knotty_roulette_last_product_fetch',
} as const;

// Product IDs - All the products mentioned in UPSELL_README.md
const PRODUCT_IDS = {
  // Individual products
  AD_FREE_REMOVAL: "ad_free_removal",
  COLLEGE_THEME_PACK: "college_theme_pack", 
  COUPLE_THEME_PACK: "couple_theme_pack",
  
  // Bundle products
  COMPLETE_EXPERIENCE_BUNDLE: "complete_experience_bundle",
  EXPAND_FUN_BUNDLE: "expand_fun_bundle",
};

// Product definitions with metadata - Used for mock data and feature unlocking
const PRODUCT_DEFINITIONS = {
  [PRODUCT_IDS.AD_FREE_REMOVAL]: {
    title: "Remove Ads",
    description: "Remove all ads and enjoy uninterrupted gameplay",
    price: "$2.99",
    unlocks: ['ad_free'],
  },
  [PRODUCT_IDS.COLLEGE_THEME_PACK]: {
    title: "College Theme Pack",
    description: "Unlock the exciting college theme for your wheel",
    price: "$2.99",
    unlocks: ['college_theme'],
  },
  [PRODUCT_IDS.COUPLE_THEME_PACK]: {
    title: "Couple Theme Pack", 
    description: "Unlock the romantic couple theme for your wheel",
    price: "$2.99",
    unlocks: ['couple_theme'],
  },
  [PRODUCT_IDS.COMPLETE_EXPERIENCE_BUNDLE]: {
    title: "Complete Experience Bundle",
    description: "Get everything: All themes + Ad-free (Save $2)",
    price: "$6.99",
    unlocks: ['ad_free', 'college_theme', 'couple_theme'],
  },
  [PRODUCT_IDS.EXPAND_FUN_BUNDLE]: {
    title: "Expand the Fun Bundle",
    description: "Both theme packs (Save $1)",
    price: "$4.99",
    unlocks: ['college_theme', 'couple_theme'],
  },
};

// Mock IAP for development/preview builds
class MockIAPService {
  async connectAsync() {}
  async disconnectAsync() {}
  setPurchaseListener() {}
  async getProductsAsync() { return { responseCode: 'OK', results: [] }; }
  async getPurchaseHistoryAsync() { return { responseCode: 'OK', results: [] }; }
  async purchaseItemAsync() { return true; }
  async finishTransactionAsync() { return true; }
  
  get IAPResponseCode() {
    return { OK: 'OK' };
  }
}

// Real IAP for production builds
let IAP: any = null;

if (isProduction()) {
  try {
    IAP = require("expo-iap");
  } catch (error) {
    console.log("🚫 IAP: Failed to load in production");
  }
}

// Use mock service for non-production builds
const getIAPService = () => {
  if (isProduction() && IAP) {
    return IAP;
  }
  return new MockIAPService();
};

class PurchaseService {
  private isInitialized = false;
  private purchasedProducts: Set<string> = new Set();
  private productCache: any[] = [];
  private lastProductFetch: number = 0;

  /**
   * Initialize the purchase service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load cached data first
      await this.loadCachedData();

      if (isProduction() && IAP) {
        const iapService = getIAPService();
        await iapService.connectAsync();
        iapService.setPurchaseListener((result: any) => this.handlePurchaseResult(result));
        await this.handlePendingPurchases();
        await this.autoRestorePurchases();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ IAP: Failed to initialize");
      this.isInitialized = true;
    }
  }

  /**
   * Load cached data from AsyncStorage
   */
  private async loadCachedData(): Promise<void> {
    try {
      const purchasedData = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      if (purchasedData) {
        this.purchasedProducts = new Set(JSON.parse(purchasedData));
      }

      const productCacheData = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCT_CACHE);
      if (productCacheData) {
        this.productCache = JSON.parse(productCacheData);
      }

      const lastFetchData = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PRODUCT_FETCH);
      if (lastFetchData) {
        this.lastProductFetch = parseInt(lastFetchData);
      }
    } catch (error) {
      console.error("❌ Failed to load cached data:", error);
    }
  }

  /**
   * Save purchased products to AsyncStorage
   */
  private async savePurchasedProducts(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PURCHASED_PRODUCTS,
        JSON.stringify(Array.from(this.purchasedProducts))
      );
    } catch (error) {
      console.error("❌ Failed to save purchased products:", error);
    }
  }

  /**
   * Save product cache to AsyncStorage
   */
  private async saveProductCache(products: any[]): Promise<void> {
    try {
      this.productCache = products;
      this.lastProductFetch = Date.now();
      
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCT_CACHE, JSON.stringify(products));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PRODUCT_FETCH, this.lastProductFetch.toString());
    } catch (error) {
      console.error("❌ Failed to save product cache:", error);
    }
  }

  /**
   * Check if a product is purchased
   */
  isProductPurchased(productId: string): boolean {
    return this.purchasedProducts.has(productId);
  }

  /**
   * Check if user is premium (has ad-free)
   */
  isPremium(): boolean {
    return this.isProductPurchased(PRODUCT_IDS.AD_FREE_REMOVAL);
  }

  /**
   * Automatically restore all purchases if user was previously premium
   */
  private async autoRestorePurchases(): Promise<void> {
    try {
      if (!IAP) return;

      const iapService = getIAPService();
      const result = await iapService.getPurchaseHistoryAsync();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        for (const purchase of result.results) {
          await this.processPurchase(purchase);
        }
      }
    } catch (error) {
      console.error("❌ Auto-restore failed:", error);
    }
  }

  /**
   * Process a single purchase and unlock features
   */
  private async processPurchase(purchase: any): Promise<void> {
    try {
      const productId = purchase.productId;
      const productDef = PRODUCT_DEFINITIONS[productId];
      
      if (!productDef) {
        console.log(`⚠️ Unknown product: ${productId}`);
        return;
      }

      // Add to purchased products set
      this.purchasedProducts.add(productId);
      await this.savePurchasedProducts();

      // Unlock features based on product
      for (const unlock of productDef.unlocks) {
        switch (unlock) {
          case 'ad_free':
            await userService.setPremium("lifetime");
            break;
          case 'college_theme':
            await themePackService.purchasePack('college');
            break;
          case 'couple_theme':
            await themePackService.purchasePack('couple');
            break;
        }
      }

      // Check for post-purchase upsells
      await upsellService.checkPostPurchaseUpsell('ad_free');
      
      console.log(`✅ Unlocked: ${productDef.title}`);
    } catch (error) {
      console.error("❌ Error processing purchase:", error);
    }
  }

  /**
   * Handle purchase results
   */
  private async handlePurchaseResult(result: any): Promise<void> {
    try {
      if (!IAP) return;

      const iapService = getIAPService();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        const purchases = result.results;
        for (const purchase of purchases) {
          if (purchase.acknowledged) {
            await this.processPurchase(purchase);
          } else {
            try {
              await iapService.finishTransactionAsync(purchase, true);
              await this.processPurchase(purchase);
            } catch (acknowledgmentError) {
              console.error("❌ Failed to acknowledge purchase:", acknowledgmentError);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error handling purchase result:", error);
    }
  }

  /**
   * Handle any pending purchases that might have been interrupted
   */
  private async handlePendingPurchases(): Promise<void> {
    try {
      if (!IAP) return;

      const iapService = getIAPService();
      const result = await iapService.getPurchaseHistoryAsync();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        const pendingPurchases = result.results.filter(
          (purchase: any) => !purchase.acknowledged
        );

        for (const purchase of pendingPurchases) {
          await this.handlePurchaseResult({
            responseCode: iapService.IAPResponseCode.OK,
            results: [purchase],
          });
        }
      }
    } catch (error) {
      console.error("❌ Error checking pending purchases:", error);
    }
  }

  /**
   * Get all available products with caching
   */
  async getProducts(): Promise<any[]> {
    await this.initialize();

    // Check if we have recent cache (less than 1 hour old)
    const cacheAge = Date.now() - this.lastProductFetch;
    const isCacheValid = cacheAge < 60 * 60 * 1000; // 1 hour

    if (!isProduction()) {
      // Return mock products for development
      const mockProducts = Object.entries(PRODUCT_DEFINITIONS).map(([productId, def]) => ({
        productId,
        title: def.title,
        description: def.description,
        price: def.price,
        type: 'individual',
        unlocks: def.unlocks,
        isPurchased: this.isProductPurchased(productId),
      }));

      await this.saveProductCache(mockProducts);
      return mockProducts;
    }

    // Return cached products if valid
    if (isCacheValid && this.productCache.length > 0) {
      return this.productCache.map(product => ({
        ...product,
        isPurchased: this.isProductPurchased(product.productId),
      }));
    }

    try {
      if (!IAP) return [];

      const iapService = getIAPService();
      const allProductIds = Object.keys(PRODUCT_DEFINITIONS);
      const result = await iapService.getProductsAsync(allProductIds);
      
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        // Enhance store products with our metadata
        const enhancedProducts = result.results.map((storeProduct: any) => {
          const def = PRODUCT_DEFINITIONS[storeProduct.productId];
          return {
            ...storeProduct,
            type: 'individual',
            unlocks: def?.unlocks || [],
            isPurchased: this.isProductPurchased(storeProduct.productId),
          };
        });

        await this.saveProductCache(enhancedProducts);
        return enhancedProducts;
      }
      return [];
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      // Return cached products as fallback
      return this.productCache.map(product => ({
        ...product,
        isPurchased: this.isProductPurchased(product.productId),
      }));
    }
  }

  /**
   * Purchase any product by ID
   */
  async purchaseProduct(productId: string): Promise<boolean> {
    await this.initialize();

    if (shouldShowMockData()) {
      // Simulate purchase success immediately (no delay)
      const mockPurchase = { productId };
      await this.processPurchase(mockPurchase);
      return true;
    }

    try {
      if (!IAP) return false;

      const iapService = getIAPService();
      await iapService.purchaseItemAsync(productId);
      return true;
    } catch (error) {
      console.error(`❌ Purchase failed for ${productId}:`, error);
      return false;
    }
  }

  /**
   * Purchase ad-free removal (this makes user premium)
   */
  async purchaseAdFree(): Promise<boolean> {
    return this.purchaseProduct(PRODUCT_IDS.AD_FREE_REMOVAL);
  }

  /**
   * Purchase college theme individually
   */
  async purchaseCollegeTheme(): Promise<boolean> {
    return this.purchaseProduct(PRODUCT_IDS.COLLEGE_THEME_PACK);
  }

  /**
   * Purchase couple theme individually
   */
  async purchaseCoupleTheme(): Promise<boolean> {
    return this.purchaseProduct(PRODUCT_IDS.COUPLE_THEME_PACK);
  }

  /**
   * Purchase complete experience bundle (ad-free + both themes)
   */
  async purchaseCompleteBundle(): Promise<boolean> {
    return this.purchaseProduct(PRODUCT_IDS.COMPLETE_EXPERIENCE_BUNDLE);
  }

  /**
   * Purchase expand fun bundle (both themes only, no ad-free)
   */
  async purchaseExpandBundle(): Promise<boolean> {
    return this.purchaseProduct(PRODUCT_IDS.EXPAND_FUN_BUNDLE);
  }

  /**
   * Restore all purchases
   */
  async restorePurchases(): Promise<boolean> {
    await this.initialize();

    if (shouldShowMockData()) {
      return this.purchasedProducts.size > 0;
    }

    try {
      if (!IAP) return false;

      const iapService = getIAPService();
      const result = await iapService.getPurchaseHistoryAsync();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        let restored = false;
        for (const purchase of result.results) {
          await this.processPurchase(purchase);
          restored = true;
        }
        return restored;
      }
      return false;
    } catch (error) {
      console.error("❌ Restore purchases failed:", error);
      return false;
    }
  }

  /**
   * Clear all purchase status from local storage (for testing purposes)
   */
  async clearPurchaseStatus(): Promise<void> {
    try {
      console.log("🧹 Clearing purchase status for testing...");
      
      this.purchasedProducts.clear();
      await this.savePurchasedProducts();
      
      await AsyncStorage.removeItem("userTier");
      await AsyncStorage.removeItem("unlockedThemes");
      
      userService.forceResetForTesting();
      
      console.log("✅ Purchase status cleared successfully");
    } catch (error) {
      console.error("❌ Failed to clear purchase status:", error);
      throw error;
    }
  }

  /**
   * Clean up purchase service
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        if (IAP) {
          const iapService = getIAPService();
          await iapService.disconnectAsync();
        }
        this.isInitialized = false;
      }
    } catch (error) {
      console.error("❌ Error cleaning up purchase service:", error);
    }
  }
}

// Export singleton instance
const purchaseService = new PurchaseService();
export default purchaseService;
