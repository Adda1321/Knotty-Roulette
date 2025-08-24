import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_PACK_DATA, THEME_PACKS, ThemePackId } from '../constants/theme';
import upsellService from './upsellService';

const STORAGE_KEYS = {
  PURCHASED_PACKS: 'knotty_roulette_purchased_packs',
  CURRENT_PACK: 'knotty_roulette_current_pack',
} as const;

export interface ThemePackPurchase {
  id: ThemePackId;
  purchasedAt: number;
  price: number;
}

export interface ThemePackState {
  purchasedPacks: ThemePackId[];
  currentPack: ThemePackId;
}

class ThemePackService {
  private purchasedPacks: ThemePackId[] = [];
  private currentPack: ThemePackId = THEME_PACKS.DEFAULT;

  constructor() {
    this.loadState();
  }

  // Load saved state from AsyncStorage
  private async loadState() {
    try {
      const [purchasedPacksData, currentPackData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_PACKS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PACK),
      ]);

      if (purchasedPacksData) {
        this.purchasedPacks = JSON.parse(purchasedPacksData);
      }

      if (currentPackData) {
        this.currentPack = JSON.parse(currentPackData);
      }

      // Ensure default pack is always available
      if (!this.purchasedPacks.includes(THEME_PACKS.DEFAULT)) {
        this.purchasedPacks.push(THEME_PACKS.DEFAULT);
      }

      // Ensure current pack is valid
      if (!this.purchasedPacks.includes(this.currentPack)) {
        this.currentPack = THEME_PACKS.DEFAULT;
      }

      await this.saveState();
    } catch (error) {
      console.error('Error loading theme pack state:', error);
      // Fallback to default state
      this.purchasedPacks = [THEME_PACKS.DEFAULT];
      this.currentPack = THEME_PACKS.DEFAULT;
    }
  }

  // Save state to AsyncStorage
  private async saveState() {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.PURCHASED_PACKS, JSON.stringify(this.purchasedPacks)),
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PACK, JSON.stringify(this.currentPack)),
      ]);
    } catch (error) {
      console.error('Error saving theme pack state:', error);
    }
  }

  // Get all purchased packs
  getPurchasedPacks(): ThemePackId[] {
    return [...this.purchasedPacks];
  }

  // Check if a pack is purchased
  isPackPurchased(packId: ThemePackId): boolean {
    return this.purchasedPacks.includes(packId);
  }

  // Get current active pack
  getCurrentPack(): ThemePackId {
    return this.currentPack;
  }

  // Set current active pack (only if purchased)
  async setCurrentPack(packId: ThemePackId): Promise<boolean> {
    if (this.isPackPurchased(packId)) {
      this.currentPack = packId;
      await this.saveState();
      return true;
    }
    return false;
  }

  // Mock purchase a theme pack
  async purchasePack(packId: ThemePackId): Promise<boolean> {
    try {
      // Mock purchase delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add to purchased packs if not already owned
      if (!this.purchasedPacks.includes(packId)) {
        this.purchasedPacks.push(packId);
        await this.saveState();
        
        // Don't auto-switch - user must manually select
        // this.currentPack = packId;
        // await this.saveState();
        
        // Initialize upsell service to check for post-purchase upsells
        await upsellService.initialize();
        
        return true;
      }
      
      return false; // Already owned
    } catch (error) {
      console.error('Error purchasing theme pack:', error);
      return false;
    }
  }

  // Get pack data with purchase status
  getPackData(packId: ThemePackId) {
    const packData = THEME_PACK_DATA[packId];
    if (!packData) return null;

    return {
      ...packData,
      isOwned: this.isPackPurchased(packId),
      isCurrent: this.currentPack === packId,
      isLocked: !this.isPackPurchased(packId),
    };
  }

  // Get all packs with their status
  getAllPacksWithStatus() {
    return Object.values(THEME_PACKS).map(packId => this.getPackData(packId)!);
  }

  // Reset all purchases (for testing)
  async resetPurchases() {
    this.purchasedPacks = [THEME_PACKS.DEFAULT];
    this.currentPack = THEME_PACKS.DEFAULT;
    await this.saveState();
  }
}

// Export singleton instance
export const themePackService = new ThemePackService();
export default themePackService; 