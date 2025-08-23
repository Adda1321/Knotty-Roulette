import AsyncStorage from '@react-native-async-storage/async-storage';
import { UPSELL_CONFIG } from '../constants/theme';
import { themePackService } from './themePackService';
import userService from './userService';

const STORAGE_KEYS = {
  AD_COUNT: 'knotty_roulette_ad_count',
  LAST_UPSELL_SHOWN: 'knotty_roulette_last_upsell_shown',
  UPSELL_DISMISSED_COUNT: 'knotty_roulette_upsell_dismissed_count',
  GAME_OVER_COUNT: 'knotty_roulette_game_over_count',
  LAST_GAME_OVER_UPSELL: 'knotty_roulette_last_game_over_upsell',
  SHOP_ENTRY_COUNT: 'knotty_roulette_shop_entry_count',
  LAST_SHOP_UPSELL: 'knotty_roulette_last_shop_upsell',
} as const;

export interface UpsellOffer {
  id: string;
  title: string;
  description: string;
  primaryButton: {
    text: string;
    price: string;
    action: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set' | 'none';
  };
  secondaryButton?: {
    text: string;
    price: string;
    action: 'theme_packs' | 'all_in_bundle' | 'complete_set';
  };
  showBestDeal?: boolean;
  bestDealText?: string;
  bestDealButton?: 'primary' | 'secondary'; // Which button should show the best deal badge
  triggerType?: 'ad_based' | 'game_over' | 'shop_entry' | 'passive';
  isCompleted?: boolean; // Flag to indicate this is a completion state (no purchase needed)
}

export type UpsellType = 'initial' | 'theme_packs' | 'ad_free' | 'complete_set' | 'none';

