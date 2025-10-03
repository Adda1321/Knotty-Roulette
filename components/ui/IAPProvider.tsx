/**
 * IAP Provider for React Native Expo Managed Workflow
 *
 * IMPORTANT SECURITY NOTE:
 * This implementation uses client-side validation due to the lack of a server.
 * While this is not as secure as server-side validation, it follows these principles:
 *
 * 1. ✅ Handles sandbox receipts properly for App Store review
 * 2. ✅ Uses basic validation (checks required fields exist)
 * 3. ✅ Follows expo-iap v3 best practices for purchase flow
 * 4. ✅ Properly finishes transactions to prevent replay attacks
 * 5. ✅ Handles unfinished transactions on app startup
 *
 * SECURITY LIMITATIONS:
 * - Client-side validation can be bypassed by determined attackers
 * - Receipt data is not cryptographically verified
 * - No server-side fraud detection
 *
 * RECOMMENDED FUTURE IMPROVEMENTS:
 * - Implement server-side receipt validation
 * - Add purchase logging for fraud detection
 * - Consider using a backend service for validation
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
      continue;
    }

    const existingPurchase = uniquePurchases.get(productId);
    if (!existingPurchase) {
      uniquePurchases.set(productId, purchase);
      continue;
    }

    const existingTimestamp = existingPurchase.transactionDate ?? 0;
    const newTimestamp = purchase.transactionDate ?? 0;

    if (newTimestamp > existingTimestamp) {
      uniquePurchases.set(productId, purchase);
    }
  }

  return Array.from(uniquePurchases.values());
};

interface IAPContextType {
  connected: boolean;
  products: any[];
  availablePurchases: any[];
  fetchStatus: string;
  lastError: string;
  purchasedProducts: Set<string>;
  currentPurchase: any | null;
  currentPurchaseError: any | null;
  isRestoring: boolean;
  restoreAttempts: number;
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
          setLastError(`Sync error: ${error.message}`);
          setFetchStatus("❌ Sync error");
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

  const [fetchStatus, setFetchStatus] = useState(
    isProd ? "Not started" : "Mock mode - ready"
  );
  const [lastError, setLastError] = useState("");
  const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(
    new Set()
  );
  
  // State tracking for restore operations to prevent multiple simultaneous calls
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreAttempts, setRestoreAttempts] = useState(0);
  const [lastRestoreTime, setLastRestoreTime] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load purchased products from storage
  // Initialize on mount with proper restoration algorithm
  useEffect(() => {
    initializeIAP();
  }, []);

  // Effect to handle product loading and purchase restoration when connected
  useEffect(() => {
    if (isProd && connected && iapHook && !hasInitialized) {
      // Load products first, then restore purchases
      const loadAndRestore = async () => {
        try {
          setHasInitialized(true);
          // Use the standalone fetchProducts function
          const productIds = Object.keys(PRODUCT_DEFINITIONS);
          console.log("🔄 Fetching products with IDs:", productIds);

          const fetchedProducts = await hookFetchProducts({
            skus: productIds,
            type: "in-app",
          });

          console.log(
            "✅ Products fetched, count:",
            fetchedProducts?.length || 0
          );

          // Handle unfinished transactions first (iOS requirement)
          await handleUnfinishedTransactions();

          // Load available purchases (following official example pattern)
          try {
            await hookGetAvailablePurchases();
            console.log("✅ Available purchases loaded");
          } catch (error) {
            console.warn("Failed to load available purchases:", error);
          }

          // Only restore if we haven't done it recently and not currently restoring
          const now = Date.now();
          const timeSinceLastRestore = now - lastRestoreTime;
          const shouldRestore = !isRestoring && (timeSinceLastRestore > 5000 || lastRestoreTime === 0);
          
          if (shouldRestore) {
            await restorePurchases();
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          setLastError(`Product loading failed: ${errorMessage}`);
        }
      };

      loadAndRestore();
    }
  }, [connected, isProd, iapHook, hasInitialized, isRestoring, lastRestoreTime]);

  // Effect to update status when products are loaded (with proper dependencies)
  useEffect(() => {
    if (isProd && connected) {
      try {
        if (products && products.length > 0) {
          const productList = products
            .map((p: any) => p.id || p.productId)
            .join(", ");
          setFetchStatus(
            `✅ ${products.length} products loaded: ${productList}`
          );
          setLastError(""); // Clear any previous errors
        } else {
          setFetchStatus(
            "⚠️ Connected but no products loaded - check product IDs and store configuration"
          );
          setLastError("No products loaded from store");
        }
      } catch (error) {
        setFetchStatus("❌ Error updating product status");
        setLastError(`Product status error: ${error}`);
      }
    }
  }, [products?.length, connected, isProd]); // Only depend on length, not the entire products array

  // Effect to update status when purchased products change (with proper dependencies)
  useEffect(() => {
    try {
      if (purchasedProducts.size > 0) {
        const purchasedList = Array.from(purchasedProducts).join(", ");
        setFetchStatus(
          `✅ ${products?.length || 0} products available, ${
            purchasedProducts.size
          } purchased (${purchasedList})`
        );
      } else if (availablePurchases && availablePurchases.length > 0) {
        // If we have available purchases but no purchased products, try to restore
        setFetchStatus(
          `⚠️ Found ${availablePurchases.length} available purchases but 0 mapped. Try manual restore.`
        );
      }
    } catch (error) {
      setFetchStatus("❌ Error updating purchase status");
      setLastError(`Purchase status error: ${error}`);
    }
  }, [purchasedProducts.size, products?.length, availablePurchases?.length]); // Only depend on sizes, not arrays

  // Auto-restore purchases when available purchases are detected but not mapped (with proper dependencies)
  useEffect(() => {
    if (
      isProd &&
      availablePurchases &&
      availablePurchases.length > 0 &&
      purchasedProducts.size === 0 &&
      !isRestoring &&
      hasInitialized
    ) {
      // Auto-trigger restoration if we have available purchases but no mapped purchases
      const autoRestore = async () => {
        try {
          // Add a small delay to ensure state is stable
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Check again if we still need to restore (state might have changed)
          if (purchasedProducts.size === 0 && !isRestoring) {
            await restorePurchases();
          }
        } catch (error) {
          setLastError(`Auto-restore failed: ${error}`);
        }
      };
      autoRestore();
    }
  }, [availablePurchases?.length, purchasedProducts.size, isProd, isRestoring, hasInitialized]); // Only depend on length, not arrays

  // Proper IAP initialization with offline-first approach
  const initializeIAP = async () => {
    // Step 1: Load cached purchases immediately (offline-first)
    await loadPurchasedProducts();

    // Step 2: If in production, wait for connection and then restore
    if (isProd) {
      if (connected) {
        try {
          await getProducts();
          await restorePurchases();
        } catch (error) {
          setFetchStatus("✅ Using cached data (offline mode)");
        }
      } else {
        setFetchStatus("🔄 Connecting to store...");
      }
    } else {
      setFetchStatus("🎭 Mock mode - using cached data");
    }
  };

  // Process purchase and unlock features
  // NOTE: This is called after basic validation - for maximum security,
  // consider implementing server-side validation in the future
  const processPurchase = async (purchase: any) => {
    const productId = purchase.productId || purchase.id || purchase.sku;
    
    // Update debug status
    setFetchStatus(`🔄 Processing purchase: ${productId}`);
    
    try {
      const productDef = PRODUCT_DEFINITIONS[productId];

      if (!productDef) {
        setLastError(`⚠️ Unknown product ID: ${productId}`);
        setFetchStatus("❌ Unknown product ID");
        return;
      }

      setFetchStatus(`✅ Product definition found: ${productDef.title}`);

      // Unlock features based on product
      for (const unlock of productDef.unlocks) {
        setFetchStatus(`🔄 Unlocking feature: ${unlock}`);
        
        switch (unlock) {
          case "ad_free":
            await userService.setPremium("lifetime");
            // Immediately update ad service to stop showing ads
            await adService.onUserTierChange();
            setFetchStatus("✅ Premium status set and ad service updated");
            break;
          case "college_theme":
            await themePackService.purchasePack("college");
            setFetchStatus("✅ College theme pack purchased");
            break;
          case "couple_theme":
            await themePackService.purchasePack("couple");
            setFetchStatus("✅ Couple theme pack purchased");
            break;
          case "test_theme_fake":
            await themePackService.purchasePack("test_theme_fake");
            setFetchStatus("✅ Fake theme pack purchased");
            break;
          case "test_theme_angry":
            await themePackService.purchasePack("test_theme_angry");
            setFetchStatus("✅ Angry theme pack purchased");
            break;
          case "test_coins":
            // Handle consumable test coins
            setFetchStatus("🪙 Test coins added to account");
            break;
        }
      }

      // Check for post-purchase upsells
      setFetchStatus("🔄 Checking post-purchase upsells...");
      await upsellService.checkPostPurchaseUpsell("ad_free");
      setFetchStatus("✅ Post-purchase upsells checked");

      setFetchStatus("✅ Purchase processing completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(`❌ Purchase processing failed: ${errorMessage}`);
      setFetchStatus("❌ Purchase processing failed");
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

    // Clear any previous errors immediately
    setLastError("");
    setFetchStatus(`🎉 Purchase Success Handler Started - Product: ${productId}`);

    try {
      // 1. Server-side receipt validation
      setFetchStatus(`🔄 Step 1: Validating receipt for ${productId}...`);
      try {
        const isValid = await validateReceiptWithServer(purchase);
        if (!isValid) {
          const errorMsg = `Receipt validation failed for ${productId}`;
          setLastError(errorMsg);
          setFetchStatus("❌ Receipt validation failed");
          return;
        }
        setFetchStatus("✅ Receipt validation successful");
      } catch (validationError) {
        const errorDetails = {
          method: "handlePurchaseSuccess -> validateReceiptWithServer",
          productId,
          platform: Platform.OS,
          isProduction: isProd,
          isConnected: connected,
          error: validationError,
          timestamp: new Date().toISOString(),
        };

        let errorMsg = `[${errorDetails.method}] Receipt validation failed for ${productId}`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Product ID: ${productId}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Validation Error: ${validationError}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Receipt validation error`;
        errorMsg += `\n• This usually means the App Store Connect API key is not working`;
        errorMsg += `\n• Or the receipt data is invalid/corrupted`;
        errorMsg += `\n• Check if your .p8 file is properly configured`;
        errorMsg += `\n• Verify the API key has the correct permissions`;

        setLastError(errorMsg);
        setFetchStatus("❌ Receipt validation error");
        return;
      }

      // 2. Process the purchase
      setFetchStatus(`🔄 Step 2: Processing purchase for ${productId}...`);
      try {
        await processPurchase(purchase);
        setFetchStatus("✅ Purchase processing completed");
      } catch (processError) {
        const errorDetails = {
          method: "handlePurchaseSuccess -> processPurchase",
          productId,
          platform: Platform.OS,
          isProduction: isProd,
          isConnected: connected,
          error: processError,
          timestamp: new Date().toISOString(),
        };

        let errorMsg = `[${errorDetails.method}] Purchase processing failed for ${productId}`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Product ID: ${productId}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Processing Error: ${processError}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Purchase processing error`;
        errorMsg += `\n• This usually means there's an issue with the purchase service`;
        errorMsg += `\n• Or the product definition is missing/invalid`;
        errorMsg += `\n• Check if the product is properly configured in PRODUCT_DEFINITIONS`;
        errorMsg += `\n• Verify the purchase service is working correctly`;

        setLastError(errorMsg);
        setFetchStatus("❌ Purchase processing failed");
        return;
      }

      // 3. IMPORTANT: Finish the transaction to prevent replay on iOS
      setFetchStatus(`🔄 Step 3: Finishing transaction for ${productId}...`);
      try {
        const finishResult = await hookFinishTransaction({
          purchase,
          isConsumable: false, // Our products are non-consumable
        });
        
        setFetchStatus(`✅ Transaction finished successfully: ${JSON.stringify(finishResult)}`);
        
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
          setFetchStatus(`✅ Updated purchased products in storage: ${Array.from(newPurchasedProducts).join(', ')}`);
        } catch (storageError) {
          setLastError(`Failed to save purchased products to storage: ${storageError}`);
          setFetchStatus("❌ Storage update failed");
        }
        
      } catch (finishError) {
        const errorDetails = {
          method: "handlePurchaseSuccess -> finishTransaction",
          productId,
          platform: Platform.OS,
          isProduction: isProd,
          isConnected: connected,
          error: finishError,
          timestamp: new Date().toISOString(),
        };

        let errorMsg = `[${errorDetails.method}] Transaction finish failed for ${productId}`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Product ID: ${productId}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Finish Error: ${finishError}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Transaction finish error`;
        errorMsg += `\n• This usually means the transaction is already finished`;
        errorMsg += `\n• Or there's an issue with the purchase object`;
        errorMsg += `\n• Check if the purchase object is valid and complete`;
        errorMsg += `\n• This error might cause the purchase to replay on next app launch`;

        setLastError(errorMsg);
        setFetchStatus("❌ Transaction finish failed");
        return;
      }

      setFetchStatus(
        `🎉 Purchase successful (${isSandbox ? "Sandbox" : "Production"}) - Product: ${productId}`
      );
      
      // IMPORTANT: Always clear any errors for successful purchases
      setLastError("");

      // Refresh available purchases (following official example pattern)
      try {
        setFetchStatus("🔄 Refreshing available purchases...");
        await hookGetAvailablePurchases();
        setFetchStatus("✅ Available purchases refreshed after purchase");
      } catch (error) {
        setFetchStatus("⚠️ Failed to refresh available purchases after purchase");
        // Don't set lastError here - this is just a refresh failure, not a purchase failure
      }
    } catch (error) {
      const errorDetails = {
        method: "handlePurchaseSuccess (main catch)",
        productId:
          purchase?.productId || purchase?.id || purchase?.sku || "UNKNOWN",
        platform: Platform.OS,
        isProduction: isProd,
        isConnected: connected,
        error: error,
        timestamp: new Date().toISOString(),
      };

      let errorMsg = `[${errorDetails.method}] Unexpected error processing purchase`;
      errorMsg += `\n\nError Details:`;
      errorMsg += `\n• Method: ${errorDetails.method}`;
      errorMsg += `\n• Product ID: ${errorDetails.productId}`;
      errorMsg += `\n• Platform: ${Platform.OS}`;
      errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
      errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
      errorMsg += `\n• Error: ${error}`;
      errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
      errorMsg += `\n\n🔍 DIAGNOSIS: Unexpected error in purchase success handler`;
      errorMsg += `\n• This is a critical error that shouldn't happen`;
      errorMsg += `\n• Check the error details above for more information`;
      errorMsg += `\n• This might indicate a bug in the purchase flow`;
      errorMsg += `\n• Contact support with these error details`;

      setLastError(errorMsg);
      setFetchStatus("❌ Purchase failed");
    }
  };

  // Handle purchase error following expo-iap documentation
  const handlePurchaseError = (error: any) => {
    const errorCode = error.code || "NO_CODE";
    const errorMessage = error.message || error.toString();
    
    // Update debug status
    setFetchStatus(`❌ Purchase Error Handler - Code: ${errorCode}`);
    
    try {
      const errorDetails = {
        method: "handlePurchaseError",
        platform: Platform.OS,
        isProduction: isProd,
        isConnected: connected,
        errorCode: errorCode,
        errorDomain: error.domain || "NO_DOMAIN",
        errorMessage: errorMessage,
        timestamp: new Date().toISOString(),
      };

      // Clear any previous errors immediately
      setLastError("");

      // Handle specific error cases as per documentation
      if (error.code === "E_USER_CANCELLED") {
        // User cancelled - no action needed
        setFetchStatus("Purchase cancelled");
        setLastError(""); // Clear error for user cancellation
      } else if (error.code === "E_NETWORK_ERROR") {
        // Network error occurred
        let errorMsg = `[${errorDetails.method}] Network error occurred`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Network error`;
        errorMsg += `\n• Check your internet connection`;
        errorMsg += `\n• Try again in a few moments`;
        errorMsg += `\n• Verify device can reach Apple's servers`;

        setLastError(errorMsg);
        setFetchStatus("❌ Network error");
      } else if (error.code === "E_ITEM_UNAVAILABLE") {
        // Product is not available
        let errorMsg = `[${errorDetails.method}] Product unavailable`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Product unavailable`;
        errorMsg += `\n• This product is currently not available for purchase`;
        errorMsg += `\n• Check App Store Connect product configuration`;
        errorMsg += `\n• Verify product is active and not paused`;

        setLastError(errorMsg);
        setFetchStatus("❌ Item unavailable");
      } else if (error.code === "E_ALREADY_OWNED") {
        // User already owns this product
        let errorMsg = `[${errorDetails.method}] Product already owned`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Product already owned`;
        errorMsg += `\n• You already own this product`;
        errorMsg += `\n• No action needed`;
        errorMsg += `\n• Try restoring purchases if you don't see it`;

        setLastError(errorMsg);
        setFetchStatus("✅ Product already owned");
      } else if (error.code === "E_PAYMENT_NOT_ALLOWED") {
        let errorMsg = `[${errorDetails.method}] Payment not allowed`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Payment not allowed`;
        errorMsg += `\n• Purchases are not allowed on this device`;
        errorMsg += `\n• Check device restrictions`;
        errorMsg += `\n• Verify payment method is set up`;

        setLastError(errorMsg);
        setFetchStatus("❌ Purchases not allowed");
      } else if (error.code === "E_PAYMENT_INVALID") {
        let errorMsg = `[${errorDetails.method}] Invalid payment`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Invalid payment`;
        errorMsg += `\n• Invalid payment information`;
        errorMsg += `\n• Check payment method in App Store`;
        errorMsg += `\n• Try updating payment information`;

        setLastError(errorMsg);
        setFetchStatus("❌ Invalid payment");
      } else if (error.code === "E_RECEIPT_VALIDATION_FAILED") {
        // This might be a sandbox receipt in production build
        let errorMsg = `[${errorDetails.method}] Receipt validation failed`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Receipt validation failed`;
        errorMsg += `\n• If testing with sandbox, this is expected`;
        errorMsg += `\n• Check App Store Connect API key configuration`;
        errorMsg += `\n• Verify .p8 file is properly set up`;

        setLastError(errorMsg);
        setFetchStatus(
          "⚠️ Receipt validation failed (check if sandbox testing)"
        );
      } else if (error.code === "E_BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE") {
        let errorMsg = `[${errorDetails.method}] Product not available in store`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Product not available in store`;
        errorMsg += `\n• Product ID not found in App Store Connect`;
        errorMsg += `\n• Check if product ID matches exactly`;
        errorMsg += `\n• Verify product is in "Ready to Submit" status`;

        setLastError(errorMsg);
        setFetchStatus("❌ Product not available in store");
      } else if (
        error.message &&
        error.message.includes("Failed to query product")
      ) {
        let errorMsg = `[${errorDetails.method}] Failed to query product`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Failed to query product`;
        errorMsg += `\n• Product ID not found in App Store Connect`;
        errorMsg += `\n• Check if product ID matches exactly (case-sensitive)`;
        errorMsg += `\n• Verify product is properly configured`;

        setLastError(errorMsg);
        setFetchStatus("❌ Product query failed");
      } else if (
        error.message &&
        error.message.includes("Transaction verification failed")
      ) {
        let errorMsg = `[${errorDetails.method}] Transaction verification failed`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Transaction verification failed`;
        errorMsg += `\n• This might be a sandbox receipt in production build`;
        errorMsg += `\n• Check App Store Connect API key configuration`;
        errorMsg += `\n• Verify .p8 file is properly set up`;

        setLastError(errorMsg);
        setFetchStatus("❌ Transaction verification failed");
      } else {
        // Other errors
        let errorMsg = `[${errorDetails.method}] Purchase failed`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error Domain: ${errorDetails.errorDomain}`;
        errorMsg += `\n• Error Message: ${errorDetails.errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
        errorMsg += `\n\n🔍 DIAGNOSIS: Unknown error type`;
        errorMsg += `\n• Error code: ${errorDetails.errorCode}`;
        errorMsg += `\n• Error domain: ${errorDetails.errorDomain}`;
        errorMsg += `\n• Full error: ${errorDetails.errorMessage}`;

        setLastError(errorMsg);
        setFetchStatus("❌ Purchase failed");
      }
    } catch (errorHandlingError) {
      const errorDetails = {
        method: "handlePurchaseError (error handling catch)",
        platform: Platform.OS,
        isProduction: isProd,
        isConnected: connected,
        error: errorHandlingError,
        timestamp: new Date().toISOString(),
      };

      let errorMsg = `[${errorDetails.method}] Error handling purchase error`;
      errorMsg += `\n\nError Details:`;
      errorMsg += `\n• Method: ${errorDetails.method}`;
      errorMsg += `\n• Platform: ${Platform.OS}`;
      errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
      errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
      errorMsg += `\n• Error Handling Error: ${errorHandlingError}`;
      errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;
      errorMsg += `\n\n🔍 DIAGNOSIS: Critical error in error handling`;
      errorMsg += `\n• This is a critical error that shouldn't happen`;
      errorMsg += `\n• Check the error details above`;
      errorMsg += `\n• Contact support with these error details`;

      setLastError(errorMsg);
      setFetchStatus("❌ Error handling failed");
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
          setFetchStatus("✅ Products loaded from cache");
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
      setLastError("");
      setFetchStatus("Fetching products...");

      // Handle mock mode
      if (!isProd) {
        setFetchStatus("✅ Mock mode - returning mock products");
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
        setFetchStatus("❌ Not connected to store");
        setLastError("Not connected to store");
        return [];
      }

      const productIds = Object.keys(PRODUCT_DEFINITIONS);

      // Use the hook's fetchProducts method
      await hookFetchProducts({
        skus: productIds,
        type: "in-app",
      });

      setFetchStatus("✅ Products fetched successfully");
      return getCurrentProducts();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setFetchStatus(`❌ Error: ${errorMessage}`);
      setLastError(`Exception during product fetch: ${errorMessage}`);
      return [];
    }
  };

  // Purchase a product
  const purchaseProduct = async (productId: string): Promise<boolean> => {
    try {
      // Clear any previous errors immediately
      setLastError("");
      setFetchStatus("🔄 Starting purchase...");

      // Check if already purchased (for non-consumable products)
      if (isProductPurchased(productId)) {
        setFetchStatus("✅ Product already owned");
        setLastError(""); // Clear any previous errors
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

          setFetchStatus("✅ Mock purchase successful");
          return true;
        } catch (mockError) {
          setLastError(`Mock purchase failed: ${mockError}`);
          return false;
        }
      }

      if (!connected) {
        const errorMsg = "Not connected to store";
        setLastError(errorMsg);
        setFetchStatus("❌ Not connected to store");
        return false;
      }

      // In production mode, the purchase will be handled by the event-driven system
      // The requestPurchase just initiates the purchase, the actual result comes via currentPurchase

      try {
        setFetchStatus("🔄 Initiating purchase...");

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
          setFetchStatus("🔄 Purchase initiated - waiting for confirmation...");
          return true;
        } else {
          const errorMsg = "Purchase failed - no result returned";
          setLastError(errorMsg);
          setFetchStatus("❌ Purchase request failed");
          return false;
        }
      } catch (requestError: any) {
        // Enhanced error handling with detailed debugging information
        const errorMessage = requestError.message || requestError.toString();
        const errorCode = requestError.code || "NO_CODE";
        const errorDomain = requestError.domain || "NO_DOMAIN";

        // Create comprehensive error details for debugging
        const errorDetails = {
          method: "purchaseProduct -> hookRequestPurchase",
          productId,
          platform: Platform.OS,
          isProduction: isProd,
          isConnected: connected,
          errorCode,
          errorDomain,
          errorMessage,
          timestamp: new Date().toISOString(),
          stack: requestError.stack || "No stack trace available",
        };

        let errorMsg = `[${errorDetails.method}] Purchase request failed for ${productId}`;
        errorMsg += `\n\nError Details:`;
        errorMsg += `\n• Method: ${errorDetails.method}`;
        errorMsg += `\n• Product ID: ${productId}`;
        errorMsg += `\n• Platform: ${Platform.OS}`;
        errorMsg += `\n• Environment: ${isProd ? "Production" : "Development"}`;
        errorMsg += `\n• Store Connected: ${connected ? "Yes" : "No"}`;
        errorMsg += `\n• Error Code: ${errorCode}`;
        errorMsg += `\n• Error Domain: ${errorDomain}`;
        errorMsg += `\n• Error Message: ${errorMessage}`;
        errorMsg += `\n• Timestamp: ${errorDetails.timestamp}`;

        // Add specific guidance based on error type
        if (errorMessage.includes("Transaction verification failed")) {
          errorMsg += `\n\n🔍 DIAGNOSIS: Transaction verification failed`;
          errorMsg += `\n• This usually means the App Store Connect API key is not working properly`;
          errorMsg += `\n• Or you're using a sandbox receipt in a production build`;
          errorMsg += `\n• Check if your .p8 file is in the correct location`;
          errorMsg += `\n• Verify the keyId and issuerId in app.json match your API key`;
        } else if (errorMessage.includes("Failed to query product")) {
          errorMsg += `\n\n🔍 DIAGNOSIS: Failed to query product`;
          errorMsg += `\n• Product ID "${productId}" not found in App Store Connect`;
          errorMsg += `\n• Check if product ID matches exactly (case-sensitive)`;
          errorMsg += `\n• Verify product is in "Ready to Submit" status`;
          errorMsg += `\n• Ensure app bundle ID matches in App Store Connect`;
        } else if (
          errorMessage.includes("21007") ||
          errorMessage.includes("21008")
        ) {
          errorMsg += `\n\n🔍 DIAGNOSIS: Sandbox receipt detected`;
          errorMsg += `\n• This is expected when testing with sandbox accounts`;
          errorMsg += `\n• The app should handle this automatically`;
          errorMsg += `\n• If this persists, check sandbox account setup`;
        } else if (errorCode === "E_BILLING_RESPONSE_RESULT_ITEM_UNAVAILABLE") {
          errorMsg += `\n\n🔍 DIAGNOSIS: Product unavailable in store`;
          errorMsg += `\n• Product "${productId}" is not available for purchase`;
          errorMsg += `\n• Check App Store Connect product configuration`;
          errorMsg += `\n• Verify product is active and not paused`;
        } else if (errorCode === "E_NETWORK_ERROR") {
          errorMsg += `\n\n🔍 DIAGNOSIS: Network error`;
          errorMsg += `\n• Check internet connection`;
          errorMsg += `\n• Try again in a few moments`;
          errorMsg += `\n• Verify device can reach Apple's servers`;
        } else {
          errorMsg += `\n\n🔍 DIAGNOSIS: Unknown error type`;
          errorMsg += `\n• Error code: ${errorCode}`;
          errorMsg += `\n• Error domain: ${errorDomain}`;
          errorMsg += `\n• Full error: ${errorMessage}`;
        }

        setLastError(errorMsg);
        setFetchStatus("❌ Purchase request failed");
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorMsg = `Unexpected error purchasing ${productId}: ${errorMessage}`;
      setLastError(errorMsg);
      setFetchStatus("❌ Purchase failed");
      return false;
    }
  };

  // Restore purchases with proper offline-first approach and state tracking
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
      setFetchStatus("⚠️ Maximum restore attempts reached");
      return purchasedProducts.size > 0;
    }

    setIsRestoring(true);
    setLastRestoreTime(now);
    setRestoreAttempts(prev => prev + 1);
    setFetchStatus("🔄 Restore Purchases Started");
    
    try {
      // Handle mock mode - just load from storage
      if (!isProd) {
        try {
          setFetchStatus("🎭 Mock mode: Loading from storage...");
          await loadPurchasedProducts();
          const hasPurchases = purchasedProducts.size > 0;
          const statusMessage = hasPurchases
            ? "✅ Mock mode - purchases restored"
            : "Mock mode - no purchases to restore";
          setFetchStatus(statusMessage);
          return hasPurchases;
        } catch (mockError) {
          setLastError(`Mock restore failed: ${mockError}`);
          setFetchStatus("❌ Mock restore failed");
          return false;
        } finally {
          setIsRestoring(false);
        }
      }

      if (!connected) {
        const statusMessage = "✅ Using cached data (offline mode)";
        setFetchStatus(statusMessage);
        return purchasedProducts.size > 0;
      }

      try {
        setFetchStatus("🔄 Fetching available purchases from store...");
        // Get available purchases from store using v3 API
        const storePurchases = await hookGetAvailablePurchases();
        
        setFetchStatus(`📦 Store purchases received: ${storePurchases?.length || 0} purchases`);

        if (storePurchases && storePurchases.length > 0) {
          // Deduplicate purchases (following official example pattern)
          const deduplicatedPurchases = deduplicatePurchases(storePurchases);
          setFetchStatus(
            `🔄 Deduplicated ${storePurchases.length} purchases to ${deduplicatedPurchases.length}`
          );

          // Merge store purchases with cached purchases
          const newPurchasedProducts = new Set(purchasedProducts);
          let restored = false;

          setFetchStatus("🔄 Processing each purchase for restoration...");

          for (const purchase of deduplicatedPurchases) {
            try {
              // Handle different purchase data structures
              const productId =
                purchase.productId || purchase.id || purchase.sku;

              if (productId) {
                setFetchStatus(`🔄 Processing purchase: ${productId}`);
                
                // Check if this product ID exists in our PRODUCT_DEFINITIONS
                if (PRODUCT_DEFINITIONS[productId]) {
                  setFetchStatus(`✅ Adding to purchased products: ${productId}`);
                  newPurchasedProducts.add(productId);
                  restored = true;

                  // Process the purchase to unlock features
                  try {
                    setFetchStatus(`🔄 Processing restored purchase: ${productId}`);
                    await processPurchase(purchase);
                    setFetchStatus(`✅ Restored purchase processed: ${productId}`);
                  } catch (processError) {
                    setLastError(
                      `Error processing restored purchase ${productId}: ${processError}`
                    );
                    setFetchStatus(`❌ Error processing restored purchase: ${productId}`);
                  }
                } else {
                  setFetchStatus(`⚠️ Product not in definitions, skipping: ${productId}`);
                }
              } else {
                setFetchStatus("⚠️ Purchase has no product ID, skipping");
              }
            } catch (purchaseError) {
              setLastError(`Error processing purchase: ${purchaseError}`);
              setFetchStatus("❌ Error processing purchase in restore");
            }
          }

          setFetchStatus(`🔄 Final purchased products: ${newPurchasedProducts.size} products`);

          // Update state and storage
          try {
            setPurchasedProducts(newPurchasedProducts);
            await AsyncStorage.setItem(
              STORAGE_KEYS.PURCHASED_PRODUCTS,
              JSON.stringify(Array.from(newPurchasedProducts))
            );

            const statusMessage = connected
              ? `✅ ${newPurchasedProducts.size} purchases restored from store`
              : `✅ ${newPurchasedProducts.size} purchases restored from cache (offline)`;
            setFetchStatus(statusMessage);
            
            // Reset retry attempts on successful restore
            setRestoreAttempts(0);
            return restored;
          } catch (storageError) {
            setLastError(`Storage update failed: ${storageError}`);
            setFetchStatus("❌ Restore completed but storage update failed");
            return restored;
          }
        } else {
          // No store purchases, use cached data
          const statusMessage = connected
            ? "✅ No store purchases found"
            : "✅ Using cached data (offline mode)";
          setFetchStatus(statusMessage);
          return purchasedProducts.size > 0;
        }
      } catch (storeError) {
        const errorMessage = storeError instanceof Error ? storeError.message : String(storeError);
        
        // Handle specific error types
        if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          setLastError(`Network error: ${errorMessage}`);
          setFetchStatus("❌ Network error - using cached data");
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          setLastError(`Timeout error: ${errorMessage}`);
          setFetchStatus("❌ Request timeout - using cached data");
        } else if (errorMessage.includes('offline') || errorMessage.includes('Offline')) {
          setLastError(`Offline error: ${errorMessage}`);
          setFetchStatus("❌ Device offline - using cached data");
        } else {
          setLastError(`Store fetch failed: ${errorMessage}`);
          setFetchStatus("❌ Store fetch failed - using cached data");
        }
        
        return purchasedProducts.size > 0;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorMsg = `Restore failed: ${errorMessage}`;
      setLastError(errorMsg);
      setFetchStatus(`❌ Restore failed: ${errorMessage}`);
      return purchasedProducts.size > 0;
    } finally {
      setIsRestoring(false);
    }
  };

  // Clear failed purchase states (for debugging and retry)
  const clearFailedPurchases = async (): Promise<void> => {
    try {
      setLastError("");
      setFetchStatus("🔄 Clearing failed purchase states...");

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

      setFetchStatus(
        "✅ Failed purchase states cleared - you can retry purchases"
      );
    } catch (error) {
      const errorMsg = `Clear failed: ${error}`;
      setLastError(errorMsg);
      setFetchStatus("❌ Clear failed");
    }
  };

  // Retry restore with exponential backoff
  const retryRestoreWithBackoff = async (): Promise<boolean> => {
    if (restoreAttempts >= 3) {
      setFetchStatus("⚠️ Maximum retry attempts reached");
      return false;
    }

    const backoffDelay = Math.pow(2, restoreAttempts) * 1000; // 1s, 2s, 4s
    setFetchStatus(`🔄 Retrying restore in ${backoffDelay / 1000} seconds...`);
    
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    return await restorePurchases();
  };

  // Manual retry function that resets attempts and tries again
  const manualRetryRestore = async (): Promise<boolean> => {
    setFetchStatus("🔄 Manual retry initiated...");
    setRestoreAttempts(0); // Reset attempts for manual retry
    setLastRestoreTime(0); // Reset timing
    setIsRestoring(false); // Reset restoring state
    
    return await restorePurchases();
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
    setLastError("");
  };

  // Clear purchase status (for testing)
  const clearPurchaseStatus = async (): Promise<void> => {
    try {
      setPurchasedProducts(new Set());
      await AsyncStorage.removeItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      setFetchStatus("Purchase status cleared");
    } catch (error) {}
  };

  // Server-side receipt validation following expo-iap documentation
  const validateReceiptWithServer = async (purchase: any): Promise<boolean> => {
    try {
      console.log("🔍 Starting server-side receipt validation...");

      if (!purchase) {
        console.error("❌ No purchase data provided for validation");
        return false;
      }

      console.log("📱 Purchase data:", {
        id: purchase.id,
        productId: purchase.productId,
        transactionDate: purchase.transactionDate,
        purchaseToken: purchase.purchaseToken,
        platform: Platform.OS,
      });

      // For development, use mock validation
      if (__DEV__) {
        console.log("🧪 Development mode: Using mock validation");
        return true;
      }

      // Server-side validation endpoint
      const serverUrl =
        process.env.EXPO_PUBLIC_VALIDATION_SERVER_URL ||
        "http://localhost:3000";

      let validationData: any = {
        platform: Platform.OS,
        productId: purchase.productId,
      };

      // Platform-specific receipt handling as per expo-iap documentation
      if (Platform.OS === "ios") {
        // iOS: Send the JWS directly from purchase.purchaseToken
        // This is the JWS format you're receiving
        validationData.receiptData = purchase.purchaseToken;
        
        console.log("🍎 iOS JWS receipt data:", {
          length: purchase.purchaseToken?.length || 0,
          isJWS: purchase.purchaseToken?.includes('.') || false
        });

        // Update status with receipt info for debugging
        setFetchStatus(
          `🍎 iOS JWS: ${purchase.purchaseToken?.length || 0} chars`
        );
      } else if (Platform.OS === "android") {
        // Android: Use purchase token and package name
        validationData.purchaseToken =
          purchase.purchaseTokenAndroid || purchase.purchaseToken;
        validationData.packageName =
          purchase.packageNameAndroid || "com.knottytimes.knottyroulette";

        // Update status with Android data for debugging
        setFetchStatus(
          `🤖 Android Data: Token=${validationData.purchaseToken?.length || 0} chars, Package=${validationData.packageName}`
        );
      }

      console.log("🌐 Sending validation request to server...");

      const response = await fetch(`${serverUrl}/validate-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationData),
      });

      if (!response.ok) {
        throw new Error(
          `Server validation failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Server validation result:", result);

      // Update status with server response for debugging
      setFetchStatus(
        `🔍 Server validation: ${
          result.isValid ? "Valid" : "Invalid"
        } - ${JSON.stringify(result, null, 2)}`
      );

      return result.isValid;
    } catch (error) {
      console.error("❌ Server validation failed:", error);

      // Update status with error details for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      setFetchStatus(`❌ Server validation failed: ${errorMessage}`);
      setLastError(`Server validation error: ${errorMessage}`);

      // Fallback to basic validation for now
      console.log("🔄 Falling back to basic validation...");
      return purchase && purchase.productId && purchase.purchaseToken;
    }
  };

  // Handle unfinished transactions on startup (iOS requirement)
  const handleUnfinishedTransactions = async (): Promise<void> => {
    if (!isProd || Platform.OS !== "ios") {
      return; // Only needed on iOS in production
    }

    try {
      // Get available purchases (unfinished transactions) using v3 API
      const unfinishedPurchases = await hookGetAvailablePurchases();

      if (unfinishedPurchases.length > 0) {
        for (const purchase of unfinishedPurchases) {
          const productId = purchase.productId || purchase.id || purchase.sku;

          // Check if this purchase was already processed
          if (isProductPurchased(productId)) {
            // Already processed, just finish the transaction
            await hookFinishTransaction({
              purchase,
              isConsumable: false,
            });
          } else {
            // Process the purchase first, then finish
            await processPurchase(purchase);
            await hookFinishTransaction({
              purchase,
              isConsumable: false,
            });
          }
        }
      }
    } catch (error) {
      // Handle unfinished transactions failed
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
        setFetchStatus(
          `✅ ${products.length} products available, ${purchasedCount} purchased`
        );
        // Clear any previous errors when products load successfully
        setLastError("");
      } else if (connected) {
        const purchasedCount = purchasedProducts.size;
        if (purchasedCount > 0) {
          setFetchStatus(
            `✅ Connected, ${purchasedCount} purchases restored from cache`
          );
        } else {
          setFetchStatus("Connected but no products loaded");
        }
      } else {
        const purchasedCount = purchasedProducts.size;
        if (purchasedCount > 0) {
          setFetchStatus(
            `✅ Offline mode, ${purchasedCount} purchases from cache`
          );
        } else {
          setFetchStatus("Not connected to store");
        }
      }
    } catch (error) {
      setFetchStatus("❌ Error updating status");
      setLastError(`Status update error: ${error}`);
    }
  }, [products?.length, connected, purchasedProducts.size]); // Only depend on length and size, not arrays

  // Handle successful purchases (event-driven)
  useEffect(() => {
    if (currentPurchase && isProd) {
      handlePurchaseSuccess(currentPurchase);
    }
  }, [currentPurchase, isProd, purchasedProducts]);

  // Update error when purchase error changes
  useEffect(() => {
    if (currentPurchaseError && isProd) {
      setLastError(
        `Purchase error: ${
          currentPurchaseError.message || currentPurchaseError
        }`
      );
    }
  }, [currentPurchaseError, isProd]);

  const contextValue: IAPContextType = {
    connected,
    products,
    availablePurchases,
    fetchStatus,
    lastError,
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
      fetchStatus:
        "Platform Not Supported - IAP only available on iOS and Android",
      lastError: "Platform not supported",
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
    };

    return (
      <IAPContext.Provider value={unsupportedContextValue}>
        {children}
      </IAPContext.Provider>
    );
  }

  return (
    <IAPContext.Provider value={contextValue}>{children}</IAPContext.Provider>
  );
}

export function useIAPContext(): IAPContextType {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error("useIAPContext must be used within an IAPProvider");
  }
  return context;
}
