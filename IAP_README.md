# In-App Purchase (IAP) System Documentation

## 📋 Overview

This document explains the IAP system implementation for Knotty Roulette, including purchase restoration, offline-first architecture, and environment handling.

## 🏗️ Architecture

### **Core Components**

#### **1. IAPProvider (`components/ui/IAPProvider.tsx`)**
- **Purpose**: Main IAP context provider using `expo-iap` v2.8+
- **Features**: 
  - Offline-first purchase restoration
  - Event-driven purchase handling
  - Mock data for development
  - Production/development environment handling

#### **2. PurchaseService (`services/purchaseService.ts`)**
- **Purpose**: Business logic layer for IAP operations
- **Features**:
  - Feature unlocking (ad-free, theme packs)
  - Purchase validation
  - Delegates to IAPProvider for actual IAP operations

#### **3. UserService (`services/userService.ts`)**
- **Purpose**: Single source of truth for user premium status
- **Features**:
  - Premium/free tier management
  - Event system for tier changes
  - Persistent storage

## 🔄 Purchase Restoration Algorithm

### **Offline-First Approach**

#### **Case 1: App Reopened (Has Cache)**
1. ✅ Load cached purchases immediately
2. ✅ Show cached status while store loads
3. ✅ Try to restore from store in background
4. ✅ Merge store + cache for complete picture
5. ✅ Update cache with any new purchases

#### **Case 2: New Device/Reinstall (No Cache)**
1. ✅ Connect to store first
2. ✅ Fetch available purchases from store
3. ✅ Restore all purchases from store
4. ✅ Save to cache for future offline use

### **Environment Handling**

#### **Development Mode (Expo Go)**
- Uses mock data and functions
- No real IAP calls
- Simulates purchase flow
- Perfect for testing UI

#### **Production Mode (Native Build)**
- Uses real `expo-iap` library
- Connects to Google Play/App Store
- Handles real purchase flow
- Restores purchases from store

## 📦 Storage Keys

### **Centralized Storage (`constants/storageKeys.ts`)**

```typescript
export const STORAGE_KEYS = {
  // User and Premium Status
  USER_TIER: 'knotty_roulette_user_tier',
  
  // IAP and Purchases
  PURCHASED_PRODUCTS: 'knotty_roulette_purchased_products',
  PRODUCT_CACHE: 'knotty_roulette_product_cache',
  LAST_PRODUCT_FETCH: 'knotty_roulette_last_product_fetch',
  
  // Theme Packs
  PURCHASED_PACKS: 'knotty_roulette_purchased_packs',
  CURRENT_PACK: 'knotty_roulette_current_pack',
  
  // Upsell System
  AD_COUNT: 'knotty_roulette_ad_count',
  LAST_UPSELL_SHOWN: 'knotty_roulette_last_upsell_shown',
  UPSELL_DISMISSED_COUNT: 'knotty_roulette_upsell_dismissed_count',
  GAME_OVER_COUNT: 'knotty_roulette_game_over_count',
  LAST_GAME_OVER_UPSELL: 'knotty_roulette_last_game_over_upsell',
  SHOP_ENTRY_COUNT: 'knotty_roulette_shop_entry_count',
  LAST_SHOP_UPSELL: 'knotty_roulette_last_shop_upsell',
} as const;
```

### **Key Differences**

#### **PURCHASED_PRODUCTS vs PURCHASED_PACKS**
- **`PURCHASED_PRODUCTS`**: Raw IAP product IDs from store
  - Examples: `["ad_free_removal", "complete_experience_bundle"]`
  - Used by IAPProvider for IAP validation
  
- **`PURCHASED_PACKS`**: App-level theme pack IDs
  - Examples: `["default", "college", "couple"]`
  - Used by ThemePackService for theme switching

## 🛍️ Product Definitions

### **Available Products**

```typescript
const PRODUCT_DEFINITIONS = {
  ad_free_removal: {
    title: "Remove Ads",
    description: "Remove all ads and enjoy uninterrupted gameplay",
    price: "$2.99",
    unlocks: ["ad_free"],
  },
  college_theme_pack: {
    title: "College Theme Pack",
    description: "Unlock the exciting college theme for your wheel",
    price: "$2.99",
    unlocks: ["college_theme"],
  },
  couple_theme_pack: {
    title: "Couple Theme Pack",
    description: "Unlock the romantic couple theme for your wheel",
    price: "$2.99",
    unlocks: ["couple_theme"],
  },
  complete_experience_bundle: {
    title: "Complete Experience Bundle",
    description: "Get everything: All themes + Ad-free (Save $2)",
    price: "$6.99",
    unlocks: ["ad_free", "college_theme", "couple_theme"],
  },
  expand_fun_bundle: {
    title: "Expand the Fun Bundle",
    description: "Both theme packs (Save $1)",
    price: "$4.99",
    unlocks: ["college_theme", "couple_theme"],
  },
};
```

