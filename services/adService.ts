import Constants from 'expo-constants';
import { Platform } from 'react-native';
import userService from './userService';

// Conditionally import AdMob only when not in Expo Go
let AdEventType: any, InterstitialAd: any, TestIds: any;

try {
  // Only import AdMob if we're not in Expo Go
  if (Constants.expoConfig?.extra?.useExpoGo !== true && Constants.expoConfig !== undefined) {
    const admob = require('react-native-google-mobile-ads');
    AdEventType = admob.AdEventType;
    InterstitialAd = admob.InterstitialAd;
    TestIds = admob.TestIds;
  }
} catch (error) {
  console.log('🚫 AdMob: Not available in this environment');
}

// AdMob Configuration
const AD_CONFIG = {
  // Test IDs for development - these are Google's official test IDs (work for both platforms)
  INTERSTITIAL_ID: __DEV__ 
    ? TestIds?.INTERSTITIAL // Google's official test interstitial ID (works for both platforms)
    : Platform.select({
        android: 'ca-app-pub-9976626838955349/2586969967', // Your Android Unit ID
        ios: 'ca-app-pub-9976626838955349/8529561786', // Your iOS Unit ID
        default: 'ca-app-pub-9976626838955349/2586969967', // Fallback to Android
      }),
};

class AdService {
  private spinCount = 0;
  private readonly SPINS_BEFORE_AD = 3;
  private isAdLoading = false;
  private isAdReady = false;
  private interstitialAd: any = null;

  /**
   * Initialize the ad service
   */
  async initialize(): Promise<void> {
    try {
      // Skip if AdMob is not available
      if (!InterstitialAd) {
        console.log('🚫 AdMob: Not available in this environment');
        return;
      }

      // Only initialize ads for free users
      if (userService.isFree()) {
        console.log('🎯 AdMob: Initializing for free user');
        console.log(`📱 Platform: ${Platform.OS}`);
        console.log(`🎯 Ad Unit ID: ${AD_CONFIG.INTERSTITIAL_ID}`);
        await this.loadInterstitialAd();
      } else {
        console.log('👑 AdMob: No ads for premium user');
      }
    } catch (error) {
      console.warn('Failed to initialize ad service:', error);
    }
  }

  /**
   * Load interstitial ad
   */
  private async loadInterstitialAd(): Promise<void> {
    if (!InterstitialAd || this.isAdLoading || this.isAdReady) {
      return;
    }

    try {
      this.isAdLoading = true;
      console.log('🎯 AdMob: Loading interstitial ad...');
      
      // Create new interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID, {
        requestNonPersonalizedAdsOnly: true,
        keywords: ['game', 'entertainment'],
      });

      // Set up event listeners
      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('✅ AdMob: Interstitial ad loaded successfully');
        this.isAdReady = true;
        this.isAdLoading = false;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('❌ AdMob: Interstitial ad error:', error);
        this.isAdReady = false;
        this.isAdLoading = false;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('🎯 AdMob: Interstitial ad closed');
        this.isAdReady = false;
        // Load the next ad
        this.loadInterstitialAd();
      });

      // Load the ad
      await this.interstitialAd.load();
      
    } catch (error) {
      console.error('Error loading interstitial ad:', error);
      this.isAdReady = false;
      this.isAdLoading = false;
    }
  }

  /**
   * Track spin and show ad if needed
   */
  async trackSpin(): Promise<void> {
    // Skip if AdMob is not available
    if (!InterstitialAd) {
      return;
    }

    // Don't show ads for premium users
    if (userService.isPremium()) {
      return;
    }

    this.spinCount++;
    console.log(`🎯 AdMob: Spin count: ${this.spinCount}/${this.SPINS_BEFORE_AD}`);

    // Show ad every 3 spins
    if (this.spinCount >= this.SPINS_BEFORE_AD) {
      await this.showInterstitialAd();
      this.spinCount = 0; // Reset counter
    }
  }

  /**
   * Show interstitial ad
   */
  private async showInterstitialAd(): Promise<void> {
    if (!InterstitialAd || !this.isAdReady || !this.interstitialAd) {
      console.log('🎯 AdMob: Ad not ready, loading new ad...');
      await this.loadInterstitialAd();
      return;
    }

    try {
      console.log('🎯 AdMob: Showing interstitial ad...');
      
      // Show the ad
      await this.interstitialAd.show();
      
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      this.isAdReady = false;
      // Try to load a new ad
      await this.loadInterstitialAd();
    }
  }

  /**
   * Reset spin counter (useful when starting a new game)
   */
  resetSpinCounter(): void {
    this.spinCount = 0;
    console.log('🎯 AdMob: Spin counter reset');
  }

  /**
   * Get current spin count
   */
  getSpinCount(): number {
    return this.spinCount;
  }

  /**
   * Get spins remaining before next ad
   */
  getSpinsRemaining(): number {
    return Math.max(0, this.SPINS_BEFORE_AD - this.spinCount);
  }

  /**
   * Check if user should see ads
   */
  shouldShowAds(): boolean {
    return InterstitialAd && userService.isFree();
  }

  /**
   * Update ad service when user tier changes
   */
  async onUserTierChange(): Promise<void> {
    if (!InterstitialAd) {
      console.log('🚫 AdMob: Not available in this environment');
      return;
    }

    if (userService.isPremium()) {
      // Premium user - clean up ads
      this.isAdReady = false;
      this.isAdLoading = false;
      this.interstitialAd = null;
      console.log('👑 AdMob: User upgraded to premium - ads disabled');
    } else {
      // Free user - initialize ads
      console.log('🎯 AdMob: User is free tier - ads enabled');
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
    console.log('🎯 AdMob: Ad service cleaned up');
  }
}

// Export singleton instance
const adService = new AdService();
export default adService; 