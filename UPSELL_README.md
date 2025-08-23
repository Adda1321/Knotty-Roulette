# 🎯 Upsell System Documentation

## Overview
The upsell system in Knotty Roulette intelligently displays offers based on user status and behavior, ensuring non-intrusive yet effective monetization.

## 🎮 User Types

### Free Users
- **Definition**: Users who haven't purchased Ad-Free
- **Experience**: See ads every 3 spins
- **Upsell Triggers**: Ad-based only

### Premium Users (Ad-Free)
- **Definition**: Users who have purchased Ad-Free
- **Experience**: No ads, uninterrupted gameplay
- **Upsell Triggers**: Game-over, shop-entry, and passive

## 🔄 Upsell Flow Logic

### Before Ad-Free Purchase (Free Users)
1. User spins wheel → Ad shows every 3 spins
2. After Xth ad → Upsell popup appears
3. **No other upsell triggers**

### After Ad-Free Purchase (Premium Users)
1. **No more ads** → Ad-based triggers removed
2. **Game Over**: Upsell every 3rd game over
3. **Shop Entry**: Upsell every 5th shop visit
4. **Passive**: Always visible bundle deals

## 📊 Current Upsell Flow Summary

| User Type | Ad Upsells | Game Over Upsells | Shop Entry Upsells | Passive Shop Offers |
|-----------|------------|-------------------|-------------------|-------------------|
| **Free Users** | ✅ Every 5th ad | ❌ None | ❌ None | ✅ Always visible |
| **Ad-Free Users** | ❌ No ads | ✅ Every 3rd game over | ✅ Every 5th shop visit | ✅ Always visible |

## 🎮 Correct Upsell Flow Now

| User State | Default Theme | College Theme | Couple Theme | Ad-Free | Passive Offer |
|------------|---------------|---------------|---------------|---------|---------------|
| **Free User** | ✅ Owned (Free) | ❌ Not Owned | ❌ Not Owned | ❌ No | **"🔥 Complete Experience Bundle!" ($6.99, save $2)** AND **"🚫 Remove Those Ads!" ($2.99)** |
| **Free User** | ✅ Owned (Free) | ✅ Purchased | ❌ Not Owned | ❌ No | **"🚫 Remove Those Ads!" ($2.99)** |
| **Free User** | ✅ Owned (Free) | ✅ Purchased | ✅ Purchased | ❌ No | **"🚫 Remove Those Ads!" ($2.99)** |
| **Ad-Free User** | ✅ Owned (Free) | ❌ Not Owned | ❌ Not Owned | ✅ Yes | **"🎨 Expand the Fun!" ($4.99, save $1)** |
| **Ad-Free User** | ✅ Owned (Free) | ✅ Purchased | ❌ Not Owned | ✅ Yes | **"✨ Complete Your Set!" ($2.99)** |

## 🎯 Trigger Types

### `'ad_based'`
- **When**: After configured ad count
- **Who**: Free users only
- **Content**: Ad-Free upgrade or All-In bundle

### `'game_over'`
- **When**: Every 3rd game over (configurable)
- **Who**: Premium users only
- **Content**: Theme pack offers based on ownership

### `'shop_entry'`
- **When**: Every 5th shop visit (configurable)
- **Who**: Premium users only
- **Content**: Featured deals and limited-time offers

### `'passive'`
- **When**: Always visible (no popups)
- **Who**: All users
- **Content**: Dynamic bundle deals in shop UI

## ⚙️ Configuration

### `constants/theme.ts`
```typescript
export const UPSELL_CONFIG = {
  AD_COUNT_BEFORE_UPSELL: 1,                    // For free users
  GAME_OVER_UPSELL_FREQUENCY: 3,                // For premium users
  SHOP_ENTRY_UPSELL_FREQUENCY: 5,               // For premium users
};
```

### Testing Different Frequencies
- **Ad Upsells**: Change `AD_COUNT_BEFORE_UPSELL` (1, 3, 5, 7, 10)
- **Game Over**: Change `GAME_OVER_UPSELL_FREQUENCY` (1, 2, 3, 5, 10)
- **Shop Entry**: Change `SHOP_ENTRY_UPSELL_FREQUENCY` (1, 3, 5, 7, 10)

## 🎨 Dynamic Bundle Offers

### Smart Content Generation
- **Free Users (No Purchases)**: "🔥 Complete Experience Bundle" ($6.99, save $2)
- **Free Users (With Purchases)**: "🚫 Remove Those Ads!" ($2.99)
- **Ad-Free Users (No Themes)**: "🎨 Expand the Fun!" ($4.99, save $1)
- **Ad-Free Users (1 Theme)**: "✨ Complete Your Set!" ($2.99)
- **Complete Users**: "🎉 Collection Complete" celebration

### Key Implementation Detail
- **DEFAULT theme** is always owned (free) and excluded from purchase logic
- **Only COLLEGE/COUPLE themes** count as actual purchases
- **Logic**: `purchasedPacks.filter(pack => pack !== 'default')`

### Best Deal Badges
- Only shown when applicable (e.g., bundle savings)
- Automatically applied based on user state
- No "Best Deal" for partial upgrades

## 🏗️ Architecture

### Services
- **`upsellService`**: Core logic and tracking
- **`adService`**: Ad view tracking for free users
- **`purchaseService`**: Purchase handling
- **`userService`**: User tier management

### Components
- **`UpsellModal`**: Centralized upsell display
- **`GameBoard`**: Game over tracking
- **`ThemeStore`**: Shop entry tracking + passive offers

### State Management
- **AsyncStorage**: Persistent tracking across sessions
- **React State**: UI state management
- **Service Singletons**: Centralized business logic

## 🚀 Key Benefits

- ✅ **Non-Intrusive**: No forced popups at app start
- ✅ **Contextual**: Different offers for different user states
- ✅ **Configurable**: Easy to adjust frequencies for testing
- ✅ **User-Friendly**: Light upsells for premium users
- ✅ **Revenue Optimized**: Maintains ad-based flow for free users

## 🔍 Testing Scenarios

1. **Free User Flow**: Spin wheel → See ads → Get upsell after X ads
2. **Premium User Flow**: Complete games → Get upsell every X game overs
3. **Shop Entry Flow**: Open shop → Get upsell every X visits
4. **Passive Flow**: Always see relevant bundle deals in shop

## 📝 Notes

- **No nested modals**: iOS limitation handled by page-based navigation
- **Mock purchases**: Currently using mock IAP (ready for real implementation)
- **Real-time updates**: Offers refresh after successful purchases
- **Error handling**: Graceful fallbacks for failed operations 