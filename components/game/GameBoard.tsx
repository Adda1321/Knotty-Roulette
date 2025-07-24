import { LinearGradient } from "expo-linear-gradient";

import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ANIMATION_CONFIGS,
  ANIMATION_VALUES,
} from "../../constants/animations";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import { Challenge, Player } from "../../types/game";
import Button from "../ui/Button";
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
}

const { width } = Dimensions.get("window");

export default function GameBoard({
  players,
  challenges,
  currentPlayerIndex,
  isOnline,
  onPlayerTurnComplete,
  onResetGame,
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
      <View style={styles.content}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Button
            text="📖 Rules"
            onPress={() => setShowRules(true)}
            backgroundColor={COLORS.YELLOW}
            textColor={COLORS.TEXT_DARK}
            shadowIntensity={5}
            shadowRadius={10}
             showGlare={true}
                glareColor="rgba(255, 255, 255, 0.47)"
                glareDuration={3000}
                glareDelay={80}
            fontSize={SIZES.CAPTION}
            fontWeight="600"
          />

          <Button
            text="🔄 New Game"
            onPress={onResetGame}
            backgroundColor={COLORS.YELLOW}
            textColor={COLORS.TEXT_DARK}
            shadowIntensity={5}
            shadowRadius={10}
            fontSize={SIZES.CAPTION}
            fontWeight="600"
          />
        </View>

        {/* Main Content - Centered */}
        <View style={styles.mainContent}>
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

            {/* Spin Button */}
            <Animated.View style={{ transform: [{ scale: spinButtonScale }] }}>
              <Button
                text={isSpinning ? "Spinning..." : "Spin the Wheel"}
                onPress={spinWheel}
                disabled={isSpinning}
                backgroundColor={COLORS.YELLOW}
                textColor={COLORS.TEXT_DARK}
                fontSize={SIZES.BODY}
                // fontWeight="bold"
                fontFamily={FONTS.DOSIS_BOLD}
                showGlare={!isSpinning}
                glareColor="rgba(255, 255, 255, 0.7)"
                glareDuration={3000}
                glareDelay={30}
                shadowIntensity={5}
                shadowRadius={10}
                paddingHorizontal={SIZES.PADDING_LARGE}
                paddingVertical={SIZES.PADDING_SMALL}
                style={[
                  styles.spinButton,
                  isSpinning && styles.spinButtonDisabled,
                ]}
              />
            </Animated.View>
          </LinearGradient>

          {/* Scoreboard */}
          <Scoreboard
            players={players}
            currentPlayerIndex={currentPlayerIndex}
          />

          {/* Challenge Display - Moved outside game area */}
          {showChallenge && currentChallenge && (
            <ChallengeDisplay
              challenge={currentChallenge}
              playerName={currentPlayer.name}
              onComplete={attemptBonus}
              onPass={passChallenge}
            />
          )}
        </View>

        {/* Game Rules Modal */}
        <GameRules visible={showRules} onClose={() => setShowRules(false)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: SIZES.PADDING_SMALL,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SIZES.PADDING_LARGE,
    paddingVertical: SIZES.PADDING_SMALL,
    backgroundColor: COLORS.DARK_GREEN,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  title: {
    fontSize: SIZES.EXTRALARGE,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.YELLOW,
    marginBottom: SIZES.PADDING_XLARGE,
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
    marginBottom: SIZES.PADDING_SMALL,
    width: "100%",
    maxWidth: 400,
  },
  wheelContainer: {
    marginBottom: SIZES.PADDING_SMALL,
    ...SIZES.SHADOW_LARGE,
  },
  wheelShadowContainer: {
    ...SIZES.SHADOW_MEDIUM,
  },
  wheel: {
    width: width * 0.5,
    height: 200,
  },
  spinButton: {
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
});
