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
import { ANIMATION_CONFIGS, ANIMATION_VALUES } from "../../constants/animations";
import { COLORS, FONTS, GAME_CONFIG, SIZES } from "../../constants/theme";
import adService from "../../services/adService";
import audioService from "../../services/audio";
import upsellService from "../../services/upsellService";
import userService from "../../services/userService";
import { Challenge, Player } from "../../types/game";
import Button from "../ui/Button";
import CustomModal from "../ui/CustomModal";
import SoundSettings from "../ui/SoundSettings";
import StoreButton from "../ui/StoreButton";
import UpsellModal from "../ui/UpsellModal";
import ChallengeDisplay from "./ChallengeDisplay";
import GameRules from "./GameRules";
import Scoreboard from "./Scoreboard";
// import PurchaseCelebrationModal from "../ui/PurchaseCelebrationModal"; // Commented out - No congrats modal needed
import { router } from "expo-router";

interface GameBoardProps {
  players: Player[];
  challenges: Challenge[];
  currentPlayerIndex: number;
  isOnline: boolean;
  isNewGame: boolean;
  onPlayerTurnComplete: (playerIndex: number, points: number) => void;
  onResetGame: () => void;
  onRulesShown: () => void;
  onUpsellTrigger?: (
    upsellType: import("../../services/upsellService").UpsellType
  ) => void;
}

const { width } = Dimensions.get("window");

