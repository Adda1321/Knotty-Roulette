export const COLORS = {
  // Primary Colors
  DARK_GREEN: "#6bc26e",
  LIGHT_GREEN: "#def6e2",
  YELLOW: "#F4C614",
  FIELDS: "#F1E9BE",

  // Background Colors
  BACKGROUND_DARK: "#1a1a1a",

  // Text Colors
  TEXT_PRIMARY: "#ffffff",
  TEXT_SECONDARY: "#cccccc",
  TEXT_DARK: "#333333",

  // Status Colors
  ONLINE: "#6bc26e",
  OFFLINE: "#ff6b6b",

  // Card Colors
  CARD_BACKGROUND: "#ffffff",
  CARD_BORDER: "#e0e0e0",

  // Button Colors
  BUTTON_PRIMARY: "#6bc26e",

  // Shadow Colors
  SHADOW: "rgba(0, 0, 0, 0.1)",
  SHADOW_DARK: "#000000",
};

export const FONTS = {
  PRIMARY: "Dosis-Regular",
  DOSIS: "Dosis-Regular",
  SECONDARY: "SpaceMono",
  DOSIS_BOLD: "Dosis-Bold",
  DOSIS_MEDIUM: "Dosis-Medium",
  FUN: "FontdinerSwanky",
};

