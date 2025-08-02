import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";
import Toast from "react-native-toast-message";
import {
  ANIMATION_CONFIGS,
  ANIMATION_VALUES,
} from "../../constants/animations";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import { logVote } from "../../services/api";
import audioService from "../../services/audio";
import { Challenge } from "../../types/game";
import Button from "../ui/Button";
import SparkleEffect from "../ui/SparkleEffect";

interface ChallengeDisplayProps {
  challenge: Challenge;
  playerName: string;
  onComplete: (points: number, action: "complete" | "pass" | "bonus") => void;
  onPass: () => void;
}

export default function ChallengeDisplay({
  challenge,
  playerName,
  onComplete,
  onPass,
}: ChallengeDisplayProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [votingType, setVotingType] = useState<"upvote" | "downvote" | null>(
    null
  );

  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Sparkle effect state
  const [showSparkles, setShowSparkles] = useState(false);

  // Card reveal animation on mount
  useEffect(() => {
    // Start sparkle effect immediately (non-blocking)
    setShowSparkles(true);

    Animated.sequence([
      Animated.timing(cardOpacity, {
        toValue: ANIMATION_VALUES.OPACITY_VISIBLE,
        ...ANIMATION_CONFIGS.FADE_IN,
      }),
      Animated.timing(cardScale, {
        toValue: ANIMATION_VALUES.SCALE_NORMAL,
        ...ANIMATION_CONFIGS.SCALE_IN,
      }),
    ]).start();
  }, [cardOpacity, cardScale]);

  const handleVote = async (voteType: "upvote" | "downvote") => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium");
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    setVotingType(voteType);

    try {
      await logVote({
        challengeId: challenge.id,
        challengeText: challenge.challenge_text,
        playerName,
        voteType,
      });
      setHasVoted(true);

      // Show success notification
      Toast.show({
        type: "success",
        text1: "Vote Submitted!",
        text2: `Your ${voteType} has been recorded`,
        position: "top",
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error("Error logging vote:", error);

      // Show specific error message based on error type
      let errorMessage = "Unable to submit your vote";

      if (error instanceof Error) {
        if (
          error.message.includes("Network error") ||
          error.message.includes("No internet connection")
        ) {
          errorMessage = "No internet connection. Vote will be saved locally.";
        } else if (
          error.message.includes("Request timeout") ||
          error.message.includes("timeout")
        ) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("Server error")) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }

      // Show error notification
      Toast.show({
        type: "error",
        text1: "Vote Failed",
        text2: errorMessage,
        position: "top",
        visibilityTime: 4000,
      });

      // Don't set hasVoted to true if the vote failed
      setHasVoted(false);
    } finally {
      setIsVoting(false);
      setVotingType(null);
    }
  };

  const handleComplete = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium"); // add haptic here

    onComplete(1, "complete");
  };

  const handleBonus = () => {
    // Bonus gives 2 points instead of 1

    audioService.playSound("buttonPress");
    audioService.playHaptic("medium"); // add haptic here
    onComplete(2, "bonus");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.challengeCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* SparkleEffect positioned absolutely to not block interactions */}
          <View style={styles.sparkleContainer}>
            <SparkleEffect
              visible={showSparkles}
              duration={1500}
              sparkleCount={3}
              symbols={["✨"]}
              onAnimationComplete={() => {
                setTimeout(() => setShowSparkles(false), 0);
              }}
            />
          </View>

          <Text style={styles.playerName}>{playerName}, your turn!</Text>

          <View style={styles.challengeTextContainer}>
            <Text style={styles.challengeText}>{challenge.challenge_text}</Text>
          </View>

          {!hasVoted && (
            <View style={styles.voteSection}>
              <Text style={styles.voteQuestion}>
                Did you like this challenge?
              </Text>
              <View style={styles.voteButtons}>
                <Surface
                  elevation={3}
                  style={[
                    {
                      borderRadius: 10,
                    },
                    styles.upvoteButton,
                    styles.voteButton,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      {
                        width: "100%",
                      },
                      // styles.voteButton,
                      isVoting &&
                        votingType !== "upvote" &&
                        styles.voteButtonDisabled,
                    ]}
                    onPress={() => {
                      audioService.playSound("buttonPress");
                      audioService.playHaptic("light");
                      handleVote("upvote");
                    }}
                    disabled={isVoting}
                  >
                    {isVoting && votingType === "upvote" ? (
                      <ActivityIndicator
                        color={COLORS.TEXT_PRIMARY}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.voteButtonText}>👍</Text>
                    )}
                  </TouchableOpacity>
                </Surface>
                <Surface
                  elevation={3}
                  style={[
                    {
                      borderRadius: 10,
                    },
                    styles.downvoteButton,
                    styles.voteButton,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      {
                        width: "100%",
                      },
                      isVoting &&
                        votingType !== "downvote" &&
                        styles.voteButtonDisabled,
                    ]}
                    onPress={() => {
                      audioService.playSound("buttonPress");
                      audioService.playHaptic("light");
                      handleVote("downvote");
                    }}
                    disabled={isVoting}
                  >
                    {isVoting && votingType === "downvote" ? (
                      <ActivityIndicator
                        color={COLORS.TEXT_PRIMARY}
                        size="small"
                      />
                    ) : (
                      <Text style={styles.voteButtonText}>👎</Text>
                    )}
                  </TouchableOpacity>
                </Surface>
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <Surface
              elevation={3}
              style={{
                borderRadius: 10,
              }}
            >
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Button
                  text="Complete Challenge +1"
                  onPress={handleComplete}
                  backgroundColor={COLORS.DARK_GREEN}
                  textColor={COLORS.TEXT_PRIMARY}
                  fontSize={SIZES.BODY}
                  fontWeight="600"
                  shadowIntensity={5}
                  shadowRadius={10}
                  paddingHorizontal={SIZES.PADDING_MEDIUM}
                  paddingVertical={SIZES.PADDING_MEDIUM}
                  style={styles.actionButton}
                  onPressIn={() => {
                    Animated.timing(buttonScale, {
                      toValue: ANIMATION_VALUES.SCALE_SMALL,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.timing(buttonScale, {
                      toValue: ANIMATION_VALUES.SCALE_NORMAL,
                      duration: 100,
                      useNativeDriver: true,
                    }).start();
                  }}
                />
              </Animated.View>
            </Surface>
            <Surface
              elevation={3}
              style={{
                borderRadius: 10,
              }}
            >
              <Button
                text="Pass (-1 point)"
                onPress={() => {
                  audioService.playSound("passChallenge");
                  audioService.playHaptic("medium");
                  onPass();
                }}
                backgroundColor={COLORS.OFFLINE}
                textColor={COLORS.TEXT_PRIMARY}
                fontSize={SIZES.BODY}
                fontWeight="600"
                // shadowIntensity={5}
                // shadowRadius={10}
                paddingHorizontal={SIZES.PADDING_MEDIUM}
                paddingVertical={SIZES.PADDING_MEDIUM}
                style={styles.actionButton}
              />
            </Surface>

            {challenge.has_bonus && (
              <Surface
                elevation={3}
                style={{
                  borderRadius: 10,
                }}
              >
                <Button
                  text="Bonus +2"
                  onPress={handleBonus}
                  backgroundColor={COLORS.YELLOW}
                  textColor={COLORS.TEXT_PRIMARY}
                  fontSize={SIZES.BODY}
                  fontWeight="600"
                  shadowIntensity={5}
                  shadowRadius={10}
                  paddingHorizontal={SIZES.PADDING_MEDIUM}
                  paddingVertical={SIZES.PADDING_MEDIUM}
                  style={styles.actionButton}
                />
              </Surface>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: "rgba(244, 236, 236, 0.77)",
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SIZES.PADDING_MEDIUM,
    paddingHorizontal: SIZES.PADDING_LARGE,
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    maxWidth: 450,
    width: "100%",
    alignItems: "center",
    ...SIZES.SHADOW_CARD,
  },
  playerName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: "bold",
    color: COLORS.DARK_GREEN,
    fontFamily: FONTS.DOSIS_BOLD,
    marginBottom: SIZES.PADDING_SMALL,
    textAlign: "center",
  },
  challengeTextContainer: {
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    width: "100%",
  },
  challengeText: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    lineHeight: 22,
    textAlign: "center",
  },
  voteSection: {
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
  },
  voteQuestion: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  voteButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  voteButton: {
    marginHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  voteButtonDisabled: {
    opacity: 0.5,
  },
  upvoteButton: {
    backgroundColor: COLORS.DARK_GREEN,
  },
  downvoteButton: {
    backgroundColor: COLORS.OFFLINE,
  },
  voteButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.BODY,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButtons: {
    width: "100%",
    gap: SIZES.PADDING_SMALL,
  },
  actionButton: {
    width: "100%",
  },
  sparkleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1, // Ensure it's behind other content
  },
});
