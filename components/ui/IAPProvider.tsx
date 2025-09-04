import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
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
    console.log("📱 Attempting to load expo-iap...");
    useIAP = require("expo-iap").useIAP;
    console.log("✅ expo-iap loaded successfully");
  } catch (error) {
    console.log("🚫 expo-iap: Failed to load", error);
  }
} else {
  console.log("🚫 expo-iap: Not in production environment");
}

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
  subscriptions: any[];
  fetchStatus: string;
  lastError: string;
  isProductPurchased: (productId: string) => boolean;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  getProducts: () => Promise<any[]>;
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

  // Conditionally use useIAP hook
  let iapHook: any = null;

  if (isProd && useIAP) {
    try {
      iapHook = useIAP({
        onPurchaseSuccess: (purchase: any) => {
          console.log("✅ Purchase successful:", purchase);
          handlePurchaseSuccess(purchase);
        },
        onPurchaseError: (error: any) => {
          console.error("❌ Purchase failed:", error);
          handlePurchaseError(error);
        },
      });
    } catch (error) {
      console.log("⚠️ IAP: Failed to initialize useIAP:", error);
    }
  }

  // Mock data for non-production
  const mockData = {
    connected: !isProd, // Always "connected" in mock mode
    products: [],
    subscriptions: [],
    fetchProducts: async () => {},
    requestPurchase: async () => ({ success: true }),
    finishTransaction: async () => {},
    getAvailablePurchases: async (skus: string[]) => [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
  };

  // Use real IAP data in production, mock data in development
  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
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

  // Proper IAP initialization with offline-first approach
  const initializeIAP = async () => {
    console.log("🔄 IAP: Initializing with offline-first approach...");

    // Step 1: Load cached purchases immediately (offline-first)
    await loadPurchasedProducts();

    // Step 2: If in production, try to restore purchases from store
    if (isProd && connected) {
      console.log("🔄 IAP: Attempting to restore purchases from store...");
      try {
        await restorePurchases();
        // After restoration, fetch fresh product data
        await getProducts();
      } catch (error) {
        console.log("⚠️ IAP: Store restoration failed, using cache:", error);
        // If store restoration fails, we still have cache
        setFetchStatus("✅ Using cached data (offline mode)");
      }
    } else {
      console.log("🎭 IAP: Development mode, using mock data");
      setFetchStatus("🎭 Mock mode - using cached data");
    }
  };

  // Process purchase and unlock features
  const processPurchase = async (purchase: any) => {
    try {
      const productId = purchase.productId || purchase.id;
      const productDef = PRODUCT_DEFINITIONS[productId];

      if (!productDef) {
        console.log(`⚠️ Unknown product: ${productId}`);
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

      console.log(`✅ Unlocked: ${productDef.title}`);
    } catch (error) {
      console.error("❌ Error processing purchase:", error);
    }
  };

  // Handle purchase success
  const handlePurchaseSuccess = async (purchase: any) => {
    try {
      console.log("🎉 Processing successful purchase:", purchase);

      // Add to purchased products
      const newPurchasedProducts = new Set(purchasedProducts);
      newPurchasedProducts.add(purchase.id || purchase.productId);
      setPurchasedProducts(newPurchasedProducts);

      // Save to storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.PURCHASED_PRODUCTS,
        JSON.stringify(Array.from(newPurchasedProducts))
      );

      // Process the purchase to unlock features
      await processPurchase(purchase);

      // Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false, // Our products are non-consumable
      });

      console.log("✅ Purchase processed successfully");
    } catch (error) {
      console.error("❌ Error processing purchase:", error);
      setLastError(`Error processing purchase: ${error}`);
    }
  };

  // Handle purchase error
  const handlePurchaseError = (error: any) => {
    console.error("❌ Purchase error:", error);
    setLastError(`Purchase failed: ${error.message || error}`);
  };

  // Load purchased products from AsyncStorage (offline-first approach)
  const loadPurchasedProducts = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_PRODUCTS);
      if (data) {
        const purchased = JSON.parse(data);
        setPurchasedProducts(new Set(purchased));
        console.log("📦 Loaded purchased products from cache:", purchased);

        // If we have cached purchases, show them immediately (offline-first)
        if (purchased.length > 0) {
          setFetchStatus("✅ Products loaded from cache");
          console.log("✅ Showing cached purchases for offline experience");
        }
      }
    } catch (error) {
      console.error("❌ Failed to load purchased products:", error);
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
        setFetchStatus("Not connected to store");
        setLastError("Not connected to store");
        return [];
      }

      const productIds = Object.keys(PRODUCT_DEFINITIONS);
      console.log("🛍️ Fetching products:", productIds);

      await fetchProducts({
        skus: productIds,
        type: "inapp",
      });

      if (products && products.length > 0) {
        setFetchStatus(`✅ Fetched ${products.length} products from store`);

        // Enhance store products with our metadata
        const enhancedProducts = products.map((storeProduct: any) => {
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

        return enhancedProducts;
      } else {
        setFetchStatus("❌ No products returned from store");
        setLastError("No products returned from store");
        return [];
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setFetchStatus(`❌ Error: ${errorMessage}`);
      setLastError(`Exception during product fetch: ${errorMessage}`);
      console.error("❌ Error fetching products:", error);
      return [];
    }
  };

  // Purchase a product
  const purchaseProduct = async (productId: string): Promise<boolean> => {
    try {
      setLastError("");
      console.log("🛒 Attempting to purchase:", productId);

      // Handle mock mode
      if (!isProd) {
        console.log("🎭 Mock purchase successful for:", productId);
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
      const result = await requestPurchase({
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
        type: "inapp",
      });

      if (result) {
        console.log(
          "✅ Purchase initiated successfully - waiting for completion"
        );
        return true;
      } else {
        setLastError("Purchase failed - no result returned");
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setLastError(`Purchase failed: ${errorMessage}`);
      console.error("❌ Purchase error:", error);
      return false;
    }
  };

  // Restore purchases with proper offline-first approach
  const restorePurchases = async (): Promise<boolean> => {
    try {
      console.log("🔄 Restoring purchases...");

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
        console.log("⚠️ Not connected to store, using cached data");
        setFetchStatus("✅ Using cached data (offline mode)");
        return purchasedProducts.size > 0;
      }

      // Get available purchases from store
      const productIds = Object.keys(PRODUCT_DEFINITIONS);
      await getAvailablePurchases(productIds);
      const storePurchases = availablePurchases;

      if (storePurchases && storePurchases.length > 0) {
        console.log("🔄 Found purchases in store:", storePurchases);

        // Merge store purchases with cached purchases
        const newPurchasedProducts = new Set(purchasedProducts);
        let restored = false;

        for (const purchase of storePurchases) {
          const productId = purchase.id || purchase.productId;
          if (productId) {
            newPurchasedProducts.add(productId);
            restored = true;
            console.log("✅ Restored purchase:", productId);
          }
        }

        // Update state and storage
        setPurchasedProducts(newPurchasedProducts);
        await AsyncStorage.setItem(
          STORAGE_KEYS.PURCHASED_PRODUCTS,
          JSON.stringify(Array.from(newPurchasedProducts))
        );

        console.log(
          "✅ All restored purchases:",
          Array.from(newPurchasedProducts)
        );
        setFetchStatus(`✅ ${newPurchasedProducts.size} purchases restored`);
        return restored;
      } else {
        console.log("ℹ️ No purchases found in store, using cached data");
        setFetchStatus("✅ Using cached data (no store purchases)");
        return purchasedProducts.size > 0;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log("⚠️ Store restoration failed, using cache:", errorMessage);
      setFetchStatus("✅ Using cached data (restore failed)");
      return purchasedProducts.size > 0;
    }
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
      console.log("✅ Purchase status cleared");
    } catch (error) {
      console.error("❌ Error clearing purchase status:", error);
    }
  };

  // Update fetch status when products change
  useEffect(() => {
    if (products && products.length > 0) {
      const purchasedCount = purchasedProducts.size;
      setFetchStatus(
        `✅ ${products.length} products available, ${purchasedCount} purchased`
      );
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
    subscriptions,
    fetchStatus,
    lastError,
    isProductPurchased,
    purchaseProduct,
    restorePurchases,
    getProducts,
    clearError,
    refreshProducts,
    clearPurchaseStatus,
  };

  // Set the context in the purchase service
  useEffect(() => {
    setIAPContext(contextValue);
  }, [contextValue]);

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
