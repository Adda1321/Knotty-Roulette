import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import purchaseService from "../../services/purchaseService";
import Button from "./Button";
import CustomModal from "./CustomModal";

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export default function PremiumUpgradeModal({
  visible,
  onClose,
  onPurchaseSuccess,
}: PremiumUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePurchase = async () => {
    try {
      setIsLoading(true);
      audioService.playHaptic("light");

      const success = await purchaseService.purchasePremiumPack();

      if (success) {
        Alert.alert(
          "Purchase Initiated",
          "Your purchase is being processed. You will be upgraded to premium once the transaction completes.",
          [{ text: "OK", onPress: onClose }]
        );
        onPurchaseSuccess?.();
      } else {
        Alert.alert(
          "Purchase Failed",
          "Unable to process your purchase. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Purchase error:", error);
      Alert.alert(
        "Purchase Error",
        "An error occurred during purchase. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      audioService.playHaptic("light");

      const restored = await purchaseService.restorePurchases();

      if (restored) {
        Alert.alert(
          "Purchase Restored",
          "Your premium purchase has been restored successfully!",
          [{ text: "OK", onPress: onClose }]
        );
        onPurchaseSuccess?.();
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous premium purchases were found to restore.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert(
        "Restore Error",
        "An error occurred while restoring purchases.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title="Upgrade to Premium"
      showCloseButton={true}
      closeButtonText="Maybe Later"
      showSparkles={true}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Premium Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>🎯 Premium Benefits</Text>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🚫</Text>
            <Text style={styles.benefitText}>No Advertisements</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={styles.benefitText}>Unlimited Spins</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🎨</Text>
            <Text style={styles.benefitText}>Premium Themes</Text>
          </View>

          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🏆</Text>
            <Text style={styles.benefitText}>Exclusive Challenges</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>$4.99</Text>
          <Text style={styles.priceSubtitle}>One-time purchase</Text>
        </View>

        {/* Purchase Button */}
        <Button
          text={isLoading ? "Processing..." : "Upgrade to Premium"}
          onPress={handlePurchase}
          disabled={isLoading}
          backgroundColor={COLORS.YELLOW}
          textColor={COLORS.TEXT_DARK}
          fontSize={SIZES.BODY}
          fontWeight="600"
          fontFamily={FONTS.DOSIS_BOLD}
          paddingHorizontal={SIZES.PADDING_LARGE}
          paddingVertical={15}
          showGlare={!isLoading}
          glareColor="rgba(255, 255, 255, 0.6)"
          glareDuration={4000}
          glareDelay={50}
          shadowIntensity={8}
          shadowRadius={12}
          style={styles.purchaseButton}
        />

        {/* Restore Button */}
        <Button
          text={isRestoring ? "Restoring..." : "Restore Purchases"}
          onPress={handleRestore}
          disabled={isRestoring}
          backgroundColor="transparent"
          textColor={COLORS.TEXT_SECONDARY}
          fontSize={SIZES.SMALL}
          fontWeight="400"
          fontFamily={FONTS.DOSIS}
          paddingHorizontal={SIZES.PADDING_SMALL}
          paddingVertical={8}
          style={styles.restoreButton}
        />

        {/* Terms */}
        <Text style={styles.termsText}>
          Purchase will be charged to your App Store account. Premium access is
          permanent and includes all future updates.
        </Text>

        {/* Small restore note */}
        <Text style={styles.restoreNote}>
          Premium status is automatically restored on app startup. Use "Restore
          Purchases" only if you're experiencing issues.
        </Text>
      </ScrollView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    maxHeight: 500,
  },
  benefitsContainer: {
    marginBottom: 20,
    color: "black",
  },
  benefitsTitle: {
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: 15,
    ...SIZES.TEXT_SHADOW_SMALL,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    fontSize: SIZES.BODY,
    fontFamily: FONTS.DOSIS,
    color: COLORS.BACKGROUND_DARK,
    flex: 1,
  },
  priceContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  price: {
    fontSize: 36,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.YELLOW,
    ...SIZES.TEXT_SHADOW_MEDIUM,
  },
  priceSubtitle: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 5,
  },
  purchaseButton: {
    marginBottom: 15,
  },
  restoreButton: {
    borderWidth: 1,
    borderColor: COLORS.TEXT_SECONDARY,
    borderRadius: 6,
    marginBottom: 15,
    opacity: 0.8,
  },
  termsText: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  restoreNote: {
    fontSize: SIZES.SMALL,
    fontFamily: FONTS.DOSIS,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 10,
  },
});
