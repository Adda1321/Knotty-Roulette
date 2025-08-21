import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { Surface } from "react-native-paper";

import {
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS, SIZES } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import audioService from "../../services/audio";
import Button from "../ui/Button";
import CustomModal from "../ui/CustomModal";
import SoundSettings from "../ui/SoundSettings";
import StoreButton from "../ui/StoreButton";

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const { COLORS, currentTheme } = useTheme();

  // Debug logging
  console.log("🎨 PlayerSetup: Current theme:", currentTheme);

  // Monitor theme changes
  useEffect(() => {
    console.log("🎨 PlayerSetup: Theme changed to:", currentTheme);
  }, [currentTheme]);

  const [players, setPlayers] = useState<string[]>(["", ""]); // Default two empty players
  const [showNotEnoughPlayersModal, setShowNotEnoughPlayersModal] =
    useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Add this for debugging
  const buildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
  const isDev = __DEV__;

  const addPlayer = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");
    if (players.length < 8) {
      setPlayers([...players, ""]); // Add empty player field
      // Trigger scroll to bottom on next render
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      // Prevent removing below minimum 2 players
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  const translateY = waveAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -6, 0, 6, 0],
  });
  const startGame = () => {
    audioService.playHaptic("medium"); // add haptic here too
    audioService.playSound("buttonPress");
    const validPlayers = players.filter((name) => name.trim());

    if (validPlayers.length < 2) {
      setShowNotEnoughPlayersModal(true);
      return;
    }

    onStartGame(validPlayers);
  };

  // Check if we need scrolling based on number of players
  useEffect(() => {
    // Estimate if we need scrolling (roughly 4-5 players fit on screen)
    setShouldScroll(players.length > 4);
  }, [players.length]);

  return (
    <LinearGradient
      colors={[COLORS.DARK_GREEN, "#116b20ff", "#3f663f"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <SoundSettings
                onPress={() => {
                  audioService.playSound("buttonPress");
                  audioService.playHaptic("medium");
                }}
              />

              <View style={styles.buttonSpacer} />

              <StoreButton
                onPress={() => {
                  audioService.playSound("buttonPress");
                  audioService.playHaptic("medium");
                  router.push("/theme-store?isGameActive=false");
                }}
              />
            </View>

            <View style={styles.mascotContainer}>
              <Image
                source={require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs.png")}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: COLORS.YELLOW }]}>
              KNOTTY ROULETTE
            </Text>
            <Text style={[styles.subtitle, { color: COLORS.TEXT_PRIMARY }]}>
              Add Players to Begin
            </Text>

            {/* Add debug info here */}
            {/* <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Build Profile: {buildProfile || "undefined"}
              </Text>
              <Text style={styles.debugText}>
                __DEV__: {isDev ? "true" : "false"}
              </Text>
            </View> */}
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.playerList}>
              {shouldScroll ? (
                // Scrollable version
                <ScrollView
                  ref={scrollViewRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.playerListScroll}
                  contentContainerStyle={styles.playerListContent}
                >
                  {players.map((player, index) => (
                    <View key={index}>
                      <View
                        style={[
                          styles.playerInputContainer,
                          {
                            backgroundColor: COLORS.FIELDS,
                            borderColor: COLORS.CARD_BORDER,
                          },
                        ]}
                      >
                        {/* Player input field */}
                        <TextInput
                          style={styles.playerInput}
                          placeholder={`Player ${index + 1}`}
                          placeholderTextColor="#a1a1a1"
                          value={player}
                          onChangeText={(text) => updatePlayer(index, text)}
                          maxLength={20}
                          selectionColor="#e94560"
                        />
                        {/* Remove button */}
                        {players.length > 2 && (
                          <TouchableOpacity
                            style={[
                              styles.removeButton,
                              {
                                backgroundColor: COLORS.OFFLINE,
                              },
                            ]}
                            onPress={() => {
                              audioService.playSound("buttonPress");
                              audioService.playHaptic("light");
                              removePlayer(index);
                            }}
                          >
                            <Text
                              style={[
                                styles.removeButtonText,
                                { color: COLORS.TEXT_PRIMARY },
                              ]}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Add Player button - now with double border in both cases */}
                      {index === players.length - 1 && players.length < 8 && (
                        <View
                          style={[
                            styles.doubleBorderOuter,
                            {
                              borderColor: COLORS.YELLOW,
                              backgroundColor: COLORS.YELLOW,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.doubleBorderInner,
                              {
                                borderColor: "#BE960C",
                                // backgroundColor: "#BE960C",
                              },
                            ]}
                          >
                            <Button
                              text="+ Add Player"
                              onPress={addPlayer}
                              backgroundColor={COLORS.YELLOW}
                              textColor={COLORS.TEXT_DARK}
                              fontSize={SIZES.BODY}
                              fontFamily={FONTS.DOSIS_MEDIUM}
                              fontWeight="800"
                              paddingHorizontal={SIZES.PADDING_SMALL}
                              paddingVertical={SIZES.PADDING_SMALL}
                              style={{ borderRadius: 4 }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                // Non-scrollable version
                <>
                  {players.map((player, index) => (
                    <View key={index}>
                      <View
                        style={[
                          styles.playerInputContainer,
                          {
                            backgroundColor: COLORS.FIELDS,
                            borderColor: COLORS.CARD_BORDER,
                          },
                        ]}
                      >
                        {/* Player input field */}
                        <TextInput
                          style={styles.playerInput}
                          placeholder={`Player ${index + 1}`}
                          placeholderTextColor="#a1a1a1"
                          value={player}
                          onChangeText={(text) => updatePlayer(index, text)}
                          maxLength={20}
                          selectionColor="#e94560"
                        />
                        {/* Remove button */}
                        {players.length > 2 && (
                          <TouchableOpacity
                            style={[
                              styles.removeButton,
                              {
                                backgroundColor: COLORS.OFFLINE,
                              },
                            ]}
                            onPress={() => {
                              audioService.playSound("buttonPress");
                              audioService.playHaptic("light");
                              removePlayer(index);
                            }}
                          >
                            <Text
                              style={[
                                styles.removeButtonText,
                                { color: COLORS.TEXT_PRIMARY },
                              ]}
                            >
                              ✕
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Add Player button - now with double border */}
                      {index === players.length - 1 && players.length < 8 && (
                        <View
                          style={[
                            styles.doubleBorderOuter,
                            {
                              borderColor: COLORS.YELLOW,
                              backgroundColor: COLORS.YELLOW,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.doubleBorderInner,
                              {
                                borderColor: "#BE960C",
                              },
                            ]}
                          >
                            <Button
                              text="+ Add Player"
                              onPress={addPlayer}
                              backgroundColor={COLORS.YELLOW}
                              textColor={COLORS.TEXT_DARK}
                              fontSize={SIZES.CAPTION}
                              fontFamily={FONTS.DOSIS_BOLD}
                              fontWeight="600"
                              paddingHorizontal={SIZES.PADDING_SMALL}
                              paddingVertical={SIZES.PADDING_SMALL}
                              style={{ borderRadius: 4 }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={styles.startButtonContainer}>
              <Animated.View style={{ transform: [{ translateY }] }}>
                <Surface elevation={5} style={{ borderRadius: 8 }}>
                  <View style={styles.startButtonOuter}>
                    <Button
                      text={
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Image
                            source={require("../../assets/images/play-button-arrowhead.png")}
                            style={{ width: 14, height: 14, marginRight: 8 }}
                          />
                          <Text
                            style={{
                              color: COLORS.TEXT_DARK,
                              fontSize: SIZES.SUBTITLE,
                              fontFamily: FONTS.DOSIS_BOLD,
                            }}
                          >
                            START GAME
                          </Text>
                        </View>
                      }
                      onPress={() => {
                        audioService.playHaptic("medium");
                        startGame();
                      }}
                      disabled={players.filter((p) => p.trim()).length < 2}
                      backgroundColor={
                        players.filter((p) => p.trim()).length < 2
                          ? "#bfa204"
                          : COLORS.YELLOW
                      }
                      textColor={COLORS.TEXT_DARK}
                      backgroundGradient={
                        [COLORS.DARK_GREEN, COLORS.YELLOW] as const
                      }
                      paddingHorizontal={SIZES.PADDING_LARGE}
                      paddingVertical={15}
                      style={styles.startButtonInner}
                    />
                  </View>
                </Surface>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Not Enough Players Modal */}
      <CustomModal
        visible={showNotEnoughPlayersModal}
        onClose={() => setShowNotEnoughPlayersModal(false)}
        title="Not Enough Players"
        message="You need at least 2 players to start the game."
        showCloseButton={true}
        closeButtonText="OK"
        showConfirmButton={false}
      />

      {/* ThemeStore is now a page component, navigation handled by router */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SIZES.PADDING_MEDIUM,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.PADDING_XLARGE,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: SIZES.PADDING_SMALL,
    marginBottom: SIZES.PADDING_SMALL,
  },
  title: {
    fontSize: 40,
    fontFamily: FONTS.DOSIS_BOLD,

    marginBottom: SIZES.PADDING_SMALL,
    textAlign: "center",
    ...SIZES.TEXT_SHADOW_MEDIUM,
    marginTop: -48,
  },
  subtitle: {
    fontSize: SIZES.BODY,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_LARGE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
  },
  playerList: {
    marginBottom: 20,
  },
  playerListScroll: {
    maxHeight: 300, // Limit height when scrolling is needed
  },
  playerListContent: {
    // backgroundColor:"red",
    // paddingBottom: SIZES.PADDING_SMALL,
  },
  playerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderWidth: 1,
    ...SIZES.SHADOW_SMALL,
  },
  playerInput: {
    flex: 1,
    fontSize: SIZES.BODY,
    // color: COLOR ,
    paddingVertical: 12,
    fontFamily: FONTS.DOSIS_BOLD,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: SIZES.BODY,
    fontWeight: "bold",
  },
  addPlayerButton: {},
  startButtonContainer: {
    marginTop: 10,
    marginBottom: 40,
  },
  startButton: {
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
  },
  spacer: {
    width: SIZES.PADDING_LARGE, // Adjust as needed for spacing
  },
  debugInfo: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    fontFamily: FONTS.PRIMARY,
    textAlign: "center",
  },

  mascotContainer: {
    alignSelf: "flex-end",
    marginRight: Platform.OS === "ios" ? 20 : 0,
  },

  mascotImage: {
    width: 150,
    height: 150,
    zIndex: 1,
    transform: [{ rotate: "5deg" }],
    marginBottom: Platform.OS === "ios" ? 0 : -5,
  },
  doubleBorderOuter: {
    borderWidth: 2,
    borderRadius: 6,
    padding: 2,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 10,
  },
  doubleBorderInner: {
    borderWidth: 3,
    borderRadius: 6,
  },
  startButtonOuter: {
    borderWidth: 3,
    borderColor: "#63A133",// They changed it
    borderRadius: 8,
    padding: 1, // This creates space between border and button
    backgroundColor: "#63A133", // They changed it
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: "hidden", // Ensures clean rounded corners
  },
  startButtonInner: {
    borderRadius: 5, // Slightly less than outer for border effect
    overflow: "hidden", // Important for gradient + borderRadius
  },

  buttonSpacer: {
    width: SIZES.PADDING_SMALL, // Space between buttons
  },
});
