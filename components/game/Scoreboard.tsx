import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { Player } from '../../types/game';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function Scoreboard({ players, currentPlayerIndex }: ScoreboardProps) {
  console.log('Scoreboard received players:', players);
  console.log('Scoreboard players length:', players.length);
  
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  const renderPlayerCard = ({ item: player, index }: { item: Player; index: number }) => (
    <View
      style={[
        styles.playerCard,
        player.id === currentPlayerIndex && styles.currentPlayerCard,
      ]}
    >
      <Text style={[
        styles.playerName,
        player.id === currentPlayerIndex && styles.currentPlayerName,
      ]}>
        {player.name}
        {player.id === currentPlayerIndex && ' (Current)'}
      </Text>
      <Text style={[
        styles.playerScore,
        player.id === currentPlayerIndex && styles.currentPlayerScore,
      ]}>{player.points}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scoreboard</Text>
      
      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayerCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.playersContainer,
          sortedPlayers.length <= 3 && styles.centerContent
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
    backgroundColor: COLORS.LIGHT_GREEN,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_SMALL,
    margin: SIZES.PADDING_SMALL,
    maxHeight: 150,
    paddingVertical: SIZES.PADDING_MEDIUM,
    width: '100%',
    ...SIZES.SHADOW_SMALL,
  },
  title: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.DOSIS_BOLD,
    textAlign: 'center',
    marginBottom: SIZES.PADDING_SMALL,
  },
  playersContainer: {
    paddingHorizontal: SIZES.PADDING_SMALL,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    width: SIZES.PADDING_SMALL,
  },
  playerCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_SMALL,
    minWidth: 80,
    maxWidth: 100,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...SIZES.SHADOW_SMALL,
  },
  currentPlayerCard: {
    backgroundColor: COLORS.DARK_GREEN,
    borderWidth: 2,
    borderColor: COLORS.YELLOW,
  },
  playerName: {
    fontSize: SIZES.SMALL,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
    marginBottom: 2,
  },
  currentPlayerName: {
    color: COLORS.TEXT_PRIMARY,
  },
  playerScore: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: COLORS.DARK_GREEN,
    fontFamily: FONTS.PRIMARY,
  },
  currentPlayerScore: {
    color: COLORS.YELLOW,
  },
  flatList: {
    width: '100%',
  },
});