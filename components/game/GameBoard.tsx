import { LinearGradient } from "expo-linear-gradient";

import React, { useRef, useState } from "react";
import {
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
    action: 'complete' | 'pass' | 'bonus';
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

  const passChallenge = () => {
    // Play pass sound and haptic
    audioService.playSound('passChallenge');
    audioService.playHaptic('warning');
    
    setCompletionData({ points: -1, action: 'pass' });
    setShowCompletionModal(true);
  };

  const handleChallengeComplete = (points: number, action: 'complete' | 'pass' | 'bonus') => {
    // Play appropriate sound and haptic based on action
    if (action === 'complete') {
      audioService.playSound('challengeComplete');
      audioService.playHaptic('success');
    } else if (action === 'bonus') {
      audioService.playSound('bonusAchieved');
      audioService.playHaptic('success');
    } else if (action === 'pass') {
      audioService.playSound('passChallenge');
      audioService.playHaptic('warning');
    }

    setCompletionData({ points, action });
    setShowCompletionModal(true);
  };

  const getCompletionModalTitle = () => {
    if (!completionData) return '';
    
    switch (completionData.action) {
      case 'complete':
        return '🎉 Challenge Complete!';
      case 'bonus':
        return '🌟 Bonus Achieved!';
      case 'pass':
        return '😅 Challenge Passed';
      default:
        return 'Challenge Result';
    }
  };

  const getCompletionModalMessage = () => {
    if (!completionData) return '';
    
    switch (completionData.action) {
      case 'complete':
        return `Amazing job! You've earned +${completionData.points} point! 🎯\n\nKeep up the fantastic work!`;
      case 'bonus':
        return `Incredible! You've earned +${completionData.points} points! 🌟\n\nYou're absolutely crushing it!`;
      case 'pass':
        return `No worries! Sometimes you gotta know when to fold 'em! 😄\n\nYou lost ${Math.abs(completionData.points)} point, but there's always next time! 💪`;
      default:
        return 'Challenge completed!';
    }
  };

  const spinWheel = async () => {
    if (isSpinning || challenges.length === 0) return;

    // Play wheel spin sound and haptic
    audioService.playSound('wheelSpin');
    audioService.playHaptic('medium');

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
    }).start(() => {
      rotation.setValue(0);
      handleSpinComplete();
      setIsSpinning(false);
    });
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Development: User Tier Toggle */}
      <UserTierToggle />
      
      <View style={styles.content}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.leftButtons}>
            <Button
              text="📖 Rules"
              onPress={() => setShowRules(true)}
              backgroundColor={COLORS.YELLOW}
              textColor={COLORS.TEXT_DARK}
              shadowIntensity={5}
              shadowRadius={10}
              showGlare={true}
              glareColor="rgba(255, 255, 255, 0.47)"
              glareDuration={3500}
              glareDelay={80}
              fontSize={SIZES.CAPTION}
              fontWeight="600"
            />
            <SoundSettings onPress={() => {}} />
          </View>

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
            <Animated.View style={{ transform: [{ scale: spinButtonScale }] }}>
              <Button
                key={`spin-button-${showCompletionModal}`} // Force re-render when modal state changes
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
              onComplete={handleChallengeComplete}
              onPass={passChallenge}
            />
          )}
        </View>

        {/* Game Rules Modal */}
        <GameRules visible={showRules} onClose={() => setShowRules(false)} />



        {/* Challenge Completion Modal */}
        <CustomModal
          visible={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            completeChallenge(completionData?.points || 0);
          }}
          title={getCompletionModalTitle()}
          message={getCompletionModalMessage()}
          showCloseButton={true}
          closeButtonText="Spin Again"
          showConfirmButton={false}
          showSparkles={completionData?.action === 'complete' || completionData?.action === 'bonus'}
        />
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
  leftButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.PADDING_SMALL,
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
    ...SIZES.TEXT_SHADOW_MEDIUM,
  },
  currentPlayer: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "800",
    marginBottom: SIZES.PADDING_SMALL,
    ...SIZES.TEXT_SHADOW_SMALL,
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
});
 