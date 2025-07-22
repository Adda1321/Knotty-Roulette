import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Player } from '../../types/game';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
}

export default function Scoreboard({ players, currentPlayerIndex }: ScoreboardProps) {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scoreboard</Text>
      
      <ScrollView 
        style={styles.playerList}
        showsVerticalScrollIndicator={false}
        horizontal
      >
        {sortedPlayers.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.playerCard,
              player.id === currentPlayerIndex && styles.currentPlayerCard,
            ]}
          >
            <Text style={styles.playerName}>
              {player.name}
              {player.id === currentPlayerIndex && ' (Current)'}
            </Text>
            <Text style={styles.playerScore}>{player.points}</Text>
            {index === 0 && player.points > 0 && (
              <Text style={styles.leaderBadge}>👑</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
    marginBottom: 10,
  },
  playerList: {
    flexDirection: 'row',
  },
  playerCard: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentPlayerCard: {
    borderColor: '#ffcc00',
    backgroundColor: '#444',
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  playerScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffcc00',
  },
  leaderBadge: {
    fontSize: 16,
    marginTop: 5,
  },
}); 