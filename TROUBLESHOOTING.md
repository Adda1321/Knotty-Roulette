# Troubleshooting Guide

## Common Errors & Solutions

### 1. RNGoogleMobileAdsModule Error

**Error**: `TurboModuleRegistry.getEnforcing(...): 'RNGoogleMobileAdsModule' could not be found`

**Cause**: You're trying to run the app with native modules in Expo Go, which doesn't support native code.

**Solutions**:

#### Option A: Use Expo Go (No Ads)
```bash
# Run in Expo Go mode (ads disabled)
npm run start:expo-go
# or
EXPO_PUBLIC_USE_EXPO_GO=true expo start
```

#### Option B: Use Development Build (With Ads)
```bash
# 1. Build development client first
npm run build:android-dev

# 2. Install the APK on your device

# 3. Start development server
npm run start:dev-client

# 4. Open the development build app (not Expo Go)
```

#### Option C: Use the App Runner
```bash
# Interactive menu to choose run mode
npm run run
```

### 2. Missing Default Export Error

**Error**: `Route "./(tabs)/index.tsx" is missing the required default export`

**Solution**: The file has been fixed to ensure proper default export. If you still see this error:

1. Clear Metro cache:
```bash
npx expo start --clear
```

2. Restart the development server:
```bash
npm run start:expo-go
```

### 3. Development Build Won't Connect

**Symptoms**: App opens but shows "Unable to connect to development server"

**Solutions**:

1. **Check Server Status**:
   ```bash
   npm run start:dev-client
   ```

2. **Use Tunnel Mode**:
   ```bash
   expo start --dev-client --tunnel
   ```

3. **Check Network**:
   - Ensure device and computer are on same WiFi
   - Try using the IP address shown in terminal

### 4. App Crashes on Launch

**Solutions**:

1. **Clear Cache**:
   ```bash
   npx expo start --clear
   ```

2. **Reset Project**:
   ```bash
   npm run reset-project
   ```

3. **Check Dependencies**:
   ```bash
   npm install
   ```

## Quick Start Guide

### For Testing UI/Features (No Ads)
```bash
npm run start:expo-go
```
- Use Expo Go app
- No native modules
- Fast development

### For Full Testing (With Ads)
```bash
# 1. Build development client
npm run build:android-dev

# 2. Install APK on device

# 3. Start development server
npm run start:dev-client

# 4. Open development build app
```

### For Web Testing
```bash
npm run web
```

## Environment Variables

The app uses these environment variables:

- `EXPO_PUBLIC_USE_EXPO_GO=true`: Disables ads for Expo Go compatibility
- Default (not set): Enables ads for development builds

## File Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Main game screen
│   └── _layout.tsx        # Tab layout
├── _layout.tsx            # Root layout
└── +not-found.tsx        # 404 page

services/
├── adService.ts           # AdMob integration (conditional)
├── audio.ts              # Sound effects
├── backgroundMusic.ts     # Background music
└── userService.ts        # User tier management
```

## Debugging Tips

1. **Check Console Logs**: Look for emoji-prefixed logs:
   - 🎯 AdMob logs
   - 🎵 Audio logs
   - 📱 Platform logs

2. **Test Different Modes**:
   - Expo Go: `npm run start:expo-go`
   - Development Build: `npm run start:dev-client`
   - Web: `npm run web`

3. **Clear Cache When Needed**:
   ```bash
   npx expo start --clear
   ```

## Common Commands

```bash
# Interactive app runner
npm run run

# Expo Go mode (no ads)
npm run start:expo-go

# Development build mode (with ads)
npm run start:dev-client

# Build development client
npm run build:android-dev

# Web mode
npm run web

# Clear cache
npx expo start --clear
``` 