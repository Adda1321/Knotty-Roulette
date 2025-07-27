import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import audioService from '../../services/audio';
import userService from '../../services/userService';
import Button from './Button';
import PremiumUpgradeModal from './PremiumUpgradeModal';

interface SoundSettingsProps {
  onPress: () => void;
}

export default function SoundSettings({ onPress }: SoundSettingsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    // Initialize audio service and get current mute state
    audioService.initialize();
    setIsMuted(audioService.isAudioMuted());
  }, []);

  const handleToggleMute = () => {
    const newMutedState = audioService.toggleMute();
    setIsMuted(newMutedState);
  };

  const handleSettingsPress = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const handlePremiumSuccess = () => {
    setShowPremiumModal(false);
    // Refresh the component to show premium status
    setShowSettings(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => {
          audioService.playHaptic('light');
          handleSettingsPress();
        }}
      >
        <Ionicons
          name="settings"
          size={20}
          color={COLORS.TEXT_DARK}
        />
      </TouchableOpacity>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSettings}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Sound Settings</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color={COLORS.DARK_GREEN}
                  />
                  <Text style={styles.settingText}>
                    {isMuted ? "Sound Effects Muted" : "Sound Effects Enabled"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, isMuted && styles.toggleButtonMuted]}
                  onPress={() => {
                    audioService.playHaptic('light');
                    handleToggleMute();
                  }}
                >
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color={COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>

              {/* Premium Upgrade Section */}
              {userService.isFree() && (
                <View style={styles.premiumSection}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="diamond"
                        size={24}
                        color={COLORS.YELLOW}
                      />
                      <Text style={[styles.settingText, styles.premiumText]}>
                        Upgrade to Premium
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => {
                        audioService.playHaptic('light');
                        setShowPremiumModal(true);
                      }}
                    >
                      <Text style={styles.upgradeButtonText}>$4.99</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.premiumSubtext}>
                    Remove ads and unlock premium features
                  </Text>
                </View>
              )}

              {/* Premium Status */}
              {userService.isPremium() && (
                <View style={styles.premiumSection}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={COLORS.YELLOW}
                      />
                      <Text style={[styles.settingText, styles.premiumText]}>
                        Premium Active
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.premiumSubtext}>
                    Enjoy ad-free gaming experience
                  </Text>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Sound Effects Include:</Text>
                <Text style={styles.infoText}>• Wheel spinning</Text>
                <Text style={styles.infoText}>• Challenge completion</Text>
                <Text style={styles.infoText}>• Button presses</Text>
                <Text style={styles.infoText}>• Haptic feedback</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                text="Close"
                onPress={closeSettings}
                backgroundColor={COLORS.DARK_GREEN}
                textColor={COLORS.TEXT_PRIMARY}
                fontSize={SIZES.BODY}
                fontWeight="600"
                paddingHorizontal={SIZES.PADDING_LARGE}
                paddingVertical={SIZES.PADDING_MEDIUM}
                style={styles.closeButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onPurchaseSuccess={handlePremiumSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    backgroundColor: COLORS.YELLOW,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_SMALL,
    justifyContent: 'center',
    alignItems: 'center',
    ...SIZES.SHADOW_SMALL,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_LARGE,
  },
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: '100%',
    maxWidth: 400,
    ...SIZES.SHADOW_LARGE,
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: 'center',
  },
  content: {
    padding: SIZES.PADDING_LARGE,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_LARGE,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    marginLeft: SIZES.PADDING_MEDIUM,
  },
  toggleButton: {
    backgroundColor: COLORS.DARK_GREEN,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    padding: SIZES.PADDING_MEDIUM,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonMuted: {
    backgroundColor: COLORS.OFFLINE,
  },
  toggleText: {
    fontSize: 20,
  },
  infoSection: {
    backgroundColor: COLORS.CARD_BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    padding: SIZES.PADDING_MEDIUM,
  },
  infoTitle: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    fontWeight: '600',
    marginBottom: SIZES.PADDING_SMALL,
  },
  infoText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    marginBottom: 2,
  },
  buttonContainer: {
    padding: SIZES.PADDING_LARGE,
  },
  closeButton: {
    width: '100%',
  },
  premiumSection: {
    backgroundColor: COLORS.CARD_BORDER,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    padding: SIZES.PADDING_MEDIUM,
    marginTop: SIZES.PADDING_LARGE,
    marginBottom: SIZES.PADDING_LARGE,
  },
  premiumText: {
    color: COLORS.YELLOW,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: COLORS.YELLOW,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    padding: SIZES.PADDING_MEDIUM,
    minWidth: 80,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  premiumSubtext: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    marginTop: SIZES.PADDING_SMALL,
    textAlign: 'center',
  },
}); 