export const SIZES = {
  // Font Sizes
  EXTRALARGE: 32,
  TITLE: 24,
  SUBTITLE: 18,
  BODY: 16,
  CAPTION: 14,
  SMALL: 12,
  // Spacing
  PADDING_SMALL: 8,
  PADDING_MEDIUM: 16,
  PADDING_LARGE: 24,
  PADDING_XLARGE: 32,

  // Border Radius
  BORDER_RADIUS_SMALL: 8,
  BORDER_RADIUS_MEDIUM: 12,
  BORDER_RADIUS_LARGE: 16,

  // Shadows
  SHADOW_SMALL: {
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  SHADOW_MEDIUM: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 60,
  },
  SHADOW_LARGE: {
    shadowColor: COLORS.SHADOW_DARK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  SHADOW_CARD: {
    shadowColor: COLORS.SHADOW_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },

  // Text Shadows
  TEXT_SHADOW_SMALL: {
    textShadowColor: "rgba(42, 42, 42, 0.4)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  TEXT_SHADOW_MEDIUM: {
    textShadowColor: "rgba(42, 42, 42, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  TEXT_SHADOW_LARGE: {
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
};

// Theme Pack Constants
export const THEME_PACKS = {
  DEFAULT: "default",
  COLLEGE: "college",
  COUPLE: "couple",
} as const;

export type ThemePackId = (typeof THEME_PACKS)[keyof typeof THEME_PACKS];

export interface ThemePackData {
  id: ThemePackId;
  name: string;
  description: string;
  price: number;
  emoji: string;
  isDefault: boolean;
}

export const THEME_PACK_DATA: Record<ThemePackId, ThemePackData> = {
  [THEME_PACKS.DEFAULT]: {
    id: THEME_PACKS.DEFAULT,
    name: "Default Theme",
    description:
      "The classic Knotty Roulette experience with party challenges and drinking games.",
    price: 0,
    emoji: "🎯",
    isDefault: true,
  },
  [THEME_PACKS.COLLEGE]: {
    id: THEME_PACKS.COLLEGE,
    name: "College Theme",
    description:
      "Wild college party challenges perfect for dorm rooms and frat parties.",
    price: 2.99,
    emoji: "🎓",
    isDefault: false,
  },
  [THEME_PACKS.COUPLE]: {
    id: THEME_PACKS.COUPLE,
    name: "Couple Theme",
    description:
      "Romantic and flirty challenges designed for couples and date nights.",
    price: 2.99,
    emoji: "💕",
    isDefault: false,
  },
};

// Theme Color Groups - Each theme has its own color palette
export const THEME_COLORS = {
  [THEME_PACKS.DEFAULT]: {
    // Primary Colors - Use original green colors
    PRIMARY: "#6bc26e", // Original green || OKAY
    LIGHT: "#116b20ff", // Original light green || OKAY
    DARK: "#3f663f",
    LIGHTEST: "#63A133",
    // BackGround:"#116b20ff" ,   // Original light green || OKAY
    BORDER: "#63A133",
    TEXT: "#F4C614",
    YELLOW: "#F4C614", // Original yellow || OKAY
    FIELDS: "#F1E9BE", // Original fields color || OKAY
    GAMEBOARDPRIMARY: "#286a19ff",
    GAMEBOARDSECONDARY: "#d4f6daff",
    SCOREBOARD: "#5aad5d",
    // Background Colors
    BACKGROUND_DARK: "#1a1a1a", // Original dark background || OKAY
    //|| OKAY

    // Text Colors
    TEXT_PRIMARY: "#ffffff", // White text
    TEXT_SECONDARY: "#cccccc", // Light gray text
    TEXT_DARK: "#333333", // Dark text

    // Status Colors
    ONLINE: "#6bc26e", // Green for online
    OFFLINE: "#ff6b6b", // Red for offline

    // Card Colors
    CARD_BACKGROUND: "#ffffff", // White cards
    CARD_BORDER: "#e0e0e0", // Light gray borders

    // Button Colors
    BUTTON_PRIMARY: "#6bc26e", // Green buttons
    // Yellow secondary
    // Gray disabled

    // Shadow Colors
    SHADOW: "rgba(0, 0, 0, 0.1)",
    SHADOW_DARK: "#000000",
  },

  [THEME_PACKS.COLLEGE]: {
    // Primary Colors - Blue Theme
    PRIMARY: "#0c2f64ff", // Blue instead of green
    LIGHT: "#1976D2",
    THEMEPACKNAME: "#9cbfe2ff",
    LIGHTEST: "#6598cbff",
    DARK: "#123f65ff", // Light blue
    TEXT: "#ff3b9dff",
    YELLOW: "#F4C614",
    // Orange accent
    FIELDS: "#E3F2FD", // Light blue fields
    GAMEBOARDPRIMARY: "#4495bbff",
    GAMEBOARDSECONDARY: "#bcecf0ff",

    SCOREBOARD: "#639db6ff",

    // Text Colors
    TEXT_PRIMARY: "#ffffff",
    TEXT_SECONDARY: "#E3F2FD", // Light blue text
    TEXT_DARK: "#0D47A1", // Dark blue text

    // Status Colors
    ONLINE: "#1976D2", // Blue
    OFFLINE: "#ff6b6b",

    // Card Colors
    CARD_BACKGROUND: "#ffffff",
    CARD_BORDER: "#BBDEFB", // Light blue border

    // Button Colors
    BUTTON_PRIMARY: "#1976D2", // Blue
    BUTTON_SECONDARY: "#FF9800", // Orange

    // Shadow Colors
    SHADOW: "rgba(0, 0, 0, 0.1)",
    SHADOW_DARK: "#000000",
  },

  [THEME_PACKS.COUPLE]: {
    // Primary Colors - Red/Pink Theme
    PRIMARY: "#BC2538", // Pink/Red instead of green
    // Primary Colors - Blue Theme
    THEMEPACKNAME: "#9cbfe2ff",

    LIGHT: "#E78D90",
    LIGHTEST: "#EB6051",
    DARK: "#CB4757",
    TEXT: "#FDCA2B",
    BORDER: "#4292c1ff",
    // Light blue    // Light pink
    YELLOW: "#FFC107", // Amber accent
    FIELDS: "#FCE4EC", // Light pink fields

    // Background Colors
    BACKGROUND_DARK: "#E14C31", // Dark pink

    GAMEBOARDPRIMARY: "#d7364cff",
    GAMEBOARDSECONDARY: "#d28c8eff",
    SCOREBOARD: "#ce5256ff",

    // Text Colors
    TEXT_PRIMARY: "#ffffff",
    TEXT_SECONDARY: "#FCE4EC", // Light pink text
    TEXT_DARK: "#C2185B", // Dark pink text

    // Status Colors
    ONLINE: "#e95e62ff", // Pink
    OFFLINE: "#ff6b6b",

    // Card Colors
    CARD_BACKGROUND: "#ffffff",
    CARD_BORDER: "#F8BBD9", // Light pink border

    // Button Colors
    BUTTON_PRIMARY: "#E91E63", // Pink
    BUTTON_SECONDARY: "#FFC107", // Amber

    // Shadow Colors
    SHADOW: "rgba(0, 0, 0, 0.1)",
    SHADOW_DARK: "#000000",
  },
} as const;

// Upsell Configuration
export const UPSELL_CONFIG = {
  AD_COUNT_BEFORE_UPSELL: 5, //5 Change this value for testing (e.g., 3, 7, 10)
  GAME_OVER_UPSELL_FREQUENCY: 3, //3 Show upsell every N game overs for premium users
  SHOP_ENTRY_UPSELL_FREQUENCY: 5, //5 Show upsell every N shop visits for ALL users
};

// Game Configuration
export const GAME_CONFIG = {
  WINNING_SCORE: 10, //10 First player to reach this score wins the game
};
