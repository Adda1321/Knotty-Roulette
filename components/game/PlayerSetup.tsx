import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";
import Button from "../ui/Button";
import CustomModal from "../ui/CustomModal";

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [players, setPlayers] = useState<string[]>(["", ""]); // Default two empty players
  const [showNotEnoughPlayersModal, setShowNotEnoughPlayersModal] =
    useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const addPlayer = () => {
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

  const startGame = () => {
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
      colors={[COLORS.DARK_GREEN, "#679c67", "#3f663f"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Text style={styles.title}>KNOTTY ROULETTE</Text>
            <Text style={styles.subtitle}>Add Players to Begin</Text>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.playerList}>
              {shouldScroll ? (
                // Use ScrollView for player list when we have many players
                <ScrollView
                  ref={scrollViewRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.playerListScroll}
                  contentContainerStyle={styles.playerListContent}
                >
                  {players.map((player, index) => (
                    <View key={index}>
                      <View style={styles.playerInputContainer}>
                        <TextInput
                          style={styles.playerInput}
                          placeholder={`Player ${index + 1}`}
                          placeholderTextColor="#a1a1a1"
                          value={player}
                          onChangeText={(text) => updatePlayer(index, text)}
                          maxLength={20}
                          selectionColor="#e94560"
                        />
                        {/* Show remove button only when more than minimum players */}
                        {players.length > 2 && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => {
                              audioService.playHaptic("light");
                              removePlayer(index);
                            }}
                          >
                            <Text style={styles.removeButtonText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Add Player button after each field when under max */}
                      {index === players.length - 1 && players.length < 8 && (
                        <Button
                          text="+ Add Player"
                          onPress={addPlayer}
                          backgroundColor={COLORS.YELLOW}
                          textColor={COLORS.TEXT_DARK}
                          fontSize={SIZES.CAPTION}
                          fontFamily={FONTS.PRIMARY}
                          fontWeight="600"
                          paddingHorizontal={SIZES.PADDING_SMALL}
                          paddingVertical={SIZES.PADDING_SMALL}
                          style={styles.addPlayerButton}
                          shadowIntensity={8}
                          shadowRadius={12}
                        />
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                // Use regular View when we have few players
                <>
                  {players.map((player, index) => (
                    <View key={index}>
                      <View style={styles.playerInputContainer}>
                        <TextInput
                          style={styles.playerInput}
                          placeholder={`Player ${index + 1}`}
                          placeholderTextColor="#a1a1a1"
                          value={player}
                          onChangeText={(text) => updatePlayer(index, text)}
                          maxLength={20}
                          selectionColor="#e94560"
                        />
                        {/* Show remove button only when more than minimum players */}
                        {players.length > 2 && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => {
                              audioService.playHaptic("light");
                              removePlayer(index);
                            }}
                          >
                            <Text style={styles.removeButtonText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Add Player button after each field when under max */}
                      {index === players.length - 1 && players.length < 8 && (
                        <Button
                          text="+ Add Player"
                          onPress={addPlayer}
                          backgroundColor={COLORS.YELLOW}
                          textColor={COLORS.TEXT_DARK}
                          fontSize={SIZES.CAPTION}
                          fontFamily={FONTS.PRIMARY}
                          fontWeight="600"
                          paddingHorizontal={SIZES.PADDING_SMALL}
                          paddingVertical={SIZES.PADDING_SMALL}
                          style={styles.addPlayerButton}
                          shadowIntensity={8}
                          shadowRadius={12}
                        />
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={styles.startButtonContainer}>
              <Button
                text="START GAME"
                onPress={startGame}
                disabled={players.filter((p) => p.trim()).length < 2}
                backgroundColor={
                  players.filter((p) => p.trim()).length < 2
                    ? "#bfa204"
                    : COLORS.YELLOW
                }
                textColor={COLORS.TEXT_DARK}
                fontSize={SIZES.SUBTITLE}
                fontFamily={FONTS.DOSIS_BOLD}
                paddingHorizontal={SIZES.PADDING_LARGE}
                paddingVertical={15}
                shadowIntensity={10}
                shadowRadius={15}
              />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.DARK_GREEN,
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
  title: {
    fontSize: 40,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.YELLOW,
    marginBottom: SIZES.PADDING_SMALL,
    marginTop: 90,
    textAlign: "center",
    ...SIZES.TEXT_SHADOW_MEDIUM,
  },
  subtitle: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_PRIMARY,
    fontFamily: FONTS.PRIMARY,
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
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
  },
  playerInput: {
    flex: 1,
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    paddingVertical: 12,
    fontFamily: FONTS.PRIMARY,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.OFFLINE,
  },
  removeButtonText: {
    color: COLORS.TEXT_PRIMARY,
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
});
