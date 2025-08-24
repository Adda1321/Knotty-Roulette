# In-App Purchases Implementation

## 🎯 Overview
Knotty Roulette now supports in-app purchases for premium tier upgrades.

## 📱 Features
- **Premium Pack**: $4.99 one-time purchase
- **Ad-free experience** for premium users
- **Purchase restoration** for existing customers
- **Automatic tier management** with persistence
- **Development testing** with simulated purchases

## 🔧 Technical Implementation

### Services
- **`purchaseService.ts`**: Handles all purchase operations
- **`userService.ts`**: Manages user tier with callbacks
- **`adService.ts`**: Automatically responds to tier changes

### Components
- **`PremiumUpgradeModal.tsx`**: Modern purchase UI
- **`SoundSettings.tsx`**: Integrated premium upgrade option

## 🛒 Product Configuration

### Product ID
```
knotty_roulette_premium_pack
```

### Price
- **$4.99** (one-time purchase)
- **Lifetime access** to premium features

## 📋 Setup Requirements

### 1. App Store Connect (iOS)
1. Create in-app purchase product
2. Product ID: `knotty_roulette_premium_pack`
3. Type: Non-Consumable
4. Price: $4.99
5. Status: Ready to Submit

### 2. Google Play Console (Android)
1. Create in-app product
2. Product ID: `knotty_roulette_premium_pack`
3. Type: Non-Consumable
4. Price: $4.99
5. Status: Active

### 3. Testing
- **Sandbox testing** available in development builds
- **Test accounts** required for App Store testing
- **License testing** available for Play Store
- **Development simulation** for free testing

## 🧪 Testing Process

### Development Testing (FREE)
```bash
# No real money needed for testing!
# Development builds automatically simulate purchases

1. Create development build:
   eas build --platform android --profile development
   eas build --platform ios --profile development

2. Install and test:
   - All purchases are simulated
   - No real money charged
   - Premium features work immediately
   - Purchase restoration works
```

### Sandbox Testing (iOS)
```bash
# Create sandbox test account:
1. App Store Connect → Users and Access → Sandbox Testers
2. Create test account with fake email
3. Use test account on device
4. All purchases are FREE in sandbox
```

### License Testing (Android)
```bash
# Add test accounts:
1. Play Console → Setup → License Testing
2. Add your email addresses
3. Use test accounts on device
4. All purchases are FREE for test accounts
```

### Testing Checklist
- [ ] Purchase flow works
- [ ] Premium features unlock
- [ ] Ads are disabled
- [ ] Purchase restoration works
- [ ] App restart maintains premium status
- [ ] Network error handling
- [ ] Multiple devices testing

## 🎮 User Experience

### Free Users
- See ads every 3 spins
- Access to premium upgrade in settings
- Clear benefits presentation

### Premium Users
- No advertisements
- Premium status indicator
- Lifetime access

## 🔄 Purchase Flow
1. User taps "Upgrade to Premium" in settings
2. Premium modal shows benefits and price
3. User confirms purchase
4. Store processes payment (FREE in testing)
5. User tier automatically updates
6. Ads are disabled immediately

## 🛠️ Development Notes

### Testing
```bash
# Development build required for testing
eas build --platform android --profile development
eas build --platform ios --profile development

# Testing features:
- Simulated purchases (no real money)
- Mock product data
- Purchase delay simulation
- Restoration testing
```

### Debugging
- Check console logs for purchase events
- Verify product IDs match store configuration
- Test purchase restoration flow
- Monitor user tier changes

### Development Mode Features
- **Simulated purchases**: No real money charged
- **Mock products**: Returns test product data
- **Purchase delays**: Simulates real purchase timing
- **Restoration testing**: Checks existing premium status

## 📱 UI/UX Features
- **Modern design** with sparkles and animations
- **Clear benefits** presentation
- **Smooth transitions** and haptic feedback
- **Professional pricing** display
- **Restore purchases** option

## 🔒 Security
- **Server-side validation** recommended for production
- **Receipt verification** for critical purchases
- **Fraud prevention** measures

## 🚀 Production Checklist
- [ ] Configure products in App Store Connect
- [ ] Configure products in Google Play Console
- [ ] Test purchase flow in sandbox
- [ ] Test purchase restoration
- [ ] Verify ad removal for premium users
- [ ] Test edge cases (network errors, etc.)
- [ ] Implement server-side receipt validation (optional)

## 📞 Support
For issues with in-app purchases:
1. Check store configuration
2. Verify product IDs
3. Test with development build
4. Review console logs
5. Contact store support if needed

## 💡 Testing Tips
- **Development builds** simulate purchases for free
- **Sandbox accounts** allow free testing on iOS
- **License testing** allows free testing on Android
- **No real money** needed during development
- **Test all scenarios** before production release 