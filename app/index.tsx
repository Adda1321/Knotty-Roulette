import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameBoard from '../components/game/GameBoard';
import PlayerSetup from '../components/game/PlayerSetup';
import { fetchChallenges } from '../services/api';
import { Challenge, GameState, Player } from '../types/game';

export default function HomeScreen() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const fetchedChallenges = await fetchChallenges();
      setChallenges(fetchedChallenges);
    } catch (error) {
      Alert.alert('Error', 'Failed to load challenges. Please check your connection.');
      console.error('Error loading challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = (playerNames: string[]) => {
    const newPlayers = playerNames.map((name, index) => ({
      id: index,
      name,
      points: 0,
    }));
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('setup');
    setPlayers([]);
    setCurrentPlayerIndex(0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Knotty Roulette...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {gameState === 'setup' ? (
        <PlayerSetup onStartGame={startGame} />
      ) : (
        <GameBoard
          players={players}
          challenges={challenges}
          currentPlayerIndex={currentPlayerIndex}
          onPlayerTurnComplete={(playerIndex, points) => {
            const updatedPlayers = [...players];
            updatedPlayers[playerIndex].points += points;
            setPlayers(updatedPlayers);
            
            // Check for winner (first to 10 points)
            if (updatedPlayers[playerIndex].points >= 10) {
              setGameState('gameOver');
              Alert.alert(
                'Game Over!',
                `${updatedPlayers[playerIndex].name} wins with ${updatedPlayers[playerIndex].points} points!`,
                [{ text: 'New Game', onPress: resetGame }]
              );
            } else {
              // Move to next player
              setCurrentPlayerIndex((playerIndex + 1) % players.length);
            }
          }}
          onResetGame={resetGame}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat',
  },
}); 