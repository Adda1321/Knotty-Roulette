import * as InAppPurchases from 'expo-in-app-purchases';
import userService from './userService';

// Product IDs - these will be configured in App Store/Play Store
const PRODUCT_IDS = {
  PREMIUM_PACK: 'knotty_roulette_premium_pack', // $4.99 premium pack
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

      // Connect to the store
      await InAppPurchases.connectAsync();
      
      // Set up purchase listener
      InAppPurchases.setPurchaseListener((result) => {
        this.handlePurchaseResult(result);
      });

      // Check for any pending purchases that need acknowledgment
      await this.handlePendingPurchases();

      this.isInitialized = true;
      console.log('✅ Purchase service initialized');
      
      if (__DEV__) {
        console.log('🧪 Development mode: Test purchases enabled');
      }
    } catch (error) {
      console.error('❌ Failed to initialize purchase service:', error);
    }
  }

  /**
   * Handle purchase results
   */
  private async handlePurchaseResult(result: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>): Promise<void> {
    try {
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        const purchases = result.results;
        for (const purchase of purchases) {
          if (purchase.acknowledged) {
            console.log('✅ Purchase already acknowledged:', purchase.productId);
            
            // Update user tier to premium
            await userService.setPremium('lifetime');
            
            // AdService will be automatically notified via tier change listener
            console.log('✅ Purchase completed - user upgraded to premium');
          } else {
            console.log('🔄 New purchase received, acknowledging...', purchase.productId);
            
            try {
              // CRITICAL: Acknowledge the purchase to Google Play
              // This prevents automatic refunds after 3 days
              await InAppPurchases.finishTransactionAsync(purchase, true);
              console.log('✅ Purchase acknowledged successfully');
              
              // Update user tier to premium
              await userService.setPremium('lifetime');
              
              // AdService will be automatically notified via tier change listener
              console.log('✅ Purchase completed - user upgraded to premium');
            } catch (acknowledgmentError) {
              console.error('❌ Failed to acknowledge purchase:', acknowledgmentError);
              // Don't update user tier if acknowledgment fails
            }
          }
        }
      } else {
        console.log('⚠️ Purchase result:', result.responseCode);
      }
    } catch (error) {
      console.error('❌ Error handling purchase result:', error);
    }
  }

  /**
   * Handle any pending purchases that might have been interrupted
   */
  private async handlePendingPurchases(): Promise<void> {
    try {
      console.log('🔍 Checking for pending purchases...');
      
      const result = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        const pendingPurchases = result.results.filter(purchase => !purchase.acknowledged);
        
        if (pendingPurchases.length > 0) {
          console.log(`🔄 Found ${pendingPurchases.length} pending purchase(s), processing...`);
          
          for (const purchase of pendingPurchases) {
            if (purchase.productId === PRODUCT_IDS.PREMIUM_PACK) {
              console.log('🔄 Processing pending premium purchase...');
              await this.handlePurchaseResult({
                responseCode: InAppPurchases.IAPResponseCode.OK,
                results: [purchase]
              });
            }
          }
        } else {
          console.log('✅ No pending purchases found');
        }
      }
    } catch (error) {
      console.error('❌ Error checking pending purchases:', error);
    }
  }

  /**
   * Get available products
   */
  async getProducts(): Promise<InAppPurchases.IAPItemDetails[]> {
    try {
      await this.initialize();
      
      const result = await InAppPurchases.getProductsAsync([
        PRODUCT_IDS.PREMIUM_PACK
      ]);
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        console.log('📦 Available products:', result.results);
        return result.results;
      } else {
        console.log('❌ Failed to get products:', result.responseCode);
        
        // Return mock product for development testing
        if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
          console.log('🧪 Returning mock product for development testing');
          return [{
            productId: PRODUCT_IDS.PREMIUM_PACK,
            title: 'Premium Pack - Ad Free Gaming',
            description: 'Remove all ads and unlock premium features for the ultimate gaming experience',
            price: '$4.99',
            priceAmountMicros: 4990000,
            priceCurrencyCode: 'USD',
          } as InAppPurchases.IAPItemDetails];
        }
        
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get products:', error);
      return [];
    }
  }

  /**
   * Purchase premium pack
   */
  async purchasePremiumPack(): Promise<boolean> {
    try {
      await this.initialize();
      
      console.log('🛒 Starting premium pack purchase...');
      
      // Development testing: simulate purchase
      if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
        console.log('🧪 Development mode: Simulating purchase...');
        
        // Simulate purchase delay
        await new Promise(resolve => setTimeout(resolve, DEV_CONFIG.TEST_PURCHASE_DELAY));
        
        // Simulate successful purchase
        await userService.setPremium('lifetime');
        console.log('✅ Development purchase completed');
        
        return true;
      }
      
      // Real purchase flow - will fail if product not configured
      try {
        await InAppPurchases.purchaseItemAsync(PRODUCT_IDS.PREMIUM_PACK);
        return true;
      } catch (purchaseError) {
        console.log('⚠️ Purchase failed (product not configured):', purchaseError);
        
        // In development, show helpful message
        if (__DEV__) {
          console.log('💡 To test real purchases:');
          console.log('1. Upload APK to Play Console');
          console.log('2. Create in-app product with ID:', PRODUCT_IDS.PREMIUM_PACK);
          console.log('3. Set up license testing');
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      return false;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    try {
      await this.initialize();
      
      console.log('🔄 Restoring purchases...');
      
      // Development testing: simulate restoration
      if (__DEV__ && DEV_CONFIG.ENABLE_TEST_PURCHASE) {
        console.log('🧪 Development mode: Simulating purchase restoration...');
        
        // Simulate restoration delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user is already premium (simulate restoration)
        if (userService.isPremium()) {
          console.log('✅ Development restoration: User already premium');
          return true;
        } else {
          console.log('❌ Development restoration: No premium found');
          return false;
        }
      }
      
      const result = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        // Check if user has premium purchase
        const hasPremium = result.results.some((purchase: InAppPurchases.InAppPurchase) => 
          purchase.productId === PRODUCT_IDS.PREMIUM_PACK
        );
        
        if (hasPremium) {
          console.log('✅ Premium purchase found in history');
          await userService.setPremium('lifetime');
          return true;
        } else {
          console.log('❌ No premium purchase found');
          return false;
        }
      } else {
        console.log('❌ Failed to get purchase history:', result.responseCode);
        return false;
      }
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return false;
    }
  }

  /**
   * Clean up purchase service
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await InAppPurchases.disconnectAsync();
        this.isInitialized = false;
        console.log('🧹 Purchase service cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up purchase service:', error);
    }
  }
}

// Export singleton instance
const purchaseService = new PurchaseService();
export default purchaseService; 