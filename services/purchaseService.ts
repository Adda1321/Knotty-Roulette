import Constants from "expo-constants";
import userService from "./userService";

// Simple check: Are we in production?
const isProduction = () => Constants.expoConfig?.extra?.eas?.buildProfile === 'production';

// Helper: Should we show mock data?
const shouldShowMockData = () => !isProduction();

// Product IDs
const PRODUCT_IDS = {
  PREMIUM_PACK: "knotty_roulette_premium_pack",
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
  // Only try to import in production
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

  /**
   * Check if IAP is available
   */
  async isIAPAvailable(): Promise<boolean> {
    if (!isProduction()) return false;
    return IAP !== null;
  }

  /**
   * Initialize the purchase service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !isProduction()) {
      this.isInitialized = true;
      return;
    }

    try {
      if (!IAP) {
        this.isInitialized = true;
        return;
      }

      const iapService = getIAPService();
      await iapService.connectAsync();
      iapService.setPurchaseListener((result: any) => this.handlePurchaseResult(result));
      await this.handlePendingPurchases();
      await this.autoRestorePremiumStatus();
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ IAP: Failed to initialize");
      this.isInitialized = true;
    }
  }

  /**
   * Automatically restore premium status if user was previously premium
   */
  private async autoRestorePremiumStatus(): Promise<void> {
    try {
      if (userService.isPremium()) return;

      if (!IAP) return;

      const iapService = getIAPService();
      const result = await iapService.getPurchaseHistoryAsync();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        const hasPremium = result.results.some(
          (purchase: any) => purchase.productId === PRODUCT_IDS.PREMIUM_PACK
        );
        if (hasPremium) {
          await userService.setPremium("lifetime");
        }
      }
    } catch (error) {
      console.error("❌ Auto-restore failed:", error);
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
            await userService.setPremium("lifetime");
          } else {
            try {
              await iapService.finishTransactionAsync(purchase, true);
              await userService.setPremium("lifetime");
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
          if (purchase.productId === PRODUCT_IDS.PREMIUM_PACK) {
            await this.handlePurchaseResult({
              responseCode: iapService.IAPResponseCode.OK,
              results: [purchase],
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking pending purchases:", error);
    }
  }

  /**
   * Get available products
   */
  async getProducts(): Promise<any[]> {
    await this.initialize();

    if (!isProduction()) {
      return [{
        productId: PRODUCT_IDS.PREMIUM_PACK,
        title: "Premium Pack - Ad Free Gaming",
        description: "Remove all ads and unlock premium features",
        price: "$4.99",
        priceAmountMicros: 4990000,
        priceCurrencyCode: "USD",
      }];
    }

    try {
      if (!IAP) return [];

      const iapService = getIAPService();
      const result = await iapService.getProductsAsync([PRODUCT_IDS.PREMIUM_PACK]);
      return (result.responseCode === iapService.IAPResponseCode.OK && result.results) 
        ? result.results 
        : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Purchase premium pack
   */
  async purchasePremiumPack(): Promise<boolean> {
    await this.initialize();

    if (shouldShowMockData()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await userService.setPremium("lifetime");
      return true;
    }

    try {
      if (!IAP) return false;

      const iapService = getIAPService();
      await iapService.purchaseItemAsync(PRODUCT_IDS.PREMIUM_PACK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    await this.initialize();

    if (shouldShowMockData()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userService.isPremium();
    }

    try {
      if (!IAP) return false;

      const iapService = getIAPService();
      const result = await iapService.getPurchaseHistoryAsync();
      if (result.responseCode === iapService.IAPResponseCode.OK && result.results) {
        const hasPremium = result.results.some(
          (purchase: any) => purchase.productId === PRODUCT_IDS.PREMIUM_PACK
        );
        if (hasPremium) {
          await userService.setPremium("lifetime");
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Manually trigger premium restoration check
   * This can be called from other parts of the app when needed
   */
  async triggerPremiumRestoration(): Promise<boolean> {
    try {
      console.log("🔄 Manually triggering premium restoration...");
      return await this.restorePurchases();
    } catch (error) {
      console.error("❌ Manual premium restoration failed:", error);
      return false;
    }
  }

  /**
   * Clear premium status from local storage (for testing purposes)
   * This allows developers to test the purchase flow again
   */
  async clearPremiumStatus(): Promise<void> {
    try {
      console.log("🧹 Clearing premium status for testing...");
      
      // Clear from AsyncStorage directly to bypass userService restrictions
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem("userTier");
      
      // Force reset the userService internal state for testing
      // This bypasses the normal downgrade restrictions
      userService.forceResetForTesting();
      
      console.log("✅ Premium status cleared successfully");
    } catch (error) {
      console.error("❌ Failed to clear premium status:", error);
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
