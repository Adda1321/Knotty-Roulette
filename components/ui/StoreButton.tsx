import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Surface } from 'react-native-paper';
import { SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import audioService from '../../services/audio';

interface StoreButtonProps {
  onPress: () => void;
}

export default function StoreButton({ onPress }: StoreButtonProps) {
  const { COLORS } = useTheme();
  
  const handlePress = () => {
    audioService.playHaptic('light');
    audioService.playSound('buttonPress');
    onPress();
  };

  return (
    <Surface elevation={3} style={{ borderRadius: 10 }}>
      <TouchableOpacity
        style={[styles.storeButton, { backgroundColor: COLORS.YELLOW }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="storefront" size={20} color={COLORS.TEXT_DARK} />
      </TouchableOpacity>
    </Surface>
  );
}

const styles = StyleSheet.create({
  storeButton: {
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_SMALL,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 