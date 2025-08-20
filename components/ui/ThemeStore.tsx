import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import Button from "./Button";

const { width: screenWidth } = Dimensions.get("window");

interface ThemePack {
  id: string;
  name: string;
  description: string;
  price: string;
  image: any;
  previewImage: any;
  isOwned: boolean;
  isLocked: boolean;
  emoji: string;
}

interface ThemeStoreProps {
  visible: boolean;
  onClose: () => void;
}

const THEME_PACKS: ThemePack[] = [
  {
    id: "default",
    name: "Default Theme",
    description:
      "The classic Knotty Roulette experience with party challenges and drinking games.",
    price: "Free",
    image: require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png"),
    previewImage: require("../../assets/images/ThemedPacksImages/DefaultTheme.jpeg"),
    isOwned: true,
    isLocked: false,
    emoji: "🎯",
  },
  {
    id: "college",
    name: "College Theme",
    description:
      "Campus life challenges perfect for dorm parties and frat events.",
    price: "$2.99",
    image: require("../../assets/images/MascotImages/College/College-legs-mascot.png"),
    previewImage: require("../../assets/images/ThemedPacksImages/CollegeThemePack.jpeg"),
    isOwned: false,
    isLocked: true,
    emoji: "🎓",
  },
  {
    id: "couple",
    name: "Couple Theme",
    description:
      "Romantic and spicy challenges for date nights and intimate gatherings.",
    price: "$2.99",
    image: require("../../assets/images/MascotImages/Couple/Couple-legs-mascot.png"),
    previewImage: require("../../assets/images/ThemedPacksImages/CoupleThemePack.jpeg"),
    isOwned: false,
    isLocked: true,
    emoji: "💕",
  },
];

const BUNDLE_DEALS = [
  {
    id: "both-themes",
    title: "Both Theme Packs",
    description: "Get both College and Couple themes at a discounted price",
    originalPrice: "$5.98",
    discountedPrice: "$4.99",
    savings: "$0.99",
    themes: ["college", "couple"],
  },
];

