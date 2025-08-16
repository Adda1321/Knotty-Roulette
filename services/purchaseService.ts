import Constants from "expo-constants";
import userService from "./userService";

// Conditionally import InAppPurchases only when not in Expo Go
let InAppPurchases: any;

try {
  // Only import InAppPurchases if we're not in Expo Go
  if (
    Constants.expoConfig?.extra?.useExpoGo !== true &&
    Constants.expoConfig !== undefined
  ) {
    InAppPurchases = require("expo-in-app-purchases");
  }
} catch (error) {
  console.log("🚫 InAppPurchases: Not available in this environment");
}

// Product IDs - these will be configured in App Store/Play Store
const PRODUCT_IDS = {
  PREMIUM_PACK: "knotty_roulette_premium_pack", // $4.99 premium pack
};

// Development testing configuration
const DEV_CONFIG = {
  ENABLE_TEST_PURCHASE: __DEV__, // Enable test purchase in development
  TEST_PURCHASE_DELAY: 2000, // Simulate purchase delay
};

class PurchaseService {
  private isInitialized = false;

  /**
   * Initialize the purchase service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Skip initialization if InAppPurchases is not available (Expo Go)
      if (!InAppPurchases) {
        console.log("🚫 InAppPurchases not available, skipping initialization");
        this.isInitialized = true;
        return;
      }

      // Connect to the store
      await InAppPurchases.connectAsync();

      // Set up purchase listener
      InAppPurchases.setPurchaseListener((result: any) => {
        this.handlePurchaseResult(result);
      });

      // Check for any pending purchases that need acknowledgment
      await this.handlePendingPurchases();

      // Automatically restore premium status if user was previously premium
      await this.autoRestorePremiumStatus();

      this.isInitialized = true;
      console.log("✅ Purchase service initialized");

      if (__DEV__) {
        console.log("🧪 Development mode: Test purchases enabled");
      }
    } catch (error) {
      console.error("❌ Failed to initialize purchase service:", error);
    }
  }

  /**
   * Automatically restore premium status if user was previously premium
   * This ensures users don't lose premium access due to app reinstalls or device changes
   */
  private async autoRestorePremiumStatus(): Promise<void> {
    try {
      // Skip if InAppPurchases is not available
      if (!InAppPurchases) {
        console.log("🚫 InAppPurchases not available, skipping auto-restore");
        return;
      }

      // Only attempt restore if user is currently showing as free
      if (userService.isPremium()) {
        console.log("✅ User is already premium, no restoration needed");
        return;
      }

      console.log("🔍 Auto-restoring premium status...");

      // Check purchase history to see if user has ever purchased premium
      const result = await InAppPurchases.getPurchaseHistoryAsync();

      if (
        result.responseCode === InAppPurchases.IAPResponseCode.OK &&
        result.results
      ) {
        // Check if user has premium purchase in their history
        const hasPremium = result.results.some(
          (purchase: any) => purchase.productId === PRODUCT_IDS.PREMIUM_PACK
        );

        if (hasPremium) {
          console.log(
            "✅ Premium purchase found in history, restoring access..."
          );
          await userService.setPremium("lifetime");
          console.log("✅ Premium status automatically restored");
        } else {
          console.log("ℹ️ No premium purchase found in history");
        }
      } else {
        console.log("⚠️ Could not retrieve purchase history for auto-restore");
      }
    } catch (error) {
      console.error("❌ Auto-restore failed:", error);
      // Don't throw error - this is a background operation that shouldn't break app initialization
    }
  }

