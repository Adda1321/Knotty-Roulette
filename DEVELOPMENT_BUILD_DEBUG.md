# Development Build Debugging Guide

## Common Issues & Solutions

### 1. App Crashes on Launch

**Symptoms**: App installs but crashes immediately when opened

**Causes & Solutions**:

#### A. Missing Development Server
```bash
# Start the development server FIRST
npm run start:dev-client

# Then install and open the development build
```

#### B. Network Issues
```bash
# Try using tunnel mode
expo start --dev-client --tunnel

# Or ensure device and computer are on same network
```

#### C. Native Module Conflicts
- Check if all native modules are properly configured
- Ensure `expo-dev-client` is installed
- Verify Google Mobile Ads configuration

### 2. Development Build Won't Connect

**Symptoms**: App opens but shows "Unable to connect to development server"

**Solutions**:

1. **Check Server Status**:
   ```bash
   # Make sure server is running
   npm run start:dev-client
   ```

2. **Check Network**:
   - Ensure device and computer are on same WiFi
   - Try using tunnel mode: `expo start --dev-client --tunnel`

3. **Check IP Address**:
   - Use the IP address shown in the terminal
   - Make sure it's accessible from your device

### 3. Google Mobile Ads Issues

**Symptoms**: App crashes with "RNGoogleMobileAdsModule" error

**Solutions**:

1. **Use Development Build** (not Expo Go):
   ```bash
   # Build development client
   npm run build:android-dev
   
   # Start development server
   npm run start:dev-client
   ```

2. **Check AdMob Configuration**:
   - Verify app.json has correct plugin configuration
   - Ensure test ad unit IDs are used in development

### 4. Build Process

**Correct Order**:

1. **Build Development Client**:
   ```bash
   eas build --platform android --profile development
   ```

2. **Install APK** on device

3. **Start Development Server**:
   ```bash
   npm run start:dev-client
   ```

4. **Open Development Build App** (not Expo Go)

5. **Scan QR Code** from terminal

### 5. Testing Different Modes

**Expo Go (No Ads)**:
```bash
npm run start:expo-go
```

**Development Build (With Ads)**:
```bash
npm run start:dev-client
```

### 6. Troubleshooting Commands

```bash
# Check if expo-dev-client is installed
npm list expo-dev-client

# Clear Metro cache
npx expo start --clear

# Check EAS build status
eas build:list

# View build logs
eas build:view
```

### 7. Common Error Messages

**"Unable to connect to development server"**:
- Server not running
- Network connectivity issues
- Wrong IP address

**"RNGoogleMobileAdsModule could not be found"**:
- Using Expo Go instead of development build
- Native module not properly linked

**"App crashes on launch"**:
- Missing development server
- Native module conflicts
- Asset loading issues

### 8. Development Workflow

1. **For UI Development**: Use Expo Go
   ```bash
   npm run start:expo-go
   ```

2. **For Ad Testing**: Use Development Build
   ```bash
   npm run start:dev-client
   ```

3. **For Production Testing**: Use Production Build
   ```bash
   eas build --profile production
   ```

### 9. Network Configuration

**Local Network**:
- Device and computer must be on same WiFi
- Use local IP address from terminal

**Tunnel Mode**:
```bash
expo start --dev-client --tunnel
```
- Works across different networks
- Slower but more reliable

### 10. Device Requirements

**Android**:
- Enable "Install from unknown sources"
- Allow app permissions when prompted
- Use development build APK (not Expo Go)

**iOS**:
- Install via TestFlight or direct installation
- Trust developer certificate in Settings

## Quick Test

1. **Start server**: `npm run start:dev-client`
2. **Install development build** on device
3. **Open development build app**
4. **Scan QR code**
5. **App should load with ads working**

If it still crashes, check the terminal for error messages and follow the specific troubleshooting steps above. 