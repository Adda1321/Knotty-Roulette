export const COLORS = {
  // Primary Colors
  DARK_GREEN: "#6bc26e",
  LIGHT_GREEN: "#def6e2",
  YELLOW: "#F4C614",
  FIELDS: "#F1E9BE",

  // Background Colors
  BACKGROUND_DARK: "#1a1a1a",
  BACKGROUND_LIGHT: "#ffffff",

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
  BUTTON_SECONDARY: "#e5c200",
  BUTTON_DISABLED: "#666666",

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
