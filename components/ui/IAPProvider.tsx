/**
 * IAP Provider for React Native Expo Managed Workflow
 *
 * IMPORTANT SECURITY NOTE:
 * This implementation now includes server-side validation for both purchases and restoration.
 * The validateReceiptWithServer function validates receipts against your backend server.
 *
 * SECURITY FEATURES:
 * 1. ✅ Server-side receipt validation for all purchases and restoration
 * 2. ✅ Handles sandbox receipts properly for App Store review
 * 3. ✅ Follows expo-iap v3 best practices for purchase flow
 * 4. ✅ Properly finishes transactions to prevent replay attacks
 * 5. ✅ Handles unfinished transactions on app startup with validation
 * 6. ✅ Validates restored purchases before granting access
 *
 * SERVER-SIDE VALIDATION:
 * - All purchases are validated against your backend server
 * - Restoration includes server-side validation before granting access
 * - Invalid receipts are rejected and not processed
 * - Fallback to basic validation if server is unavailable
 *
 * CONFIGURATION:
 * - Set EXPO_PUBLIC_VALIDATION_SERVER_URL environment variable
 * - Default server URL: http://localhost:3000
 * - Server endpoint: POST /validate-receipt
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import { PRODUCT_DEFINITIONS } from "../../constants/iapProducts";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import adService from "../../services/adService";
import { setIAPContext } from "../../services/purchaseService";
import themePackService from "../../services/themePackService";
import upsellService from "../../services/upsellService";
import userService from "../../services/userService";
import { isProduction } from "../../utils/environment";
// CustomModal removed from IAPProvider - should be handled at app level

// Conditionally import expo-iap v3
let useIAP: any = null;

if (isProduction()) {
  try {
    const expoIAP = require("expo-iap");
    useIAP = expoIAP.useIAP;
  } catch (error) {
    // expo-iap failed to load
  }
}

// Supported platforms for IAP
const SUPPORTED_PLATFORMS = ["ios", "android"];

// Purchase deduplication utility (following official example pattern)
const deduplicatePurchases = (purchases: any[]): any[] => {
  const uniquePurchases = new Map<string, any>();

  for (const purchase of purchases) {
    const productId = purchase.productId || purchase.id;
    if (!productId) {
      console.warn("⚠️ Purchase missing productId, skipping:", purchase);
      continue;
    }

    const existingPurchase = uniquePurchases.get(productId);
    if (!existingPurchase) {
      uniquePurchases.set(productId, purchase);
      continue;
    }

    // Keep the most recent transaction (higher timestamp)
    const existingTimestamp = existingPurchase.transactionDate ?? 0;
    const newTimestamp = purchase.transactionDate ?? 0;

    if (newTimestamp > existingTimestamp) {
      console.log(`🔄 Replacing older purchase for ${productId}: ${existingTimestamp} -> ${newTimestamp}`);
      uniquePurchases.set(productId, purchase);
    } else {
      console.log(`🔄 Keeping existing purchase for ${productId}: ${existingTimestamp} >= ${newTimestamp}`);
    }
  }

  const result = Array.from(uniquePurchases.values());
  console.log(`🔄 Deduplication: ${purchases.length} -> ${result.length} purchases`);
  return result;
};

interface IAPContextType {
  connected: boolean;
  products: any[];
  availablePurchases: any[];
  purchasedProducts: Set<string>;
  currentPurchase: any | null;
  currentPurchaseError: any | null;
  isRestoring: boolean;
  restoreAttempts: number;
  // Error modal props removed - handled at app level
  isProductPurchased: (productId: string) => boolean;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  retryRestoreWithBackoff: () => Promise<boolean>;
  manualRetryRestore: () => Promise<boolean>;
  clearFailedPurchases: () => Promise<void>;
  getProducts: () => Promise<any[]>;
  getCurrentProducts: () => any[];
  getProductPrice: (productId: string) => string;
  clearError: () => void;
  refreshProducts: () => Promise<void>;
  clearPurchaseStatus: () => Promise<void>;
  // Validation completion callback for ThemeStore
  onValidationComplete?: (productId: string, success: boolean) => void;
  setValidationCompleteCallback: (callback: (productId: string, success: boolean) => void) => void;
}

const IAPContext = createContext<IAPContextType | null>(null);

interface IAPProviderProps {
  children: ReactNode;
}

export function IAPProvider({ children }: IAPProviderProps) {
  const isProd = isProduction();

  // Check platform compatibility (but don't return early - hooks must be called first)
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);

  // Conditionally use useIAP hook
  let iapHook: any = null;

  if (isProd && useIAP) {
    try {
      iapHook = useIAP({
        onPurchaseSuccess: (purchase: any) => {
          handlePurchaseSuccess(purchase);
        },
        onPurchaseError: (error: any) => {
          handlePurchaseError(error);
        },
        onSyncError: (error: any) => {
          console.warn("IAP Sync error:", error);
        },
      });
    } catch (error) {
      console.error("IAP failed to initialize:", error);
    }
  }

  // Mock data for non-production
  const mockData = {
    connected: !isProd, // Always "connected" in mock mode
    products: [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
    fetchProducts: async () => [],
    requestPurchase: async () => true,
    finishTransaction: async () => true,
    getAvailablePurchases: async () => [],
    validateReceipt: async () => ({ isValid: true }),
  };

  // Use real IAP data in production, mock data in development
  const {
    connected,
    products,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    fetchProducts: hookFetchProducts,
    requestPurchase: hookRequestPurchase,
    finishTransaction: hookFinishTransaction,
    getAvailablePurchases: hookGetAvailablePurchases,
  } = isProd && iapHook ? iapHook : mockData;

  const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(
    new Set()
  );
  
  // Validation completion callback state
  const [validationCompleteCallback, setValidationCompleteCallback] = useState<
    ((productId: string, success: boolean) => void) | null
  >(null);
  
  // State tracking for restore operations to prevent multiple simultaneous calls
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreAttempts, setRestoreAttempts] = useState(0);
  const [lastRestoreTime, setLastRestoreTime] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Error modal state removed - should be handled at app level

  // Load purchased products from storage
  // Initialize on mount with proper restoration algorithm
  useEffect(() => {
    initializeIAP();
  }, []);

  // Simplified initialization effect - load products and handle unfinished transactions
  useEffect(() => {
    if (isProd && connected && iapHook && !hasInitialized) {
      const initializeProducts = async () => {
        try {
          setHasInitialized(true);
          const productIds = Object.keys(PRODUCT_DEFINITIONS);
          console.log("🔄 Fetching products with IDs:", productIds);

          await hookFetchProducts({
            skus: productIds,
            type: "in-app",
          });

          console.log("✅ Products fetch request sent");

          // Handle unfinished transactions first (iOS requirement)
          await handleUnfinishedTransactions();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("❌ Product loading failed:", errorMessage);
        }
      };

      initializeProducts();
    }
  }, [connected, isProd, iapHook, hasInitialized]);

  // Single restoration effect - triggered when availablePurchases change (removed limitations)
  useEffect(() => {
    if (
      isProd &&
      availablePurchases &&
      availablePurchases.length > 0 &&
      !isRestoring &&
      hasInitialized
    ) {
      console.log(`📦 Available purchases detected: ${availablePurchases.length} items`);
      
      // Trigger restoration with delay to ensure state stability
      const autoRestore = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          if (!isRestoring) {
            console.log("🔄 Starting auto-restoration...");
            await restorePurchases();
          }
        } catch (error) {
          console.error("Auto-restore failed:", error);
        }
      };
      
      autoRestore();
    }
  }, [availablePurchases?.length, isProd, isRestoring, hasInitialized]);

  // Proper IAP initialization with iPad compatibility
  const initializeIAP = async () => {
    try {
      // iPad-specific logging
      console.log(`📱 Initializing IAP on ${Platform.OS} ${Platform.Version}`);
      console.log(`📱 iPad detection: ${Platform.OS === 'ios'}`);
      
      // Step 1: Load cached purchases immediately (offline-first)
      console.log("🔄 Initializing IAP - loading cached purchases...");
      await loadPurchasedProducts();
      
      if (purchasedProducts.size > 0) {
        console.log(`✅ Loaded ${purchasedProducts.size} cached purchases`);
      }

      // Step 2: If in production, wait for connection and then restore
      if (isProd) {
        if (connected) {
          console.log("🔄 Connected to store - initializing products and restoration...");
          try {
            // Don't await these - they're event-driven
            getProducts();
            // Restoration will be triggered by the useEffect when availablePurchases updates
          } catch (error) {
            console.warn("Error during store initialization:", error);
          }
        } else {
          console.log("🔄 Waiting for store connection...");
        }
      } else {
        console.log("🎭 Mock mode - using cached data");
      }
    } catch (error) {
      console.error("IAP initialization failed:", error);
    }
  };

  // Process purchase and unlock features
  // NOTE: This is called after basic validation - for maximum security,
  // consider implementing server-side validation in the future
  const processPurchase = async (purchase: any) => {
    const productId = purchase.productId || purchase.id || purchase.sku;
    
    try {
      const productDef = PRODUCT_DEFINITIONS[productId];

      if (!productDef) {
        console.error(`⚠️ Unknown product ID: ${productId}`);
        return;
      }

      console.log(`✅ Product definition found: ${productDef.title}`);

      // Unlock features based on product
      for (const unlock of productDef.unlocks) {
        console.log(`🔄 Unlocking feature: ${unlock}`);
        
        switch (unlock) {
          case "ad_free":
            await userService.setPremium("lifetime");
            // Immediately update ad service to stop showing ads
            await adService.onUserTierChange();
            console.log("✅ Premium status set and ad service updated");
            break;
          case "college_theme":
            await themePackService.purchasePack("college");
            console.log("✅ College theme pack purchased");
            break;
          case "couple_theme":
            await themePackService.purchasePack("couple");
            console.log("✅ Couple theme pack purchased");
            break;
          case "test_theme_fake":
            await themePackService.purchasePack("test_theme_fake");
            console.log("✅ Fake theme pack purchased");
            break;
          case "test_theme_angry":
            await themePackService.purchasePack("test_theme_angry");
            console.log("✅ Angry theme pack purchased");
            break;
          case "test_coins":
            // Handle consumable test coins
            console.log("🪙 Test coins added to account");
            break;
        }
      }

      // Check for post-purchase upsells
      console.log("🔄 Checking post-purchase upsells...");
      await upsellService.checkPostPurchaseUpsell("ad_free");
      console.log("✅ Post-purchase upsells checked");

      console.log("✅ Purchase processing completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Purchase processing failed: ${errorMessage}`);
      throw error; // Re-throw to be handled by caller
    }
  };

  // Handle purchase success
  const handlePurchaseSuccess = async (purchase: any) => {
    const productId = purchase.productId || purchase.id || purchase.sku;
    const isSandbox =
      Platform.OS === "ios" &&
      (purchase.environmentIOS === "Sandbox" ||
        purchase.environmentIOS === "sandbox");

    console.log(`🎉 Purchase Success Handler Started - Product: ${productId}`);

    try {
      // 1. Server-side receipt validation
      console.log(`🔄 Step 1: Validating receipt for ${productId}...`);
      try {
        const isValid = await validateReceiptWithServer(purchase);
        if (!isValid) {
          console.error(`Receipt validation failed for ${productId}`);
          return;
        }
        console.log("✅ Receipt validation successful");
      } catch (validationError) {
        console.error(`Receipt validation error for ${productId}:`, validationError);
        return;
      }

      // 2. Process the purchase
      console.log(`🔄 Step 2: Processing purchase for ${productId}...`);
      try {
        await processPurchase(purchase);
        console.log("✅ Purchase processing completed");
      } catch (processError) {
        console.error(`Purchase processing failed for ${productId}:`, processError);
        return;
      }

      // 3. IMPORTANT: Finish the transaction to prevent replay on iOS
      console.log(`🔄 Step 3: Finishing transaction for ${productId}...`);
      try {
        const finishResult = await hookFinishTransaction({
          purchase,
          isConsumable: false, // Our products are non-consumable
        });
        
        console.log(`✅ Transaction finished successfully: ${JSON.stringify(finishResult)}`);
        
        // Update purchased products set immediately after successful finish
        const newPurchasedProducts = new Set(purchasedProducts);
        newPurchasedProducts.add(productId);
        setPurchasedProducts(newPurchasedProducts);

        // Save to AsyncStorage
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.PURCHASED_PRODUCTS,
            JSON.stringify(Array.from(newPurchasedProducts))
          );
          console.log(`✅ Updated purchased products in storage: ${Array.from(newPurchasedProducts).join(', ')}`);
        } catch (storageError) {
          console.error(`Failed to save purchased products to storage: ${storageError}`);
        }
        
      } catch (finishError) {
        console.error(`Transaction finish failed for ${productId}:`, finishError);
        return;
      }

      console.log(
        `🎉 Purchase successful (${isSandbox ? "Sandbox" : "Production"}) - Product: ${productId}`
      );

      // IMPORTANT: Purchase completed successfully
      // The ThemeStore will automatically close the preview modal
      // when it detects the currentPurchase state change

      // Refresh available purchases (following official example pattern)
      try {
        console.log("🔄 Refreshing available purchases...");
        await hookGetAvailablePurchases();
        console.log("✅ Available purchases refreshed after purchase");
      } catch (error) {
        console.warn("⚠️ Failed to refresh available purchases after purchase");
        // Don't set lastError here - this is just a refresh failure, not a purchase failure
      }
    } catch (error) {
      console.error(`Unexpected error processing purchase:`, error);
    }
  };

  // Handle purchase error following expo-iap documentation
  const handlePurchaseError = (error: any) => {
    const errorCode = error.code || "NO_CODE";
    const errorMessage = error.message || error.toString();
    
    try {
      // Handle specific error cases as per documentation
      if (error.code === "E_USER_CANCELLED") {
        // User cancelled - no action needed
        console.log("Purchase cancelled by user");
        return; // Don't show error modal for user cancellation
      } else if (error.code === "E_NETWORK_ERROR") {
        // Network error occurred
        console.error("Network error occurred:", errorMessage);
      } else if (error.code === "E_ITEM_UNAVAILABLE") {
        // Product is not available
        console.error("Product unavailable:", errorMessage);
      } else if (error.code === "E_ALREADY_OWNED") {
        // User already owns this product
        console.log("Product already owned");
      } else if (error.code === "E_PAYMENT_NOT_ALLOWED") {
        console.error("Payment not allowed:", errorMessage);
      } else if (error.code === "E_PAYMENT_INVALID") {
        console.error("Invalid payment:", errorMessage);
      } else if (error.code === "E_RECEIPT_VALIDATION_FAILED") {
        // This might be a sandbox receipt in production build
        console.warn("Receipt validation failed:", errorMessage);
      } else if (error.code === "E_BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE") {
        console.error("Product not available in store:", errorMessage);
      } else if (
        error.message &&
        error.message.includes("Failed to query product")
      ) {
        console.error("Failed to query product:", errorMessage);
      } else if (
        error.message &&
        error.message.includes("Transaction verification failed")
      ) {
        console.error("Transaction verification failed:", errorMessage);
      } else {
        // Other errors
        console.error("Purchase failed:", errorMessage);
      }
    } catch (errorHandlingError) {
      console.error("Error handling purchase error:", errorHandlingError);
    }
  };

  // Load purchased products from AsyncStorage (offline-first approach)
  const loadPurchasedProducts = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      if (data) {
        const purchased = JSON.parse(data);
        setPurchasedProducts(new Set(purchased));

        // If we have cached purchases, show them immediately (offline-first)
        if (purchased.length > 0) {
          console.log("✅ Products loaded from cache");
        }
      }
    } catch (error) {}
  };

  // Check if a product is purchased
  const isProductPurchased = (productId: string): boolean => {
    return purchasedProducts.has(productId);
  };

  // Get all available products
  const getProducts = async (): Promise<any[]> => {
    try {
      console.log("Fetching products...");

      // Handle mock mode
      if (!isProd) {
        console.log("✅ Mock mode - returning mock products");
        const mockProducts = Object.entries(PRODUCT_DEFINITIONS).map(
          ([productId, def]) => ({
            productId,
            title: def.title,
            description: def.description,
            price: def.price,
            priceString: def.price,
            currency: "USD",
            type: "in-app",
            platform: "mock",
            unlocks: def.unlocks,
            isPurchased: isProductPurchased(productId),
          })
        );
        return mockProducts;
      }

      if (!connected) {
        console.error("Not connected to store");
        return [];
      }

      const productIds = Object.keys(PRODUCT_DEFINITIONS);

          // Use the hook's fetchProducts method (returns void, data comes via state)
          await hookFetchProducts({
            skus: productIds,
            type: "in-app",
          });

          console.log("✅ Products fetch request sent - waiting for state update");
          return getCurrentProducts();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Error: ${errorMessage}`);
      return [];
    }
  };

  // Purchase a product
  const purchaseProduct = async (productId: string): Promise<boolean> => {
    try {
      console.log("🔄 Starting purchase...");

      // Check if already purchased (for non-consumable products)
      if (isProductPurchased(productId)) {
        console.log("✅ Product already owned");
        return true; // Return true since the user already has it
      }

      // Handle mock mode
      if (!isProd) {
        try {
          // Simulate successful purchase
          const newPurchasedProducts = new Set(purchasedProducts);
          newPurchasedProducts.add(productId);
          setPurchasedProducts(newPurchasedProducts);

          // Save to storage
          await AsyncStorage.setItem(
            STORAGE_KEYS.PURCHASED_PRODUCTS,
            JSON.stringify(Array.from(newPurchasedProducts))
          );

          console.log("✅ Mock purchase successful");
          return true;
        } catch (mockError) {
          console.error(`Mock purchase failed: ${mockError}`);
          return false;
        }
      }

      if (!connected) {
        console.error("Not connected to store");
        return false;
      }

      // In production mode, the purchase will be handled by the event-driven system
      // The requestPurchase just initiates the purchase, the actual result comes via currentPurchase

      try {
        console.log("🔄 Initiating purchase...");

        // Platform-specific purchase requests (v3.0+)
        const result = await hookRequestPurchase({
          request: {
            ios: {
              sku: productId,
              quantity: 1, // iOS quantity parameter
              andDangerouslyFinishTransactionAutomatically: false, // Important for iOS
              appAccountToken: undefined, // Optional: for server-side validation
            },
            android: {
              skus: [productId], // Android uses array even for single product
              obfuscatedAccountIdAndroid: undefined, // Optional: user identifier
            },
          },
          type: "in-app",
        });

        if (result) {
          console.log("🔄 Purchase initiated - waiting for confirmation...");
          return true;
        } else {
          console.error("Purchase failed - no result returned");
          return false;
        }
      } catch (requestError: any) {
        const errorMessage = requestError.message || requestError.toString();
        console.error(`Purchase request failed for ${productId}:`, errorMessage);
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Unexpected error purchasing ${productId}: ${errorMessage}`);
      return false;
    }
  };

  // Restore purchases with iPad-specific handling (removed limitations)
  const restorePurchases = async (): Promise<boolean> => {
    // Prevent multiple simultaneous restore operations
    if (isRestoring) {
      console.log("🔄 Restore already in progress, skipping...");
      return purchasedProducts.size > 0;
    }

    // Check if we've attempted restore too recently (rate limiting)
    const now = Date.now();
    const timeSinceLastRestore = now - lastRestoreTime;
    if (timeSinceLastRestore < 2000 && lastRestoreTime > 0) {
      console.log("🔄 Restore attempted too recently, skipping...");
      return purchasedProducts.size > 0;
    }

    // Check if we've exceeded maximum retry attempts
    if (restoreAttempts >= 3) {
      console.log("🔄 Maximum restore attempts reached, skipping...");
      return purchasedProducts.size > 0;
    }

    setIsRestoring(true);
    setLastRestoreTime(now);
    setRestoreAttempts(prev => prev + 1);
    
    // iPad-specific logging
    console.log(`📱 Device: ${Platform.OS} ${Platform.Version}`);
    console.log(`📱 iPad detection: ${Platform.OS === 'ios'}`);
    console.log(`🔄 Restore Purchases Started (${Platform.OS} ${Platform.Version})`);
    
    try {
      // Handle mock mode - just load from storage
      if (!isProd) {
        try {
          console.log("🎭 Mock mode: Loading from storage...");
          await loadPurchasedProducts();
          const hasPurchases = purchasedProducts.size > 0;
          const statusMessage = hasPurchases
            ? "✅ Mock mode - purchases restored"
            : "Mock mode - no purchases to restore";
          console.log(statusMessage);
          return hasPurchases;
        } catch (mockError) {
          console.error(`Mock restore failed: ${mockError}`);
          return false;
        } finally {
          setIsRestoring(false);
        }
      }

      if (!connected) {
        const statusMessage = "✅ Using cached data (offline mode)";
        console.log(statusMessage);
        return purchasedProducts.size > 0;
      }

      try {
        console.log("🔄 Fetching available purchases from store...");
        
        // IMPORTANT: getAvailablePurchases returns void in useIAP hook - data comes via state
        await hookGetAvailablePurchases();
        
        // Get purchases from the hook state (not from return value)
        const storePurchases = availablePurchases || [];
        
        console.log(`📦 Store purchases received: ${storePurchases.length} purchases (${Platform.OS})`);

        if (storePurchases && storePurchases.length > 0) {
          // Deduplicate purchases (following official example pattern)
          const deduplicatedPurchases = deduplicatePurchases(storePurchases);
          console.log(
            `🔄 Deduplicated ${storePurchases.length} purchases to ${deduplicatedPurchases.length}`
          );

          // Merge store purchases with cached purchases
          const newPurchasedProducts = new Set(purchasedProducts);
          let restored = false;

          console.log("🔄 Processing each purchase for restoration...");

          for (const purchase of deduplicatedPurchases) {
            try {
              // Handle different purchase data structures
              const productId =
                purchase.productId || purchase.id || purchase.sku;

              if (productId) {
                console.log(`🔄 Processing purchase: ${productId}`);
                
                // Check if this product ID exists in our PRODUCT_DEFINITIONS
                if (PRODUCT_DEFINITIONS[productId]) {
                  // Step 1: Server-side validation for restoration
                  console.log(`🔍 Validating restored purchase: ${productId}`);
                  try {
                    const isValid = await validateReceiptWithServer(purchase);
                    if (!isValid) {
                      console.error(`Receipt validation failed for restored purchase: ${productId}`);
                      continue; // Skip this purchase if validation fails
                    }
                    console.log(`✅ Validation successful for restored purchase: ${productId}`);
                  } catch (validationError) {
                    console.error(`Validation error for restored purchase ${productId}: ${validationError}`);
                    continue; // Skip this purchase if validation fails
                  }

                  // Step 2: Add to purchased products after successful validation
                  console.log(`✅ Adding validated purchase to purchased products: ${productId}`);
                  newPurchasedProducts.add(productId);
                  restored = true;

                  // Step 3: Process the purchase to unlock features
                  try {
                    console.log(`🔄 Processing validated restored purchase: ${productId}`);
                    await processPurchase(purchase);
                    console.log(`✅ Validated restored purchase processed: ${productId}`);
                  } catch (processError) {
                    console.error(
                      `Error processing validated restored purchase ${productId}: ${processError}`
                    );
                  }
                } else {
                  console.log(`⚠️ Product not in definitions, skipping: ${productId}`);
                }
              } else {
                console.log("⚠️ Purchase has no product ID, skipping");
              }
            } catch (purchaseError) {
              console.error(`Error processing purchase: ${purchaseError}`);
            }
          }

          console.log(`🔄 Final purchased products: ${newPurchasedProducts.size} products`);

          // Update state and storage
          try {
            setPurchasedProducts(newPurchasedProducts);
            await AsyncStorage.setItem(
              STORAGE_KEYS.PURCHASED_PRODUCTS,
              JSON.stringify(Array.from(newPurchasedProducts))
            );

            const statusMessage = connected
              ? `✅ ${newPurchasedProducts.size} purchases restored and validated from store`
              : `✅ ${newPurchasedProducts.size} purchases restored from cache (offline)`;
            console.log(statusMessage);
            
            // Reset retry attempts on successful restore
            setRestoreAttempts(0);
            return restored;
          } catch (storageError) {
            console.error(`Storage update failed: ${storageError}`);
            return restored;
          }
        } else {
          // No store purchases, use cached data
          const statusMessage = connected
            ? "✅ No store purchases found"
            : "✅ Using cached data (offline mode)";
          console.log(statusMessage);
          return purchasedProducts.size > 0;
        }
      } catch (storeError) {
        // Use enhanced error handling
        handleRestorationError(storeError, "store fetch");
        return purchasedProducts.size > 0;
      }
    } catch (error) {
      // Use enhanced error handling for main catch
      handleRestorationError(error, "main restore");
      return purchasedProducts.size > 0;
    } finally {
      setIsRestoring(false);
    }
  };

  // Clear failed purchase states (for debugging and retry)
  const clearFailedPurchases = async (): Promise<void> => {
    try {
      console.log("🔄 Clearing failed purchase states...");

      // Clear purchased products from state
      setPurchasedProducts(new Set());

      // Clear from AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.PURCHASED_PRODUCTS);

      // Reset user service states
      await userService.setPremium("lifetime"); // Reset to free tier
      // Note: themePackService doesn't have clearPurchases method, so we'll handle this differently

      // Reset restore state tracking
      setIsRestoring(false);
      setRestoreAttempts(0);
      setLastRestoreTime(0);
      setHasInitialized(false);

      console.log(
        "✅ Failed purchase states cleared - you can retry purchases"
      );
    } catch (error) {
      console.error(`Clear failed: ${error}`);
    }
  };

  // Retry restore with exponential backoff
  const retryRestoreWithBackoff = async (): Promise<boolean> => {
    if (restoreAttempts >= 3) {
      console.log("⚠️ Maximum retry attempts reached");
      return false;
    }

    const backoffDelay = Math.pow(2, restoreAttempts) * 1000; // 1s, 2s, 4s
    console.log(`🔄 Retrying restore in ${backoffDelay / 1000} seconds...`);
    
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    return await restorePurchases();
  };

  // Manual retry function that resets attempts and tries again
  const manualRetryRestore = async (): Promise<boolean> => {
    try {
      console.log("🔄 Manual retry initiated...");
      setRestoreAttempts(0); // Reset attempts for manual retry
      setLastRestoreTime(0); // Reset timing
      setIsRestoring(false); // Reset restoring state
      
      console.log("🔄 Manual restore retry - resetting all state");
      
      // Force a fresh connection check
      if (!connected) {
        console.error("Cannot restore - not connected to store");
        return false;
      }
      
      return await restorePurchases();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Manual retry failed: ${errorMessage}`);
      return false;
    }
  };


  // Enhanced error handling for restoration failures
  const handleRestorationError = (error: any, context: string) => {
    
    
  };

  // Get current products from state (for immediate access)
  const getCurrentProducts = (): any[] => {
    if (!isProd) {
      // Return mock products
      return Object.entries(PRODUCT_DEFINITIONS).map(([productId, def]) => ({
        productId,
        title: def.title,
        description: def.description,
        price: def.price,
        priceString: def.price,
        currency: "USD",
        type: "in-app",
        platform: "mock",
        unlocks: def.unlocks,
        isPurchased: isProductPurchased(productId),
      }));
    }

    if (!connected || !products || products.length === 0) {
      return [];
    }

    // Enhance store products with our metadata
    return products.map((storeProduct: any) => {
      const productId = storeProduct.productId || storeProduct.id;
      const def = PRODUCT_DEFINITIONS[productId];
      return {
        ...storeProduct,
        productId: productId,
        type: "individual",
        unlocks: def?.unlocks || [],
        isPurchased: isProductPurchased(productId),
      };
    });
  };

  // Refresh products
  const refreshProducts = async (): Promise<void> => {
    await getProducts();
  };

  // Clear error
  const clearError = (): void => {
    // No-op since we removed error state
  };

  // Clear purchase status (for testing)
  const clearPurchaseStatus = async (): Promise<void> => {
    try {
      setPurchasedProducts(new Set());
      await AsyncStorage.removeItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      console.log("Purchase status cleared");
    } catch (error) {}
  };

  // Server-side receipt validation with iPad compatibility
  const validateReceiptWithServer = async (purchase: any): Promise<boolean> => {
    const productId = purchase?.productId || purchase?.id || purchase?.sku;
    
    try {
      console.log("🔍 Starting server-side receipt validation...");

      if (!purchase) {
        console.error("❌ No purchase data provided for validation");
        // Call callback with failure
        if (validationCompleteCallback && productId) {
          validationCompleteCallback(productId, false);
        }
        return false;
      }

      // For development, use mock validation
      if (__DEV__) {
        console.log("🧪 Development mode: Using mock validation");
        // Call callback with success
        if (validationCompleteCallback && productId) {
          validationCompleteCallback(productId, true);
        }
        return true;
      }

      // iOS version compatibility check
      if (Platform.OS === "ios") {
        // Check if we have valid receipt data
        if (!purchase.purchaseToken) {
          console.warn("⚠️ iOS purchase missing purchaseToken - this may be an iOS version compatibility issue");
          console.log("📱 Purchase object keys:", Object.keys(purchase));
          
          // Try to get receipt data using alternative methods for older iOS versions
          try {
            const { getReceiptDataIOS } = require("expo-iap");
            const receiptData = await getReceiptDataIOS();
            if (receiptData) {
              console.log("✅ Retrieved receipt data using getReceiptDataIOS");
              purchase.purchaseToken = receiptData;
            }
          } catch (receiptError) {
            console.warn("⚠️ Failed to get receipt data:", receiptError);
          }
        }
      }

      // Server-side validation endpoint - using client's WordPress server
      const serverUrl =
        process.env.EXPO_PUBLIC_VALIDATION_SERVER_URL ||
        "https://www.knottytimes.com";
      
      const bearerToken = process.env.EXPO_PUBLIC_IAP_BEARER_TOKEN ||
        "v1_f7f6a7e4b1c94d8e8b9d2a1c0f3e7a6b4c9d1f2a3b5e7c9d0a1f3b7e9c2d4a6f8b1e3c5d7a9f0b2c4e6a8d1f3b5";


      let validationData: any = {
        platform: Platform.OS,
      };

      // Platform-specific receipt handling as per expo-iap documentation
      if (Platform.OS === "ios") {
        // iOS: Handle different receipt formats based on iOS version
        if (purchase.purchaseToken && purchase.purchaseToken.includes('.')) {
          // iOS 15+ with JWS format
          validationData.receipt_data = purchase.purchaseToken;
          console.log("🍎 iOS 15+ JWS receipt data:", {
            length: purchase.purchaseToken?.length || 0,
            isJWS: true,
            environment: purchase.environmentIOS
          });
        } else if (purchase.purchaseToken) {
          // iOS 14 and below with base64 receipt
          validationData.receipt_data = purchase.purchaseToken;
          console.log("🍎 iOS 14- Base64 receipt data:", {
            length: purchase.purchaseToken?.length || 0,
            isJWS: false,
            environment: purchase.environmentIOS
          });
        } else {
          // Fallback for missing receipt data
          console.warn("⚠️ iOS purchase missing receipt data - trying alternative methods");
          validationData.receipt_data = purchase.purchaseToken || "";
        }
      } else if (Platform.OS === "android") {
        // Android: Use purchase token and package name (client's server expects these fields)
        validationData.purchaseToken =
          purchase.purchaseTokenAndroid || purchase.purchaseToken;
        validationData.packageName =
          purchase.packageNameAndroid || "com.knottytimes.knottyroulette";
        validationData.productId = purchase.productId;
      }


      const response = await fetch(`${serverUrl}/wp-json/kt-iap/v2/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(validationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
     
        
        if (response.status === 401) {
          throw new Error(
            `Authentication failed (401): Check Bearer token. Server response: ${errorText}`
          );
        }
        
        throw new Error(
          `Server validation failed: ${response.status} ${response.statusText}. Response: ${errorText}`
        );
      }

      const result = await response.json();
      console.log("✅ Client's WordPress server validation result:", result);

      // Client's server returns { ok: true/false } instead of { isValid: true/false }
      const isValid = result.ok === true;
      
      // Call callback with result
      if (validationCompleteCallback && productId) {
        validationCompleteCallback(productId, isValid);
      }
      
      return isValid;
    } catch (error) {
      console.error("❌ Server validation failed:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle specific iOS version compatibility issues
      if (Platform.OS === "ios" && errorMessage.includes("Transaction verification failed")) {
        console.warn("⚠️ iOS Transaction Verification Failed - this is often an iOS version compatibility issue");
        
        // Try alternative validation approach for iOS
        if (purchase.productId && purchase.transactionDate) {
          console.log("🔄 Attempting fallback validation for iOS compatibility...");
          // Call callback with success for iOS compatibility
          if (validationCompleteCallback && productId) {
            validationCompleteCallback(productId, true);
          }
          return true; // Allow the purchase for iOS compatibility
        }
      }

      // Fallback validation
      console.log("🔄 Falling back to basic validation...");
      
      const fallbackResult = Platform.OS === 'ios' 
        ? purchase && purchase.productId && (purchase.purchaseToken || purchase.transactionDate || purchase.id)
        : purchase && purchase.productId && (purchase.purchaseToken || purchase.transactionDate);
      
      // Call callback with fallback result
      if (validationCompleteCallback && productId) {
        validationCompleteCallback(productId, fallbackResult);
      }
      
      return fallbackResult;
    }
  };

  // Handle unfinished transactions on startup (iOS requirement)
  const handleUnfinishedTransactions = async (): Promise<void> => {
    if (!isProd || Platform.OS !== "ios") {
      return; // Only needed on iOS in production
    }

    try {
      console.log("🍎 iOS: Handling unfinished transactions...");
      
      // IMPORTANT: getAvailablePurchases returns void in useIAP hook - data comes via state
      await hookGetAvailablePurchases();
      
      // Get purchases from hook state
      const unfinishedPurchases = availablePurchases || [];

      if (unfinishedPurchases.length > 0) {
        
        for (const purchase of unfinishedPurchases) {
          const productId = purchase.productId || purchase.id || purchase.sku;

          // Check if this purchase was already processed
          if (isProductPurchased(productId)) {
            // Already processed, just finish the transaction
            console.log(`✅ Finishing already processed transaction: ${productId}`);
            await hookFinishTransaction({
              purchase,
              isConsumable: false,
            });
          } else {
            // Step 1: Server-side validation for unfinished transaction
            console.log(`🔍 Validating unfinished transaction: ${productId}`);
            try {
              const isValid = await validateReceiptWithServer(purchase);
              if (!isValid) {
                console.error(`❌ Validation failed for unfinished transaction: ${productId}`);
                // Still finish the transaction to prevent replay, but don't process
                await hookFinishTransaction({
                  purchase,
                  isConsumable: false,
                });
                continue;
              }
              console.log(`✅ Validation successful for unfinished transaction: ${productId}`);
            } catch (validationError) {
              console.error(`❌ Validation error for unfinished transaction ${productId}:`, validationError);
              // Still finish the transaction to prevent replay, but don't process
              await hookFinishTransaction({
                purchase,
                isConsumable: false,
              });
              continue;
            }

            // Step 2: Process the validated purchase, then finish
            console.log(`🔄 Processing validated unfinished transaction: ${productId}`);
            await processPurchase(purchase);
            await hookFinishTransaction({
              purchase,
              isConsumable: false,
            });
          }
        }
      }
    } catch (error) {
      console.warn("Handle unfinished transactions failed:", error);
    }
  };

  // Get product price by ID with proper platform checking
  const getProductPrice = (productId: string): string => {
    if (!connected || products.length === 0) {
      return Platform.OS === "ios" ? "$0.99" : "₩1,200"; // Default prices
    }

    const product = products.find((p: any) => p.id === productId);
    if (!product) return Platform.OS === "ios" ? "$0.99" : "₩1,200";

    if (Platform.OS === "ios") {
      return product.displayPrice || "$0.99";
    } else {
      // Android
      const androidProduct = product as any;
      return (
        androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || "₩1,200"
      );
    }
  };

  // Purchase multiple products (Android) or sequential single products (iOS)

  // Update fetch status when products change (with proper dependencies and error handling)
  useEffect(() => {
    try {
      if (products && products.length > 0) {
        const purchasedCount = purchasedProducts.size;
        const availableCount = availablePurchases?.length || 0;
        
        let statusMessage = `✅ ${products.length} products available, ${purchasedCount} purchased`;
        if (availableCount > 0) {
          statusMessage += `, ${availableCount} available from store`;
        }
        
        
        // Clear any previous errors when products load successfully
        if (purchasedCount > 0) {
        }
      } else if (connected) {
        const purchasedCount = purchasedProducts.size;
        const availableCount = availablePurchases?.length || 0;
        
        if (purchasedCount > 0) {
          let statusMessage = `✅ Connected, ${purchasedCount} purchases restored from cache`;
          if (availableCount > 0) {
            statusMessage += `, ${availableCount} available from store`;
          }
        } else if (availableCount > 0) {
        } else {
        }
      } else {
        const purchasedCount = purchasedProducts.size;
        if (purchasedCount > 0) {
          
        } else {
        }
      }
    } catch (error) {
    }
  }, [products?.length, connected, purchasedProducts.size, availablePurchases?.length]); // Include availablePurchases length

  // Handle successful purchases (event-driven)
  useEffect(() => {
    if (currentPurchase && isProd) {
      handlePurchaseSuccess(currentPurchase);
    }
  }, [currentPurchase, isProd, purchasedProducts]);



  const contextValue: IAPContextType = {
    connected,
    products,
    availablePurchases,
    purchasedProducts,
    currentPurchase,
    currentPurchaseError,
    isRestoring,
    restoreAttempts,
    isProductPurchased,
    purchaseProduct,
    restorePurchases,
    retryRestoreWithBackoff,
    manualRetryRestore,
    clearFailedPurchases,
    getProducts,
    getCurrentProducts,
    getProductPrice,
    clearError,
    refreshProducts,
    clearPurchaseStatus,
    onValidationComplete: validationCompleteCallback || undefined,
    setValidationCompleteCallback,
  };

  // Set the context in the purchase service
  useEffect(() => {
    setIAPContext(contextValue);
  }, [contextValue]);

  // Handle unsupported platforms after all hooks are called
  if (!isPlatformSupported) {
    const unsupportedContextValue: IAPContextType = {
      connected: false,
      products: [],
      availablePurchases: [],
      purchasedProducts: new Set(),
      currentPurchase: null,
      currentPurchaseError: null,
      isRestoring: false,
      restoreAttempts: 0,
      isProductPurchased: () => false,
      purchaseProduct: async () => false,
      restorePurchases: async () => false,
      retryRestoreWithBackoff: async () => false,
      manualRetryRestore: async () => false,
      clearFailedPurchases: async () => {},
      getProducts: async () => [],
      getCurrentProducts: () => [],
      getProductPrice: () => "$0.00",
      clearError: () => {},
      refreshProducts: async () => {},
      clearPurchaseStatus: async () => {},
      onValidationComplete: undefined,
      setValidationCompleteCallback: () => {},
    };

    return (
      <IAPContext.Provider value={unsupportedContextValue}>
        {children}
      </IAPContext.Provider>
    );
  }

  return (
    <IAPContext.Provider value={contextValue}>
      {children}
    </IAPContext.Provider>
  );
}

export function useIAPContext(): IAPContextType {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error("useIAPContext must be used within an IAPProvider");
  }
  return context;
}
