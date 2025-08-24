import React, { useEffect } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme"; // Fixed import
import { useTheme } from "../../contexts/ThemeContext";
import audioService from "../../services/audio";
import Button from "../ui/Button";
interface GameRulesProps {
  visible: boolean;
  onClose: () => void;
}

export default function GameRules({ visible, onClose }: GameRulesProps) {
  const rules = [
    {
      number: 1,
      text: "Grab a Knotty Times.",
    },
    {
      number: 2,
      text: "Round up at least 2 players - The more, the knotty-er.😏",
    },
    {
      number: 3,
      text: 'Tap "Spin" - The wheel decides your fate!',
    },
    {
      number: 4,
      text: "Complete the challenge - It might be fun... or a little knotty. 😈",
      subtext: "Chicken out? Finish your drink and lose 1 point!",
    },
    {
      number: 5,
      text: "Earn points",
      subtext:
        '• Complete the action = 1 point\n• If the action has a "Bonus" challenge, nail it for 2 points!\n• First player to 11 points wins!',
    },
    {
      number: 6,
      text: "Pass the phone - Next player spins, and the game rolls on!",
    },
  ];
  const { COLORS, currentTheme } = useTheme();
  
  // Debug logging
  console.log("🎨 GameBoard: Current theme:", currentTheme);
  
  // Monitor theme changes
  useEffect(() => {
    console.log("🎨 GameBoard: Theme changed to:", currentTheme);
  }, [currentTheme]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header,{backgroundColor:COLORS.PRIMARY}]}>
            <Text style={styles.title}>Knotty Roulette</Text>
            <Text style={styles.subtitle}>(Party Game)</Text>
          </View>

          {/* Rules Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {rules.map((rule, index) => (
              <View key={index} style={styles.ruleContainer}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>{rule.number}</Text>
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleText}>{rule.text}</Text>
                  {rule.subtext && (
                    <Text style={styles.ruleSubtext}>{rule.subtext}</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Close Button */}
          <Button
            text="Got it!"
            onPress={() => {
              audioService.playSound("buttonPress");
              audioService.playHaptic("light");
              onClose();
            }}
            backgroundColor={COLORS.YELLOW}
            textColor={COLORS.TEXT_DARK}
            fontSize={SIZES.SUBTITLE}
            // fontWeight="bold"
            fontFamily={FONTS.DOSIS_BOLD}
            style={styles.closeButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: COLORS.FIELDS,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    margin: SIZES.PADDING_MEDIUM,
    maxHeight: Platform.OS === "ios" ? "80%" : "90%",
    width: "90%",
    maxWidth: 400,
    height: "100%",
    ...SIZES.SHADOW_LARGE,
  },
  header: {
    // backgroundColor: COLORS.DARK_GREEN,
    borderTopLeftRadius: SIZES.BORDER_RADIUS_LARGE,
    borderTopRightRadius: SIZES.BORDER_RADIUS_LARGE,
    alignItems: "center",
    padding: SIZES.PADDING_LARGE,
  },
  title: {
    fontSize: 30,
    color: COLORS.YELLOW,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  subtitle: {
    fontSize: SIZES.SUBTITLE,
    color: COLORS.TEXT_PRIMARY,
    fontFamily: FONTS.PRIMARY,
    fontStyle: "italic",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.FIELDS,
    padding: SIZES.PADDING_LARGE,
  },
  ruleContainer: {
    flexDirection: "row",
    marginBottom: SIZES.PADDING_LARGE,
    alignItems: "flex-start",
  },
  ruleNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.YELLOW,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.PADDING_MEDIUM,
    ...SIZES.SHADOW_SMALL,
  },
  ruleNumberText: {
    fontSize: SIZES.CAPTION,
    fontWeight: "bold",
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
  },
  ruleContent: {
    flex: 1,
  },
  ruleText: {
    fontSize: SIZES.CAPTION,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    lineHeight: 22,
    marginBottom: SIZES.PADDING_SMALL,
  },
  ruleSubtext: {
    fontSize: SIZES.CAPTION,
    color: "#666",
    fontFamily: FONTS.PRIMARY,
    fontStyle: "italic",
    lineHeight: 18,
  },
  closeButton: {
    margin: SIZES.PADDING_SMALL,
    marginBottom: 14,
  },
});
