import Constants from "expo-constants";
import { Platform } from "react-native";
import { isProduction } from "../utils/environment";
import upsellService from "./upsellService";
import userService from "./userService";

// Environment utilities
const isExpoGo = () => {
  return Constants.expoConfig === null || Constants.expoConfig === undefined;
};

const isNativeEnvironment = () => {
  return !isExpoGo(); // If not Expo Go, we're in a native environment
};

// Debug: Log the environment info
const debugEnvironment = () => {
  console.log("🔍 AdService Environment Debug:", {
    isExpoGo: isExpoGo(),
    isNative: isNativeEnvironment(),
    isProduction: isProduction(),
    isDev: __DEV__,
  });
};

// Conditionally import AdMob
let AdEventType: any, InterstitialAd: any, TestIds: any;

if (isNativeEnvironment()) {
  try {
    console.log("📱 Attempting to load AdMob...");
    const admob = require("react-native-google-mobile-ads");
    AdEventType = admob.AdEventType;
    InterstitialAd = admob.InterstitialAd;
    TestIds = admob.TestIds;
    console.log("✅ AdMob loaded successfully:", {
      AdEventType: !!AdEventType,
      InterstitialAd: !!InterstitialAd,
      TestIds: !!TestIds,
    });
  } catch (error) {
    console.log("🚫 AdMob: Failed to load", error);
  }
} else {
  console.log("🚫 AdMob: Not in native environment");
}
// Ad configuration based on environment
const getAdConfig = () => {
  const isNative = isNativeEnvironment();
  const isProd = isProduction();

  // Only load ads in native environment
  if (!isNative) {
    return { INTERSTITIAL_ID: null };
  }
  const showLiveAds = false; // Remove in PRODUCTION
  // In native environment, use test ads for non-production, real ads for production
  if (showLiveAds && isProd) {
    // Production: Use real ad IDs
    return {
      INTERSTITIAL_ID: Platform.select({
        android: "ca-app-pub-9976626838955349/2586969967",
        ios: "ca-app-pub-9976626838955349~7843166076",
        default: "ca-app-pub-9976626838955349/2586969967",
      }),
    };
  } else {
    // Non-production: Use test ad IDs
    return {
      INTERSTITIAL_ID: TestIds?.INTERSTITIAL || "test-id",
    };
  }
};

const AD_CONFIG = getAdConfig();

class AdService {
  private spinCount = 0;
  private readonly SPINS_BEFORE_AD = 3;
  private isAdLoading = false;
  private isAdReady = false;
  private interstitialAd: any = null;
  private lastAdLoadAttempt = 0;
  private readonly AD_RETRY_DELAY = 30000; // 30 seconds

  /**
   * Check if AdMob is available and configured
   */
  isAdMobAvailable(): boolean {
    const isNative = isNativeEnvironment();
    const hasAdId = AD_CONFIG.INTERSTITIAL_ID !== null;
    const hasAdMob = InterstitialAd !== undefined;

    console.log(`🔍 AdMob Availability Check:`, {
      isNative,
      hasAdId,
      hasAdMob,
      adId: AD_CONFIG.INTERSTITIAL_ID,
    });

    return isNative && hasAdId && hasAdMob;
  }

  /**
   * Check if user is premium (has ad-free from IAP)
   * Uses userService as single source of truth
   */
  isUserPremium(): boolean {
    const isPremium = userService.isPremium();
    console.log(`🔍 AdService: isUserPremium() = ${isPremium}`);
    return isPremium;
  }

  /**
   * Check if we should attempt to load an ad (rate limiting for offline scenarios)
   */
  private shouldAttemptAdLoad(): boolean {
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastAdLoadAttempt;

    // If we already have an ad ready, don't load another
    if (this.isAdReady) {
      return false;
    }

    // If we're currently loading, don't start another load
    if (this.isAdLoading) {
      return false;
    }

    // Rate limit ad loading attempts (especially important for offline scenarios)
    if (timeSinceLastAttempt < this.AD_RETRY_DELAY) {
      console.log(
        `🎯 AdMob: Rate limiting ad load (${Math.round(
          (this.AD_RETRY_DELAY - timeSinceLastAttempt) / 1000
        )}s remaining)`
      );
      return false;
    }

    return true;
  }

