import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';
import adService from '../../services/adService';
import userService from '../../services/userService';
import Button from './Button';

interface UserTierToggleProps {
  onTierChange?: () => void;
}

export default function UserTierToggle({ onTierChange }: UserTierToggleProps) {
  const handleToggleTier = async () => {
    try {
      if (userService.isPremium()) {
        await userService.setFree();
      } else {
        await userService.setPremium();
      }
      
      // Update ad service when user tier changes
      await adService.onUserTierChange();
      
      // Notify parent component
      onTierChange?.();
    } catch (error) {
      console.error('Error toggling user tier:', error);
    }
  };

  const currentTier = userService.isPremium() ? 'Premium' : 'Free';
  const buttonText = userService.isPremium() ? 'Switch to Free' : 'Switch to Premium';

  return (
    <View style={styles.container}>
      <Button
        text={buttonText}
        onPress={handleToggleTier}
        backgroundColor={userService.isPremium() ? COLORS.DARK_GREEN : COLORS.YELLOW}
        textColor={userService.isPremium() ? COLORS.TEXT_PRIMARY : COLORS.TEXT_DARK}
        fontSize={SIZES.SMALL}
        paddingHorizontal={SIZES.PADDING_SMALL}
        paddingVertical={8}
        shadowIntensity={3}
        shadowRadius={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 1000,
  },
}); 