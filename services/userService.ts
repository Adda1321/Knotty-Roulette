import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserTier {
  tier: 'free' | 'premium';
  subscriptionType?: 'lifetime' | 'monthly' | 'yearly';
  purchaseDate?: string;
  expiryDate?: string;
}

class UserService {
  private userTier: UserTier = { tier: 'free' };
  private isInitialized = false;
  private tierChangeCallbacks: (() => void)[] = [];

  async initialize(): Promise<void> {
    try {
      const storedTier = await AsyncStorage.getItem('userTier');
      if (storedTier) {
        this.userTier = JSON.parse(storedTier);
      }
      this.isInitialized = true;
      console.log('✅ UserService initialized:', this.userTier);
    } catch (error) {
      console.error('❌ Failed to initialize UserService:', error);
    }
  }

  getUserTier(): UserTier {
    return this.userTier;
  }

  isPremium(): boolean {
    return this.userTier.tier === 'premium' && !this.isSubscriptionExpired();
  }

  isFree(): boolean {
    return !this.isPremium();
  }

  /**
   * Check if user can be downgraded from premium to free
   * One-time purchases (lifetime) cannot be downgraded
   */
  canDowngrade(): boolean {
    if (this.userTier.tier !== 'premium') {
      return true; // Already free, can't downgrade further
    }
    // Only allow downgrade for subscription-based tiers, not lifetime purchases
    return this.userTier.subscriptionType !== 'lifetime';
  }

  async updateUserTier(tier: UserTier): Promise<void> {
    this.userTier = tier;
    await AsyncStorage.setItem('userTier', JSON.stringify(tier));
    
    // Notify all callbacks about tier change
    this.tierChangeCallbacks.forEach(callback => callback());
    
    console.log('✅ User tier updated:', tier);
  }

  async setPremium(subscriptionType: 'lifetime' | 'monthly' | 'yearly' = 'lifetime'): Promise<void> {
    const purchaseDate = new Date().toISOString();
    let expiryDate: string | undefined;

    if (subscriptionType === 'monthly') {
      expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (subscriptionType === 'yearly') {
      expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    await this.updateUserTier({
      tier: 'premium',
      subscriptionType,
      purchaseDate,
      expiryDate,
    });
  }

  async setFree(): Promise<void> {
    if (!this.canDowngrade()) {
      console.warn('⚠️ Cannot downgrade lifetime premium purchase');
      throw new Error('Cannot downgrade from lifetime premium purchase');
    }
    await this.updateUserTier({ tier: 'free' });
  }

  isSubscriptionExpired(): boolean {
    if (this.userTier.tier !== 'premium' || !this.userTier.expiryDate) {
      return false;
    }

    const expiryDate = new Date(this.userTier.expiryDate);
    const now = new Date();
    return now > expiryDate;
  }

  // Add callback for tier changes
  onTierChange(callback: () => void): void {
    this.tierChangeCallbacks.push(callback);
  }

  // Remove callback
  removeTierChangeCallback(callback: () => void): void {
    this.tierChangeCallbacks = this.tierChangeCallbacks.filter(cb => cb !== callback);
  }
}

const userService = new UserService();
export default userService; 