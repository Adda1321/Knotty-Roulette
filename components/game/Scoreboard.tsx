import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
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
      
      <View style={styles.playerList}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  playerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  playerCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffcc00',
  },
  leaderBadge: {
    fontSize: 14,
    marginTop: 3,
  },
}); 