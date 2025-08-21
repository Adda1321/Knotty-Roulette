import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  COLORS,
  FONTS,
  SIZES,
  THEME_PACKS,
  THEME_PACK_DATA,
  ThemePackId,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext"; // Add useTheme hook
import audioService from "../../services/audio";
import themePackService from "../../services/themePackService";
import { getSampleChallenges } from "../../utils/themeHelpers";
import Button from "./Button";
import CustomModal from "./CustomModal";

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
  isCurrent: boolean;
  emoji: string;
}

export default function ThemeStore({
  isGameActive = false, // Add prop to check if game is active
}: {
  isGameActive?: boolean;
}) {
  const { switchTheme } = useTheme(); // Add theme context hook
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPack, setSelectedPack] = useState<ThemePack | null>(null);
  const [themePacks, setThemePacks] = useState<ThemePack[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [purchasedPackName, setPurchasedPackName] = useState("");
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);
  const [packToSwitch, setPackToSwitch] = useState<ThemePack | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Load theme packs with current status
  useEffect(() => {
    loadThemePacks();
  }, []);

  const loadThemePacks = () => {
    const packsWithStatus = themePackService.getAllPacksWithStatus();
    const packs: ThemePack[] = [
      {
        id: THEME_PACKS.DEFAULT,
        name: THEME_PACK_DATA[THEME_PACKS.DEFAULT].name,
        description: THEME_PACK_DATA[THEME_PACKS.DEFAULT].description,
        price: "Free",
        image: require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png"),
        previewImage: require("../../assets/images/ThemedPacksImages/DefaultTheme.jpeg"),
        isOwned: packsWithStatus[0].isOwned,
        isLocked: packsWithStatus[0].isLocked,
        isCurrent: packsWithStatus[0].isCurrent,
        emoji: THEME_PACK_DATA[THEME_PACKS.DEFAULT].emoji,
      },
      {
        id: THEME_PACKS.COLLEGE,
        name: THEME_PACK_DATA[THEME_PACKS.COLLEGE].name,
        description: THEME_PACK_DATA[THEME_PACKS.COLLEGE].description,
        price: `$${THEME_PACK_DATA[THEME_PACKS.COLLEGE].price}`,
        image: require("../../assets/images/MascotImages/College/College-legs-mascot.png"),
        previewImage: require("../../assets/images/ThemedPacksImages/CollegeThemePack.jpeg"),
        isOwned: packsWithStatus[1].isOwned,
        isLocked: packsWithStatus[1].isLocked,
        isCurrent: packsWithStatus[1].isCurrent,
        emoji: THEME_PACK_DATA[THEME_PACKS.COLLEGE].emoji,
      },
      {
        id: THEME_PACKS.COUPLE,
        name: THEME_PACK_DATA[THEME_PACKS.COUPLE].name,
        description: THEME_PACK_DATA[THEME_PACKS.COUPLE].description,
        price: `$${THEME_PACK_DATA[THEME_PACKS.COUPLE].price}`,
        image: require("../../assets/images/MascotImages/Couple/Couple-legs-mascot.png"),
        previewImage: require("../../assets/images/ThemedPacksImages/CoupleThemePack.jpeg"),
        isOwned: packsWithStatus[2].isOwned,
        isLocked: packsWithStatus[2].isLocked,
        isCurrent: packsWithStatus[2].isCurrent,
        emoji: THEME_PACK_DATA[THEME_PACKS.COUPLE].emoji,
      },
    ];
    setThemePacks(packs);
  };

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

  const openPreview = (pack: ThemePack) => {
    setSelectedPack(pack);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedPack(null);
  };

  const handlePurchase = async (pack: ThemePack) => {
    if (pack.isOwned) return;

    setIsPurchasing(true);
    try {
      const success = await themePackService.purchasePack(pack.id as any);

      if (success) {
        setPurchasedPackName(pack.name);
        setShowPurchaseSuccess(true);
        // Play sound after modal is shown for better audio timing
        setTimeout(() => {
          audioService.playSound("bonusAchieved");
          audioService.playHaptic("success");
        }, 100);
        loadThemePacks(); // Refresh the list
        closePreview();
      } else {
        Alert.alert(
          "Purchase Failed",
          "Unable to complete purchase. Please try again."
        );
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during purchase.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePackSelection = async (pack: ThemePack) => {
    if (!pack.isOwned) return;

    console.log("🎨 ThemeStore: User wants to switch to theme:", pack.id);
    console.log("🎨 ThemeStore: Pack details:", pack);

    // Show confirmation modal instead of direct switch
    setPackToSwitch(pack);
    setShowSwitchConfirmation(true);
  };

  const confirmThemeSwitch = async () => {
    if (!packToSwitch) return;
    console.log("Pack to switch ID", packToSwitch.id);
    // Use theme context to switch themes - this will update all components
    const success = await switchTheme(packToSwitch.id as ThemePackId);
    if (success) {
      loadThemePacks(); // Refresh to show current selection
      audioService.playSound("buttonPress");
      audioService.playHaptic("light");
      console.log(
        "🎨 ThemeStore: Theme switched successfully to:",
        packToSwitch.id
      );
    } else {
      console.log("❌ ThemeStore: Failed to switch theme to:", packToSwitch.id);
    }

    setShowSwitchConfirmation(false);
    setPackToSwitch(null);
  };

  const handleBundlePurchase = (bundle: any) => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    // Mock bundle purchase - replace with actual IAP logic later
    console.log(`Mock bundle purchase initiated for ${bundle.title}`);
  };

  const handleResetStore = async () => {
    try {
      await themePackService.resetPurchases();
      loadThemePacks(); // Refresh the list
      audioService.playSound("buttonPress");
      audioService.playHaptic("medium");
    } catch (error) {
      console.error("Error resetting store:", error);
    }
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
      onPress={() => openPreview(pack)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        {/* <View style={styles.themeEmojiContainer}> */}
        <Text style={styles.themeEmoji}>{pack.emoji}</Text>
        {/* </View> */}
        {pack.isOwned && (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>Owned</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          <Image
            source={pack.image}
            style={styles.themeImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.themeName}>{pack.name}</Text>
        <Text style={styles.themePrice}>{pack.price}</Text>

        {/* Show "In Use", "Use This Theme", or "Preview" button */}
        {pack.isOwned && pack.isCurrent ? (
          <TouchableOpacity
            style={[
              styles.selectButton,
              {
                backgroundColor: COLORS.DARK_GREEN,
              },
            ]}
            disabled={true}
            activeOpacity={0.8}
          >
            <Text style={styles.selectButtonText}>In Use</Text>
          </TouchableOpacity>
        ) : pack.isOwned && !pack.isCurrent ? (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => handlePackSelection(pack)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectButtonText}>Use This Theme</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderPreviewModal = () => (
    <Modal
      visible={showPreview}
      animationType="slide"
      transparent={true}
      // statusBarTranslucent
      // presentationStyle="overFullScreen"
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
              <View style={styles.previewImageWrapper}>
                <View style={styles.previewImageContainer}>
                  <Image
                    source={selectedPack?.previewImage}
                    style={styles.previewImage}
                  />
                </View>
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
                    {`Get a taste of what's inside this theme pack`}
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

                            {Platform.OS === "ios" ? (
                              <View style={styles.blurredTextContainer}>
                                <BlurView
                                  intensity={10}
                                  tint="light"
                                  style={styles.blurredTextBlur}
                                >
                                  <Text style={styles.blurredTextContent}>
                                    {secondHalf}
                                  </Text>
                                </BlurView>
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.blurredTextContainer,
                                  styles.androidBlurSimple,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.blurredTextContent,
                                    styles.androidBlurSimpleText,
                                  ]}
                                >
                                  {secondHalf}
                                </Text>
                              </View>
                            )}
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
                      text={isPurchasing ? "Purchasing..." : "Purchase"}
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.title}>Theme Store</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => setShowResetConfirmation(true)}
              style={styles.resetButton}
            >
              <Ionicons name="refresh" size={20} color={COLORS.YELLOW} />
            </TouchableOpacity>
          </View>
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
                {themePacks.map(renderThemeCard)}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {renderPreviewModal()}
      <CustomModal
        visible={showPurchaseSuccess}
        onClose={() => setShowPurchaseSuccess(false)}
        title="Purchase Successful! 🎉"
        message={`You've unlocked the ${purchasedPackName}! You can now use this theme pack. Select it manually when you're ready to switch themes.`}
        showConfirmButton={true}
        confirmButtonText="Awesome!"
        onConfirm={() => {
          setShowPurchaseSuccess(false);
          loadThemePacks(); // Refresh the list
        }}
        showSparkles={true}
      />

      {/* Theme Switch Confirmation Modal */}
      <CustomModal
        visible={showSwitchConfirmation}
        onClose={() => setShowSwitchConfirmation(false)}
        title="Switch Theme Pack?"
        message={`Are you sure you want to switch to ${packToSwitch?.name}? You can only change themes when not in an active game.`}
        showConfirmButton={true}
        confirmButtonText="Switch Theme"
        onConfirm={confirmThemeSwitch}
        showCloseButton={true}
        closeButtonText="Cancel"
        disabled={isGameActive}
      />

      {/* Store Reset Confirmation Modal */}
      <CustomModal
        visible={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        title="Reset Theme Store?"
        message="This will reset all theme pack purchases and return you to the default theme. This action cannot be undone."
        showConfirmButton={true}
        confirmButtonText="Reset Store"
        onConfirm={() => {
          handleResetStore();
          setShowResetConfirmation(false);
        }}
        showCloseButton={true}
        closeButtonText="Cancel"
        destructive={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: 0,
    width: "100%",
    maxWidth: "100%",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: SIZES.PADDING_LARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft:0
  },
  backButton: {
    padding: SIZES.PADDING_SMALL,
    width: 100,
    height: 44,
    paddingLeft:SIZES.PADDING_LARGE,
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 8,
    // backgroundColor:"red"
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
    textAlign: "center",
    marginLeft: -40, // Compensate for back button width to center title
  },
  closeButton: {
    padding: SIZES.PADDING_SMALL,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  resetButton: {
    padding: SIZES.PADDING_SMALL,
    marginRight: SIZES.PADDING_SMALL,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.FIELDS,
  },
  content: {
    flex: 1,
    padding: SIZES.PADDING_MEDIUM,
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
    marginTop: SIZES.PADDING_LARGE,
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SIZES.PADDING_MEDIUM,
    paddingHorizontal: SIZES.PADDING_SMALL,
  },
  themeCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_MEDIUM,
    width: (screenWidth - SIZES.PADDING_LARGE * 2.7) / 2,
    minHeight: 200,
    maxWidth: 180,
    // borderWidth: 1, // Removed border
    // borderColor: COLORS.CARD_BORDER, // Removed border
    ...SIZES.SHADOW_SMALL,
    overflow: "hidden", // Ensure content doesn't overflow
  },
  lockedCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
    width: "100%", // Ensure full width
  },
  themeEmoji: {
    fontSize: 20, // Slightly smaller to ensure it fits
  },
  ownedBadge: {
    backgroundColor: COLORS.ONLINE,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_SMALL - 2,
  },
  ownedBadgeText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.FIELDS, // Use existing color instead of WHITE
    fontFamily: FONTS.DOSIS_BOLD,
  },
  // inUseBadge: {
  //   backgroundColor: COLORS.ONLINE,
  //   paddingHorizontal: SIZES.PADDING_SMALL,
  //   paddingVertical: 2,
  //   borderRadius: SIZES.BORDER_RADIUS_SMALL,
  //   marginTop: SIZES.PADDING_MEDIUM,
  // },
  // inUseBadgeText: {
  //   fontSize: SIZES.CAPTION,
  //   color: COLORS.FIELDS, // Use existing color instead of WHITE
  //   fontFamily: FONTS.DOSIS_BOLD,
  // },
  cardContent: {
    flex: 1,
    alignItems: "center",
  },
  imageContainer: {
    height: 80,
    width: "100%",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_SMALL,
    marginBottom: SIZES.PADDING_SMALL,
  },
  themeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  themeName: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
    lineHeight: 16,
  },
  themePrice: {
    fontSize: SIZES.CAPTION,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
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
  previewImageWrapper: {
    width: "100%",
    alignItems: "center", // This centers horizontally
    justifyContent: "center", // This centers vertically
    marginBottom: SIZES.PADDING_LARGE,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
  },
  previewImageContainer: {
    width: "90%",
    height: 300, // Reduced from 300
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    // marginBottom: SIZES.PADDING_LARGE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
    padding: SIZES.PADDING_SMALL, // Reduced padding
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.PADDING_SMALL,
  },
  blurredTextContent: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    lineHeight: 20,
  },
  androidBlurSimple: {
    backgroundColor: "#fff",
    borderLeftWidth: 0,
    borderLeftColor: "rgba(255, 255, 255, 0.5)",
  },
  androidBlurSimpleText: {
    opacity: 0.1,
    textShadowColor: "rgba(190, 37, 37, 0.1)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
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
  selectButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_LARGE,
    paddingVertical: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    minWidth: 150,
    alignItems: "center",
    marginTop: SIZES.PADDING_SMALL,
  },
  selectButtonText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  previewButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_LARGE,
    paddingVertical: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    minWidth: 150,
    alignItems: "center",
    marginTop: SIZES.PADDING_SMALL,
  },
  previewButtonText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
});
