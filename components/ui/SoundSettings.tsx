import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";
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
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
  };

  const toggleSoundsMute = () => {
    const newState = audioService.toggleSoundsMute();
    setIsSoundsMuted(newState);
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
  };

  const toggleVibration = () => {
    const newState = audioService.toggleVibration();
    setIsVibrationEnabled(newState);
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
  };

  const handleSettingsPress = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
  };

  return (
    <>
      <Surface
        elevation={Platform.OS === "ios" ? 3 : 5}
        style={{ borderRadius: 10 }}
      >
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            audioService.playHaptic("light");
            handleSettingsPress();
          }}
        >
          <Ionicons name="settings" size={20} color={COLORS.TEXT_DARK} />
        </TouchableOpacity>
      </Surface>

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
              {/* Music Toggle */}
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
              {/* Sound Effects Toggle */}
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
              {/* Vibration Toggle */}
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
              -
            </View>

            <View style={styles.buttonContainer}>
              <Surface
                elevation={Platform.OS === "ios" ? 3 : 5}
                style={{
                  borderRadius: 10,
                }}
              >
                <Button
                  text="Close"
                  onPress={() => {
                    audioService.playHaptic("medium");
                    audioService.playSound("buttonPress");
                    closeSettings();
                  }}
                  backgroundColor={COLORS.YELLOW}
                  textColor={COLORS.TEXT_DARK}
                  fontSize={SIZES.BODY}
                  shadowIntensity={5}
                  fontFamily={FONTS.DOSIS_BOLD}
                  shadowRadius={10}
                  paddingHorizontal={SIZES.PADDING_LARGE}
                  paddingVertical={SIZES.PADDING_MEDIUM}
                  style={styles.closeButton}
                />
              </Surface>
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
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.PADDING_LARGE,
  },
  container: {
    backgroundColor: COLORS.FIELDS,
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
    backgroundColor: COLORS.FIELDS,
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



  buttonContainer: {
    padding: SIZES.PADDING_LARGE,
  },
  closeButton: {
    width: "100%",
  },
});
