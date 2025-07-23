import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import { ANIMATION_CONFIGS, ANIMATION_VALUES } from "../../constants/animations";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import { logVote } from "../../services/api";
import { Challenge } from "../../types/game";
import SparkleEffect from "../ui/SparkleEffect";

interface ChallengeDisplayProps {
  challenge: Challenge;
  playerName: string;
  onComplete: () => void;
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
    Animated.sequence([
      Animated.timing(cardOpacity, {
        toValue: ANIMATION_VALUES.OPACITY_VISIBLE,
        ...ANIMATION_CONFIGS.FADE_IN,
      }),
      Animated.timing(cardScale, {
        toValue: ANIMATION_VALUES.SCALE_NORMAL,
        ...ANIMATION_CONFIGS.SCALE_IN,
      }),
    ]).start(() => {
      // Trigger sparkle effect after card animation completes
      setShowSparkles(true);
    });
  }, [cardOpacity, cardScale]);

  const handleVote = async (voteType: "upvote" | "downvote") => {
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

      // Show error notification
      Toast.show({
        type: "error",
        text1: "Vote Failed",
        text2: "Unable to submit your vote",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setIsVoting(false);
      setVotingType(null);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleBonus = () => {
    // Bonus gives 2 points instead of 1
    onComplete();
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
          {/* Reusable SparkleEffect component */}
          <SparkleEffect
            visible={showSparkles}
            duration={1500}
            sparkleCount={3}
            symbols={['✨']}
            onAnimationComplete={() => setShowSparkles(false)}
          />

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
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    styles.upvoteButton,
                    isVoting &&
                      votingType !== "upvote" &&
                      styles.voteButtonDisabled,
                  ]}
                  onPress={() => handleVote("upvote")}
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
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    styles.downvoteButton,
                    isVoting &&
                      votingType !== "downvote" &&
                      styles.voteButtonDisabled,
                  ]}
                  onPress={() => handleVote("downvote")}
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
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleComplete}
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
              >
                <Text style={styles.actionButtonText}>Complete Challenge +1</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={onPass}
            >
              <Text style={styles.actionButtonText}>Pass (-1 point)</Text>
            </TouchableOpacity>

            {challenge.has_bonus && (
              <TouchableOpacity
                style={[styles.actionButton, styles.bonusButton]}
                onPress={handleBonus}
              >
                <Text style={styles.actionButtonText}>Bonus +2</Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(225, 225, 225, 0.84)",
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
    fontFamily: FONTS.PRIMARY,
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
    flex: 1,
    marginHorizontal: SIZES.PADDING_SMALL,
    paddingVertical: SIZES.PADDING_SMALL,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    justifyContent: "center",
    alignItems: "center",
    ...SIZES.SHADOW_SMALL,
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
    paddingVertical: SIZES.PADDING_MEDIUM,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    justifyContent: "center",
    alignItems: "center",
    ...SIZES.SHADOW_SMALL,
  },
  completeButton: {
    backgroundColor: COLORS.DARK_GREEN,
  },
  passButton: {
    backgroundColor: COLORS.OFFLINE,
  },
  bonusButton: {
    backgroundColor: COLORS.DARK_GREEN,
  },
  actionButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.BODY,
    fontFamily: FONTS.PRIMARY,
    fontWeight: "600",
    textAlign: "center",
  },
});
