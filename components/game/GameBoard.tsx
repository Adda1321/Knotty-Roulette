import { LinearGradient } from "expo-linear-gradient";
import { Surface } from "react-native-paper";

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
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
import adService from "../../services/adService";
import audioService from "../../services/audio";
import { Challenge, Player } from "../../types/game";
import Button from "../ui/Button";

import CustomModal from "../ui/CustomModal";
import SoundSettings from "../ui/SoundSettings";
import UserTierToggle from "../ui/UserTierToggle";
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
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionData, setCompletionData] = useState<{
    points: number;
    action: "complete" | "pass" | "bonus";
  } | null>(null);
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
    setIsSpinning(false); // Ensure spinning state is reset
    onPlayerTurnComplete(currentPlayerIndex, points);
  };

  const handleChallengeComplete = (
    points: number,
    action: "complete" | "pass" | "bonus"
  ) => {
    // Play appropriate sound and haptic based on action
    if (action === "complete") {
      audioService.playSound("challengeComplete");
      audioService.playHaptic("success");
    } else if (action === "bonus") {
      audioService.playSound("bonusAchieved");
      audioService.playHaptic("success");
    } else if (action === "pass") {
      audioService.playSound("passChallenge");
      audioService.playHaptic("warning");
    }

    setCompletionData({ points, action });
    setShowCompletionModal(true);
  };

  const getCompletionModalTitle = () => {
    if (!completionData) return "";

    switch (completionData.action) {
      case "complete":
        return "🎉 Challenge Complete!";
      case "bonus":
        return "🌟 Bonus Achieved!";
      case "pass":
        return "😅 Challenge Passed";
      default:
        return "Challenge Result";
    }
  };

  const getCompletionModalMessage = () => {
    if (!completionData) return "";

    switch (completionData.action) {
      case "complete":
        return `Amazing job! You've earned +${completionData.points} point! 🎯\n\nKeep up the fantastic work!`;
      case "bonus":
        return `Incredible! You've earned +${completionData.points} points! 🌟\n\nYou're absolutely crushing it!`;
      case "pass":
        return `No worries! Sometimes you gotta know when to fold 'em! 😄\n\nYou lost ${Math.abs(
          completionData.points
        )} point, but there's always next time! 💪`;
      default:
        return "Challenge completed!";
    }
  };

  const spinWheel = async () => {
    if (isSpinning || challenges.length === 0) return;
    audioService.playSound("buttonPress");

    // Play wheel spin sound and haptic
    audioService.playSound("wheelSpin");
    audioService.playHaptic("medium");

    // Track spin for ad display (every 3 spins for free users)
    await adService.trackSpin();

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
    }).start(async () => {
      rotation.setValue(0);
      handleSpinComplete();
      setIsSpinning(false);
    });
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
    outputRange: [0, -5, 0, 5, 0],
  });
  const shineAnim1 = useRef(new Animated.Value(-100)).current;
  const shineAnim2 = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const loopGlare = () => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(shineAnim1, {
            toValue: 200,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim2, {
            toValue: 100,
            duration: 2500,
            delay: 150,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    if (!isSpinning) {
      // Reset animation values before starting loop
      shineAnim1.setValue(-100);
      shineAnim2.setValue(-100);
      loopGlare();
    }
  }, [isSpinning]);

  const glareAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glareAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          delay: 80,
        }),
        Animated.timing(glareAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const currentPlayer = players[currentPlayerIndex];
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Development: User Tier Toggle */}
      <UserTierToggle />

      <View style={styles.content}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.leftButtons}>
            <Surface
              elevation={Platform.OS === "ios" ? 3 : 5}
              style={{
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <View style={{ position: "relative", overflow: "hidden" }}>
                {/* Shine Layer 1 */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.glareLayer1,
                    {
                      transform: [
                        { translateX: shineAnim1 },
                        Platform.OS === "ios"
                          ? { skewX: "-15deg" }
                          : { rotate: "15deg" },
                      ],
                    },
                  ]}
                />

                <Button
                  text="📖 Rules"
                  onPress={() => {
                    audioService.playSound("buttonPress");
                    audioService.playHaptic("medium");
                    setShowRules(true);
                  }}
                  backgroundColor={COLORS.YELLOW}
                  textColor={COLORS.TEXT_DARK}
                  fontSize={SIZES.SUBTITLE}
                  fontWeight="600"
                  style={{ borderRadius: 8 }}
                />
              </View>
            </Surface>

            <SoundSettings
              onPress={() => {
                audioService.playSound("buttonPress");

                audioService.playHaptic("medium"); // add haptic here
              }}
            />
          </View>
          <Surface
            elevation={Platform.OS === "ios" ? 3 : 5}
            style={{ borderRadius: 10 }}
          >
            <Button
              text="🔄 New Game"
              onPress={() => {
                audioService.playSound("buttonPress");
                audioService.playHaptic("medium"); // add haptic here too
                onResetGame();
              }}
              backgroundColor={COLORS.YELLOW}
              // backgroundGradient={[COLORS.DARK_GREEN, COLORS.YELLOW] as const}
              textColor={COLORS.TEXT_DARK}
              // shadowIntensity={5}
              // shadowRadius={10}
              fontSize={SIZES.SUBTITLE}
              fontWeight="600"
            />
          </Surface>
        </View>

        {/* Main Content - Centered */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.mascotContainer}>
              <Image
                source={require("../../assets/images/Knotty-Mascot.png")}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>KNOTTY ROULETTE</Text>
          </View>

          {/* Game Area */}
          <LinearGradient
            // colors={["#3e8e2cff","#328021ff"]}
            colors={["#d4f6daff", "#286a19ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gameArea}
          >
            {/* Diagonal Glare Overlay
  <Animated.View style={[
    styles.glareOverlay,
    {
      opacity: glareAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 0.10]
      })
    }
  ]}>
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0)']}
      start={{ x: 1, y: 0 }} // Top right
      end={{ x: 0, y: 1 }}   // Bottom left
      style={StyleSheet.absoluteFill}
    />
  </Animated.View> */}
            {/* Shine Layer 1 */}
            {/* <Animated.View
            pointerEvents="none"
            style={[
              styles.backgdglareLayer,
              {
                transform: [
                  { translateX: shineAnim1 },
                  { skewX: "-15deg" },
                ],
              },
            ]}
          /> */}

            {/* Rest of your content */}

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
              <Animated.View
                style={[
                  styles.wheelShadowContainer,
                  {
                    transform: [{ scale: wheelScale }],
                  },
                ]}
              >
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
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            {/* Spin Button */}

            <Animated.View style={{ transform: [{ translateY }] }}>
              <Surface
                elevation={5}
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  marginVertical: 4,
                }}
              >
                {/* <View style={{ overflow: "hidden" }}> */}
                {/* Shine Layer 1 */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.glareLayer1,
                    {
                      transform: [
                        { translateX: shineAnim1 },
                        Platform.OS === "ios"
                          ? { skewX: "-15deg" }
                          : { rotate: "15deg" },
                      ],
                    },
                  ]}
                />
                <Button
                  text={isSpinning ? "Spinning..." : "Spin the Wheel"}
                  onPress={spinWheel}
                  disabled={isSpinning}
                  backgroundGradient={
                    [COLORS.DARK_GREEN, COLORS.YELLOW] as const
                  }
                  textColor={COLORS.TEXT_DARK}
                  fontSize={SIZES.SUBTITLE}
                  fontFamily={FONTS.DOSIS_BOLD}
                  shadowIntensity={5}
                  // shadowRadius={12}
                  paddingHorizontal={SIZES.PADDING_LARGE}
                  paddingVertical={SIZES.PADDING_MEDIUM}
                  style={[
                    styles.spinButton,
                    isSpinning && styles.spinButtonDisabled,
                  ]}
                />
                {/* </View> */}
              </Surface>
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
              onComplete={handleChallengeComplete}
            />
          )}
        </View>

        {/* Game Rules Modal */}
        <GameRules visible={showRules} onClose={() => setShowRules(false)} />

        {/* Challenge Completion Modal */}
        <CustomModal
          visible={showCompletionModal}
          onClose={() => {
            audioService.playSound("buttonPress");
            audioService.playHaptic("medium"); // add haptic here
            setShowCompletionModal(false);
            completeChallenge(completionData?.points || 0);
          }}
          title={getCompletionModalTitle()}
          message={getCompletionModalMessage()}
          showCloseButton={true}
          closeButtonText="Spin Again"
          showConfirmButton={false}
          showSparkles={
            completionData?.action === "complete" ||
            completionData?.action === "bonus"
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#116b20ff",
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
    backgroundColor: "#116b20ff",
  },
  leftButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.PADDING_SMALL,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    maxHeight: "85%",
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  title: {
    fontSize: SIZES.EXTRALARGE,
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.YELLOW,
    marginBottom: SIZES.PADDING_MEDIUM,
    ...SIZES.TEXT_SHADOW_MEDIUM,
    marginTop: -120,
    marginLeft: 15,
    textAlign: "left",
    alignSelf: "flex-start", // forces it to align left inside its container
  },
  currentPlayer: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    // fontWeight: "800",
    marginBottom: SIZES.PADDING_SMALL,
    ...SIZES.TEXT_SHADOW_SMALL,
  },
  passInstruction: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    // fontFamily: FONTS.PRIMARY,
    fontStyle: "italic",
  },
  gameArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: COLORS.LIGHT_GREEN,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_MEDIUM,
    ...SIZES.SHADOW_SMALL,
    alignItems: "center",
    marginBottom: SIZES.PADDING_SMALL,
    width: "100%",
    maxWidth: 400,
    zIndex: -1,
  },
  glareOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  wheelContainer: {
    marginBottom: SIZES.PADDING_SMALL,
    ...SIZES.SHADOW_LARGE,
  },
  wheelShadowContainer: {
    // Enhanced shadow for wheel depth
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 20,
    // Make container circular to match wheel shape
    borderRadius: width * 0.25 + 8, // Half of wheel width + padding
    // Add padding to ensure shadow is visible
    padding: 12,
    // Ensure shadow is visible on all sides
    overflow: "visible",
    // Force shadow rendering
    // backgroundColor: 'transparent',
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
  glareLayer1: {
    position: "absolute",
    top: -10,
    left: 0,
    height: 200,
    width: 50, // Made thinner
    backgroundColor: "rgba(255, 255, 255, 0.12)", // Slightly more transparent
    zIndex: 1,
  },
  // backgdglareLayer: {
  //   position: "absolute",
  //   top: 0,
  //   left: 0,
  //   height: "100%",
  //   width: 600,
  //   backgroundColor: "rgba(255, 255, 255, 0.1)", // More transparent
  //   zIndex: 1,
  // },
  glareLayer2: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)", // More transparent
    zIndex: 1,
  },
  mascotContainer: {
    alignSelf: "flex-end",
    top: 2, // This will right-align the container
    marginRight: Platform.OS === "ios" ? -135 : -55,
  },

  mascotImage: {
    width: 150,
    height: 150,
    zIndex: 1,
    transform: [{ rotate: "5deg" }],
  },
});
