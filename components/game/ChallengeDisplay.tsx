import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";
import {
  ANIMATION_CONFIGS,
  ANIMATION_VALUES,
} from "../../constants/animations";
import { FONTS, SIZES, THEME_PACKS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { logVote } from "../../services/api";
import audioService from "../../services/audio";
import { Challenge } from "../../types/game";
import Button from "../ui/Button";
import CustomModal from "../ui/CustomModal";
import SparkleEffect from "../ui/SparkleEffect";

interface ChallengeDisplayProps {
  challenge: Challenge;
  playerName: string;
  onComplete: (points: number, action: "complete" | "pass" | "bonus") => void;
}

export default function ChallengeDisplay({
  challenge,
  playerName,
  onComplete,
}: ChallengeDisplayProps) {
  // Debug logging for challenge display

  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [votingType, setVotingType] = useState<"upvote" | "downvote" | null>(
    null
  );

  // Modal state management
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "info">(
    "info"
  );

  const { COLORS, currentTheme } = useTheme();

  // Animation values
  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Sparkle effect state
  const [showSparkles, setShowSparkles] = useState(false);

  // Helper function to show modal
  const showModalMessage = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    audioService.playHaptic("medium");
    audioService.playSound("buttonPress");
    setShowModal(false);
  };

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
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    setVotingType(voteType);

    try {
      const voteResponse = await logVote({
        challengeId: challenge.id,
        challengeText: challenge.challenge_text,
        playerName,
        voteType,
      });

      setHasVoted(true);

      // Handle the response based on the documented API behavior
      if (voteResponse.already_voted) {
        // User already voted on this challenge - show appropriate message
        showModalMessage(
          "Already Voted",
          "You've already voted on this challenge",
          "info"
        );
        audioService.playSound("passChallenge");
      } else {
        // New vote submitted successfully
        showModalMessage(
          "Vote Submitted!",
          "You just made Knotty Times even better - thanks for your input!",
          "success"
        );
        audioService.playSound("challengeComplete");
      }
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

  const handleOnPass = () => {
    audioService.playSound("buttonPress");
    audioService.playHaptic("medium"); // add haptic here
    onComplete(-1, "pass");
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
              backgroundColor: COLORS.FIELDS,
              borderColor:
                currentTheme === THEME_PACKS.DEFAULT
                  ? "#2B7B33"
                  : COLORS.YELLOW,
            },
          ]}
        >
          <View
            style={[
              styles.playerContainer,
              {
                backgroundColor: COLORS.PRIMARY,
              },
            ]}
          >
            <View>
              <Text style={[styles.playerName, { color: COLORS.YELLOW }]}>
                {playerName},
              </Text>
              <Text
                style={[
                  styles.turnText,
                  {
                    color: COLORS.YELLOW,
                  },
                ]}
              >
                YOUR TURN
              </Text>
            </View>
            <View style={styles.mascotContainer}>
              <Image
                source={require("../../assets/images/MascotImages/Default/Knotty-Mascot-no-legs-thumbsup.png")}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>
          </View>
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
          <View
            style={{
              padding: 20, // Equal padding on all sides
              borderRadius: 8,
            }}
          >
            <View style={styles.challengeTextContainer}>
              <Text
                style={[
                  styles.challengeText,
                  {
                    color: COLORS.TEXT_DARK,
                  },
                ]}
              >
                {challenge.challenge_text}
              </Text>
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
                      {
                        backgroundColor: COLORS.ONLINE,
                        borderColor: COLORS.PRIMARY,
                      },
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
                        <Text
                          style={[
                            styles.voteButtonText,
                            {
                              color: COLORS.TEXT_PRIMARY,
                            },
                          ]}
                        >
                          👍
                        </Text>
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
                      {
                        backgroundColor:
                          currentTheme === THEME_PACKS.COUPLE
                            ? COLORS.LIGHT
                            : "#EE562B",
                      },
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
            <View>
              <View style={styles.actionButtons}>
                <Surface
                  elevation={3}
                  style={{
                    borderRadius: 11,
                    borderWidth: 3, // Add border width
                    borderColor:
                      currentTheme === THEME_PACKS.DEFAULT
                        ? "#18752A"
                        : COLORS.PRIMARY,
                    overflow: "hidden", // Ensures border radius clips content
                  }}
                >
                  <Animated.View
                    style={{ transform: [{ scale: buttonScale }] }}
                  >
                    <Button
                      text="COMPLETE CHALLENGE +1" // Uppercase to match image
                      onPress={handleComplete}
                      backgroundColor={
                        currentTheme === THEME_PACKS.DEFAULT
                          ? "#3A983D"
                          : COLORS.ONLINE
                      }
                      textColor={COLORS.YELLOW}
                      fontSize={SIZES.SUBTITLE}
                      fontFamily={FONTS.DOSIS_BOLD}
                      // fontWeight="800" // Bolder to match image
                      // shadowIntensity={5}
                      // shadowRadius={10}
                      paddingHorizontal={SIZES.PADDING_MEDIUM}
                      paddingVertical={SIZES.PADDING_MEDIUM}
                      style={[styles.actionButton]}
                    />
                  </Animated.View>
                </Surface>
                <Surface
                  elevation={3}
                  style={{
                    borderRadius: 11,
                    borderWidth: 3, // Add border width
                    borderColor: "#DC4016", // Dark green border color
                    overflow: "hidden", // Ensures border radius clips content
                  }}
                >
                  <Button
                    text="Pass (-1 point)"
                    onPress={handleOnPass}
                    backgroundColor={
                      currentTheme === THEME_PACKS.COUPLE
                        ? COLORS.LIGHT
                        : "#EE562B"
                    }
                    textColor={COLORS.YELLOW}
                    fontSize={SIZES.SUBTITLE}
                    fontFamily={FONTS.DOSIS_BOLD}
                    // fontWeight="800"
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
                      borderWidth: 3, // Add border width
                      borderColor: "#DDA100", // Dark green border color
                      overflow: "hidden", // Ensures border radius clips content
                    }}
                  >
                    <Button
                      text="Bonus +2"
                      onPress={handleBonus}
                      backgroundColor={COLORS.YELLOW}
                      textColor={COLORS.TEXT_DARK}
                      fontFamily={FONTS.DOSIS_BOLD}
                      fontSize={SIZES.SUBTITLE}
                      // fontWeight="600"
                      shadowIntensity={5}
                      shadowRadius={10}
                      paddingHorizontal={SIZES.PADDING_MEDIUM}
                      paddingVertical={SIZES.PADDING_MEDIUM}
                      style={styles.actionButton}
                    />
                  </Surface>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Custom Modal for notifications */}
      <CustomModal
        visible={showModal}
        onClose={handleModalClose}
        title={modalTitle}
        message={modalMessage}
        showCloseButton={true}
        closeButtonText="OK"
        showSparkles={modalType === "success"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -65, // push beyond top
    left: -10, // push beyond left
    right: -10, // push beyond right
    bottom: -35, // push beyond bottom
    // backgroundColor: COLORS.BACKGROUND_DARK,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    zIndex: 9999,
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
    borderColor: "#2B7B33",
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    borderWidth: 3,
    maxWidth: 450,
    width: "100%",
    padding: 0,
    alignItems: "center",
    overflow: "hidden", // Ensure content doesn't overflow borders
    // ...SIZES.SHADOW_CARD,
  },
  playerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE - 3, // Account for border width
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE - 3, // Account for border width
    paddingVertical: 5,
    paddingLeft: 20,
    width: "100%",
    marginTop: -3, // Pull up to cover the border gap
    marginLeft: -3, // Pull left to cover the border gap
    marginRight: -3, // Pull right to cover the border gap
  },
  playerName: {
    fontSize: SIZES.EXTRALARGE,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "left",
    textShadowColor: "#06540fff", // Border color
    textShadowOffset: { width: 1, height: 1 }, // Border thickness
    textShadowRadius: 0, // Sharp border
    includeFontPadding: false, // Tighter text layout
  },
  turnText: {
    fontSize: SIZES.TITLE + 4,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "left",
    letterSpacing: 1,
    textShadowColor: "#06540fff", // Border color
    textShadowOffset: { width: 1, height: 1 }, // Border thickness
    textShadowRadius: 0, // Sharp border
    marginTop: -4, // Brings lines closer
    includeFontPadding: false,
    elevation: 5,
  },
  challengeTextContainer: {
    backgroundColor: "#F4C614",
    borderRadius: 15,
    borderColor: "#DDA100",
    padding: 15,
    marginBottom: 15,
    marginTop: 15,
    borderWidth: 2,
    width: "100%",
  },
  challengeText: {
    fontSize: SIZES.BODY,
    fontFamily: FONTS.DOSIS_BOLD,
    lineHeight: 22,
    textAlign: "center",
  },
  voteSection: {
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
  },
  voteQuestion: {
    fontSize: SIZES.BODY,
    color: "#504f4fff",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: FONTS.DOSIS_BOLD,
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
    borderColor: "#18752A",
    borderWidth: 2,
  },
  downvoteButton: {
    // backgroundColor: COLORS.OFFLINE,
    borderColor: "#DC4016",
    borderWidth: 2,
  },
  voteButtonText: {
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
    top: 10,
    bottom: 0,
    left: 0,
    width: "6%", // only cover left 6% of container
    zIndex: 1,
  },
  mascotContainer: {
    // position: "absolute",
    alignSelf: "flex-end",
    // top: -30, // This will right-align the container
    // right: 10,
    marginRight: Platform.OS === "ios" ? -10 : -10,
  },

  mascotImage: {
    width: 150,
    height: 120,
    zIndex: 1,
    transform: [{ rotate: "5deg" }],
    // backgroundColor:"red"
  },
});
