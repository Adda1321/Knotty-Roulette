# AdMob Integration for Knotty Roulette

## Overview
This document describes the AdMob integration for the Knotty Roulette app, which shows interstitial ads to free users every 3 spins.

## Architecture

### Services
- **`userService.ts`**: Manages user tier (free/premium) with AsyncStorage persistence
- **`adService.ts`**: Handles AdMob interstitial ads with automatic loading and display logic

### Key Features
- **Free Users**: See interstitial ads every 3 spins
- **Premium Users**: No ads shown
- **Automatic Ad Loading**: Ads are preloaded for smooth user experience
- **Error Handling**: Graceful fallback if ads fail to load
- **Development Testing**: Test ads in development, real ads in production

## Configuration

### AdMob Setup
1. **Test IDs** (Development):
   - Android: `ca-app-pub-3940256099942544~3347511713`
   - iOS: `ca-app-pub-3940256099942544~1458002511`
   - Interstitial: `ca-app-pub-3940256099942544/1033173712`

2. **Production IDs** (Replace when ready):
   - Update `AD_CONFIG.INTERSTITIAL_ID` in `services/adService.ts`
   - Update app IDs in `app.json`

### App Configuration
```json
{
  "expo": {
    "plugins": [
      [
        "expo-ads-admob",
        {
          "androidAppId": "ca-app-pub-3940256099942544~3347511713",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ]
  }
}
```

## Usage

### Service Initialization
```typescript
// Initialize in app startup
await userService.initialize();
await adService.initialize();
```

### Track Spins
```typescript
// Call this every time user spins the wheel
await adService.trackSpin();
```

### User Tier Management
```typescript
// Set user as premium (no ads)
await userService.setPremium();

// Set user as free (with ads)
await userService.setFree();

// Check user tier
const isPremium = userService.isPremium();
```

## Development Testing

### User Tier Toggle
A development component `UserTierToggle` is included for testing:
- Toggle between free/premium tiers
- Automatically updates ad service
- Positioned in top-right corner of GameBoard

### Test Ads
- Development uses Google's test ad unit IDs
- No real ads shown during development
- Test device ID set to 'EMULATOR'

## Production Deployment

### Before Release
1. Replace test ad unit IDs with real ones
2. Remove `UserTierToggle` component
3. Test with real ad unit IDs
4. Ensure compliance with AdMob policies

### AdMob Policies
- Follow [AdMob Program Policies](https://support.google.com/admob/answer/6128543)
- Ensure ads don't interfere with gameplay
- Test ad frequency and placement

## Error Handling

### Ad Loading Failures
- Graceful fallback if ads fail to load
- Automatic retry on next spin
- No impact on game functionality

### Network Issues
- Ads won't show if network is unavailable
- Game continues normally without ads
- Automatic retry when network returns

## Performance Considerations

### Memory Management
- Ads are cleaned up when user becomes premium
- Event listeners are properly removed
- No memory leaks from ad components

### User Experience
- Ads are preloaded for smooth display
- No blocking of game functionality
- Minimal impact on game performance

## Future Enhancements

### In-App Purchase Integration
- Replace manual tier setting with real IAP
- Integrate with App Store/Play Store
- Handle subscription renewals

### Advanced Ad Features
- Banner ads for additional revenue
- Rewarded ads for bonus features
- A/B testing for ad frequency

### Analytics
- Track ad performance metrics
- Monitor user engagement
- Optimize ad placement and frequency 