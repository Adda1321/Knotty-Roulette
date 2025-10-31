// Product IDs - Must match Google Play Console exactly
export const PRODUCT_IDS = {
  // Individual products
  AD_FREE_REMOVAL: "ad_free_removal_upd",
  COLLEGE_THEME_PACK: "college_theme_pack_upd",
  COUPLE_THEME_PACK: "couple_theme_pack_upd",

  // Bundle products
  COMPLETE_EXPERIENCE_BUNDLE: "complete_experience_bundle_upd",
  EXPAND_FUN_BUNDLE: "expand_fun_bundle_upd",

  // Test products
  TEST_PRODUCT_2: "testid2", // Consumable
  TEST_THEME_FAKE: "testthemeFakeupd_6", // Non-consumable
  TEST_THEME_ANGRY: "testthemeAngryupd_6", // Non-consumable
};

// Product definitions with metadata
export const PRODUCT_DEFINITIONS = {
  [PRODUCT_IDS.AD_FREE_REMOVAL]: {
    title: "Remove Ads",
    description: "Remove all ads and enjoy uninterrupted gameplay",
    price: "$2.99",
    unlocks: ["ad_free"],
  },
  [PRODUCT_IDS.COLLEGE_THEME_PACK]: {
    title: "College Theme Pack",
    description: "Unlock the exciting college theme for your wheel",
    price: "$2.99",
    unlocks: ["college_theme"],
  },
  [PRODUCT_IDS.COUPLE_THEME_PACK]: {
    title: "Couple Theme Pack",
    description: "Unlock the romantic couple theme for your wheel",
    price: "$2.99",
    unlocks: ["couple_theme"],
  },
  [PRODUCT_IDS.COMPLETE_EXPERIENCE_BUNDLE]: {
    title: "Complete Experience Bundle",
    description: "Get everything: All themes + Ad-free (Save $2)",
    price: "$6.99",
    unlocks: ["ad_free", "college_theme", "couple_theme"],
  },
  [PRODUCT_IDS.EXPAND_FUN_BUNDLE]: {
    title: "Expand the Fun Bundle",
    description: "Both theme packs (Save $1)",
    price: "$4.99",
    unlocks: ["college_theme", "couple_theme"],
  },
  [PRODUCT_IDS.TEST_PRODUCT_2]: {
    title: "Test Coins Pack",
    description: "Get 100 test coins for special features (consumable)",
    price: "$8.99",
    unlocks: ["test_coins"],
    isTestProduct: true,
    isConsumable: true,
  },
  [PRODUCT_IDS.TEST_THEME_FAKE]: {
    title: "Fake Theme Pack",
    description: "Unlock the fake theme with mysterious and deceptive patterns",
    price: "$2.99",
    unlocks: ["test_theme_fake"],
    isTestProduct: true,
  },
  [PRODUCT_IDS.TEST_THEME_ANGRY]: {
    title: "Angry Theme Pack",
    description: "Unlock the angry theme with bold red colors and intense effects",
    price: "$2.99",
    unlocks: ["test_theme_angry"],
    isTestProduct: true,
  },
};
