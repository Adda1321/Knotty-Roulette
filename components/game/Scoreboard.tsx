import React, { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SIZES, THEME_PACKS } from "../../constants/theme"; // Fixed import
import { useTheme } from "../../contexts/ThemeContext";
import { Player } from "../../types/game";

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function Scoreboard({
  players,
  currentPlayerIndex,
}: ScoreboardProps) {
  const { COLORS, currentTheme } = useTheme();

  // Debug logging
  console.log("🎨 GameBoard: Current theme:", currentTheme);

  // Monitor theme changes
  useEffect(() => {
    console.log("🎨 GameBoard: Theme changed to:", currentTheme);
  }, [currentTheme]);
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  const renderPlayerCard = ({
    item: player,
    index,
  }: {
    item: Player;
    index: number;
  }) => (
    <View
      style={[
        styles.playerCard,
        player.id === currentPlayerIndex && {
          backgroundColor: COLORS.PRIMARY,
          borderWidth: 2,
          borderColor: COLORS.YELLOW,
        },
      ]}
    >
      <Text
        style={[
          styles.playerName,
          player.id === currentPlayerIndex && styles.currentPlayerName,
          // {backgroundColor:COLORS.LIGHTEST}
        ]}
      >
        {player.name}
        {player.id === currentPlayerIndex && " (Current)"}
      </Text>
      <Text
        style={[
          styles.playerScore,
          { color: COLORS.PRIMARY },
          player.id === currentPlayerIndex && styles.currentPlayerScore,
        ]}
      >
        {player.points}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            currentTheme === THEME_PACKS.COUPLE
              ? COLORS.GAMEBOARDPRIMARY
              : COLORS.SCOREBOARD,
        },
      ]}
    >
      <Text style={styles.title}>Scoreboard</Text>

      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayerCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.playersContainer,
          sortedPlayers.length <= 3 && styles.centerContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.flatList}
        bounces={false}
        alwaysBounceHorizontal={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "#5aad5d", // Darker shade of 6bc26e - more sophisticated
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_SMALL,
    marginTop: 14,
    maxHeight: 150,
    paddingVertical: 12,
    width: "100%",
    ...SIZES.SHADOW_SMALL,
  },
  title: {
    fontSize: SIZES.SUBTITLE + 4,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: "center",
    marginBottom: SIZES.PADDING_SMALL,
  },
  playersContainer: {
    paddingHorizontal: SIZES.PADDING_SMALL,
    flexGrow: 1,
    justifyContent: "center",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    width: SIZES.PADDING_SMALL,
  },
  playerCard: {
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_SMALL,
    minWidth: 80,
    maxWidth: 100,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    ...SIZES.SHADOW_SMALL,
    backgroundColor: COLORS.FIELDS,
  },
  currentPlayerCard: {
    backgroundColor: COLORS.DARK_GREEN,
    borderWidth: 2,
    borderColor: COLORS.YELLOW,
  },
  playerName: {
    fontSize: SIZES.CAPTION,
    fontWeight: "600",
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_MEDIUM,
    textAlign: "center",
    marginBottom: 2,
  },
  currentPlayerName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.CAPTION,
  },
  playerScore: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: "bold",
    // color: COLORS.DARK_GREEN,
    fontFamily: FONTS.DOSIS_MEDIUM,
  },
  currentPlayerScore: {
    color: COLORS.YELLOW,
  },
  flatList: {
    width: "100%",
  },
});
