# 🛒 IAP Implementation Guide

## Overview
The purchase service has been updated to support all the individual products and bundles mentioned in your UPSELL_README.md. It maintains backward compatibility while adding new IAP functionality with persistent storage and caching.

## 🆕 New Product IDs

### Individual Products
- `ad_free_removal` - $2.99 (Remove ads)
- `college_theme_pack` - $2.99 (College theme)
- `couple_theme_pack` - $2.99 (Couple theme)

### Bundle Products
- `complete_experience_bundle` - $6.99 (All themes + ad-free, save $2)
- `expand_fun_bundle` - $4.99 (Both themes, save $1)

## 🔧 How to Use

### 1. Basic Purchase
```typescript
import purchaseService from '../services/purchaseService';

// Purchase any product by ID
const success = await purchaseService.purchaseProduct('ad_free_removal');

// Or use convenience methods
const success = await purchaseService.purchaseAdFree();
const success = await purchaseService.purchaseCompleteBundle();
```

### 2. Get All Products
```typescript
const products = await purchaseService.getProducts();
// Returns array with product details, pricing, unlock information, and purchase status
```

### 3. Check Purchase Status
```typescript
// Check if specific product is purchased
const isPurchased = purchaseService.isProductPurchased('college_theme_pack');

// Get all purchased product IDs
const purchasedIds = purchaseService.getPurchasedProductIds();
```

### 4. Restore Purchases
```typescript
const restored = await purchaseService.restorePurchases();
// Automatically restores all previous purchases from store
```

### 5. Check IAP Availability
```typescript
const isAvailable = await purchaseService.isIAPAvailable();
// Returns true in production builds with expo-iap, false in Expo GO
```

## 🎯 Product Definitions

Each product includes metadata about what it unlocks:

```typescript
{
  productId: 'complete_experience_bundle',
  title: 'Complete Experience Bundle',
  description: 'Get everything: All themes + Ad-free (Save $2)',
  price: '$6.99',
  type: 'bundle',
  unlocks: ['ad_free', 'college_theme', 'couple_theme'],
  savings: '$2.00',
  isPurchased: false // Current purchase status
}
```

## 💾 Persistence & Caching

### Purchase Persistence
- **Local Storage**: All purchases are saved to AsyncStorage
- **Cross-Session**: Purchases persist between app launches
- **Cross-Device**: Purchases restore from Google Play/App Store on same account

### Product Caching
- **1-Hour Cache**: Product details cached to reduce API calls
- **Offline Support**: Cached products available when offline
- **Auto-Refresh**: Cache automatically refreshes when stale

### Storage Keys
- `knotty_roulette_purchased_products` - List of purchased product IDs
- `knotty_roulette_product_cache` - Cached product details
- `knotty_roulette_last_product_fetch` - Last product fetch timestamp

## 🚀 Development vs Production

### Expo GO (Development)
- Uses mock IAP service
- **No delays** - purchases complete immediately
- Automatically unlocks features
- Perfect for UI/UX testing

### Production Builds
- Uses real expo-iap
- Connects to Google Play/App Store
- Handles real purchase validation
- Restores purchases automatically

## 🔄 Purchase Flow

1. **Initialize** - Service loads cached data and connects to store
2. **Purchase** - User selects product, IAP flow begins
3. **Process** - Purchase is validated and features are unlocked
4. **Persist** - Purchase status saved to AsyncStorage
5. **Update** - UI refreshes to show new unlocked content
6. **Upsell** - Post-purchase upsells are triggered if applicable

## 🛡️ Error Handling

The service gracefully handles:
- Network failures
- Invalid product IDs
- Purchase cancellations
- Store connection issues
- Missing expo-iap in development
- Cache corruption (falls back to fresh fetch)

## 📱 Integration Points

### Theme Store
- Replace mock purchases with `purchaseService.purchaseProduct()`
- Use `purchaseService.getProducts()` for dynamic pricing
- Check `isPurchased` status for UI state
- Handle bundle purchases with single method calls

### Upsell System
- Use specific product IDs for targeted offers
- Leverage product metadata for dynamic content
- Check purchase status before showing offers
- Maintain existing upsell flow logic

## 🔄 Cross-Device & Reinstall Support

### Same Google/Apple Account
- Purchases automatically restore from store
- No manual intervention required
- Works across different devices
- Handles account transfers

### App Reinstall
- Local purchase cache preserved
- Store validation on first launch
- Automatic purchase restoration
- Seamless user experience

## 🧪 Testing

### Mock Testing (Expo GO)
```typescript
// Clear all purchase status for testing
await purchaseService.clearPurchaseStatus();

// Test individual purchases
await purchaseService.purchaseAdFree();

// Test bundle purchases
await purchaseService.purchaseCompleteBundle();

// Check purchase status
const isPurchased = purchaseService.isProductPurchased('ad_free_removal');
```

### Production Testing
1. Add product IDs to Google Play Console
2. Set up internal testing
3. Use test accounts for purchases
4. Verify purchase restoration
5. Test cross-device scenarios

## 🔗 Dependencies

- `expo-iap` - For production IAP functionality
- `@react-native-async-storage/async-storage` - For purchase persistence
- `expo-constants` - For build profile detection

## 📝 Notes

- **Non-consumable products**: All products are one-time purchases
- **Automatic restoration**: Purchases are restored on app launch
- **Clean API**: Uses clear method names like `purchaseAdFree()`, `purchaseCompleteBundle()`
- **Safe in Expo GO**: Won't crash, gracefully falls back to mock service
- **TypeScript support**: Full type safety for all methods and products
- **No mock delays**: Purchases complete immediately in development
- **Persistent storage**: All data survives app restarts and reinstalls

## 🚨 Important

- Product IDs must match exactly in Google Play Console
- Test thoroughly with internal testing before release
- Handle purchase failures gracefully in UI
- Implement proper loading states during purchases
- Cache provides offline support but may be stale
- Purchases restore automatically from store on same account 