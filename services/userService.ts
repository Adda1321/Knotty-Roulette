import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserTier {
  tier: "free" | "premium";
  subscriptionType?: "lifetime";
  purchaseDate?: string;
}

class UserService {
  private userTier: UserTier = { tier: "free" };
  private isInitialized = false;
  private tierChangeCallbacks: (() => void)[] = [];

  async initialize(): Promise<void> {
    try {
      const storedTier = await AsyncStorage.getItem("userTier");
      if (storedTier) {
        this.userTier = JSON.parse(storedTier);
      }
      this.isInitialized = true;
      console.log("✅ UserService initialized:", this.userTier);
      // LOG  ✅ UserService initialized: {"purchaseDate": "2025-08-16T16:59:34.491Z", "subscriptionType": "lifetime", "tier": "premium"}
    } catch (error) {
      console.error("❌ Failed to initialize UserService:", error);
    }
  }

  getUserTier(): UserTier {
    return this.userTier;
  }

  isPremium(): boolean {
    return this.userTier.tier === "premium";
  }

  isFree(): boolean {
    return !this.isPremium();
  }

  async updateUserTier(tier: UserTier): Promise<void> {
    this.userTier = tier;
    await AsyncStorage.setItem("userTier", JSON.stringify(tier));

    // Notify all callbacks about tier change
    this.tierChangeCallbacks.forEach((callback) => callback());

    console.log("✅ User tier updated:", tier);
  }

  async setPremium(subscriptionType: "lifetime" = "lifetime"): Promise<void> {
    const purchaseDate = new Date().toISOString();

    await this.updateUserTier({
      tier: "premium",
      subscriptionType,
      purchaseDate,
    });
  }


  // Add callback for tier changes
  onTierChange(callback: () => void): void {
    this.tierChangeCallbacks.push(callback);
  }



  /**
   * Force reset user tier for testing purposes
   * This bypasses normal downgrade restrictions
   */
  forceResetForTesting(): void {
    console.log("🧪 Force resetting user tier for testing...");
    this.userTier = { tier: "free" };
    this.isInitialized = true;
    console.log("✅ User tier force reset to free for testing");
  }
}

const userService = new UserService();
export default userService;