export default function ThemeStore({ visible, onClose }: ThemeStoreProps) {
  const [selectedPack, setSelectedPack] = useState<ThemePack | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePackPress = (pack: ThemePack) => {
    audioService.playHaptic("light");
    audioService.playSound("buttonPress");
    setSelectedPack(pack);
    setShowPreview(true);
  };

  const handlePurchase = (pack: ThemePack) => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    // Mock purchase - replace with actual IAP logic later
    console.log(`Mock purchase initiated for ${pack.name}`);

    // For now, just close the preview
    setShowPreview(false);
    setSelectedPack(null);
  };

  const handleBundlePurchase = (bundle: (typeof BUNDLE_DEALS)[0]) => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    // Mock bundle purchase
    console.log(`Mock bundle purchase initiated for ${bundle.title}`);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedPack(null);
  };

  const closeStore = () => {
    audioService.playHaptic("light");
    onClose();
  };

  // Function to get sample challenges for each theme pack
  const getSampleChallenges = (themeId?: string) => {
    const sampleChallenges = [
      {
        challenge_text:
          "Give a flirty compliment to someone in the group or a stranger – Bonus if a stranger!",
        has_bonus: true,
      },
      {
        challenge_text:
          "Show off your best dance moves! – Bonus if you commit for at least 10 seconds!",
        has_bonus: true,
      },
      {
        challenge_text:
          "Ask the bartender or a friend for their best flirting advice – Bonus if you actually try it on someone!",
        has_bonus: true,
      },
    ];

    // Return different challenges based on theme
    if (themeId === "college") {
      return [
        {
          challenge_text:
            "Challenge someone to a dance-off – Loser must finish their drink!",
          has_bonus: false,
        },
        {
          challenge_text:
            'Start a chant – Even if it\'s just "One more round!"',
          has_bonus: false,
        },
        {
          challenge_text:
            "Pretend you know a stranger for 30 seconds – Sell it!",
          has_bonus: false,
        },
      ];
    } else if (themeId === "couple") {
      return [
        {
          challenge_text:
            "Make eye contact with someone in the group for 10 seconds – No breaking first!",
          has_bonus: false,
        },
        {
          challenge_text:
            "Whisper a made-up secret to someone in the group – Make it juicy.",
          has_bonus: false,
        },
        {
          challenge_text:
            "Try to make someone in the group blush – No touching allowed!",
          has_bonus: false,
        },
      ];
    }

    return sampleChallenges;
  };

  const renderBundleDeals = () => (
    <View style={styles.bundleSection}>
      <Text style={styles.sectionTitle}>Bundle Deals</Text>
      {BUNDLE_DEALS.map((bundle) => (
        <TouchableOpacity
          key={bundle.id}
          style={styles.bundleCard}
          onPress={() => handleBundlePurchase(bundle)}
          activeOpacity={0.8}
        >
          <View style={styles.bundleHeader}>
            <Text style={styles.bundleTitle}>{bundle.title}</Text>
            <View style={styles.bundlePriceContainer}>
              <Text style={styles.bundleOriginalPrice}>
                {bundle.originalPrice}
              </Text>
              <Text style={styles.bundleDiscountedPrice}>
                {bundle.discountedPrice}
              </Text>
            </View>
          </View>
          <Text style={styles.bundleDescription}>{bundle.description}</Text>
          <View style={styles.bundleFooter}>
            <Text style={styles.bundleSavings}>Save {bundle.savings}</Text>
            <View style={styles.bundleButton}>
              <Text style={styles.bundleButtonText}>Get Bundle</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderThemeCard = (pack: ThemePack) => (
    <TouchableOpacity
      key={pack.id}
      style={[styles.themeCard, pack.isLocked && styles.lockedCard]}
      onPress={() => handlePackPress(pack)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{pack.emoji}</Text>
        {pack.isOwned && (
          <View style={styles.ownedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.ONLINE} />
            <Text style={styles.ownedText}>Owned</Text>
          </View>
        )}
        {pack.isLocked && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={24} color={COLORS.TEXT_DARK} />
          </View>
        )}
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={pack.image}
          style={styles.themeImage}
          resizeMode="cover"
          defaultSource={require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png")} // Fallback image
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.themeName}>{pack.name}</Text>
        <Text style={styles.themePrice}>{pack.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPreviewModal = () => (
    <Modal
      visible={showPreview}
      animationType="slide"
      transparent={true}
      onRequestClose={closePreview}
    >
      <View style={styles.previewOverlay}>
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{selectedPack?.name}</Text>
            <TouchableOpacity
              onPress={closePreview}
              style={styles.closePreviewButton}
            >
              <Ionicons name="close" size={24} color={COLORS.TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContentWrapper}>
            <ScrollView
              style={styles.previewScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewScrollContent}
            >
              <View style={styles.previewImageContainer}>
                <Image
                  source={selectedPack?.previewImage}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.previewContent}>
                <Text style={styles.previewDescription}>
                  {selectedPack?.description}
                </Text>

                {/* Sample Challenges Section */}
                <View style={styles.sampleChallengesSection}>
                  <Text style={styles.sampleChallengesTitle}>
                    Sample Challenges
                  </Text>
                  <Text style={styles.sampleChallengesSubtitle}>
                    Get a taste of what's inside this theme pack
                  </Text>

                  {getSampleChallenges(selectedPack?.id).map(
                    (challenge: any, index: number) => {
                      const text = challenge.challenge_text;
                      const midPoint = Math.floor(text.length / 2);
                      const firstHalf = text.substring(0, midPoint);
                      const secondHalf = text.substring(midPoint);
                      
                      return (
                        <View key={index} style={styles.sampleChallengeItem}>
                          <View style={styles.challengeTextContainer}>
                            <Text style={styles.sampleChallengeText}>
                              {firstHalf}
                            </Text>
                            <View style={styles.blurredTextContainer}>
                              <BlurView
                                intensity={30}
                                tint="light"
                                style={styles.blurredTextBlur}
                              >
                                <Text style={styles.blurredTextContent}>
                                  {secondHalf}
                                </Text>
                              </BlurView>
                            </View>
                          </View>
                        </View>
                      );
                    }
                  )}
                </View>

                {!selectedPack?.isOwned && (
                  <View style={styles.purchaseSection}>
                    <Text style={styles.previewPrice}>
                      {selectedPack?.price}
                    </Text>
                    <Button
                      text="Purchase"
                      onPress={() => handlePurchase(selectedPack!)}
                      backgroundColor={COLORS.YELLOW}
                      textColor={COLORS.TEXT_DARK}
                      fontSize={SIZES.BODY}
                      fontFamily={FONTS.DOSIS_BOLD}
                      paddingHorizontal={SIZES.PADDING_LARGE}
                      paddingVertical={SIZES.PADDING_MEDIUM}
                      style={styles.purchaseButton}
                    />
                  </View>
                )}

                {selectedPack?.isOwned && (
                  <View style={styles.ownedSection}>
                    <Ionicons
                      name="checkmark-circle"
                      size={32}
                      color={COLORS.ONLINE}
                    />
                    <Text style={styles.ownedMessage}>
                      You own this theme pack!
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeStore}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Theme Store</Text>
              <TouchableOpacity onPress={closeStore} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Bundle Deals at the top */}
                {renderBundleDeals()}

                {/* Theme Packs */}
                <View style={styles.themesSection}>
                  <Text style={styles.sectionTitle}>Theme Packs</Text>
                  <View style={styles.themesGrid}>
                    {THEME_PACKS.map(renderThemeCard)}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {renderPreviewModal()}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_SMALL,
  },
  container: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: "90%",
    maxWidth: 500,
    height: "90%",
    ...SIZES.SHADOW_LARGE,
    overflow: "hidden",
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: SIZES.PADDING_SMALL,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.FIELDS,
  },
  content: {
    flex: 1,
    padding: SIZES.PADDING_SMALL,
    backgroundColor: COLORS.FIELDS,
  },
  scrollContent: {
    paddingBottom: SIZES.PADDING_XLARGE,
  },
  bundleSection: {
    paddingHorizontal: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    // padding: SIZES.PADDING_MEDIUM,
    // backgroundColor: "red",
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_LARGE,
    // backgroundColor: "pink",
    // marginTop: SIZES.PADDING_SMALL,
  },
  bundleCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    paddingHorizontal: SIZES.PADDING_LARGE,
    paddingVertical: SIZES.PADDING_MEDIUM,
    marginBottom: SIZES.PADDING_LARGE,
    ...SIZES.SHADOW_CARD,
    borderWidth: 2,
    borderColor: COLORS.YELLOW,
  },
  bundleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.PADDING_MEDIUM,
  },
  bundleTitle: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
    // marginRight: SIZES.PADDING_MEDIUM,
  },
  bundlePriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  bundleOriginalPrice: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: "line-through",
    marginRight: SIZES.PADDING_SMALL,
  },
  bundleDiscountedPrice: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  bundleDescription: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    marginBottom: SIZES.PADDING_MEDIUM,
    lineHeight: 18,
  },
  bundleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginTop: SIZES.PADDING_MEDIUM,
  },
  bundleSavings: {
    fontSize: SIZES.CAPTION,
    color: COLORS.ONLINE,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  bundleButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_LARGE,
    paddingVertical: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    minWidth: 100,
    alignItems: "center",
  },
  bundleButtonText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  themesSection: {
    // marginTop: SIZES.PADDING_LARGE,
    // backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: SIZES.PADDING_SMALL,
    // backgroundColor: "red",
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 2,
  },
  themeCard: {
    width: (screenWidth - SIZES.PADDING_MEDIUM * 6) / 2, // Account for container padding, grid gap, and card margins
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    paddingVertical: SIZES.PADDING_MEDIUM,
    paddingHorizontal: SIZES.PADDING_SMALL + 2,
    marginBottom: SIZES.PADDING_MEDIUM,
    ...SIZES.SHADOW_CARD,
    borderWidth: 2,
    borderColor: COLORS.CARD_BORDER,
    alignItems: "center",
    minHeight: 180,
    maxWidth: 150, // Reduced max width to ensure 2-column layout
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  lockedCard: {
    opacity: 0.7,
    borderColor: COLORS.OFFLINE,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
    width: "100%",
  },
  cardEmoji: {
    fontSize: 20,
  },
  ownedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.LIGHT_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  ownedText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    marginLeft: 2,
  },
  lockIcon: {
    backgroundColor: COLORS.CARD_BORDER,
    padding: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  imageContainer: {
    width: "100%",
    height: 100,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    marginBottom: SIZES.PADDING_SMALL,
    padding: 2, // Reduced padding to give images more space
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  themeImage: {
    width: "80%", // Use full container width
    height: "80%", // Use full container height
    resizeMode: "contain", // This will fill the container completely
    // backgroundColor: "yellow",
  },
  cardContent: {
    alignItems: "center",
    width: "100%",
  },
  themeName: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  themePrice: {
    fontSize: SIZES.CAPTION,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Solid dark overlay
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_MEDIUM,
  },
  previewContainer: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: "95%", // Slightly wider
    maxWidth: 400,
    height: "95%", // Slightly taller
    ...SIZES.SHADOW_LARGE,
    overflow: "hidden", // Ensure content doesn't leak out
  },
  previewHeader: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
    flex: 0, // Don't expand header
  },
  previewTitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
    textAlign: "center",
  },
  closePreviewButton: {
    padding: SIZES.PADDING_SMALL,
  },
  previewScrollView: {
    flex: 1, // Take remaining space
  },
  previewScrollContent: {
    paddingBottom: SIZES.PADDING_XLARGE, // Increased bottom padding for better scrolling
    // backgroundColor: "red",
    padding: SIZES.PADDING_MEDIUM, // Added padding for content
  },
  previewContentWrapper: {
    flex: 1, // Take remaining space
  },
  previewImageContainer: {
    width: "100%",
    height: 300, // Fixed height that works well with most image aspect ratios
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    marginBottom: SIZES.PADDING_LARGE,
    // marginHorizontal: SIZES.PADDING_SMALL,
    padding: SIZES.PADDING_MEDIUM,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
  },
  previewImage: {
    width: "100%",
    height: "100%", // Fill the container
    resizeMode: "cover", // This will crop the image to fit the container
    // Alternative resize modes you can try:
    // "contain" - Shows full image with possible empty space
    // "stretch" - Stretches image to fill (may distort)
    // "center" - Centers image without resizing
    // "repeat" - Repeats image to fill space
  },
  previewContent: {
    padding: SIZES.PADDING_LARGE,
    paddingTop: 0, // Remove top padding since image container has margin
  },
  previewDescription: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    lineHeight: 22,
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center",
  },
  sampleChallengesSection: {
    marginBottom: SIZES.PADDING_XLARGE, // More space before purchase section
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE, // Larger border radius
    padding: SIZES.PADDING_LARGE, // More padding inside section
    borderWidth: 1, // Add border
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL, // Add subtle shadow
  },
  sampleChallengesTitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_SMALL,
    textAlign: "center",
  },
  sampleChallengesSubtitle: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: FONTS.DOSIS, // Use existing DOSIS font
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center",
    lineHeight: 18,
  },
  sampleChallengeItem: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_MEDIUM,
    marginBottom: SIZES.PADDING_SMALL,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    position: "relative",
    overflow: "hidden",
    minHeight: 80, // Increased height for better text display
    ...SIZES.SHADOW_SMALL,
  },
  challengeTextContainer: {
    position: "relative",
    zIndex: 1,
    paddingRight: 80, // Leave space for blur effect on the right
  },
  sampleChallengeText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "left",
    lineHeight: 20,
    position: "relative",
    zIndex: 2,
  },
  blurredTextContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80, // Width of the blur effect
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    overflow: "hidden",
  },
  blurredTextBlur: {
    width: "100%",
    height: "100%",
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    justifyContent: "center",
    alignItems: "center",
  },
  blurredTextContent: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SIZES.PADDING_SMALL,
  },
  purchaseSection: {
    alignItems: "center",
    paddingVertical: SIZES.PADDING_MEDIUM,
    paddingHorizontal: SIZES.PADDING_SMALL, // Added horizontal padding
  },
  previewPrice: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center", // Center the price
  },
  purchaseButton: {
    minWidth: 160, // Increased button width
    paddingHorizontal: SIZES.PADDING_XLARGE,
    paddingVertical: SIZES.PADDING_MEDIUM, // Added vertical padding
  },
  ownedSection: {
    alignItems: "center",
    paddingVertical: SIZES.PADDING_LARGE,
    paddingHorizontal: SIZES.PADDING_SMALL, // Added horizontal padding
  },
  ownedMessage: {
    fontSize: SIZES.BODY,
    color: COLORS.ONLINE,
    fontFamily: FONTS.DOSIS_BOLD,
    marginTop: SIZES.PADDING_MEDIUM,
    textAlign: "center",
  },
  testElement: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    padding: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    marginBottom: SIZES.PADDING_MEDIUM,
    alignItems: "center",
    justifyContent: "center",
  },
  testText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
});