  /**
   * Handle purchase results
   */
  private async handlePurchaseResult(result: any): Promise<void> {
    try {
      if (
        result.responseCode === InAppPurchases?.IAPResponseCode?.OK &&
        result.results
      ) {
        const purchases = result.results;
        for (const purchase of purchases) {
          if (purchase.acknowledged) {
            console.log(
              "✅ Purchase already acknowledged:",
              purchase.productId
            );

            // Update user tier to premium
            await userService.setPremium("lifetime");

            // AdService will be automatically notified via tier change listener
            console.log("✅ Purchase completed - user upgraded to premium");
          } else {
            console.log(
              "🔄 New purchase received, acknowledging...",
              purchase.productId
            );

            try {
              // CRITICAL: Acknowledge the purchase to Google Play
              // This prevents automatic refunds after 3 days
              await InAppPurchases.finishTransactionAsync(purchase, true);
              console.log("✅ Purchase acknowledged successfully");

              // Update user tier to premium
              await userService.setPremium("lifetime");

              // AdService will be automatically notified via tier change listener
              console.log("✅ Purchase completed - user upgraded to premium");
            } catch (acknowledgmentError) {
              console.error(
                "❌ Failed to acknowledge purchase:",
                acknowledgmentError
              );
              // Don't update user tier if acknowledgment fails
            }
          }
        }
      } else {
        console.log("⚠️ Purchase result:", result.responseCode);
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
      // Skip if InAppPurchases is not available
      if (!InAppPurchases) {
        console.log(
          "🚫 InAppPurchases not available, skipping pending purchases check"
        );
        return;
      }

      console.log("🔍 Checking for pending purchases...");

      const result = await InAppPurchases.getPurchaseHistoryAsync();

      if (
        result.responseCode === InAppPurchases.IAPResponseCode.OK &&
        result.results
      ) {
        const pendingPurchases = result.results.filter(
          (purchase: any) => !purchase.acknowledged
        );

        if (pendingPurchases.length > 0) {
          console.log(
            `🔄 Found ${pendingPurchases.length} pending purchase(s), processing...`
          );

          for (const purchase of pendingPurchases) {
            if (purchase.productId === PRODUCT_IDS.PREMIUM_PACK) {
              console.log("🔄 Processing pending premium purchase...");
              await this.handlePurchaseResult({
                responseCode: InAppPurchases.IAPResponseCode.OK,
                results: [purchase],
              });
            }
          }
        } else {
          console.log("✅ No pending purchases found");
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
    try {
      await this.initialize();

      // Skip if InAppPurchases is not available
      if (!InAppPurchases) {
        console.log(
          "🚫 InAppPurchases not available, returning mock products for development"
        );

        // Return mock product for development testing
        if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
          console.log("🧪 Returning mock product for development testing");
          return [
            {
              productId: PRODUCT_IDS.PREMIUM_PACK,
              title: "Premium Pack - Ad Free Gaming",
              description:
                "Remove all ads and unlock premium features for the ultimate gaming experience",
              price: "$4.99",
              priceAmountMicros: 4990000,
              priceCurrencyCode: "USD",
            },
          ];
        }

        return [];
      }

      const result = await InAppPurchases.getProductsAsync([
        PRODUCT_IDS.PREMIUM_PACK,
      ]);

      if (
        result.responseCode === InAppPurchases.IAPResponseCode.OK &&
        result.results
      ) {
        console.log("📦 Available products:", result.results);
        return result.results;
      } else {
        console.log("❌ Failed to get products:", result.responseCode);

        // Return mock product for development testing
        if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
          console.log("🧪 Returning mock product for development testing");
          return [
            {
              productId: PRODUCT_IDS.PREMIUM_PACK,
              title: "Premium Pack - Ad Free Gaming",
              description:
                "Remove all ads and unlock premium features for the ultimate gaming experience",
              price: "$4.99",
              priceAmountMicros: 4990000,
              priceCurrencyCode: "USD",
            },
          ];
        }

        return [];
      }
    } catch (error) {
      console.error("❌ Failed to get products:", error);
      return [];
    }
  }

  /**
   * Purchase premium pack
   */
  async purchasePremiumPack(): Promise<boolean> {
    try {
      await this.initialize();

      console.log("🛒 Starting premium pack purchase...");

      // Development testing: simulate purchase
      if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
        console.log("🧪 Development mode: Simulating purchase...");

        // Simulate purchase delay
        await new Promise((resolve) =>
          setTimeout(resolve, DEV_CONFIG.TEST_PURCHASE_DELAY)
        );

        // Simulate successful purchase
        await userService.setPremium("lifetime");
        console.log("✅ Development purchase completed");

        return true;
      }

      // Skip if InAppPurchases is not available
      if (!InAppPurchases) {
        console.log("🚫 InAppPurchases not available, purchase not possible");
        return false;
      }

      // Real purchase flow - will fail if product not configured
      try {
        await InAppPurchases.purchaseItemAsync(PRODUCT_IDS.PREMIUM_PACK);
        return true;
      } catch (purchaseError) {
        console.log(
          "⚠️ Purchase failed (product not configured):",
          purchaseError
        );

        // In development, show helpful message
        if (__DEV__) {
          console.log("💡 To test real purchases:");
          console.log("1. Upload APK to Play Console");
          console.log(
            "2. Create in-app product with ID:",
            PRODUCT_IDS.PREMIUM_PACK
          );
          console.log("3. Set up license testing");
        }

        return false;
      }
    } catch (error) {
      console.error("❌ Purchase failed:", error);
      return false;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      await this.initialize();

      console.log("🔄 Restoring purchases...");

      // Development testing: simulate restoration
      if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
        console.log("🧪 Development mode: Simulating purchase restoration...");

        // Simulate restoration delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if user is already premium (simulate restoration)
        if (userService.isPremium()) {
          console.log("✅ Development restoration: User already premium");
          return true;
        } else {
          console.log("❌ Development restoration: No premium found");
          return false;
        }
      }

      // Skip if InAppPurchases is not available
      if (!InAppPurchases) {
        console.log(
          "🚫 InAppPurchases not available, restoration not possible"
        );
        return false;
      }

      const result = await InAppPurchases.getPurchaseHistoryAsync();

      if (
        result.responseCode === InAppPurchases.IAPResponseCode.OK &&
        result.results
      ) {
        // Check if user has premium purchase
        const hasPremium = result.results.some(
          (purchase: any) => purchase.productId === PRODUCT_IDS.PREMIUM_PACK
        );

        if (hasPremium) {
          console.log("✅ Premium purchase found in history");
          await userService.setPremium("lifetime");
          return true;
        } else {
          console.log("❌ No premium purchase found");
          return false;
        }
      } else {
        console.log("❌ Failed to get purchase history:", result.responseCode);
        return false;
      }
    } catch (error) {
      console.error("❌ Restore failed:", error);
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
      if (this.isInitialized && InAppPurchases) {
        await InAppPurchases.disconnectAsync();
        this.isInitialized = false;
        console.log("🧹 Purchase service cleaned up");
      }
    } catch (error) {
      console.error("❌ Error cleaning up purchase service:", error);
    }
  }
}

// Export singleton instance
const purchaseService = new PurchaseService();
export default purchaseService;