  /**
   * Initialize the ad service
   */
  async initialize(): Promise<void> {
    // Debug environment first
    debugEnvironment();

    if (!this.isAdMobAvailable()) {
      console.log(
        "🚫 AdMob: Not available (not native environment or no ad ID)"
      );
      return;
    }

    if (this.isUserPremium()) {
      console.log("🚫 AdMob: User is premium, ads disabled");
      return;
    }

    await this.loadInterstitialAd();

    // Listen for user tier changes
    userService.onTierChange(() => this.onUserTierChange());
  }

  /**
   * Load interstitial ad with offline handling
   */
  private async loadInterstitialAd(): Promise<void> {
    if (!InterstitialAd || !AD_CONFIG.INTERSTITIAL_ID) return;

    // Check if we should attempt to load an ad (rate limiting)
    if (!this.shouldAttemptAdLoad()) {
      return;
    }

    try {
      this.isAdLoading = true;
      this.lastAdLoadAttempt = Date.now();
      console.log(`🎯 AdMob: Loading ad with ID: ${AD_CONFIG.INTERSTITIAL_ID}`);

      this.interstitialAd = InterstitialAd.createForAdRequest(
        AD_CONFIG.INTERSTITIAL_ID,
        {
          requestNonPersonalizedAdsOnly: true,
          keywords: ["game", "entertainment"],
        }
      );

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isAdReady = true;
        this.isAdLoading = false;
        console.log("✅ AdMob: Ad loaded successfully");
      });

      this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.isAdReady = false;
          this.isAdLoading = false;
          console.log(
            "❌ AdMob: Ad failed to load:",
            error?.message || "Unknown error"
          );
          // Don't retry immediately - rate limiting will handle this
        }
      );

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isAdReady = false;
        console.log("🔄 AdMob: Ad closed, preparing next ad");
        // Try to load next ad after a delay (for offline scenarios)
        setTimeout(() => {
          this.loadInterstitialAd();
        }, 1000);
      });

      await this.interstitialAd.load();
    } catch (error) {
      this.isAdReady = false;
      this.isAdLoading = false;
      console.log("❌ AdMob: Failed to create ad request:", error);
    }
  }

  /**
   * Track spin and show ad if needed
   * @returns {Promise<boolean>} True if an ad was shown, false otherwise
   */
  async trackSpin(): Promise<boolean> {
    if (!this.isAdMobAvailable() || this.isUserPremium()) {
      console.log(
        `🎯 AdMob: Skipping ad (available: ${this.isAdMobAvailable()}, premium: ${this.isUserPremium()})`
      );
      return false;
    }

    this.spinCount++;
    console.log(
      `🎯 AdMob: Spin count: ${this.spinCount}/${this.SPINS_BEFORE_AD}`
    );

    if (this.spinCount >= this.SPINS_BEFORE_AD) {
      console.log(
        `🎯 AdMob: Attempting to show ad after ${this.spinCount} spins`
      );

      // Try to show ad if available, otherwise try to load one
      if (this.isAdReady) {
        await this.showInterstitialAd();
        this.spinCount = 0;
        // Track ad view for upsell logic
        await upsellService.trackAdView();
        return true; // Ad was shown
      } else {
        // No ad ready, try to load one for next time
        console.log(`🎯 AdMob: No ad ready, attempting to load for next time`);
        this.loadInterstitialAd();
        // Don't reset spin count - let user try again
        return false; // No ad was shown
      }
    }

    return false; // No ad was shown
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
    console.log("🔄 AdService: onUserTierChange() called");
    if (!InterstitialAd) {
      console.log("🚫 AdService: InterstitialAd not available, skipping");
      return;
    }

    const isPremium = this.isUserPremium();
    console.log(`🔄 AdService: User premium status changed to: ${isPremium}`);

    if (isPremium) {
      console.log("🚫 AdService: User is premium, cleaning up ads");
      this.cleanup();
      // Reset upsell ad count when user becomes premium
      await upsellService.resetAdCount();
    } else {
      console.log("🎯 AdService: User is not premium, initializing ads");
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