export default function GameBoard({
  players,
  challenges,
  currentPlayerIndex,
  isOnline,
  isNewGame,
  onPlayerTurnComplete,
  onResetGame,
  onRulesShown,
  onUpsellTrigger,
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
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [currentUpsellOffer, setCurrentUpsellOffer] = useState<any>(null);
  const [pendingUpsell, setPendingUpsell] = useState<any>(null);
  const [spinCount, setSpinCount] = useState(0);
  // Commented out - No congrats modal for bundle purchases on GameBoard
  // const [showPurchaseCelebrationModal, setShowPurchaseCelebrationModal] = useState(false);
  // const [purchaseType, setPurchaseType] = useState<'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set' | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const spinButtonScale = useRef(new Animated.Value(1)).current;
  const wheelScale = useRef(new Animated.Value(1)).current;

  // Auto-show rules for new games
  useEffect(() => {
    if (isNewGame) {
      setShowRules(true);
    }
  }, [isNewGame]);

  // Handle rules close for new games
  const handleRulesClose = () => {
    setShowRules(false);
    if (isNewGame) {
      onRulesShown(); // Notify parent that rules have been shown
    }
  };

  // Handle manual rules opening (not from new game)
  const handleManualRulesOpen = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
    setShowRules(true);
  };

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

    // Remove this incorrect call - game over upsell should only show when game is actually over
    // checkGameOverUpsell();
  };

  const checkGameOverUpsell = async () => {
    try {
      const upsellType = await upsellService.trackGameOver();
      if (upsellType !== "none") {
        const offer = upsellService.getUpsellOffer(upsellType, "game_over");
        if (offer) {
          setCurrentUpsellOffer(offer);
          setShowUpsellModal(true);
        }
      }
    } catch (error) {
      console.error("Error checking game over upsell:", error);
    }
  };

  const handleChallengeComplete = (
    points: number,
    action: "complete" | "pass" | "bonus"
  ) => {
    // Check if the current player will win after this challenge
    const currentPlayer = players[currentPlayerIndex];
    const willWin = currentPlayer.points + points >= GAME_CONFIG.WINNING_SCORE;

    // Play appropriate sound and haptic based on action
    if (action === "complete") {
      audioService.playSound("challengeComplete");
      audioService.playHaptic("success");
    } else if (action === "bonus") {
      audioService.playSound("bonusAchieved");
      audioService.playHaptic("success");
    } else if (action === "pass") {
      console.log("Sound PALYEDD passChallenge");
      audioService.playSound("passChallenge");
      audioService.playHaptic("warning");
    }

    if (willWin) {
      // Player will win - skip completion modal and go straight to game over
      completeChallenge(points);
    } else {
      // Player won't win - show completion modal as usual
      setCompletionData({ points, action });
      setShowCompletionModal(true);
    }
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

    // Check if there's a pending upsell to show first
    if (pendingUpsell) {
      console.log('🎯 GameBoard: Showing pending upsell:', pendingUpsell);
      // Show upsell locally in GameBoard instead of sending to parent
      const offer = upsellService.getUpsellOffer(pendingUpsell, 'ad_based');
      console.log('🎯 GameBoard: Upsell offer:', offer);
      if (offer) {
        setCurrentUpsellOffer(offer);
        setShowUpsellModal(true);
        console.log('🎯 GameBoard: Upsell modal should be visible now');
      }
      setPendingUpsell(null);
      return;
    }

    audioService.playSound("buttonPress");
    audioService.playHaptic("light");

    // Play wheel spin sound and haptic
    audioService.playSound("wheelSpin");
    audioService.playHaptic("medium");

    setIsSpinning(true);
    setShowChallenge(false);
    setCurrentChallenge(null);
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
      
      // Track spin count for upsell logic
      const newSpinCount = spinCount + 1;
      setSpinCount(newSpinCount);
      
      // Debug user status
      const isPremium = userService.isPremium();
      console.log('🎯 GameBoard: User is premium:', isPremium, 'Spin count:', newSpinCount);
      
      // Track spin for ad display (every 3 spins for free users)
      const adWasShown = await adService.trackSpin();
      console.log('🎯 GameBoard: Ad was shown:', adWasShown);

      // Clean logic: Trigger upsell every 3 spins for free users (simulating ad intervals)
      if (!isPremium && newSpinCount % 3 === 0) {
        try {
          const upsellType = await upsellService.trackAdView();
          console.log('🎯 GameBoard: Upsell type from service:', upsellType);
          if (upsellType !== 'none') {
            // Store the upsell for later - don't show immediately
            setPendingUpsell(upsellType);
            console.log('🎯 GameBoard: Stored pending upsell:', upsellType);
          }
        } catch (error) {
          console.error('Error checking upsell after spin:', error);
        }
      }

      handleSpinComplete();
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

  const handleUpsellPurchaseSuccess = () => {
    setShowUpsellModal(false);
    // Refresh any necessary data after purchase
  };

  // Commented out - No congrats modal for bundle purchases on GameBoard
  /*
  const handlePurchaseComplete = (type: 'ad_free' | 'theme_packs' | 'all_in_bundle' | 'complete_set') => {
    // setPurchaseType(type); // This line is no longer needed
    // setShowPurchaseCelebrationModal(true); // This line is no longer needed
  };
  */

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Development: User Tier Toggle */}
      <View style={styles.content}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.leftButtons}>
            <Surface
              elevation={Platform.OS === "ios" ? 3 : 5}
              style={{
                borderRadius: 8,
              }}
            >
              <View style={{ overflow: "hidden" }}>
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
                  onPress={handleManualRulesOpen}
                  backgroundColor={COLORS.YELLOW}
                  textColor={COLORS.TEXT_DARK}
                  fontSize={SIZES.CAPTION}
                  fontFamily={FONTS.DOSIS_BOLD}
                  style={{ borderRadius: 8 }}
                />
              </View>
            </Surface>

            <StoreButton
              onPress={() => {
                audioService.playSound("buttonPress");
                audioService.playHaptic("medium");
                router.push("/theme-store?isGameActive=true");
              }}
            />

            <SoundSettings
              onPress={() => {
                audioService.playSound("buttonPress");
                audioService.playHaptic("medium");
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
              fontSize={SIZES.CAPTION}
              fontFamily={FONTS.DOSIS_BOLD}
              // fontWeight="600"
            />
          </Surface>
        </View>

        {/* Main Content - Centered */}
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>KNOTTY ROULETTE</Text>
            <View style={styles.mascotContainer}>
              <Image
                source={require("../../assets/images/MascotImages/Default/KnottyMascotComplete.png")}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Game Area */}
          <LinearGradient
            colors={["#d4f6daff", "#286a19ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gameArea}
          >
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
                      opacity: 0.8, // Make the image less bright
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

 

            {/* Spin Button */}
            {pendingUpsell && (
              <Text style={styles.upsellTooltip}>
                💡 You have a special offer to check before spinning!
              </Text>
            )}

            <Animated.View style={{ transform: [{ translateY }] }}>
              <Surface
                elevation={5}
                style={{
                  borderRadius: 14,
                  marginVertical: 4,
                }}
              >
                <View style={{ overflow: "hidden" }}>
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
                  {/* Shine Layer 2 */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.glareLayer2,
                      {
                        transform: [
                          { translateX: shineAnim2 },
                          Platform.OS === "ios"
                            ? { skewX: "-15deg" }
                            : { rotate: "15deg" },
                        ],
                      },
                    ]}
                  />
                  <Button
                    text={
                      isSpinning
                        ? "Spinning..."
                        : pendingUpsell
                          ? "Check Special Offer!"
                          : "Spin the Wheel"
                    }
                    onPress={spinWheel}
                    disabled={isSpinning}
                    backgroundGradient={
                      pendingUpsell
                        ? [COLORS.YELLOW, COLORS.YELLOW] as const
                        : [COLORS.DARK_GREEN, COLORS.YELLOW] as const
                    }
                    textColor={COLORS.TEXT_DARK}
                    fontSize={SIZES.SUBTITLE}
                    fontFamily={FONTS.DOSIS_BOLD}
                    shadowIntensity={5}
                    // shadowRadius={12}
                    paddingHorizontal={SIZES.PADDING_LARGE}
                    paddingVertical={SIZES.PADDING_MEDIUM}
                    style={styles.spinButton}
                  />
                </View>
              </Surface>
            </Animated.View>
          </LinearGradient>

          {/* Scoreboard */}
          <Scoreboard
            players={players}
            currentPlayerIndex={currentPlayerIndex}
          />
        </View>
        {/* Challenge Display - Moved outside game area */}
        {showChallenge && currentChallenge && (
          <ChallengeDisplay
            challenge={currentChallenge}
            playerName={currentPlayer.name}
            onComplete={handleChallengeComplete}
          />
        )}

        {/* Game Rules Modal */}
        <GameRules visible={showRules} onClose={handleRulesClose} />

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
          closeButtonText={`${
            players[(currentPlayerIndex + 1) % players.length]?.name
          }'s Turn To Spin`}
          showConfirmButton={false}
          showSparkles={
            completionData?.action === "complete" ||
            completionData?.action === "bonus"
          }
        />

        {/* Upsell Modal */}
        {currentUpsellOffer && (
          <UpsellModal
            visible={showUpsellModal}
            onClose={() => {
              setShowUpsellModal(false);
              setPendingUpsell(null); // Clear pending upsell if dismissed
            }}
            onPurchaseSuccess={handleUpsellPurchaseSuccess}
            onPurchaseComplete={() => {
              // No congrats modal needed for GameBoard bundle purchases
              // Just close the upsell modal and continue with game
            }}
            offer={currentUpsellOffer}
          />
        )}

        {/* Purchase Celebration Modal */}
        {/* Commented out - No congrats modal for bundle purchases on GameBoard
        {showPurchaseCelebrationModal && purchaseType && (
          <PurchaseCelebrationModal
            visible={showPurchaseCelebrationModal}
            onClose={() => setShowPurchaseCelebrationModal(false)}
            purchaseType={purchaseType}
          />
        )}
        */}
      </View>

      {/* Theme Store - Navigate to page instead of modal */}
      {/* ThemeStore is now a page component, navigation handled by router */}
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
    maxHeight: "88%",
  },
  header: {
    alignItems: "center",
    marginTop: 5,
    marginBottom: SIZES.PADDING_SMALL,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  title: {
    fontSize:
      Platform.OS === "android"
        ? Math.min(SIZES.EXTRALARGE, width * 0.072)
        : Math.min(SIZES.EXTRALARGE * 1.0, width),
    fontFamily: FONTS.DOSIS_BOLD,
    color: COLORS.YELLOW,
    marginBottom: SIZES.PADDING_MEDIUM,
    ...SIZES.TEXT_SHADOW_MEDIUM,
    textAlign: "left",
    marginLeft: 5,
    flex: 1,
    flexShrink: 1,
  },
  currentPlayer: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    // fontWeight: "800",
    // marginBottom: SIZES.PADDING_SMALL,
    paddingTop: 5,
    ...SIZES.TEXT_SHADOW_SMALL,
  },
  passInstruction: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    // fontFamily: FONTS.PRIMARY,
    fontStyle: "italic",
  },
  gameArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    // padding: SIZES.PADDING_MEDIUM,
    // ...SIZES.SHADOW_SMALL,
    alignItems: "center",
    // marginBottom: 50,
    marginTop: -45,
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
    borderRadius: width * 0.3 + 8, // Half of wheel width + padding (updated for larger wheel)
    // Add padding to ensure shadow is visible
    padding: 12,
    // Ensure shadow is visible on all sides
    overflow: "visible",
    // Force shadow rendering
    // backgroundColor: 'transparent',
  },
  wheel: {
    width: width * 0.6, // Increased from 0.5 to 0.6 (20% larger)
    height: 240, // Increased from 200 to 240 (20% larger)
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
    height: 240, // Updated to match new wheel height
    width: 50, // Made thinner
    backgroundColor: "rgba(255, 255, 255, 0.12)", // Slightly more transparent
    zIndex: 1,
  },
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
    marginRight: -10,
    flexShrink: 0,
    minWidth: 100,
  },

  mascotImage: {
    width: 130,
    height: 130,
    zIndex: 1,
    transform: [{ rotate: "5deg" }],
  },
  upsellTooltip: {
    position: "absolute",
    top: -40, // Adjust as needed
    backgroundColor: COLORS.YELLOW,
    color: COLORS.TEXT_DARK,
    paddingVertical: SIZES.PADDING_SMALL,
    paddingHorizontal: SIZES.PADDING_MEDIUM,
    borderRadius: 8,
    zIndex: 10,
    ...SIZES.TEXT_SHADOW_SMALL,
    fontFamily: FONTS.DOSIS_BOLD,
    fontSize: SIZES.CAPTION,
    textAlign: "center",
  },
  debugInfo: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: SIZES.PADDING_SMALL,
    borderRadius: 8,
    zIndex: 10,
  },
  debugText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.CAPTION,
    fontFamily: FONTS.DOSIS_BOLD,
  },
});
