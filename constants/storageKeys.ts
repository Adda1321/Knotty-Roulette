/**
 * Centralized storage keys for the entire app
 * All services should use these keys to avoid conflicts
 */
export const STORAGE_KEYS = {
  // User and Premium Status
  USER_TIER: 'knotty_roulette_user_tier',
  
  // IAP and Purchases
  PURCHASED_PRODUCTS: 'knotty_roulette_purchased_products',
  PRODUCT_CACHE: 'knotty_roulette_product_cache',
  LAST_PRODUCT_FETCH: 'knotty_roulette_last_product_fetch',
  
  // Theme Packs
  PURCHASED_PACKS: 'knotty_roulette_purchased_packs',
  CURRENT_PACK: 'knotty_roulette_current_pack',
  
  // Upsell System
  AD_COUNT: 'knotty_roulette_ad_count',
  LAST_UPSELL_SHOWN: 'knotty_roulette_last_upsell_shown',
  UPSELL_DISMISSED_COUNT: 'knotty_roulette_upsell_dismissed_count',
  GAME_OVER_COUNT: 'knotty_roulette_game_over_count',
  LAST_GAME_OVER_UPSELL: 'knotty_roulette_last_game_over_upsell',
  SHOP_ENTRY_COUNT: 'knotty_roulette_shop_entry_count',
  LAST_SHOP_UPSELL: 'knotty_roulette_last_shop_upsell',
} as const;
