import Constants from 'expo-constants';
import { Platform } from 'react-native';
import upsellService from './upsellService';
import userService from './userService';

// Debug: Log the environment info
const debugEnvironment = () => {
  console.log('🔍 Environment Debug:', {
    expoConfig: Constants.expoConfig,
    eas: Constants.expoConfig?.extra?.eas,
    buildProfile: Constants.expoConfig?.extra?.eas?.buildProfile,
    isDev: __DEV__,
    isExpoGo: Constants.expoConfig === null || Constants.expoConfig === undefined
  });
};

// Simple check: Are we in a native environment?
const isNativeEnvironment = () => {
  const buildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
  const isExpoGo = Constants.expoConfig === null || Constants.expoConfig === undefined;
  const isNative = !isExpoGo; // If not Expo Go, we're in a native environment (dev build, preview, or production)
  console.log(`🌐 Native Environment Check: ${isNative} (buildProfile: ${buildProfile}, isExpoGo: ${isExpoGo})`);
  return isNative;
};

// Simple check: Are we in production?
const isProduction = () => {
  const buildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
  const isProd = buildProfile === 'production';
  console.log(`🏭 Production Check: ${isProd} (buildProfile: ${buildProfile})`);
  return isProd;
};

// Conditionally import AdMob
let AdEventType: any, InterstitialAd: any, TestIds: any;

if (isNativeEnvironment()) {
  try {
    console.log('📱 Attempting to load AdMob...');
    const admob = require('react-native-google-mobile-ads');
    AdEventType = admob.AdEventType;
    InterstitialAd = admob.InterstitialAd;
    TestIds = admob.TestIds;
    console.log('✅ AdMob loaded successfully:', { AdEventType: !!AdEventType, InterstitialAd: !!InterstitialAd, TestIds: !!TestIds });
  } catch (error) {
    console.log('🚫 AdMob: Failed to load', error);
  }
} else {
  console.log('🚫 AdMob: Not in native environment');
}

// Simple ad configuration
const AD_CONFIG = {
  INTERSTITIAL_ID: isProduction() 
    ? Platform.select({
        android: 'ca-app-pub-9976626838955349/2586969967',
        ios: 'ca-app-pub-9976626838955349~7843166076',
        default: 'ca-app-pub-9976626838955349/2586969967',
      })
    : TestIds?.INTERSTITIAL || 'test-id'
};

class AdService {
  private spinCount = 0;
  private readonly SPINS_BEFORE_AD = 3;
  private isAdLoading = false;
  private isAdReady = false;
  private interstitialAd: any = null;

  /**
   * Check if AdMob is available
   */
  isAdMobAvailable(): boolean {
    return InterstitialAd !== undefined;
  }

  /**
   * Initialize the ad service
   */
  async initialize(): Promise<void> {
    // Debug environment first
    debugEnvironment();
    
    if (!this.isAdMobAvailable() || userService.isPremium()) {
      console.log('🚫 AdMob: Not available or user is premium');
      return;
    }

    console.log(`🎯 AdMob: ${isProduction() ? 'Production' : 'Test'} ads enabled`);
    await this.loadInterstitialAd();
    
    // Listen for user tier changes
    userService.onTierChange(() => this.onUserTierChange());
  }

  /**
   * Load interstitial ad
   */
  private async loadInterstitialAd(): Promise<void> {
    if (!InterstitialAd || this.isAdLoading || this.isAdReady) return;

    try {
      this.isAdLoading = true;
      this.interstitialAd = InterstitialAd.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['game', 'entertainment'],
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isAdReady = true;
        this.isAdLoading = false;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
        this.isAdReady = false;
        this.isAdLoading = false;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isAdReady = false;
        this.loadInterstitialAd();
      });

      await this.interstitialAd.load();
    } catch (error) {
      this.isAdReady = false;
      this.isAdLoading = false;
    }
  }

  /**
   * Track spin and show ad if needed
   */
  async trackSpin(): Promise<void> {
    if (!InterstitialAd || userService.isPremium()) return;

    this.spinCount++;
    if (this.spinCount >= this.SPINS_BEFORE_AD) {
      await this.showInterstitialAd();
      this.spinCount = 0;
      
      // Track ad view for upsell logic
      await upsellService.trackAdView();
    }
  }

  /**
   * Show interstitial ad
   */
  private async showInterstitialAd(): Promise<void> {
    if (!this.isAdReady) {
      await this.loadInterstitialAd();
      return;
    }

    try {
      await this.interstitialAd.show();
    } catch (error) {
      this.isAdReady = false;
      await this.loadInterstitialAd();
    }
  }

  /**
   * Reset spin counter
   */
  resetSpinCounter(): void {
    this.spinCount = 0;
  }

  /**
   * Update ad service when user tier changes
   */
  async onUserTierChange(): Promise<void> {
    if (!InterstitialAd) return;

    if (userService.isPremium()) {
      this.cleanup();
      // Reset upsell ad count when user becomes premium
      await upsellService.resetAdCount();
    } else {
      await this.initialize();
    }
  }

  /**
   * Clean up ad service
   */
  cleanup(): void {
    this.interstitialAd = null;
    this.isAdReady = false;
    this.isAdLoading = false;
  }
}

// Export singleton instance
const adService = new AdService();
export default adService; 