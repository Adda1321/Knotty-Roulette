import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import Button from "./Button";
import CustomModal from "./CustomModal";

interface PurchaseCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  purchaseType: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set';
}

export default function PurchaseCelebrationModal({ 
  visible, 
  onClose, 
  purchaseType 
}: PurchaseCelebrationModalProps) {
  
  const getCelebrationTitle = () => {
    switch (purchaseType) {
      case 'ad_free':
        return "🎉 Ad-Free Unlocked!";
      case 'theme_packs':
        return "🎨 Theme Packs Unlocked!";
      case 'all_in_bundle':
        return "🌟 Complete Bundle Unlocked!";
      case 'complete_set':
        return "✨ Collection Complete!";
      default:
        return "🎉 Purchase Successful!";
    }
  };

  const getCelebrationMessage = () => {
    switch (purchaseType) {
      case 'ad_free':
        return "Congratulations! You've unlocked an ad-free gaming experience. No more interruptions - just pure fun! 🚫📱";
      case 'theme_packs':
        return "Amazing! You now have access to College and Couple theme packs. Switch between themes to customize your game! 🎨🎮";
      case 'all_in_bundle':
        return "Incredible! You've unlocked everything - Ad-Free gaming plus all theme packs. You're all set for the ultimate experience! 🌟✨";
      case 'complete_set':
        return "Perfect! You've completed your theme collection. Every theme is now at your fingertips! 🎯🎨";
      default:
        return "Thank you for your purchase! Enjoy your new features! 🎉";
    }
  };

  const getCelebrationSubtitle = () => {
    switch (purchaseType) {
      case 'ad_free':
        return "Enjoy uninterrupted gaming!";
      case 'theme_packs':
        return "Customize your game experience!";
      case 'all_in_bundle':
        return "You have it all!";
      case 'complete_set':
        return "Your collection is complete!";
      default:
        return "Enjoy your purchase!";
    }
  };

  const handleExit = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
    onClose();
  };

  return (
    <CustomModal
      visible={visible}
      onClose={handleExit}
      title={getCelebrationTitle()}
      message={getCelebrationMessage()}
      showCloseButton={false}
      showConfirmButton={false}
      showSparkles={true}
      sparkleStaggerDelay={50}
    >
      <View style={styles.content}>
        {/* Celebration Icon */}
        <View style={styles.celebrationIcon}>
          <Text style={styles.celebrationEmoji}>
            {purchaseType === 'ad_free' ? '🚫' : 
             purchaseType === 'theme_packs' ? '🎨' : 
             purchaseType === 'all_in_bundle' ? '🌟' : '✨'}
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {getCelebrationSubtitle()}
        </Text>

        {/* Exit Button */}
        <View style={styles.buttonContainer}>
          <Button
            text="Exit"
            onPress={handleExit}
            backgroundColor={COLORS.YELLOW}
            textColor={COLORS.TEXT_DARK}
            fontSize={SIZES.SUBTITLE}
            fontFamily={FONTS.DOSIS_BOLD}
            paddingHorizontal={SIZES.PADDING_XLARGE}
            paddingVertical={SIZES.PADDING_MEDIUM}
            style={styles.exitButton}
          />
        </View>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: SIZES.PADDING_LARGE,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_LARGE,
    ...SIZES.SHADOW_MEDIUM,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  subtitle: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: 'center',
    marginBottom: SIZES.PADDING_XLARGE,
    lineHeight: 24,
  },
  exitButton: {
    minWidth: 120,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
}); 