import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import adService from "../../services/adService";
import { setIAPContext } from "../../services/purchaseService";
import themePackService from "../../services/themePackService";
import upsellService from "../../services/upsellService";
import userService from "../../services/userService";
import { isProduction } from "../../utils/environment";

// Conditionally import expo-iap
let useIAP: any = null;

if (isProduction()) {
  try {
    useIAP = require("expo-iap").useIAP;
  } catch (error) {
    // expo-iap failed to load
  }
}

// Supported platforms for IAP
const SUPPORTED_PLATFORMS = ['ios', 'android'];

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

// Product definitions with metadata
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

interface IAPContextType {
  connected: boolean;
  products: any[];
  availablePurchases: any[];
  fetchStatus: string;
  lastError: string;
  purchasedProducts: Set<string>;
  isProductPurchased: (productId: string) => boolean;
  purchaseProduct: (productId: string) => Promise<boolean>;
  purchaseProducts: (productIds: string[]) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
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
          // IAP sync error
        },
        autoFinishTransactions: false, // We'll handle this manually
      });
    } catch (error) {
      // IAP failed to initialize
    }
  }

  // Mock data for non-production
  const mockData = {
    connected: !isProd, // Always "connected" in mock mode
    products: [],
    requestProducts: async () => {},
    requestPurchase: async () => ({ success: true }),
    finishTransaction: async () => {},
    getAvailablePurchases: async (skus: string[]) => [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
    validateReceipt: async () => ({ isValid: true }),
  };

  // Use real IAP data in production, mock data in development
  const {
    connected,
    products,
    requestProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    validateReceipt,
  } = isProd && iapHook ? iapHook : mockData;

  const [fetchStatus, setFetchStatus] = useState(
    isProd ? "Not started" : "Mock mode - ready"
  );
  const [lastError, setLastError] = useState("");
  const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(
    new Set()
  );

  // Load purchased products from storage
  // Initialize on mount with proper restoration algorithm
  useEffect(() => {
    initializeIAP();
  }, []);

  // Effect to handle product loading and purchase restoration when connected
  useEffect(() => {
    if (isProd && connected && requestProducts) {
      // Load products first, then restore purchases
      const loadAndRestore = async () => {
        try {
          // Call requestProducts directly to fetch products
          const productIds = Object.keys(PRODUCT_DEFINITIONS);
          
          await requestProducts({
            skus: productIds,
            type: "inapp",
          });
          
          // Handle unfinished transactions first (iOS requirement)
          await handleUnfinishedTransactions();
          
          await restorePurchases();
        } catch (error) {
          // IAP auto-restoration failed
        }
      };
      
      loadAndRestore();
    }
  }, [connected, isProd, requestProducts]);


  // Effect to update status when products are loaded
  useEffect(() => {
    if (isProd && connected && products && products.length > 0) {
      setFetchStatus(`✅ ${products.length} products loaded from store`);
      setLastError(""); // Clear any previous errors
    }
  }, [products, connected, isProd]);

  // Effect to update status when purchased products change
  useEffect(() => {
    if (purchasedProducts.size > 0) {
      const purchasedList = Array.from(purchasedProducts).join(", ");
      setFetchStatus(`✅ ${products?.length || 0} products available, ${purchasedProducts.size} purchased (${purchasedList})`);
    } else if (availablePurchases && availablePurchases.length > 0) {
      // If we have available purchases but no purchased products, try to restore
      setFetchStatus(`⚠️ Found ${availablePurchases.length} available purchases but 0 mapped. Try manual restore.`);
    }
  }, [purchasedProducts, products, availablePurchases]);

  // Auto-restore purchases when available purchases are detected but not mapped
  useEffect(() => {
    if (isProd && availablePurchases && availablePurchases.length > 0 && purchasedProducts.size === 0) {
      // Auto-trigger restoration if we have available purchases but no mapped purchases
      const autoRestore = async () => {
        try {
          // Add a small delay to ensure state is stable
          await new Promise(resolve => setTimeout(resolve, 1000));
          await restorePurchases();
        } catch (error) {
          // Auto-restoration failed, user can try manual restore
        }
      };
      autoRestore();
    }
  }, [availablePurchases, purchasedProducts.size, isProd]);

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
  const processPurchase = async (purchase: any) => {
    try {
      const productId = purchase.productId || purchase.id || purchase.sku;
      const productDef = PRODUCT_DEFINITIONS[productId];

      if (!productDef) {
        return;
      }

      // Unlock features based on product
      for (const unlock of productDef.unlocks) {
        switch (unlock) {
          case "ad_free":
            await userService.setPremium("lifetime");
            // Immediately update ad service to stop showing ads
            await adService.onUserTierChange();
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
      // Error processing purchase
    }
  };

  // Handle purchase success
  const handlePurchaseSuccess = async (purchase: any) => {
    try {
      const productId = purchase.productId || purchase.id || purchase.sku;
      
      // 1. Simple receipt validation
      const isValid = await validateReceiptSimple(productId, purchase);
      if (!isValid) {
        setLastError("Receipt validation failed");
        return;
      }

      // 2. Process the purchase
      await processPurchase(purchase);

      // 3. IMPORTANT: Finish the transaction to prevent replay on iOS
      await finishTransaction({
        purchase,
        isConsumable: false, // Our products are non-consumable
      });

      setFetchStatus("✅ Purchase successful");
    } catch (error) {
      setLastError(`Error processing purchase: ${error}`);
    }
  };

  // Handle purchase error
  const handlePurchaseError = (error: any) => {
    // Handle specific error cases
    if (
      error.code === "E_ALREADY_OWNED" ||
      error.message?.includes("already owned")
    ) {
      setLastError("Product already owned");
      setFetchStatus("✅ Product already owned");
    } else if (error.code === "E_USER_CANCELLED") {
      // User cancelled - don't show error message
      setFetchStatus("Purchase cancelled");
    } else if (error.code === "E_PAYMENT_NOT_ALLOWED") {
      setLastError("Purchases are not allowed on this device");
      setFetchStatus("❌ Purchases not allowed");
    } else if (error.code === "E_PAYMENT_INVALID") {
      setLastError("Invalid payment information");
      setFetchStatus("❌ Invalid payment");
    } else if (error.code === "E_ITEM_UNAVAILABLE") {
      setLastError("This item is not available for purchase");
      setFetchStatus("❌ Item unavailable");
    } else if (error.code === "E_NETWORK_ERROR") {
      setLastError("Network error occurred during purchase");
      setFetchStatus("❌ Network error");
    } else {
      setLastError(`Purchase failed: ${error.message || error}`);
      setFetchStatus("❌ Purchase failed");
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
    } catch (error) {
    }
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
            type: "inapp",
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

      // Use the correct v2.8 API - requestProducts returns void, products are updated via state
      await requestProducts({
        skus: productIds,
        type: "inapp",
      });

      // Wait for products to be loaded into state (longer wait for iOS)
      const waitTime = Platform.OS === 'ios' ? 4000 : 3000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));


      // Return the current products from state (they should be populated by requestProducts)
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
      setLastError("");

      // Check if already purchased (for non-consumable products)
      if (isProductPurchased(productId)) {
        setFetchStatus("✅ Product already owned");
        return true; // Return true since the user already has it
      }

      // Handle mock mode
      if (!isProd) {
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
      }

      if (!connected) {
        setLastError("Not connected to store");
        return false;
      }

      // In production mode, the purchase will be handled by the event-driven system
      // The requestPurchase just initiates the purchase, the actual result comes via currentPurchase
      
      // Platform-specific purchase requests (v2.7.0+)
      const result = await requestPurchase({
        request: {
          ios: { 
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false, // Important for iOS
            appAccountToken: undefined, // Optional: for server-side validation
          },
          android: { 
            skus: [productId], // Android uses array even for single product
            obfuscatedAccountIdAndroid: undefined, // Optional: user identifier
          },
        },
        type: "inapp",
      });

      if (result) {
        return true;
      } else {
        setLastError("Purchase failed - no result returned");
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setLastError(`Purchase failed: ${errorMessage}`);
      return false;
    }
  };

  // Restore purchases with proper offline-first approach
  const restorePurchases = async (): Promise<boolean> => {
    try {

      // Handle mock mode - just load from storage
      if (!isProd) {
        await loadPurchasedProducts();
        const hasPurchases = purchasedProducts.size > 0;
        setFetchStatus(
          hasPurchases
            ? "✅ Mock mode - purchases restored"
            : "Mock mode - no purchases to restore"
        );
        return hasPurchases;
      }

      if (!connected) {
        setFetchStatus("✅ Using cached data (offline mode)");
        return purchasedProducts.size > 0;
      }

      // Get available purchases from store
      await getAvailablePurchases();

      // Wait for state to update and get fresh data (longer wait for iOS)
      const waitTime = Platform.OS === 'ios' ? 3000 : 2000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Get the current available purchases from state
      const storePurchases = availablePurchases || [];

      if (storePurchases && storePurchases.length > 0) {
        // Merge store purchases with cached purchases
        const newPurchasedProducts = new Set(purchasedProducts);
        let restored = false;

        for (const purchase of storePurchases) {
          // Handle different purchase data structures
          const productId = purchase.productId || purchase.id || purchase.sku;
          console.log("🔍 Processing purchase:", { purchase, productId });
          
          if (productId) {
            // Check if this product ID exists in our PRODUCT_DEFINITIONS
            if (PRODUCT_DEFINITIONS[productId]) {
              console.log("✅ Adding product to purchased:", productId);
              newPurchasedProducts.add(productId);
              restored = true;
              
              // Process the purchase to unlock features
              await processPurchase(purchase);
            } else {
              console.log("❌ Product not in definitions:", productId);
            }
          } else {
            console.log("❌ No product ID found in purchase:", purchase);
          }
        }

        // Update state and storage
        setPurchasedProducts(newPurchasedProducts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.PURCHASED_PRODUCTS,
          JSON.stringify(Array.from(newPurchasedProducts))
        );

        setFetchStatus(`✅ ${newPurchasedProducts.size} purchases restored`);
        return restored;
      } else {
        setFetchStatus("✅ Using cached data (no store purchases)");
        return purchasedProducts.size > 0;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setFetchStatus(`✅ Using cached data (restore failed) ${errorMessage}`);
      return purchasedProducts.size > 0;
    }
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
        type: "inapp",
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
    } catch (error) {
    }
  };

  // Simple receipt validation (client-side only)
  const validateReceiptSimple = async (productId: string, purchase: any): Promise<boolean> => {
    if (!isProd) {
      return true; // Skip validation in development
    }

    try {
      if (Platform.OS === 'ios') {
        // iOS: Use expo-iap's built-in validation
        const result = await validateReceipt(productId);
        return result.isValid;
      } else if (Platform.OS === 'android') {
        // Android: Basic validation - check required fields exist
        return !!(purchase.purchaseTokenAndroid && purchase.packageNameAndroid);
      }
      
      return true; // Default for unsupported platforms
    } catch (error) {
      return false;
    }
  };

  // Handle unfinished transactions on startup (iOS requirement)
  const handleUnfinishedTransactions = async (): Promise<void> => {
    if (!isProd || Platform.OS !== 'ios') {
      return; // Only needed on iOS in production
    }

    try {
      // Get available purchases (unfinished transactions)
      await getAvailablePurchases();
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const unfinishedPurchases = availablePurchases || [];
      
      if (unfinishedPurchases.length > 0) {
        for (const purchase of unfinishedPurchases) {
          const productId = purchase.productId || purchase.id || purchase.sku;
          
          // Check if this purchase was already processed
          if (isProductPurchased(productId)) {
            // Already processed, just finish the transaction
            await finishTransaction({
              purchase,
              isConsumable: false,
            });
          } else {
            // Process the purchase first, then finish
            await processPurchase(purchase);
            await finishTransaction({
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
      return Platform.OS === 'ios' ? '$0.99' : '₩1,200'; // Default prices
    }

    const product = products.find((p: any) => p.id === productId);
    if (!product) return Platform.OS === 'ios' ? '$0.99' : '₩1,200';

    if (Platform.OS === 'ios') {
      return product.displayPrice || '$0.99';
    } else {
      // Android
      const androidProduct = product as any;
      return (
        androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || '₩1,200'
      );
    }
  };


  // Purchase multiple products (Android) or sequential single products (iOS)
  const purchaseProducts = async (productIds: string[]): Promise<boolean> => {
    try {
      setLastError("");

      // Check if already purchased (for non-consumable products)
      const alreadyPurchased = productIds.filter(id => isProductPurchased(id));
      if (alreadyPurchased.length > 0) {
        setFetchStatus("✅ Some products already owned");
        return true;
      }

      // Handle mock mode
      if (!isProd) {
        const newPurchasedProducts = new Set(purchasedProducts);
        productIds.forEach(id => newPurchasedProducts.add(id));
        setPurchasedProducts(newPurchasedProducts);

        await AsyncStorage.setItem(
          STORAGE_KEYS.PURCHASED_PRODUCTS,
          JSON.stringify(Array.from(newPurchasedProducts))
        );

        setFetchStatus("✅ Mock purchase successful");
        return true;
      }

      if (!connected) {
        setLastError("Not connected to store");
        return false;
      }

      if (Platform.OS === 'ios') {
        // iOS: Purchase products one by one (sequential)
        let allSuccessful = true;
        for (const productId of productIds) {
          const result = await requestPurchase({
            request: {
              ios: { 
                sku: productId,
                andDangerouslyFinishTransactionAutomatically: false,
                appAccountToken: undefined,
              },
              android: { skus: [productId] }, // Fallback for Android
            },
            type: "inapp",
          });
          
          if (!result) {
            allSuccessful = false;
            setLastError(`Failed to purchase ${productId}`);
            break;
          }
        }
        return allSuccessful;
      } else {
        // Android: Purchase all products at once
        const result = await requestPurchase({
          request: {
            ios: { sku: productIds[0] }, // Fallback for iOS
            android: { 
              skus: productIds,
              obfuscatedAccountIdAndroid: undefined,
            },
          },
          type: "inapp",
        });

        return !!result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLastError(`Purchase failed: ${errorMessage}`);
      return false;
    }
  };

  // Update fetch status when products change
  useEffect(() => {
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
  }, [products, connected, purchasedProducts]);

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
    isProductPurchased,
    purchaseProduct,
    purchaseProducts,
    restorePurchases,
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
      fetchStatus: "Platform Not Supported - IAP only available on iOS and Android",
      lastError: "Platform not supported",
      purchasedProducts: new Set(),
      isProductPurchased: () => false,
      purchaseProduct: async () => false,
      purchaseProducts: async () => false,
      restorePurchases: async () => false,
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
