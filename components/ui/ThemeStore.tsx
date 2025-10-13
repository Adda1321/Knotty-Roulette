import userService from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { PRODUCT_DEFINITIONS } from "../../constants/iapProducts";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import {
    COLORS,
    FONTS,
    SIZES,
    THEME_COLORS,
    THEME_PACKS,
    THEME_PACK_DATA,
    ThemePackId,
} from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext"; // Add useTheme hook
import adService from "../../services/adService";
import audioService from "../../services/audio";
import purchaseService from "../../services/purchaseService";
import { themePackService } from "../../services/themePackService";
import upsellService from "../../services/upsellService";
import { getSampleChallenges } from "../../utils/themeHelpers";
import Button from "./Button";
import CustomModal from "./CustomModal";
import { useIAPContext } from "./IAPProvider";
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

export default function ThemeStore() {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPack, setSelectedPack] = useState<ThemePack | null>(null);
  const [themePacks, setThemePacks] = useState<ThemePack[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);
  const [packToSwitch, setPackToSwitch] = useState<ThemePack | null>(null);
  const { COLORS, switchTheme, currentTheme, refreshTheme } = useTheme();
  const iapContext = useIAPContext();
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
    "ad_free" | "theme_packs" | "all_in_bundle" | "complete_set" | null | null
  >(null);
  const [isThemeSwitching, setIsThemeSwitching] = useState(false);

  // Load theme packs with current status
  useEffect(() => {
    loadThemePacks();
    loadPassiveOffers();
    checkShopEntryUpsell();
  }, []);

  // Refresh passive offers when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPassiveOffers();
      loadThemePacks();
    }, [])
  );

  // Listen for validation completion to close preview modal
  useEffect(() => {
    // Set up validation completion callback
    const handleValidationComplete = (productId: string, success: boolean) => {
      // Map theme pack IDs to their corresponding product IDs
      const themePackProductMap: { [key: string]: string[] } = {
        college: ["college"],
        couple: ["couple"],
        test_theme_fake: ["testthemeFakeupd_6"],
        test_theme_angry: ["testthemeAngryupd_6"],
      };

      // Check if this product ID corresponds to any theme pack
      const isThemePackPurchase = Object.values(themePackProductMap).some(
        (productIds) => productIds.includes(productId)
      );

      if (isThemePackPurchase) {
        console.log(
          `🎉 Server validation completed for ${productId} (success: ${success}), closing preview modal`
        );
        closePreview();
      }
    };

    // Set the callback in IAP context
    iapContext.setValidationCompleteCallback(handleValidationComplete);

    // Cleanup function to remove callback
    return () => {
      iapContext.setValidationCompleteCallback(() => {});
    };
  }, []);

  // Fallback: Listen for purchase state changes to close modal
  useEffect(() => {
    if (iapContext.currentPurchase && selectedPack && !selectedPack.isOwned) {
      // Check if the current purchase matches our selected pack
      const purchaseProductId =
        iapContext.currentPurchase.productId ||
        iapContext.currentPurchase.id ||
        iapContext.currentPurchase.sku;

      const themePackProductMap: { [key: string]: string[] } = {
        college: ["college"],
        couple: ["couple"],
        test_theme_fake: ["testthemeFakeupd_6"],
        test_theme_angry: ["testthemeAngryupd_6"],
      };

      const expectedProductIds = themePackProductMap[selectedPack.id] || [];

      if (expectedProductIds.includes(purchaseProductId)) {
        console.log(
          `🎉 Purchase detected for ${purchaseProductId}, closing preview modal as fallback`
        );
        // Small delay to ensure the purchase is processed
        setTimeout(() => {
          closePreview();
          loadThemePacks(); // Refresh to show updated ownership status
        }, 500);
      }
    }
  }, [iapContext.currentPurchase, selectedPack]);

  // Additional fallback: Listen for purchased products changes to close modal
  useEffect(() => {
    if (selectedPack && !selectedPack.isOwned && isPurchasing) {
      // Map theme pack IDs to their corresponding product IDs
      const themePackProductMap: { [key: string]: string[] } = {
        college: ["college"],
        couple: ["couple"],
        test_theme_fake: ["testthemeFakeupd_6"],
        test_theme_angry: ["testthemeAngryupd_6"],
      };

      // Check if the selected pack is now owned using the mapping
      const expectedProductIds = themePackProductMap[selectedPack.id] || [];
      const isNowOwned = expectedProductIds.some(productId => 
        iapContext.isProductPurchased(productId)
      );
      
      if (isNowOwned) {
        console.log(
          `🎉 Theme pack ${selectedPack.id} is now owned, closing preview modal`
        );
        setTimeout(() => {
          closePreview();
          loadThemePacks(); // Refresh to show updated ownership status
        }, 300);
      }
    }
  }, [iapContext.purchasedProducts, selectedPack, isPurchasing]);

  // Reload theme packs when IAP context changes (for test products)
  useEffect(() => {
    loadThemePacks();
    loadPassiveOffers(); // Also refresh passive offers when IAP context changes
  }, [iapContext.purchasedProducts, iapContext.isProductPurchased]);

  // Direct mapping fallback for when normal restore doesn't work
  const handleDirectMapping = async (): Promise<boolean> => {
    try {
      if (
        !iapContext.availablePurchases ||
        iapContext.availablePurchases.length === 0
      ) {
        return false;
      }

      // Get current purchased products
      const currentPurchased = new Set(iapContext.purchasedProducts || []);
      let mapped = false;

      // Process each available purchase
      for (const purchase of iapContext.availablePurchases) {
        const productId = purchase.productId || purchase.id || purchase.sku;

        if (productId) {
          // Check if this product should be mapped using the existing product definitions
          let productDef = iapContext
            .getCurrentProducts()
            .find((p) => p.productId === productId);

          // Fallback to shared PRODUCT_DEFINITIONS if getCurrentProducts doesn't have the product
          if (!productDef || !productDef.unlocks) {
            productDef =
              PRODUCT_DEFINITIONS[
                productId as keyof typeof PRODUCT_DEFINITIONS
              ];
          }

          if (productDef && productDef.unlocks) {
            // Add to purchased products
            currentPurchased.add(productId);
            mapped = true;

            // Process the purchase to unlock features
            for (const unlock of productDef.unlocks) {
              switch (unlock) {
                case "ad_free":
                  await userService.setPremium("lifetime");
                  await adService.onUserTierChange();
                  break;
                case "college_theme":
                  await themePackService.purchasePack("college");
                  break;
                case "couple_theme":
                  await themePackService.purchasePack("couple");
                  break;
                case "test_theme_fake":
                  await themePackService.purchasePack("test_theme_fake");
                  break;
                case "test_theme_angry":
                  await themePackService.purchasePack("test_theme_angry");
                  break;
              }
            }
          }
        }
      }

      if (mapped) {
        // Update the IAP context with the new purchased products
        // This is a direct state update since we can't call the context method
        const newPurchasedArray = Array.from(currentPurchased);

        // Save to AsyncStorage
        await AsyncStorage.setItem(
          STORAGE_KEYS.PURCHASED_PRODUCTS,
          JSON.stringify(newPurchasedArray)
        );

        // Force a refresh by calling the context's restore method
        await iapContext.restorePurchases();

        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Direct mapping failed:", error);
      return false;
    }
  };

  const handleManualRestore = async () => {
    // Play audio and haptic feedback
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");

    try {
      // Check if we're connected to the store
      if (!iapContext.connected) {
        console.log("❌ Store not connected - cannot restore");
        return;
      }

      // Try to fetch products first
      const products = await iapContext.getProducts();

      if (products && products.length > 0) {
        // Products fetched successfully, now try to restore purchases
        const restoreSuccess = await iapContext.restorePurchases();

        if (restoreSuccess) {
          console.log("✅ Restore successful!");
          // Success - update UI
          loadThemePacks();
          loadPassiveOffers();
        } else {
          // Fallback: Try direct mapping if availablePurchases exist but restore failed
          if (
            iapContext.availablePurchases &&
            iapContext.availablePurchases.length > 0
          ) {
            console.log("🔄 Fallback: Direct mapping available purchases...");

            const directMappingSuccess = await handleDirectMapping();

            if (directMappingSuccess) {
              console.log("✅ Direct mapping successful!");
              // Success - update UI
              loadThemePacks();
              loadPassiveOffers();
            } else {
              console.log("⚠️ No purchases found to restore");
            }
          } else {
            console.log("⚠️ No purchases found to restore");
          }
        }
      } else {
        console.log("❌ Failed to load products");
      }
    } catch (error) {
      console.error("❌ ThemeStore: Manual restore error:", error);
    }
  };

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
      // {
      //   id: THEME_PACKS.TEST_THEME_FAKE,
      //   name: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_FAKE].name,
      //   description: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_FAKE].description,
      //   price: `$${THEME_PACK_DATA[THEME_PACKS.TEST_THEME_FAKE].price}`,
      //   image: require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png"), // Using default image for now
      //   previewImage: require("../../assets/images/ThemedPacksImages/DefaultTheme.jpeg"), // Using default preview for now
      //   isOwned: iapContext.isProductPurchased("testthemeFakeupd_6"),
      //   isLocked: !iapContext.isProductPurchased("testthemeFakeupd_6"),
      //   isCurrent: false,
      //   emoji: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_FAKE].emoji,
      // },
      // {
      //   id: THEME_PACKS.TEST_THEME_ANGRY,
      //   name: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_ANGRY].name,
      //   description: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_ANGRY].description,
      //   price: `$${THEME_PACK_DATA[THEME_PACKS.TEST_THEME_ANGRY].price}`,
      //   image: require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png"), // Using default image for now
      //   previewImage: require("../../assets/images/ThemedPacksImages/DefaultTheme.jpeg"), // Using default preview for now
      //   isOwned: iapContext.isProductPurchased("testthemeAngryupd_6"),
      //   isLocked: !iapContext.isProductPurchased("testthemeAngryupd_6"),
      //   isCurrent: false,
      //   emoji: THEME_PACK_DATA[THEME_PACKS.TEST_THEME_ANGRY].emoji,
      // },
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

    // Set a timeout to close the modal if purchase takes too long
    const purchaseTimeout = setTimeout(() => {
      console.log(
        `⏰ Purchase timeout for ${pack.id}, closing modal as fallback`
      );
      closePreview();
      setIsPurchasing(false);
    }, 200000);

    try {
      let success = false;
      let result: any = null;

      // Use proper purchase service methods based on theme type
      if (pack.id === "college") {
        const purchaseResult = await purchaseService.purchaseCollegeTheme();
        success = purchaseResult.success;
        result = purchaseResult.result;
      } else if (pack.id === "couple") {
        const purchaseResult = await purchaseService.purchaseCoupleTheme();
        success = purchaseResult.success;
        result = purchaseResult.result;
      } else if (pack.id === "test_theme_fake") {
        const purchaseResult = await purchaseService.purchaseFakeTheme();
        success = purchaseResult.success;
        result = purchaseResult.result;
      } else if (pack.id === "test_theme_angry") {
        const purchaseResult = await purchaseService.purchaseAngryTheme();
        success = purchaseResult.success;
        result = purchaseResult.result;
      } else {
        // Fallback for other theme types
        const purchaseResult = await purchaseService.purchaseProduct(pack.id);
        success = purchaseResult.success;
        result = purchaseResult.result;
      }

      // Clear the timeout since we got a response
      clearTimeout(purchaseTimeout);

      // If purchase was successful, close the modal and refresh theme packs
      if (success) {
        console.log(`✅ Purchase successful for ${pack.id}, closing modal`);
        closePreview();
        loadThemePacks(); // Refresh to show updated ownership status
      } else {
        console.log(`⚠️ Purchase service returned false for ${pack.id}`);
        // Don't close modal immediately, let the fallback mechanisms handle it
      }
    } catch (error) {
      // Clear the timeout since we got an error
      clearTimeout(purchaseTimeout);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Purchase failed for ${pack.id}:`, errorMessage);

      // Store error data to show after preview modal closes
      setPurchaseSuccessData({
        title: "❌ Error",
        message: `Exception during purchase: ${errorMessage}`,
        action: "OK",
      });
      // Close preview modal first, then show error
      closePreview();
    } finally {
      setIsPurchasing(false);
    }
  };

  const handlePackSelection = async (pack: ThemePack) => {
    if (!pack.isOwned) return;

    audioService.playSound("buttonPress");
    audioService.playHaptic("light");

    // Show confirmation modal instead of direct switch
    setPackToSwitch(pack);
    setShowSwitchConfirmation(true);
  };

  const confirmThemeSwitch = async () => {
    if (!packToSwitch || isThemeSwitching) return;

    console.log("🎨 ThemeStore: Confirming theme switch to:", packToSwitch.id);
    console.log("🎨 ThemeStore: Current theme before switch:", currentTheme);

    // Set loading state
    setIsThemeSwitching(true);

    try {
      // Use theme context to switch themes - this will update all components
      const success = await switchTheme(packToSwitch.id as ThemePackId);
      if (success) {
        console.log(
          "🎨 ThemeStore: Theme switched successfully to:",
          packToSwitch.id
        );

        // Import background music service to check audio readiness
        const backgroundMusic = (await import("../../services/backgroundMusic"))
          .default;
        const audioReady = await backgroundMusic.ensureAudioLoaded();

        if (audioReady) {
          console.log("🎨 ThemeStore: Background music loaded successfully");
        } else {
          console.warn(
            "⚠️ ThemeStore: Background music loading timeout, proceeding anyway"
          );
        }

        // Refresh theme packs to show current selection
        loadThemePacks();

        // Play success feedback
        audioService.playSound("buttonPress");
        audioService.playHaptic("light");

        console.log("🎨 ThemeStore: Navigating to player setup page...");

        // Small delay to ensure all state updates are processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Navigate to player setup page to start a new game with the new theme
        router.push("/(tabs)");
      } else {
        console.log(
          "❌ ThemeStore: Failed to switch theme to:",
          packToSwitch.id
        );
        // Show error feedback
        audioService.playSound("buttonPress");
        audioService.playHaptic("error");
      }
    } catch (error) {
      console.error("❌ ThemeStore: Error during theme switch:", error);
      // Show error feedback
      audioService.playSound("buttonPress");
      audioService.playHaptic("error");
    } finally {
      // Reset loading state
      setIsThemeSwitching(false);
      setShowSwitchConfirmation(false);
      setPackToSwitch(null);
    }
  };

  const handleAdFreeOnlyPurchase = async () => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");

    setIsAdFreePurchasing(true);

    try {
      const purchaseResult = await purchaseService.purchaseAdFree();
      const success = purchaseResult.success;

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
        setShowPurchaseSuccessModal(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setPurchaseSuccessData({
        title: "❌ Error",
        message: `Exception during purchase: ${errorMessage}`,
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
        const purchaseResult = await purchaseService.purchaseAdFree();
        success = purchaseResult.success;
      } else if (offer.primaryButton.action === "theme_packs") {
        // Buy both theme packs (expand fun bundle)
        const purchaseResult = await purchaseService.purchaseExpandBundle();
        success = purchaseResult.success;
      } else if (offer.primaryButton.action === "complete_set") {
        // Buy the remaining theme pack to complete the collection
        const purchasedPacks = themePackService.getPurchasedPacks();
        const hasCollege = purchasedPacks.includes("college");
        const hasCouple = purchasedPacks.includes("couple");

        if (!hasCollege) {
          const purchaseResult = await purchaseService.purchaseCollegeTheme();
          success = purchaseResult.success;
        } else if (!hasCouple) {
          const purchaseResult = await purchaseService.purchaseCoupleTheme();
          success = purchaseResult.success;
        } else {
          // User already has all themes, this shouldn't happen
          console.warn(
            "⚠️ ThemeStore: User already has all themes but complete_set action triggered"
          );
        }
      } else if (offer.primaryButton.action === "all_in_bundle") {
        const purchaseResult = await purchaseService.purchaseCompleteBundle();
        success = purchaseResult.success;
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
        setShowPurchaseSuccessModal(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setPurchaseSuccessData({
        title: "❌ Error",
        message: `Exception during purchase: ${errorMessage}`,
        action: "OK",
      });
      setShowPurchaseSuccessModal(true);
    } finally {
      setPurchasingBundleId(null);
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

  const renderThemeCard = (pack: ThemePack) => {
    // Get theme-specific colors from the existing THEME_COLORS constants
    const getThemeColors = (themeId: string) => {
      const themeColors = THEME_COLORS[themeId as ThemePackId];
      return {
        primary: themeColors.PRIMARY,
        online: "green",
        yellow: themeColors.YELLOW,
        dark: themeColors.DARK,
        light: themeColors.LIGHT,
      };
    };

    const themeColors = getThemeColors(pack.id);

    return (
      <LinearGradient
        colors={[themeColors.primary, themeColors.light, themeColors.dark]}
        style={[{ borderRadius: SIZES.BORDER_RADIUS_LARGE }]}
      >
        <TouchableOpacity
          key={pack.id}
          style={[styles.themeCard, pack.isLocked && styles.lockedCard]}
          onPress={() => openPreview(pack)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.themeEmoji}>{pack.emoji}</Text>
            {pack.isOwned && (
              <View
                style={[
                  styles.ownedBadge,
                  { backgroundColor: themeColors.yellow },
                ]}
              >
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
                style={[styles.selectButton]}
                disabled={true}
                activeOpacity={0.8}
              >
                <Text style={styles.selectButtonText}>In Use</Text>
              </TouchableOpacity>
            ) : pack.isOwned && !pack.isCurrent ? (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: themeColors.yellow,
                  },
                ]}
                onPress={() => handlePackSelection(pack)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectButtonText}>Use This Theme</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    opacity: 0,
                  },
                ]}
                disabled={true}
              >
                <Text style={styles.selectButtonText}>Use This Theme</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  const renderTestProductCard = (
    productId: string,
    title: string,
    description: string,
    price: string,
    emoji: string,
    unlockKey: string,
    isConsumable: boolean = false
  ) => {
    const isOwned = iapContext.isProductPurchased(productId);
    const isCurrentlyPurchasing =
      isPurchasing && purchasingBundleId === productId;

    const handleTestProductPurchase = async () => {
      try {
        setIsPurchasing(true);
        setPurchasingBundleId(productId);

        let success = false;

        // Use purchaseService methods for test themes, iapContext for others
        if (productId === "testthemeFakeupd_6") {
          const purchaseResult = await purchaseService.purchaseFakeTheme();
          success = purchaseResult.success;
        } else if (productId === "testthemeAngryupd_6") {
          const purchaseResult = await purchaseService.purchaseAngryTheme();
          success = purchaseResult.success;
        } else {
          // For other test products (like test coins), use iapContext directly
          success = await iapContext.purchaseProduct(productId);
        }

        if (success) {
          // Show success message
          setPurchaseSuccessData({
            title: "Purchase Successful! 🎉",
            message: `You've successfully purchased ${title}!`,
            action: isConsumable
              ? "Coins added to your account"
              : "Theme unlocked and ready to use",
          });
          setShowPurchaseSuccessModal(true);

          // Refresh theme packs to update ownership status
          loadThemePacks();
        }
      } catch (error) {
        console.error("Test product purchase failed:", error);
      } finally {
        setIsPurchasing(false);
        setPurchasingBundleId(null);
      }
    };

    return (
      <View style={styles.testProductCard}>
        <View style={styles.testProductHeader}>
          <Text style={styles.testProductEmoji}>{emoji}</Text>
          <View style={styles.testProductInfo}>
            <Text style={styles.testProductTitle}>{title}</Text>
            <Text style={styles.testProductPrice}>{price}</Text>
          </View>
          {isOwned && (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedBadgeText}>✓ Owned</Text>
            </View>
          )}
        </View>

        <Text style={styles.testProductDescription}>{description}</Text>

        <View style={styles.testProductActions}>
          {isOwned ? (
            <View style={styles.ownedButton}>
              <Text style={styles.ownedButtonText}>
                {isConsumable ? "Coins Added" : "Theme Unlocked"}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.testProductButton,
                isCurrentlyPurchasing && styles.testProductButtonDisabled,
              ]}
              onPress={handleTestProductPurchase}
              disabled={isCurrentlyPurchasing}
            >
              <Text style={styles.testProductButtonText}>
                {isCurrentlyPurchasing ? "Purchasing..." : `Buy ${price}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
                <Image
                  source={selectedPack?.previewImage}
                  style={styles.previewImage}
                  resizeMode="contain"
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
                      backgroundColor={isPurchasing ? "#CCCCCC" : COLORS.YELLOW}
                      textColor={isPurchasing ? "#000000" : COLORS.TEXT_DARK}
                      fontSize={SIZES.BODY}
                      fontFamily={FONTS.DOSIS_BOLD}
                      paddingHorizontal={SIZES.PADDING_LARGE}
                      paddingVertical={SIZES.PADDING_MEDIUM}
                      style={[
                        styles.purchaseButton,
                        isPurchasing && styles.purchaseButtonDisabled,
                      ]}
                      disabled={isPurchasing}
                    />
                  </View>
                )}

                {selectedPack?.isOwned && (
                  <View style={styles.ownedSection}>
                    <Ionicons
                      name="checkmark-circle"
                      size={32}
                      color={"green"}
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
        {/* Fixed Header */}
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
              onPress={handleManualRestore}
              style={styles.restoreButton}
              accessibilityLabel="Restore Purchases"
              accessibilityHint="Tap to restore your previous purchases from the store"
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
            {/* Ad-Free Button */}
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

            {/* Bundle Deals at the top */}
            {renderBundleDeals()}

            {/* Theme Packs */}
            <View style={styles.themesSection}>
              <Text style={styles.sectionTitle}>Theme Packs</Text>
              <View style={styles.themesGrid}>
                {themePacks.map((pack) => (
                  <View key={pack.id}>{renderThemeCard(pack)}</View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {renderPreviewModal()}
      {/* <CustomModal
        visible={showPurchaseSuccess}
        onClose={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowPurchaseSuccess(false);
        }}
        title="Purchase Successful! 🎉"
        message={`You've unlocked the ${purchasedPackName}! You can now use this theme pack. Switching themes will start a new game with the new theme.`}
        showConfirmButton={true}
        confirmButtonText="Awesome!"
        onConfirm={() => {
          audioService.playSound("buttonPress");
          audioService.playHaptic("light");
          setShowPurchaseSuccess(false);
          loadThemePacks(); // Refresh the list
        }}
        showSparkles={true}
      /> */}

      {/* Theme Switch Confirmation Modal */}
      <CustomModal
        visible={showSwitchConfirmation}
        onClose={() => {
          if (!isThemeSwitching) {
            audioService.playSound("buttonPress");
            audioService.playHaptic("light");
            setShowSwitchConfirmation(false);
          }
        }}
        title="Switch Theme Pack?"
        message={`Are you sure you want to switch to ${
          packToSwitch?.name
        }? Switching themes will start a new game. This action cannot be undone.${
          isThemeSwitching ? "\n\n⏳ Please wait while we switch themes..." : ""
        }`}
        showConfirmButton={true}
        confirmButtonText="Switch Theme"
        onConfirm={() => {
          if (!isThemeSwitching) {
            audioService.playSound("buttonPress");
            audioService.playHaptic("light");
            confirmThemeSwitch();
          }
        }}
        showCloseButton={!isThemeSwitching}
        closeButtonText="Cancel"
        disabled={isThemeSwitching}
        isLoading={isThemeSwitching}
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
      {/* {showPurchaseCelebrationModal && purchaseType && (
        <PurchaseCelebrationModal
          visible={showPurchaseCelebrationModal}
          onClose={() => setShowPurchaseCelebrationModal(false)}
          purchaseType={purchaseType}
        />
      )} */}

      {/* Purchase Success/Error Modal */}
      {/* {purchaseSuccessData && (
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
      )} */}
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
  // resetButton: {
  //   padding: SIZES.PADDING_SMALL,
  //   marginRight: SIZES.PADDING_SMALL,
  // },
  restoreButton: {
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
    marginRight: -SIZES.PADDING_MEDIUM,

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
    color: COLORS.TEXT_DARK, // Use existing color instead of WHITE
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
    color: COLORS.FIELDS,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.PADDING_LARGE,
    paddingHorizontal: SIZES.PADDING_SMALL,
  },
  previewImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1, // Maintain square aspect ratio for consistent display
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
    marginBottom: SIZES.PADDING_SMALL, // Space between challenges
    // paddingHorizontal: SIZES.PADDING_SMALL, // Minimal horizontal padding
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
    fontSize: SIZES.SUBTITLE - 2,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "left",
    lineHeight: 20,
    flex: 1, // Take remaining space
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
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  ownedSection: {
    alignItems: "center",
    paddingTop: SIZES.PADDING_LARGE,
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
  // Test Products Styles
  sectionSubtitle: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: FONTS.DOSIS,
    marginBottom: SIZES.PADDING_MEDIUM,
    textAlign: "center",
  },
  testProductsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SIZES.PADDING_SMALL,
  },
  testProductCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 12,
    padding: SIZES.PADDING_MEDIUM,
    marginBottom: SIZES.PADDING_SMALL,
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testProductHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  testProductEmoji: {
    fontSize: 24,
    marginRight: SIZES.PADDING_SMALL,
  },
  testProductInfo: {
    flex: 1,
  },
  testProductTitle: {
    fontSize: SIZES.BODY,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
  },
  testProductPrice: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.BUTTON_PRIMARY,
  },

  testProductDescription: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.PADDING_SMALL,
    lineHeight: 16,
  },
  testProductActions: {
    marginTop: "auto",
  },
  testProductButton: {
    backgroundColor: COLORS.BUTTON_PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  testProductButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    opacity: 0.6,
  },
  testProductButtonText: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS_BOLD,
    color: "white",
  },
  ownedButton: {
    backgroundColor: COLORS.ONLINE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  ownedButtonText: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS_BOLD,
    color: "white",
  },
});