class UpsellService {
  private adCount = 0;
  private lastUpsellShown: UpsellType = 'none';
  private upsellDismissedCount = 0;
  private gameOverCount = 0;
  private lastGameOverUpsell = 0;
  private shopEntryCount = 0;
  private lastShopUpsell = 0;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const [
        adCountData, 
        lastUpsellData, 
        dismissedCountData,
        gameOverCountData,
        lastGameOverUpsellData,
        shopEntryCountData,
        lastShopUpsellData
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AD_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_UPSELL_SHOWN),
        AsyncStorage.getItem(STORAGE_KEYS.UPSELL_DISMISSED_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.GAME_OVER_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_GAME_OVER_UPSELL),
        AsyncStorage.getItem(STORAGE_KEYS.SHOP_ENTRY_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SHOP_UPSELL),
      ]);

      this.adCount = adCountData ? parseInt(adCountData, 10) : 0;
      this.lastUpsellShown = (lastUpsellData as UpsellType) || 'none';
      this.upsellDismissedCount = dismissedCountData ? parseInt(dismissedCountData, 10) : 0;
      this.gameOverCount = gameOverCountData ? parseInt(gameOverCountData, 10) : 0;
      this.lastGameOverUpsell = lastGameOverUpsellData ? parseInt(lastGameOverUpsellData, 10) : 0;
      this.shopEntryCount = shopEntryCountData ? parseInt(shopEntryCountData, 10) : 0;
      this.lastShopUpsell = lastShopUpsellData ? parseInt(lastShopUpsellData, 10) : 0;

      this.isInitialized = true;
      console.log('✅ UpsellService initialized:', {
        adCount: this.adCount,
        lastUpsellShown: this.lastUpsellShown,
        dismissedCount: this.upsellDismissedCount,
        gameOverCount: this.gameOverCount,
        shopEntryCount: this.shopEntryCount,
      });
    } catch (error) {
      console.error('❌ Failed to initialize UpsellService:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Track an ad view and determine if upsell should be shown (ONLY for free users)
   */
  async trackAdView(): Promise<UpsellType> {
    if (!this.isInitialized) await this.initialize();
    
    // If user is premium (Ad-Free), don't track ads or show upsells
    if (userService.isPremium()) {
      return 'none';
    }

    this.adCount++;
    await this.saveAdCount();

    // Show upsell after configured ad count for free users only
    if (this.adCount >= UPSELL_CONFIG.AD_COUNT_BEFORE_UPSELL) {
      return 'initial';
    }

    return 'none';
  }

  /**
   * Track game over and determine if upsell should be shown (for Ad-Free users)
   * Note: "Premium users" = users who have purchased Ad-Free (no more ads)
   */
  async trackGameOver(): Promise<UpsellType> {
    if (!this.isInitialized) await this.initialize();
    
    // Only show game-over upsells for premium users (Ad-Free users)
    if (!userService.isPremium()) {
      return 'none';
    }

    this.gameOverCount++;
    await this.saveGameOverCount();

    // Show upsell every N game overs for premium users (configurable)
    const shouldShowUpsell = this.gameOverCount - this.lastGameOverUpsell >= UPSELL_CONFIG.GAME_OVER_UPSELL_FREQUENCY;
    
    if (shouldShowUpsell) {
      this.lastGameOverUpsell = this.gameOverCount;
      await this.saveLastGameOverUpsell();
      
      // Determine what to upsell based on user's current state
      const purchasedPacks = themePackService.getPurchasedPacks();
      const totalPacks = Object.keys(themePackService.getAllPacksWithStatus()).length;
      // Exclude DEFAULT theme from the count (it's always free)
      const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
      const actualOwnedPacks = actualPurchasedPacks.length;

      if (actualOwnedPacks < (totalPacks - 1)) {
        return 'theme_packs';
      } else {
        return 'none'; // User has everything
      }
    }

    return 'none';
  }

  /**
   * Track shop entry and determine if upsell should be shown (for ALL users)
   * Shows upsell every N shop visits regardless of user tier
   */
  async trackShopEntry(): Promise<UpsellType> {
    if (!this.isInitialized) await this.initialize();
    
    // Show shop entry upsells for ALL users (not just premium)
    this.shopEntryCount++;
    await this.saveShopEntryCount();

    // Show upsell every N shop entries for all users (configurable)
    const shouldShowUpsell = this.shopEntryCount - this.lastShopUpsell >= UPSELL_CONFIG.SHOP_ENTRY_UPSELL_FREQUENCY;
    
    if (shouldShowUpsell) {
      this.lastShopUpsell = this.shopEntryCount;
      await this.saveLastShopUpsell();
      
      // Determine what to upsell based on user's current state
      const hasAdFree = userService.isPremium();
      const purchasedPacks = themePackService.getPurchasedPacks();
      const totalPacks = Object.keys(themePackService.getAllPacksWithStatus()).length;
      // Exclude DEFAULT theme from the count (it's always free)
      const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
      const actualOwnedPacks = actualPurchasedPacks.length;

      if (!hasAdFree) {
        // Free user - upsell Ad-Free or All-In Bundle
        return 'initial';
      } else if (actualOwnedPacks < (totalPacks - 1)) {
        // Premium user with missing theme packs - upsell theme packs
        return 'theme_packs';
      } else {
        // User has everything - no upsell needed
        return 'none';
      }
    }

    return 'none';
  }

  /**
   * Get the appropriate upsell offer based on user's current state
   */
  getUpsellOffer(type: UpsellType, triggerType: 'ad_based' | 'game_over' | 'shop_entry' | 'passive' = 'ad_based'): UpsellOffer | null {
    if (type === 'none') return null;

    const hasAdFree = userService.isPremium();
    const purchasedPacks = themePackService.getPurchasedPacks();
    const totalPacks = Object.keys(themePackService.getAllPacksWithStatus()).length;
    // Exclude DEFAULT theme from the count (it's always free)
    const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
    const actualOwnedPacks = actualPurchasedPacks.length;

    switch (type) {
      case 'initial':
        // Free user after Xth ad or shop entry - allow both triggers
        if (triggerType !== 'ad_based' && triggerType !== 'shop_entry') return null;
        
        return {
          id: 'initial_upsell',
          title: "Tired of ads?",
          description: "Upgrade for $2.99 or get all-in bundle for $6.99 (Save $2)!",
          primaryButton: {
            text: "Go Ad-Free",
            price: "$2.99",
            action: 'ad_free',
          },
          secondaryButton: {
            text: "All-In Bundle",
            price: "$6.99",
            action: 'all_in_bundle',
          },
          showBestDeal: true,
          bestDealText: "Best Deal - Save $2!",
          bestDealButton: 'secondary', // Show best deal badge on secondary button
          triggerType: triggerType === 'shop_entry' ? 'shop_entry' : 'ad_based',
        };

      case 'theme_packs':
        // User has ad-free, upsell theme packs
        // Exclude DEFAULT theme from the count (it's always free)
        const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
        const actualOwnedPacks = actualPurchasedPacks.length;
        
        if (actualOwnedPacks === 0) {
          // User has no theme packs yet
          return {
            id: 'theme_packs_upsell',
            title: "Expand the fun!",
            description: "Grab both packs for $4.99 (Save $1)!",
            primaryButton: {
              text: "Get Both Packs",
              price: "$4.99",
              action: 'theme_packs',
            },
            showBestDeal: true,
            bestDealText: "Best Deal - Save $1!",
            bestDealButton: 'primary', // Show best deal badge on primary button
            triggerType,
          };
        } else if (actualOwnedPacks === 1) {
          // User has 1 theme pack, offer the last one
          return {
            id: 'complete_set_upsell',
            title: "Complete your set!",
            description: "Unlock the last pack for just $2.99!",
            primaryButton: {
              text: "Get Last Pack",
              price: "$2.99",
              action: 'complete_set',
            },
            triggerType,
          };
        } else {
          // User has all theme packs
          return null;
        }

      case 'ad_free':
        // User has theme packs, upsell ad-free
        return {
          id: 'ad_free_upsell',
          title: "Remove those ads!",
          description: "Go ad-free for just $2.99 and enjoy uninterrupted gaming!",
          primaryButton: {
            text: "Go Ad-Free",
            price: "$2.99",
            action: 'ad_free',
          },
          triggerType,
        };

      default:
        return null;
    }
  }

  /**
   * Check if user should see an upsell after purchasing something
   */
  async checkPostPurchaseUpsell(purchaseType: 'ad_free' | 'theme_pack' | 'all_in_bundle'): Promise<UpsellType> {
    if (purchaseType === 'all_in_bundle') {
      return 'none'; // No more upsells needed
    }

    const hasAdFree = userService.isPremium();
    const purchasedPacks = themePackService.getPurchasedPacks();
    const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
    const ownedPacks = actualPurchasedPacks.length;

    if (purchaseType === 'ad_free') {
      // User bought ad-free, upsell theme packs if they don't have all
      if (ownedPacks < 2) { // 2 purchased packs (excluding DEFAULT)
        return 'theme_packs';
      }
    } else if (purchaseType === 'theme_pack') {
      // User bought a theme pack, upsell ad-free if they don't have it
      if (!hasAdFree) {
        return 'ad_free';
      }
    }

    return 'none';
  }

  /**
   * Mark upsell as shown
   */
  async markUpsellShown(type: UpsellType): Promise<void> {
    this.lastUpsellShown = type;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPSELL_SHOWN, type);
  }

  /**
   * Mark upsell as dismissed
   */
  async markUpsellDismissed(): Promise<void> {
    this.upsellDismissedCount++;
    await AsyncStorage.setItem(STORAGE_KEYS.UPSELL_DISMISSED_COUNT, this.upsellDismissedCount.toString());
  }

  /**
   * Reset ad count (called when user becomes premium)
   */
  async resetAdCount(): Promise<void> {
    this.adCount = 0;
    await this.saveAdCount();
  }

  /**
   * Get current ad count
   */
  getAdCount(): number {
    return this.adCount;
  }

  /**
   * Get current game over count
   */
  getGameOverCount(): number {
    return this.gameOverCount;
  }

  /**
   * Get current shop entry count
   */
  getShopEntryCount(): number {
    return this.shopEntryCount;
  }

  /**
   * Check if user has seen the maximum number of upsells
   */
  hasReachedMaxUpsells(): boolean {
    return this.upsellDismissedCount >= 3; // Limit to 3 dismissals
  }

  /**
   * Reset upsell state (for testing)
   */
  async resetUpsellState(): Promise<void> {
    this.adCount = 0;
    this.lastUpsellShown = 'none';
    this.upsellDismissedCount = 0;
    this.gameOverCount = 0;
    this.lastGameOverUpsell = 0;
    this.shopEntryCount = 0;
    this.lastShopUpsell = 0;
    
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.AD_COUNT),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_UPSELL_SHOWN),
      AsyncStorage.removeItem(STORAGE_KEYS.UPSELL_DISMISSED_COUNT),
      AsyncStorage.removeItem(STORAGE_KEYS.GAME_OVER_COUNT),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_GAME_OVER_UPSELL),
      AsyncStorage.removeItem(STORAGE_KEYS.SHOP_ENTRY_COUNT),
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_SHOP_UPSELL),
    ]);
  }

  /**
   * Get passive upsells that should always be visible in shop UI
   */
  getPassiveUpsells(): UpsellOffer[] {
    const hasAdFree = userService.isPremium();
    const purchasedPacks = themePackService.getPurchasedPacks();
    const totalPacks = Object.keys(themePackService.getAllPacksWithStatus()).length;
    
    // Filter out DEFAULT theme (always owned, not purchased)
    const actualPurchasedPacks = purchasedPacks.filter(pack => pack !== 'default');
    const ownedPacks = actualPurchasedPacks.length;

    const passiveOffers: UpsellOffer[] = [];

    // If user has nothing (free user with no purchases)
    if (!hasAdFree && ownedPacks === 0) {
      passiveOffers.push({
        id: 'all_in_bundle_passive',
        title: "🔥 Complete Experience Bundle!",
        description: "Get everything: Ad-Free + Both Theme Packs at the best price!",
        primaryButton: {
          text: "Get Everything",
          price: "$6.99",
          action: 'all_in_bundle',
        },
        showBestDeal: true,
        bestDealText: "🌟 BEST DEAL - Save $2!",
        triggerType: 'passive',
      });
    }

    // If user has Ad-Free but no purchased theme packs
    if (hasAdFree && ownedPacks === 0) {
      passiveOffers.push({
        id: 'theme_packs_bundle_passive',
        title: "🎨 Expand the Fun!",
        description: "Grab both packs for $4.99 (Save $1)!",
        primaryButton: {
          text: "Get Both Packs",
          price: "$4.99",
          action: 'theme_packs',
        },
        showBestDeal: true,
        bestDealText: "🌟 BEST DEAL - Save $1!",
        triggerType: 'passive',
      });
    }

    // If user has Ad-Free and only one purchased theme pack, show completion offer
    if (hasAdFree && ownedPacks === 1) {
      passiveOffers.push({
        id: 'complete_set_passive',
        title: "✨ Complete Your Set!",
        description: "Unlock the last pack for just $2.99!",
        primaryButton: {
          text: "Get Last Pack",
          price: "$2.99",
          action: 'complete_set',
        },
        triggerType: 'passive',
      });
    }

    // If user has Ad-Free and all theme packs, show celebration message
    if (hasAdFree && ownedPacks >= 2) { // 2 purchased packs (excluding DEFAULT)
      passiveOffers.push({
        id: 'complete_collection_passive',
        title: "🎉 Collection Complete!",
        description: "Congratulations! You have unlocked everything. Enjoy your premium experience!",
        primaryButton: {
          text: "You're All Set!",
          price: "You're All Set!",
          action: 'none', // No action needed - user has everything
        },
        triggerType: 'passive',
        isCompleted: true, // Flag to indicate this is a completion state
      });
    }

    // If user has purchased theme packs but no Ad-Free, show Ad-Free upgrade
    if (!hasAdFree && ownedPacks > 0) {
      passiveOffers.push({
        id: 'ad_free_upgrade_passive',
        title: "🚫 Remove Those Ads!",
        description: "You have great themes, now go Ad-Free for uninterrupted gaming!",
        primaryButton: {
          text: "Go Ad-Free",
          price: "$2.99",
          action: 'ad_free',
        },
        triggerType: 'passive',
      });
    }

    return passiveOffers;
  }

  /**
   * Get the best passive offer for the current user (for featured display)
   */
  getFeaturedPassiveOffer(): UpsellOffer | null {
    const passiveOffers = this.getPassiveUpsells();
    
    // Return the first offer with "Best Deal" badge, or the first offer
    const bestDealOffer = passiveOffers.find(offer => offer.showBestDeal);
    return bestDealOffer || passiveOffers[0] || null;
  }

  private async saveAdCount(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AD_COUNT, this.adCount.toString());
    } catch (error) {
      console.error('❌ Failed to save ad count:', error);
    }
  }

  private async saveGameOverCount(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_OVER_COUNT, this.gameOverCount.toString());
    } catch (error) {
      console.error('❌ Failed to save game over count:', error);
    }
  }

  private async saveLastGameOverUpsell(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_GAME_OVER_UPSELL, this.lastGameOverUpsell.toString());
    } catch (error) {
      console.error('❌ Failed to save last game over upsell:', error);
    }
  }

  private async saveShopEntryCount(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_ENTRY_COUNT, this.shopEntryCount.toString());
    } catch (error) {
      console.error('❌ Failed to save shop entry count:', error);
    }
  }

  private async saveLastShopUpsell(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SHOP_UPSELL, this.lastShopUpsell.toString());
    } catch (error) {
      console.error('❌ Failed to save last shop upsell:', error);
    }
  }
}

// Export singleton instance
const upsellService = new UpsellService();
export default upsellService; 