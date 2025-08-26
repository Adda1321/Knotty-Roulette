import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
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
import purchaseService from "../../services/purchaseService";
import themePackService from "../../services/themePackService";
import upsellService from "../../services/upsellService";
import userService from "../../services/userService";
import { getSampleChallenges } from "../../utils/themeHelpers";
import Button from "./Button";
import CustomModal from "./CustomModal";
import PurchaseCelebrationModal from "./PurchaseCelebrationModal";
import UpsellModal from "./UpsellModal";

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
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPack, setSelectedPack] = useState<ThemePack | null>(null);
  const [themePacks, setThemePacks] = useState<ThemePack[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [purchasedPackName, setPurchasedPackName] = useState("");
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);
  const [packToSwitch, setPackToSwitch] = useState<ThemePack | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const { COLORS, switchTheme, currentTheme, refreshTheme } = useTheme();
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [currentUpsellOffer, setCurrentUpsellOffer] = useState<any>(null);
  const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] =
    useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{
    title: string;
    message: string;
    action: string;
  } | null>(null);
  const [isAdFreePurchasing, setIsAdFreePurchasing] = useState(false);
  const [purchasingBundleId, setPurchasingBundleId] = useState<string | null>(
    null
  );
  const [passiveOffers, setPassiveOffers] = useState<any[]>([]);
  const [showPurchaseCelebrationModal, setShowPurchaseCelebrationModal] =
    useState(false);
  const [purchaseType, setPurchaseType] = useState<
    "ad_free" | "theme_packs" | "all_in_bundle" | "complete_set" | null
  >(null);
  console.log("isGameActive=>>", isGameActive);
  // Load theme packs with current status
  useEffect(() => {
    loadThemePacks();
    checkShopEntryUpsell();
  }, []);

  const checkShopEntryUpsell = async () => {
    try {
      console.log("🛍️ ThemeStore: Checking shop entry upsell...");
      const upsellType = await upsellService.trackShopEntry();
      console.log("🛍️ ThemeStore: Shop entry upsell result:", upsellType);

      if (upsellType !== "none") {
        console.log(
          "🛍️ ThemeStore: Getting upsell offer for type:",
          upsellType
        );
        const offer = upsellService.getUpsellOffer(upsellType, "shop_entry");
        console.log("🛍️ ThemeStore: Upsell offer result:", offer);

        if (offer) {
          console.log(
            "🛍️ ThemeStore: Setting upsell modal with offer:",
            offer.id
          );
          setCurrentUpsellOffer(offer);
          setShowUpsellModal(true);
        } else {
          console.log(
            "🛍️ ThemeStore: No offer returned for upsell type:",
            upsellType
          );
        }
      } else {
        console.log("🛍️ ThemeStore: No upsell needed (type: none)");
      }
    } catch (error) {
      console.error("Error checking shop entry upsell:", error);
    }
  };

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

  // Load passive offers based on user state
  useEffect(() => {
    loadPassiveOffers();
  }, []);

  const loadPassiveOffers = () => {
    const offers = upsellService.getPassiveUpsells();
    setPassiveOffers(offers);

    // Debug: Log user status and passive offers
    const isPremium = userService.isPremium();
    const purchasedPacks = themePackService.getPurchasedPacks();
    const hasAdFreeBundle = offers.some(
      (offer) => offer.primaryButton.action === "ad_free"
    );

    console.log("🔍 ThemeStore Debug:", {
      userStatus: isPremium ? "Premium (Ad-Free)" : "Free User",
      ownedThemePacks: purchasedPacks.length,
      totalThemePacks: Object.keys(themePackService.getAllPacksWithStatus())
        .length,
      passiveOffersCount: offers.length,
      passiveOffers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        price: o.primaryButton.price,
        action: o.primaryButton.action,
      })),
      hasAdFreeBundle: hasAdFreeBundle,
      adFreeButtonVisible: !isPremium && !hasAdFreeBundle,
      adFreeButtonReason: hasAdFreeBundle
        ? "Hidden - Ad-Free bundle available"
        : "Visible - No Ad-Free bundle",
    });
  };

  const openPreview = (pack: ThemePack) => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
    setSelectedPack(pack);
    setShowPreview(true);
  };

  const closePreview = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
    setShowPreview(false);
    setSelectedPack(null);
  };

  const handlePurchase = async (pack: ThemePack) => {
    if (pack.isOwned) return;

    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
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
        loadPassiveOffers(); // Refresh passive offers
        closePreview();
      } else {
        setPurchaseSuccessData({
          title: "❌ Purchase Failed",
          message: "Unable to complete purchase. Please try again.",
          action: "OK",
        });
        setShowPurchaseSuccessModal(true);
      }
    } catch (error) {
      setPurchaseSuccessData({
        title: "❌ Error",
        message: "An error occurred during purchase.",
        action: "OK",
      });
      setShowPurchaseSuccessModal(true);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePackSelection = async (pack: ThemePack) => {
    if (!pack.isOwned) return;

    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
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

  const handleAdFreeOnlyPurchase = async () => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    setIsAdFreePurchasing(true);

    try {
      const success = await purchaseService.purchasePremiumPack();

      if (success) {
        // Refresh passive offers and theme packs
        loadPassiveOffers();
        loadThemePacks();

        // Show success feedback
        audioService.playSound("bonusAchieved");
        audioService.playHaptic("success");

        // Show custom success modal
        setPurchaseSuccessData({
          title: "🎉 Ad-Free Activated!",
          message: "You're now a premium user! No more ads during gameplay.",
          action: "Awesome!",
        });
        setShowPurchaseSuccessModal(true);
      } else {
        setPurchaseSuccessData({
          title: "❌ Purchase Failed",
          message: "Unable to complete purchase. Please try again.",
          action: "OK",
        });
        setShowPurchaseSuccessModal(true);
      }
    } catch (error) {
      setPurchaseSuccessData({
        title: "❌ Error",
        message: "An error occurred during purchase.",
        action: "OK",
      });
      setShowPurchaseSuccessModal(true);
    } finally {
      setIsAdFreePurchasing(false);
    }
  };

  const handlePassiveOfferPurchase = async (offer: any) => {
    // Don't process if this is a completed offer
    if (offer.isCompleted || offer.primaryButton.action === "none") {
      return;
    }

    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    // Set loading state for this specific bundle
    setPurchasingBundleId(offer.id);

    // Handle passive offer purchase based on action type
    try {
      let success = false;

      if (offer.primaryButton.action === "ad_free") {
        success = await purchaseService.purchasePremiumPack();
      } else if (offer.primaryButton.action === "theme_packs") {
        success = await themePackService.purchasePack("college");
        if (success) {
          success = await themePackService.purchasePack("couple");
        }
      } else if (offer.primaryButton.action === "complete_set") {
        success = await themePackService.purchasePack("couple");
      } else if (offer.primaryButton.action === "all_in_bundle") {
        success = await purchaseService.purchasePremiumPack();
        if (success) {
          success = await themePackService.purchasePack("college");
          if (success) {
            success = await themePackService.purchasePack("couple");
          }
        }
      }

      if (success) {
        // Refresh passive offers and theme packs
        loadPassiveOffers();
        loadThemePacks();

        // Show success feedback
        audioService.playSound("bonusAchieved");
        audioService.playHaptic("success");
        // Show custom success modal
        setPurchaseSuccessData({
          title: "🎉 Purchase Successful!",
          message: "Your purchase has been completed successfully!",
          action: "Awesome!",
        });
        setShowPurchaseSuccessModal(true);
      } else {
        setPurchaseSuccessData({
          title: "❌ Purchase Failed",
          message: "Unable to complete purchase. Please try again.",
          action: "OK",
        });
        setShowPurchaseSuccessModal(true);
      }
    } catch (error) {
      setPurchaseSuccessData({
        title: "❌ Error",
        message: "An error occurred during purchase.",
        action: "OK",
      });
      setShowPurchaseSuccessModal(true);
    } finally {
      setPurchasingBundleId(null);
    }
  };

  const handleBundlePurchase = (bundle: any) => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    // Mock bundle purchase - replace with actual IAP logic later
    console.log(`Mock bundle purchase initiated for ${bundle.title}`);
  };

  const handleResetStore = async () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");

    try {
      // Reset theme pack purchases
      await themePackService.resetPurchases();

      // Reset user premium status (Ad-Free)
      await userService.forceResetForTesting();

      // Reset upsell service state
      await upsellService.resetUpsellState();

      // Force theme refresh to ensure context updates
      await refreshTheme();

      // Small delay to ensure theme context updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh all data
      loadThemePacks();
      loadPassiveOffers();

      // Show success feedback
      audioService.playSound("buttonPress");
      audioService.playHaptic("medium");

      // Show success message
      Alert.alert(
        "🔄 Store Reset Complete!",
        "All purchases and premium status have been reset. You're now a free user again and back to the default theme.",
        [{ text: "Got it!" }]
      );
    } catch (error) {
      console.error("❌ ThemeStore: Error resetting store:", error);
      Alert.alert(
        "Error",
        "Failed to reset store completely. Please try again."
      );
    }
  };

  const renderBundleDeals = () => {
    return (
      <View style={styles.bundleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Offers</Text>
        </View>

        {passiveOffers.length > 0 &&
          passiveOffers.map((offer) => (
            <View
              key={offer.id}
              style={[
                styles.bundleCard,
                offer.isCompleted && styles.bundleCardCompleted,
              ]}
            >
              <View style={styles.bundleHeader}>
                <Text style={styles.bundleTitle}>{offer.title}</Text>
                {offer.showBestDeal && offer.bestDealText && (
                  <View style={styles.bundleBestDealBadge}>
                    <Text style={styles.bundleBestDealText}>
                      {offer.bestDealText}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.bundleDescription}>{offer.description}</Text>
              <View style={styles.bundleFooter}>
                <View
                  style={[
                    styles.bundlePriceContainer,
                    offer.isCompleted && styles.bundlePriceContainerCompleted,
                  ]}
                >
                  <Text style={styles.bundlePrice}>
                    {offer.primaryButton.price}
                  </Text>
                </View>
                {!offer.isCompleted ? (
                  <TouchableOpacity
                    style={[
                      styles.bundleButton,
                      purchasingBundleId === offer.id &&
                        styles.bundleButtonDisabled,
                    ]}
                    onPress={() => handlePassiveOfferPurchase(offer)}
                    activeOpacity={0.8}
                    disabled={purchasingBundleId === offer.id}
                  >
                    <Text style={styles.bundleButtonText}>
                      {purchasingBundleId === offer.id
                        ? "Purchasing..."
                        : offer.primaryButton.text}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <></>
                )}
              </View>
            </View>
          ))}
      </View>
    );
  };

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
          <View style={[styles.ownedBadge, { backgroundColor: COLORS.ONLINE }]}>
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
                backgroundColor: COLORS.ONLINE,
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
          <View
            style={[styles.previewHeader, { backgroundColor: COLORS.PRIMARY }]}
          >
            <Text style={styles.previewTitle}>{selectedPack?.name}</Text>
            <TouchableOpacity
              onPress={() => {
                audioService.playSound("buttonPress");
                audioService.playHaptic("light");
                closePreview();
              }}
              style={styles.closePreviewButton}
            >
              <Ionicons name="close" size={24} color={COLORS.YELLOW} />
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
                    (challenge: any, index: number) => (
                      <View key={index} style={styles.sampleChallengeItem}>
                        <View style={styles.challengeNumberBadge}>
                          <Text style={styles.challengeNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        <Text style={styles.sampleChallengeText}>
                          {challenge.challenge_text}
                        </Text>
                      </View>
                    )
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

  const handleUpsellPurchaseSuccess = () => {
    // This function is called when the user successfully purchases the upsell offer.
    // It can be used to update the UI or trigger other actions.
    console.log("🛍️ ThemeStore: Upsell purchase successful!");
    loadThemePacks(); // Refresh theme packs after purchase
    loadPassiveOffers(); // Refresh passive offers
    setShowUpsellModal(false);
  };

  const handlePurchaseComplete = (
    type: "ad_free" | "theme_packs" | "all_in_bundle" | "complete_set"
  ) => {
    setPurchaseType(type);
    setShowPurchaseCelebrationModal(true);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: COLORS.PRIMARY }]}>
          <TouchableOpacity
            onPress={() => {
              audioService.playSound("buttonPress");
              audioService.playHaptic("light");
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.YELLOW} />
          </TouchableOpacity>
          <Text style={styles.title}>Theme Store</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => {
                audioService.playSound("buttonPress");
                audioService.playHaptic("light");
                setShowResetConfirmation(true);
              }}
              style={styles.resetButton}
            >
              <Ionicons name="refresh" size={20} color={COLORS.YELLOW} />
            </TouchableOpacity>
          </View>
        </View>
        <View>
          {!userService.isPremium() &&
            !passiveOffers.some(
              (offer) => offer.primaryButton.action === "ad_free"
            ) && (
              <TouchableOpacity
                style={[
                  styles.adFreeButton,
                  isAdFreePurchasing && styles.adFreeButtonDisabled,
                ]}
                onPress={() => handleAdFreeOnlyPurchase()}
                activeOpacity={0.8}
                disabled={isAdFreePurchasing}
              >
                <Text style={styles.adFreeButtonText}>
                  {isAdFreePurchasing ? "Purchasing..." : "Ad-Free Only"}
                </Text>
              </TouchableOpacity>
            )}
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
        onClose={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowPurchaseSuccess(false);
        }}
        title="Purchase Successful! 🎉"
        message={`You've unlocked the ${purchasedPackName}! You can now use this theme pack. Select it manually when you're ready to switch themes.`}
        showConfirmButton={true}
        confirmButtonText="Awesome!"
        onConfirm={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowPurchaseSuccess(false);
          loadThemePacks(); // Refresh the list
        }}
        showSparkles={true}
      />

      {/* Theme Switch Confirmation Modal */}
      <CustomModal
        visible={showSwitchConfirmation}
        onClose={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowSwitchConfirmation(false);
        }}
        title="Switch Theme Pack?"
        message={`Are you sure you want to switch to ${packToSwitch?.name}? You can only change themes when not in an active game.`}
        showConfirmButton={true}
        confirmButtonText="Switch Theme"
        onConfirm={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          confirmThemeSwitch();
        }}
        showCloseButton={true}
        closeButtonText="Cancel"
        disabled={isGameActive}
      />

      {/* Store Reset Confirmation Modal */}
      <CustomModal
        visible={showResetConfirmation}
        onClose={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowResetConfirmation(false);
        }}
        title="Reset Theme Store?"
        message="This will reset all theme pack purchases and return you to the default theme. This action cannot be undone."
        showConfirmButton={true}
        confirmButtonText="Reset Store"
        onConfirm={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          handleResetStore();
          setShowResetConfirmation(false);
        }}
        showCloseButton={true}
        closeButtonText="Cancel"
        destructive={true}
      />

      {/* Upsell Modal */}
      {currentUpsellOffer && (
        <UpsellModal
          visible={showUpsellModal}
          onClose={() => setShowUpsellModal(false)}
          onPurchaseSuccess={handleUpsellPurchaseSuccess}
          onPurchaseComplete={handlePurchaseComplete}
          offer={currentUpsellOffer}
        />
      )}

      {/* Purchase Celebration Modal */}
      {showPurchaseCelebrationModal && purchaseType && (
        <PurchaseCelebrationModal
          visible={showPurchaseCelebrationModal}
          onClose={() => setShowPurchaseCelebrationModal(false)}
          purchaseType={purchaseType}
        />
      )}

      {/* Purchase Success/Error Modal */}
      {purchaseSuccessData && (
        <CustomModal
          visible={showPurchaseSuccessModal}
          onClose={() => {
            audioService.playSound("buttonPress");
            audioService.playHaptic("light");
            setShowPurchaseSuccessModal(false);
          }}
          title={purchaseSuccessData.title}
          message={purchaseSuccessData.message}
          showCloseButton={true}
          closeButtonText={purchaseSuccessData.action}
          showConfirmButton={false}
          showSparkles={purchaseSuccessData.title.includes("🎉")}
        />
      )}
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
    // backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: SIZES.PADDING_LARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 0,
  },
  backButton: {
    padding: SIZES.PADDING_SMALL,
    width: 100,
    height: 44,
    paddingLeft: SIZES.PADDING_LARGE,
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 8,
    // backgroundColor:"red"
  },
  title: {
    fontSize: SIZES.EXTRALARGE + 4,
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
  },
  sectionHeader: {
    position: "relative", // For absolute positioning of Ad-Free button
    alignItems: "center",
  },
  adFreeButton: {
    position: "absolute",
    right: 0, // Position on the right side
    top: 0, // Align with the top of the container
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_SMALL,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_SMALL,
    borderBottomLeftRadius: SIZES.BORDER_RADIUS_SMALL,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.CARD_BORDER,
    marginTop: 15,
    zIndex: 1, // Ensure button appears above other elements
  },
  adFreeButtonDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  adFreeButtonText: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: SIZES.TITLE,
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
  bundleCardDisabled: {
    opacity: 0.6,
    borderColor: COLORS.TEXT_SECONDARY,
  },
  bundleCardCompleted: {
    // Keep original styling, just indicate it's completed
    borderColor: COLORS.YELLOW,
    fontSize: SIZES.CAPTION,
  },
  bundleButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.6,
  },
  bundleCompletedText: {
    // Simple text display, no button styling
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.PADDING_SMALL,
  },
  bundleCompletedTextStyle: {
    fontSize: SIZES.CAPTION,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    fontStyle: "italic",
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
  bundleBestDealBadge: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 4,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    marginBottom: SIZES.PADDING_SMALL,
  },
  bundleBestDealText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
  },
  bundlePriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  bundlePriceContainerCompleted: {
    justifyContent: "center",
    flex: 1,
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
  bundlePrice: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  bundleDescription: {
    fontSize: SIZES.CAPTION,
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
    marginVertical: SIZES.PADDING_LARGE,
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
    // backgroundColor: COLORS.ONLINE,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 2,
    borderRadius: SIZES.BORDER_RADIUS_SMALL - 2,
  },
  ownedBadgeText: {
    fontSize: SIZES.BODY,
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
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
    lineHeight: 16,
  },
  themePrice: {
    fontSize: SIZES.BODY,
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
    fontSize: SIZES.EXTRALARGE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
    textAlign: "center",
    marginLeft: 20,
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
    paddingHorizontal: 26,
  },
  previewImageContainer: {
    width: "80%",
    height: 400, // Reduced from 300
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    // marginBottom: SIZES.PADDING_LARGE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
    // padding: SIZES.PADDING_SMALL, // Reduced padding
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
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    lineHeight: 22,
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center",
  },
  sampleChallengesSection: {
    backgroundColor: COLORS.FIELDS, // Changed from CARD_BACKGROUND to FIELDS for minimal look
    borderRadius: SIZES.BORDER_RADIUS_LARGE, // Larger border radius
    paddingVertical: SIZES.PADDING_LARGE, // More padding inside section
    borderWidth: 0, // Remove border for cleaner look
  },
  sampleChallengesTitle: {
    fontSize: SIZES.TITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_SMALL,
    textAlign: "center",
  },
  sampleChallengesSubtitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS, // Use existing DOSIS font
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center",
    lineHeight: 18,
  },
  sampleChallengeItem: {
    flexDirection: "row", // Horizontal layout
    alignItems: "flex-start", // Align items to top
    marginBottom: SIZES.PADDING_MEDIUM, // Space between challenges
    paddingHorizontal: SIZES.PADDING_SMALL, // Minimal horizontal padding
    paddingVertical: SIZES.PADDING_SMALL, // Minimal vertical padding
    position: "relative",
    minHeight: 60, // Reduced height since no container
  },
  challengeNumberBadge: {
    backgroundColor: COLORS.YELLOW,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 2,
    marginRight: SIZES.PADDING_MEDIUM, // Space between number and text
    minWidth: 24, // Fixed width for consistent alignment
    alignItems: "center",
    justifyContent: "center",
  },
  challengeNumberText: {
    // fontSize: SIZES.SMALL,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    fontSize: SIZES.SUBTITLE,
  },
  sampleChallengeText: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "left",
    lineHeight: 20,
    flex: 1, // Take remaining space
    paddingRight: SIZES.PADDING_MEDIUM, // Space for bonus badge
  },
  bonusBadge: {
    position: "absolute",
    top: SIZES.PADDING_SMALL,
    right: SIZES.PADDING_SMALL,
    backgroundColor: COLORS.YELLOW,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 2,
  },
  bonusText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
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
    fontSize: SIZES.SUBTITLE,
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
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_PRIMARY,
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
