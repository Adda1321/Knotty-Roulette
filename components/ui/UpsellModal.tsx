import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import purchaseService from "../../services/purchaseService";
import { themePackService } from "../../services/themePackService";
import { UpsellOffer } from "../../services/upsellService";
import Button from "./Button";
import CustomModal from "./CustomModal";

interface UpsellModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess: () => void;
  onPurchaseComplete: (purchaseType: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set') => void;
  offer: UpsellOffer;
}

export default function UpsellModal({ visible, onClose, onPurchaseSuccess, onPurchaseComplete, offer }: UpsellModalProps) {
  const [isPrimaryPurchasing, setIsPrimaryPurchasing] = useState(false);
  const [isSecondaryPurchasing, setIsSecondaryPurchasing] = useState(false);

  // Don't render if no valid offer
  if (!offer || !offer.primaryButton) {
    return null;
  }

  // Handle "Maybe Later" button with audio and haptic feedback
  const handleMaybeLater = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
    onClose();
  };

  const handlePrimaryPurchase = async () => {
    // Add audio and haptic feedback when button is pressed
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
    
    setIsPrimaryPurchasing(true);
    try {
      let success = false;
      let purchaseType: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set' = 'ad_free';
      
      if (offer.primaryButton.action === 'ad_free') {
        success = await purchaseService.purchasePremiumPack();
        purchaseType = 'ad_free';
      } else if (offer.primaryButton.action === 'theme_packs') {
        success = await themePackService.purchasePack('college');
        if (success) {
          success = await themePackService.purchasePack('couple');
        }
        purchaseType = 'theme_packs';
      } else if (offer.primaryButton.action === 'complete_set') {
        success = await themePackService.purchasePack('couple');
        purchaseType = 'complete_set';
      } else if (offer.primaryButton.action === 'all_in_bundle') {
        // Handle all-in bundle purchase
        success = await purchaseService.purchasePremiumPack();
        if (success) {
          success = await themePackService.purchasePack('college');
          if (success) {
            success = await themePackService.purchasePack('couple');
          }
        }
        purchaseType = 'all_in_bundle';
      }

      if (success) {
        audioService.playSound("bonusAchieved");
        audioService.playHaptic("success");
        onPurchaseSuccess();
        onPurchaseComplete(purchaseType);
        onClose();
      } else {
        Alert.alert("Purchase Failed", "Unable to complete purchase. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during purchase.");
    } finally {
      setIsPrimaryPurchasing(false);
    }
  };

  const handleSecondaryPurchase = async () => {
    if (!offer.secondaryButton) return;
    
    // Add audio and haptic feedback when button is pressed
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
    
    setIsSecondaryPurchasing(true);
    try {
      let success = false;
      let purchaseType: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set' = 'ad_free';
      
      if (offer.secondaryButton.action === 'all_in_bundle') {
        // Buy all-in bundle
        success = await purchaseService.purchasePremiumPack();
        if (success) {
          success = await themePackService.purchasePack('college');
          if (success) {
            success = await themePackService.purchasePack('couple');
          }
        }
        purchaseType = 'all_in_bundle';
      } else if (offer.secondaryButton.action === 'theme_packs') {
        // Buy both theme packs
        success = await themePackService.purchasePack('college');
        if (success) {
          success = await themePackService.purchasePack('couple');
        }
        purchaseType = 'theme_packs';
      } else if (offer.secondaryButton.action === 'complete_set') {
        // Buy the remaining pack
        success = await themePackService.purchasePack('couple');
        purchaseType = 'complete_set';
      }

      if (success) {
        audioService.playSound("bonusAchieved");
        audioService.playHaptic("success");
        onPurchaseSuccess();
        onPurchaseComplete(purchaseType);
        onClose();
      } else {
        Alert.alert("Purchase Failed", "Unable to complete purchase. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during purchase.");
    } finally {
      setIsSecondaryPurchasing(false);
    }
  };

  const getModalMessage = () => {
    if (!offer?.triggerType) return offer?.description || "Check out these amazing deals!";
    
    switch (offer.triggerType) {
      case 'game_over':
        return "You're on fire! Keep the momentum going with these exclusive deals.";
      case 'shop_entry':
        return "Welcome back! Here are some special offers just for you.";
      case 'ad_based':
      default:
        return offer.description || "Check out these amazing deals!";
    }
  };

  const getModalTitle = () => {
    if (!offer?.triggerType) return offer?.title || "Special Offer";
    
    switch (offer.triggerType) {
      case 'game_over':
        return "🎉 Great Game! Want More?";
      case 'shop_entry':
        return "🛍️ Special Offer!";
      case 'ad_based':
      default:
        return offer.title || "Special Offer";
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={handleMaybeLater}
      title={getModalTitle()}
      // message={getModalMessage()}
      showCloseButton={true}
      closeButtonText="Maybe Later"
      showConfirmButton={false}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.offerContainer}>
          {/* Primary Offer */}
          <View style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <Text style={styles.offerTitle}>{offer.primaryButton.text || "Get Offer"}</Text>
              {offer?.showBestDeal && offer?.bestDealButton === 'primary' && (
                <View style={styles.bestDealBadge}>
                  <Text style={styles.bestDealText}>{offer.bestDealText}</Text>
                </View>
              )}
            </View>
            <Text style={styles.offerDescription}>{offer.description || "Amazing deal for you!"}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{offer.primaryButton.price || "Free"}</Text>
            </View>
            <Button
              text={isPrimaryPurchasing ? "Purchasing..." : (offer.primaryButton.text || "Get Offer")}
              onPress={handlePrimaryPurchase}
              disabled={isPrimaryPurchasing || isSecondaryPurchasing}
              backgroundColor={COLORS.YELLOW}
              textColor={COLORS.TEXT_DARK}
              fontSize={SIZES.BODY}
              fontFamily={FONTS.DOSIS_BOLD}
              paddingHorizontal={SIZES.PADDING_LARGE}
              paddingVertical={SIZES.PADDING_MEDIUM}
              style={styles.primaryButton}
            />
          </View>

          {/* Secondary Offer */}
          {offer.secondaryButton && (
            <View style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerTitle}>{offer.secondaryButton.text || "Alternative Offer"}</Text>
                {offer?.showBestDeal && offer?.bestDealButton === 'secondary' && (
                  <View style={styles.bestDealBadge}>
                    <Text style={styles.bestDealText}>{offer.bestDealText}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.offerDescription}>{offer.description || "Another great option for you!"}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{offer.secondaryButton.price || "Free"}</Text>
              </View>
              <Button
                text={isSecondaryPurchasing ? "Purchasing..." : (offer.secondaryButton.text || "Alternative Offer")}
                onPress={handleSecondaryPurchase}
                disabled={isSecondaryPurchasing || isPrimaryPurchasing}
                backgroundColor={COLORS.YELLOW}
                textColor={COLORS.TEXT_DARK}
                fontSize={SIZES.BODY}
                fontFamily={FONTS.DOSIS_BOLD}
                paddingHorizontal={SIZES.PADDING_LARGE}
                paddingVertical={SIZES.PADDING_MEDIUM}
                style={styles.secondaryButton}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    maxHeight: 490,
  },
  offerContainer: {
    gap: SIZES.PADDING_MEDIUM,
  },
  offerCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    padding: SIZES.PADDING_LARGE,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  offerTitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    flex: 1,
  },
  bestDealBadge: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 4,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  bestDealText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  offerDescription: {
    fontSize: SIZES.SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SIZES.PADDING_MEDIUM,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SIZES.PADDING_SMALL,
  },
  originalPrice: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: "line-through",
  },
  discountedPrice: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  savings: {
    fontSize: SIZES.CAPTION,
    color: COLORS.ONLINE,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  price: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_LARGE,
  },
  primaryButton: {
    minWidth: 160,
  },
  secondaryButton: {
    minWidth: 160,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
  },
}); 