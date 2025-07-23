import { LinearGradient } from "expo-linear-gradient";

import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ANIMATION_CONFIGS, ANIMATION_VALUES } from "../../constants/animations";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import { Challenge, Player } from "../../types/game";
import ChallengeDisplay from "./ChallengeDisplay";
import GameRules from "./GameRules";
import Scoreboard from "./Scoreboard";

interface GameBoardProps {
  players: Player[];
  challenges: Challenge[];
  currentPlayerIndex: number;
  isOnline: boolean;
  onPlayerTurnComplete: (playerIndex: number, points: number) => void;
  onResetGame: () => void;
  renderPremiumSection?: React.ReactNode;
}

const { width } = Dimensions.get("window");

export default function GameBoard({
  players,
  challenges,
  currentPlayerIndex,
  isOnline,
  onPlayerTurnComplete,
  onResetGame,
  renderPremiumSection,
}: GameBoardProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(
    null
  );
  const [showChallenge, setShowChallenge] = useState(false);
  const [recentChallenges, setRecentChallenges] = useState<number[]>([]);
  const [showRules, setShowRules] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const spinButtonScale = useRef(new Animated.Value(1)).current;
  const wheelScale = useRef(new Animated.Value(1)).current;

  const getNonRepeatingChallenge = (): Challenge => {
    const available = challenges.filter(
      (ch) => !recentChallenges.includes(ch.id)
    );
    if (available.length === 0) {
      setRecentChallenges([]);
      return challenges[Math.floor(Math.random() * challenges.length)];
    }
    const random = available[Math.floor(Math.random() * available.length)];
    const updatedRecent = [...recentChallenges, random.id];
    if (updatedRecent.length > 5) updatedRecent.shift();
    setRecentChallenges(updatedRecent);
    return random;
  };

  const handleSpinComplete = () => {
    const challenge = getNonRepeatingChallenge();
    setCurrentChallenge(challenge);
    setShowChallenge(true);
  };

  const completeChallenge = (points: number) => {
    setShowChallenge(false);
    onPlayerTurnComplete(currentPlayerIndex, points);
  };

  const passChallenge = () => {
    Alert.alert(
      "Pass Challenge",
      "Are you sure you want to pass? You will lose 1 point.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pass",
          style: "destructive",
          onPress: () => completeChallenge(-1),
        },
      ]
    );
  };

  const attemptBonus = () => {
    if (currentChallenge?.has_bonus) {
      Alert.alert(
        "Bonus Challenge",
        "Attempt the bonus challenge for an extra point!",
        [
          { text: "Skip Bonus", onPress: () => completeChallenge(1) },
          { text: "Attempt Bonus", onPress: () => completeChallenge(2) },
        ]
      );
    } else {
      completeChallenge(1);
    }
  };

  const spinWheel = () => {
    if (isSpinning || challenges.length === 0) return;

    setShowChallenge(false);
    setCurrentChallenge(null);
    setIsSpinning(true);
    rotation.setValue(0);

    // Animate spin button press
    Animated.sequence([
      Animated.timing(spinButtonScale, {
        toValue: ANIMATION_VALUES.SCALE_SMALL,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(spinButtonScale, {
        toValue: ANIMATION_VALUES.SCALE_NORMAL,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate wheel scale during spin
    Animated.sequence([
      Animated.timing(wheelScale, {
        toValue: ANIMATION_VALUES.SCALE_LARGE,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(wheelScale, {
        toValue: ANIMATION_VALUES.SCALE_NORMAL,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(rotation, {
      toValue: 5,
      ...ANIMATION_CONFIGS.SPIN_WHEEL,
    }).start(() => {
      rotation.setValue(0);
      handleSpinComplete();
      setIsSpinning(false);
    });
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusIndicator,
              isOnline ? styles.online : styles.offline,
            ]}
          >
            <Text style={styles.statusText}>
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.rulesButton}
            onPress={() => setShowRules(true)}
          >
            <Text style={styles.rulesButtonText}>📖 Rules</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KNOTTY ROULETTE</Text>
        </View>

        {/* Game Area */}
        <LinearGradient
          colors={["#def6e2", "#84BB78"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gameArea}
        >
          {/* Spinning Wheel */}
          <View style={styles.wheelContainer}>
            <View style={styles.header}>
              <Text style={styles.currentPlayer}>
                {`${currentPlayer.name}'s Turn`}
              </Text>
              <Text style={styles.passInstruction}>
                Pass Phone to Next Player
              </Text>
            </View>
            <View style={styles.wheelShadowContainer}>
              <Animated.Image
                source={require("../../assets/images/knotty-logo.png")}
                style={[
                  styles.wheel,
                  {
                    transform: [
                      {
                        rotate: rotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                      {
                        scale: wheelScale,
                      },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            </View>
          </View>

          {renderPremiumSection}

          {/* Spin Button */}
          <Animated.View style={{ transform: [{ scale: spinButtonScale }] }}>
            <TouchableOpacity
              style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
              onPress={spinWheel}
              disabled={isSpinning}
            >
              <Text style={styles.spinButtonText}>
                {isSpinning ? "Spinning..." : "Spin the Wheel"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Challenge Display */}
          {showChallenge && currentChallenge && (
            <ChallengeDisplay
              challenge={currentChallenge}
              playerName={currentPlayer.name}
              onComplete={attemptBonus}
              onPass={passChallenge}
            />
          )}
        </LinearGradient>

        {/* Scoreboard */}
        <Scoreboard players={players} currentPlayerIndex={currentPlayerIndex} />

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={onResetGame}>
          <Text style={styles.resetButtonText}>New Game</Text>
        </TouchableOpacity>

        {/* Game Rules Modal */}
        <GameRules visible={showRules} onClose={() => setShowRules(false)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: SIZES.PADDING_MEDIUM,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_SMALL,
    backgroundColor: COLORS.DARK_GREEN,
  },
  statusIndicator: {
    paddingHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: 4,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
  },
  online: {
    // backgroundColor: COLORS.ONLINE,
    backgroundColor: "#2ba1d7ff",
  },
  offline: {
    // backgroundColor: COLORS.OFFLINE,
    backgroundColor: "#ffcc00",
  },
  statusText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.CAPTION,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
  },
  statusSubtext: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: SIZES.CAPTION,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
    fontFamily: FONTS.PRIMARY,
  },
  rulesButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    ...SIZES.SHADOW_SMALL,
  },
  rulesButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.CAPTION,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.PADDING_MEDIUM,
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: "bold",
    color: COLORS.YELLOW,
    fontFamily: FONTS.TITLE,
    marginBottom: SIZES.PADDING_SMALL,
    marginTop: SIZES.PADDING_LARGE,
    textAlign: "center",
  },
  currentPlayer: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "800",
    marginBottom: SIZES.PADDING_SMALL,
  },
  passInstruction: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    fontStyle: "italic",
  },
  gameArea: {
    backgroundColor: COLORS.LIGHT_GREEN,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_MEDIUM,
    ...SIZES.SHADOW_SMALL,
    alignItems: "center",
    marginBottom: SIZES.PADDING_MEDIUM,
  },
  wheelContainer: {
    marginBottom: SIZES.PADDING_LARGE,
    ...SIZES.SHADOW_LARGE,
  },
  wheelShadowContainer: {
    ...SIZES.SHADOW_MEDIUM,
  },
  wheel: {
    width: width * 0.7,
    height: 280,
  },
  spinButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_XLARGE,
    paddingVertical: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    ...SIZES.SHADOW_MEDIUM,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    color: COLORS.TEXT_DARK,
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "bold",
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: COLORS.YELLOW,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    paddingVertical: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    alignItems: "center",
  },
  resetButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
  },
});
