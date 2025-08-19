import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserTier {
  isPremium: boolean;
  subscriptionType?: 'monthly' | 'yearly' | 'lifetime';
  expiryDate?: string;
}

const USER_TIER_KEY = 'user_tier';

class UserService {
  private userTier: UserTier = { isPremium: false };

  /**
   * Initialize user service and load user tier from storage
   */
  async initialize(): Promise<void> {
    try {
      const storedTier = await AsyncStorage.getItem(USER_TIER_KEY);
      if (storedTier) {
        this.userTier = JSON.parse(storedTier);
      }
    } catch (error) {
      console.warn('Failed to load user tier from storage:', error);
      // Default to free tier if loading fails
      this.userTier = { isPremium: false };
    }
  }

  /**
   * Get current user tier
   */
  getUserTier(): UserTier {
    return { ...this.userTier };
  }

  /**
   * Check if user is premium
   */
  isPremium(): boolean {
    return this.userTier.isPremium;
  }

  /**
   * Check if user is free tier
   */
  isFree(): boolean {
    return !this.userTier.isPremium;
  }

  /**
   * Update user tier (for future in-app purchase integration)
   */
  async updateUserTier(tier: UserTier): Promise<void> {
    try {
      this.userTier = { ...tier };
      await AsyncStorage.setItem(USER_TIER_KEY, JSON.stringify(tier));
    } catch (error) {
      console.error('Failed to save user tier:', error);
      throw new Error('Failed to update user tier');
    }
  }

  /**
   * Set user as premium (for testing purposes)
   */
  async setPremium(subscriptionType: 'monthly' | 'yearly' | 'lifetime' = 'monthly'): Promise<void> {
    const expiryDate = subscriptionType === 'lifetime' 
      ? undefined 
      : new Date(Date.now() + (subscriptionType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
    
    await this.updateUserTier({
      isPremium: true,
      subscriptionType,
      expiryDate,
    });
  }

  /**
   * Set user as free tier
   */
  async setFree(): Promise<void> {
    await this.updateUserTier({
      isPremium: false,
    });
  }

  /**
   * Check if premium subscription is expired
   */
  isSubscriptionExpired(): boolean {
    if (!this.userTier.isPremium || !this.userTier.expiryDate) {
      return false;
    }
    
    const expiryDate = new Date(this.userTier.expiryDate);
    return expiryDate < new Date();
  }
}

// Export singleton instance
const userService = new UserService();
export default userService; 