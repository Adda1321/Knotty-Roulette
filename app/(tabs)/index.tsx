import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import GameBoard from '../../components/game/GameBoard';
import PlayerSetup from '../../components/game/PlayerSetup';
import CustomModal from '../../components/ui/CustomModal';
import Loader from '../../components/ui/Loader';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import adService from '../../services/adService';
import { fetchChallenges } from '../../services/api';
import audioService from '../../services/audio';
import userService from '../../services/userService';
import { Challenge, GameState, Player } from '../../types/game';

export default function HomeScreen() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize user service first
      await userService.initialize();
      
      // Initialize ad service (depends on user service)
      await adService.initialize();
      
      // Load challenges
      await loadChallenges();
    } catch (error) {
      console.error('Error initializing services:', error);
      // Still try to load challenges even if services fail
      await loadChallenges();
    }
  };

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const fetchedChallenges = await fetchChallenges();
      setChallenges(fetchedChallenges);
      setIsOnline(true); // Success means we're online
    } catch (error) {
      console.error('Error loading challenges:', error);
      setIsOnline(false); // Error means we're offline
      // Don't show alert, just use fallback challenges
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = (playerNames: string[]) => {
    console.log('Received player names:', playerNames);
    const newPlayers = playerNames.map((name, index) => ({
      id: index,
      name,
      points: 0,
    }));
    console.log('Created players:', newPlayers);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState('playing');
    
    // Reset ad service spin counter for new game
    adService.resetSpinCounter();
  };

  const resetGame = () => {
    setGameState('setup');
    setPlayers([]);
    setCurrentPlayerIndex(0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader />
        <Toast />
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
          isOnline={isOnline}
          onPlayerTurnComplete={(playerIndex, points) => {
            const updatedPlayers = [...players];
            updatedPlayers[playerIndex].points += points;
            setPlayers(updatedPlayers);
            
            // Check for winner (first to 10 points)
            if (updatedPlayers[playerIndex].points >= 10) {
              // Play game over sound and haptic
              audioService.playSound('gameOver');
              audioService.playHaptic('success');
              
              setGameState('gameOver');
              setWinner(updatedPlayers[playerIndex]);
              setShowGameOverModal(true);
            } else {
              // Move to next player
              setCurrentPlayerIndex((playerIndex + 1) % players.length);
            }
          }}
          onResetGame={resetGame}
        />
      )}

      {/* Game Over Modal */}
      <CustomModal
        visible={showGameOverModal}
        onClose={() => {
          setShowGameOverModal(false);
          resetGame();
        }}
        title="Game Over!"
        message={winner ? `${winner.name} wins with ${winner.points} points!` : ''}
        showCloseButton={true}
        closeButtonText="New Game"
        showConfirmButton={false}
        showSparkles={true}
      />
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_DARK,
    padding:0,
    margin: 0,
  },
  loadingText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.PRIMARY,
  },
});