## 🔧 Environment Configuration

### **Environment Variables**

```typescript
// utils/environment.ts
export const isProduction = () => {
  return process.env.EXPO_PUBLIC_IS_PRODUCTION === 'true';
};

export const isExpoGo = () => {
  return Constants.expoConfig === null || Constants.expoConfig === undefined;
};

export const isNativeEnvironment = () => {
  return !isExpoGo();
};
```

### **Environment Matrix**

| Environment | Expo Go | Native | IAP | Ads |
|-------------|---------|--------|-----|-----|
| Development | ✅ | ❌ | Mock | Test |
| Preview | ❌ | ✅ | Mock | Test |
| Production | ❌ | ✅ | Real | Real |

## 🚀 Usage Examples

### **Checking Purchase Status**

```typescript
import { useIAPContext } from '../components/ui/IAPProvider';

const MyComponent = () => {
  const iapContext = useIAPContext();
  
  if (iapContext?.isProductPurchased('ad_free_removal')) {
    // User has ad-free
  }
};
```

### **Making a Purchase**

```typescript
const handlePurchase = async () => {
  const success = await iapContext?.purchaseProduct('ad_free_removal');
  if (success) {
    // Purchase successful
  }
};
```

### **Restoring Purchases**

```typescript
const handleRestore = async () => {
  const restored = await iapContext?.restorePurchases();
  if (restored) {
    // Purchases restored
  }
};
```

## 🐛 Debugging

### **Status Messages**

- `✅ 5 products available, 2 purchased` - Store connected, products loaded
- `✅ Connected, 2 purchases restored from cache` - Using cached data
- `✅ Offline mode, 2 purchases from cache` - No internet, using cache
- `Connected but no products loaded` - Store connected but no products
- `Not connected to store` - Store not available

### **Debug Information**

The IAPProvider shows debug info in ThemeStore:
- IAP Connected: ✅/❌
- Products: X
- Premium: ✅/❌

## 🔄 Purchase Flow

### **1. Purchase Initiation**
```typescript
// User clicks purchase button
const success = await iapContext.purchaseProduct('ad_free_removal');
```

### **2. Event-Driven Processing**
```typescript
// IAPProvider handles the event
onPurchaseSuccess: (purchase) => {
  // Process purchase and unlock features
  await processPurchase(purchase);
}
```

### **3. Feature Unlocking**
```typescript
// Unlock features based on product
if (unlock === "ad_free") {
  await userService.setPremium("lifetime");
  await adService.onUserTierChange(); // Stop showing ads
}
```

### **4. Cache Update**
```typescript
// Save to AsyncStorage for offline access
await AsyncStorage.setItem(
  STORAGE_KEYS.PURCHASED_PRODUCTS,
  JSON.stringify(Array.from(newPurchasedProducts))
);
```

## 🧪 Testing

### **Development Testing**
- Use mock data in Expo Go
- Test UI without real purchases
- Simulate purchase flow

### **Production Testing**
- Test on native builds
- Verify purchase restoration
- Test offline scenarios

## 📱 Platform Support

- **Android**: Google Play Billing
- **iOS**: App Store Connect
- **Expo Go**: Mock implementation

## 🔒 Security

- All purchases validated through platform stores
- No client-side purchase validation
- Secure storage of purchase status
- Proper error handling for network issues

## 🚨 Troubleshooting

### **Common Issues**

1. **"Connected but no products loaded"**
   - Check product IDs in store
   - Verify store connection
   - Check network connectivity

2. **"Purchase failed"**
   - Check store configuration
   - Verify product setup
   - Check user's payment method

3. **"Products not restored"**
   - Check store connection
   - Verify purchase history
   - Check cache data

### **Debug Steps**

1. Check console logs for IAP status
2. Verify environment configuration
3. Test purchase restoration
4. Check AsyncStorage data
5. Verify store connection

## 📚 Related Files

- `components/ui/IAPProvider.tsx` - Main IAP context
- `services/purchaseService.ts` - Business logic
- `services/userService.ts` - User tier management
- `services/adService.ts` - Ad management
- `services/upsellService.ts` - Upsell logic
- `constants/storageKeys.ts` - Storage keys
- `utils/environment.ts` - Environment utilities
