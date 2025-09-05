import { STORAGE_KEYS } from "@/constants/storageKeys";
import { isProduction } from "../utils/environment";
import themePackService from "./themePackService";
import upsellService from "./upsellService";
import userService from "./userService";


// Product IDs - Must match Google Play Console exactly
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
    unlocks: ["ad_free"],
  },
  [PRODUCT_IDS.COLLEGE_THEME_PACK]: {
    title: "College Theme Pack",
    description: "Unlock the exciting college theme for your wheel",
    price: "$2.99",
    unlocks: ["college_theme"],
  },
  [PRODUCT_IDS.COUPLE_THEME_PACK]: {
    title: "Couple Theme Pack",
    description: "Unlock the romantic couple theme for your wheel",
    price: "$2.99",
    unlocks: ["couple_theme"],
  },
  [PRODUCT_IDS.COMPLETE_EXPERIENCE_BUNDLE]: {
    title: "Complete Experience Bundle",
    description: "Get everything: All themes + Ad-free (Save $2)",
    price: "$6.99",
    unlocks: ["ad_free", "college_theme", "couple_theme"],
  },
  [PRODUCT_IDS.EXPAND_FUN_BUNDLE]: {
    title: "Expand the Fun Bundle",
    description: "Both theme packs (Save $1)",
    price: "$4.99",
    unlocks: ["college_theme", "couple_theme"],
  },
};

// Global IAP context reference - will be set by the IAPProvider
let iapContext: any = null;

// Function to set the IAP context (called by IAPProvider)
export const setIAPContext = (context: any) => {
  iapContext = context;
};

// Get the IAP context
const getIAPContext = () => {
  if (!iapContext) {
    return null;
  }
  return iapContext;
};

class PurchaseService {
  private isInitialized = false;

  /**
   * Initialize the purchase service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = true;
    }
  }

  /**
   * Check if a product is purchased
   */
  isProductPurchased(productId: string): boolean {
    const context = getIAPContext();
    if (context) {
      return context.isProductPurchased(productId);
    }
    return false;
  }

  /**
   * Check if user is premium (has ad-free)
   * Delegates to userService as single source of truth
   */
  isPremium(): boolean {
    return userService.isPremium();
  }

  /**
   * Get the current fetch status for debugging
   */
  getFetchStatus(): string {
    const context = getIAPContext();
    if (context) {
      if (context.lastError) {
        return `${context.fetchStatus} | Error: ${context.lastError}`;
      }
      return context.fetchStatus;
    }
    return "IAP context not available";
  }

  /**
   * Get detailed error information
   */
  getLastError(): string {
    const context = getIAPContext();
    if (context) {
      return context.lastError;
    }
    return "IAP context not available";
  }

  /**
   * Clear error status
   */
  clearError(): void {
    const context = getIAPContext();
    if (context) {
      context.clearError();
    }
  }

  /**
   * Process a single purchase and unlock features
   * Note: In production mode, this is handled by IAPProvider's event system
   * This method is kept for mock mode and fallback scenarios
   */
  private async processPurchase(purchase: any): Promise<void> {
    try {
      const productId = purchase.productId || purchase.id;
      const productDef = PRODUCT_DEFINITIONS[productId];

      if (!productDef) {
        return;
      }

      // Unlock features based on product
      for (const unlock of productDef.unlocks) {
        switch (unlock) {
          case "ad_free":
            await userService.setPremium("lifetime");
            break;
          case "college_theme":
            await themePackService.purchasePack("college");
            break;
          case "couple_theme":
            await themePackService.purchasePack("couple");
            break;
        }
      }

      // Check for post-purchase upsells
      await upsellService.checkPostPurchaseUpsell("ad_free");

    } catch (error) {
    }
  }

  /**
   * Get all available products
   */
  async getProducts(): Promise<any[]> {
    await this.initialize();

    const context = getIAPContext();
    if (context) {
      return await context.getProducts();
    }

    // Fallback for when context is not available
    return Object.entries(PRODUCT_DEFINITIONS).map(([productId, def]) => ({
      productId,
      title: def.title,
      description: def.description,
      price: def.price,
      type: "individual",
      unlocks: def.unlocks,
      isPurchased: false,
    }));
  }

  /**
   * Purchase any product by ID
   */
  async purchaseProduct(productId: string): Promise<boolean> {
    await this.initialize();

    const context = getIAPContext();
    if (context) {
      const success = await context.purchaseProduct(productId);
      // Note: In production mode, processPurchase is handled by IAPProvider's event system
      // In mock mode, we need to process it here
      if (success && !isProduction()) {
        await this.processPurchase({ productId, id: productId });
      }
      return success;
    }

    // Fallback for when context is not available
    await this.processPurchase({ productId, id: productId });
    return true;
  }

  /**
   * Purchase multiple products (Android) or single product (iOS)
   * Handles platform differences automatically
   */
  async purchaseProducts(productIds: string[]): Promise<boolean> {
    await this.initialize();

    const context = getIAPContext();
    if (context) {
      const success = await context.purchaseProducts(productIds);
      // Note: In production mode, processPurchase is handled by IAPProvider's event system
      // In mock mode, we need to process it here
      if (success && !isProduction()) {
        for (const productId of productIds) {
          await this.processPurchase({ productId, id: productId });
        }
      }
      return success;
    }

    // Fallback for when context is not available
    for (const productId of productIds) {
      await this.processPurchase({ productId, id: productId });
    }
    return true;
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

    const context = getIAPContext();
    if (context) {
      return await context.restorePurchases();
    }

    // Fallback for when context is not available
    return false;
  }

  /**
   * Clear purchase status (for testing)
   */
  async clearPurchaseStatus(): Promise<void> {
    try {
      const context = getIAPContext();
      if (context) {
        await context.clearPurchaseStatus();
      } else {
        // Fallback: clear from AsyncStorage directly
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      }
    } catch (error) {
    }
  }

}

// Export singleton instance
const purchaseService = new PurchaseService();
export default purchaseService;
