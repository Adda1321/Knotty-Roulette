import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import backgroundMusic from "../../services/backgroundMusic";

import Button from "./Button";

interface SoundSettingsProps {
  onPress: () => void;
}

export default function SoundSettings({ onPress }: SoundSettingsProps) {
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isSoundsMuted, setIsSoundsMuted] = useState(false);
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    audioService.initialize();

    setIsMusicMuted(backgroundMusic.isMusicMuted());
    setIsSoundsMuted(audioService.isSoundsMuted());
    setIsVibrationEnabled(audioService.isVibrationEnabled());
  }, []);

  const toggleMusicMute = async () => {
    const newState = await backgroundMusic.toggleMute();
    setIsMusicMuted(newState);
    audioService.playHaptic("medium");
  };

  const toggleSoundsMute = () => {
    const newState = audioService.toggleSoundsMute();
    setIsSoundsMuted(newState);
    audioService.playHaptic("medium");
  };

  const toggleVibration = () => {
    const newState = audioService.toggleVibration();
    setIsVibrationEnabled(newState);
    audioService.playSound('buttonPress');
    audioService.playHaptic("medium");
  };

  const handleSettingsPress = () => {
    setShowSettings(true);
    audioService.playSound('buttonPress');
    audioService.playHaptic("light");
  };

  const closeSettings = () => {
    setShowSettings(false);
    audioService.playSound('buttonPress');

    audioService.playHaptic("medium");
  };

  return (
    <>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => {
          audioService.playHaptic("light");
          handleSettingsPress();
        }}
      >
        <Ionicons name="settings" size={20} color={COLORS.TEXT_DARK} />
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
                    name={
                      isMusicMuted ? "musical-notes-outline" : "musical-notes"
                    }
                    size={24}
                    color={COLORS.DARK_GREEN}
                  />
                  <Text style={styles.settingText}>
                    {isMusicMuted
                      ? "Background Music Muted"
                      : "Background Music Enabled"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isMusicMuted && styles.toggleButtonMuted,
                  ]}
                  onPress={toggleMusicMute}
                >
                  <Ionicons
                    name={isMusicMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color={COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name={isSoundsMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color={COLORS.DARK_GREEN}
                  />
                  <Text style={styles.settingText}>
                    {isSoundsMuted
                      ? "Sound Effects Muted"
                      : "Sound Effects Enabled"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isSoundsMuted && styles.toggleButtonMuted,
                  ]}
                  onPress={toggleSoundsMute}
                >
                  <Ionicons
                    name={isSoundsMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color={COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name={
                      isVibrationEnabled
                        ? "phone-portrait"
                        : "phone-portrait-outline"
                    }
                    size={24}
                    color={COLORS.DARK_GREEN}
                  />
                  <Text style={styles.settingText}>
                    {isVibrationEnabled
                      ? "Vibration Enabled"
                      : "Vibration Disabled"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !isVibrationEnabled && styles.toggleButtonMuted,
                  ]}
                  onPress={toggleVibration}
                >
                  <Ionicons
                    name={
                      isVibrationEnabled ? "notifications" : "notifications-off"
                    }
                    size={24}
                    color={COLORS.TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                text="Close"
                onPress={() => {
                  audioService.playHaptic("medium"); // add haptic here too
                  audioService.playSound("buttonPress");

                  closeSettings();
                }}
                backgroundColor={COLORS.YELLOW}
                textColor={COLORS.TEXT_PRIMARY}
                fontSize={SIZES.BODY}
                shadowIntensity={5}
                shadowRadius={10}
                fontWeight="600"
                paddingHorizontal={SIZES.PADDING_LARGE}
                paddingVertical={SIZES.PADDING_MEDIUM}
                style={styles.closeButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    backgroundColor: COLORS.YELLOW,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_SMALL,
    justifyContent: "center",
    alignItems: "center",
    // iOS shadow properties
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 7.5,
    // Android elevation
    elevation: 7.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_LARGE,
  },
  container: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    width: "100%",
    maxWidth: 400,
    ...SIZES.SHADOW_LARGE,
  },
  header: {
    backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_LARGE,
    alignItems: "center",
  },
  title: {
    fontSize: SIZES.TITLE,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
  },
  content: {
    padding: SIZES.PADDING_LARGE,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.PADDING_LARGE,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
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
    fontWeight: "600",
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
    width: "100%",
  },
});
