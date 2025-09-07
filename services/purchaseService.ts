import { PRODUCT_DEFINITIONS, PRODUCT_IDS } from "../constants/iapProducts";
import { isProduction } from "../utils/environment";
import themePackService from "./themePackService";
import upsellService from "./upsellService";
import userService from "./userService";



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


}

// Export singleton instance
const purchaseService = new PurchaseService();
export default purchaseService;
