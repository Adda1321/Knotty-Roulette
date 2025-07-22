import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [players, setPlayers] = useState<string[]>(['']);
  const [playerName, setPlayerName] = useState('');

  const addPlayer = () => {
    if (playerName.trim()) {
      setPlayers([...players, playerName.trim()]);
      setPlayerName('');
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const startGame = () => {
    const validPlayers = players.filter(name => name.trim());
    
    if (validPlayers.length < 2) {
      Alert.alert('Not Enough Players', 'You need at least 2 players to start the game.');
      return;
    }

    if (validPlayers.length > 8) {
      Alert.alert('Too Many Players', 'Maximum 8 players allowed.');
      return;
    }

    console.log('Starting game with players:', validPlayers);
    onStartGame(validPlayers);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knotty Roulette</Text>
        <Text style={styles.subtitle}>Add Players to Start</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.playerList}>
          {players.map((player, index) => (
            <View key={index} style={styles.playerInputContainer}>
              <TextInput
                style={styles.playerInput}
                placeholder={`Player ${index + 1} Name`}
                placeholderTextColor="#666"
                value={player}
                onChangeText={(text) => updatePlayer(index, text)}
                maxLength={20}
              />
              {players.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePlayer(index)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.addPlayerContainer}>
          <TextInput
            style={styles.addPlayerInput}
            placeholder="Add another player..."
            placeholderTextColor="#666"
            value={playerName}
            onChangeText={setPlayerName}
            onSubmitEditing={addPlayer}
            maxLength={20}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addPlayer}
            disabled={!playerName.trim() || players.length >= 8}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.startButton,
            players.filter(p => p.trim()).length < 2 && styles.startButtonDisabled
          ]}
          onPress={startGame}
          disabled={players.filter(p => p.trim()).length < 2}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  playerList: {
    marginBottom: 20,
  },
  playerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  playerInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    marginRight: 10,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  addPlayerInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#00cc00',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#ffcc00',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  startButtonDisabled: {
    backgroundColor: '#666',
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 