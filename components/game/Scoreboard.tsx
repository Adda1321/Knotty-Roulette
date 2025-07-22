import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scoreboard:</Text>
      
      <View style={styles.playersContainer}>
        {sortedPlayers.map((player, index) => (
          <View
            key={player.id}
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
            {index === 0 && player.points > 0 && (
              <Text style={styles.leaderBadge}>👑</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.LIGHT_GREEN,
    borderRadius: SIZES.BORDER_RADIUS_LARGE,
    padding: SIZES.PADDING_MEDIUM,
    margin: SIZES.PADDING_MEDIUM,
    ...SIZES.SHADOW_SMALL,
  },
  title: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
    marginBottom: SIZES.PADDING_MEDIUM,
  },
  playersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SIZES.PADDING_SMALL,
  },
  playerCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    padding: SIZES.PADDING_MEDIUM,
    minWidth: 100,
    alignItems: 'center',
    ...SIZES.SHADOW_SMALL,
  },
  currentPlayerCard: {
    backgroundColor: COLORS.DARK_GREEN,
    borderWidth: 2,
    borderColor: COLORS.YELLOW,
  },
  playerName: {
    fontSize: SIZES.CAPTION,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
    marginBottom: SIZES.PADDING_SMALL,
  },
  currentPlayerName: {
    color: COLORS.TEXT_PRIMARY,
  },
  playerScore: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.DARK_GREEN,
    fontFamily: FONTS.PRIMARY,
  },
  currentPlayerScore: {
    color: COLORS.YELLOW,
  },
  leaderBadge: {
    fontSize: 14,
    marginTop: 3,
  },
});