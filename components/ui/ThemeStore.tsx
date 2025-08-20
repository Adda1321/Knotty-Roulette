import { Ionicons } from "@expo/vector-icons";
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
    image: require("../../assets/images/MascotImages/College/College-legs-mascot.png"), // Fallback to mascot for now
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
    image: require("../../assets/images/MascotImages/Couple/Couple-legs-mascot.png"), // Fallback to mascot for now
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

          <Image
            source={selectedPack?.image}
            style={styles.previewImage}
            resizeMode="cover"
          />

          <View style={styles.previewContent}>
            <Text style={styles.previewDescription}>
              {selectedPack?.description}
            </Text>

            {!selectedPack?.isOwned && (
              <View style={styles.purchaseSection}>
                <Text style={styles.previewPrice}>{selectedPack?.price}</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_LARGE,
  },
  previewContainer: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    ...SIZES.SHADOW_LARGE,
  },
  previewHeader: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  previewImage: {
    width: "100%",
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
    resizeMode: "cover",
  },
  previewContent: {
    padding: SIZES.PADDING_LARGE,
  },
  previewDescription: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    lineHeight: 24,
    marginBottom: SIZES.PADDING_LARGE,
    textAlign: "center",
  },
  purchaseSection: {
    alignItems: "center",
    paddingVertical: SIZES.PADDING_MEDIUM,
  },
  previewPrice: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_LARGE,
  },
  purchaseButton: {
    minWidth: 140,
    paddingHorizontal: SIZES.PADDING_XLARGE,
  },
  ownedSection: {
    alignItems: "center",
    paddingVertical: SIZES.PADDING_LARGE,
  },
  ownedMessage: {
    fontSize: SIZES.BODY,
    color: COLORS.ONLINE,
    fontFamily: FONTS.DOSIS_BOLD,
    marginTop: SIZES.PADDING_MEDIUM,
    textAlign: "center",
  },
});
