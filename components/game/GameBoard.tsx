import React, { useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Challenge, Player } from '../../types/game';
import ChallengeDisplay from './ChallengeDisplay';
import RouletteWheel from './RouletteWheel';
import Scoreboard from './Scoreboard';

interface GameBoardProps {
  players: Player[];
  challenges: Challenge[];
  currentPlayerIndex: number;
  isOnline: boolean;
  onPlayerTurnComplete: (playerIndex: number, points: number) => void;
  onResetGame: () => void;
}

const { width } = Dimensions.get('window');

export default function GameBoard({
  players,
  challenges,
  currentPlayerIndex,
  isOnline,
  onPlayerTurnComplete,
  onResetGame,
}: GameBoardProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [recentChallenges, setRecentChallenges] = useState<number[]>([]);
  const wheelRef = useRef<any>(null);

  const getNonRepeatingChallenge = (): Challenge => {
    const availableChallenges = challenges.filter(
      challenge => !recentChallenges.includes(challenge.id)
    );

    if (availableChallenges.length === 0) {
      // Reset if all challenges have been used
      setRecentChallenges([]);
      return challenges[Math.floor(Math.random() * challenges.length)];
    }

    const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    
    // Update recent challenges
    const newRecentChallenges = [...recentChallenges, randomChallenge.id];
    if (newRecentChallenges.length > 5) {
      newRecentChallenges.shift();
    }
    setRecentChallenges(newRecentChallenges);

    return randomChallenge;
  };

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowChallenge(false);
    setCurrentChallenge(null);

    // Spin the wheel
    if (wheelRef.current) {
      wheelRef.current.spin(() => {
        // Wheel finished spinning, show challenge
        const challenge = getNonRepeatingChallenge();
        setCurrentChallenge(challenge);
        setShowChallenge(true);
        setIsSpinning(false);
      });
    }
  };

  const completeChallenge = (points: number) => {
    setShowChallenge(false);
    onPlayerTurnComplete(currentPlayerIndex, points);
  };

  const passChallenge = () => {
    Alert.alert(
      'Pass Challenge',
      'Are you sure you want to pass? You will lose 1 point.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pass', style: 'destructive', onPress: () => completeChallenge(-1) },
      ]
    );
  };

  const attemptBonus = () => {
    if (currentChallenge?.has_bonus) {
      Alert.alert(
        'Bonus Challenge',
        'Attempt the bonus challenge for an extra point!',
        [
          { text: 'Skip Bonus', onPress: () => completeChallenge(1) },
          { text: 'Attempt Bonus', onPress: () => completeChallenge(2) },
        ]
      );
    } else {
      completeChallenge(1);
    }
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Online/Offline Status Indicator */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]}>
          <Text style={styles.statusText}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>
        <Text style={styles.statusSubtext}>
          {isOnline ? 'Connected to Knotty Times' : 'Using offline challenges'}
        </Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Knotty Roulette</Text>
        <Text style={styles.currentPlayer}>
          {currentPlayer.name}'s Turn
        </Text>
      </View>

      <View style={styles.gameArea}>
        <RouletteWheel
          ref={wheelRef}
          isSpinning={isSpinning}
          style={styles.wheel}
        />

        {showChallenge && currentChallenge && (
          <ChallengeDisplay
            challenge={currentChallenge}
            playerName={currentPlayer.name}
            onComplete={attemptBonus}
            onPass={passChallenge}
          />
        )}

        {!showChallenge && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
              onPress={spinWheel}
              disabled={isSpinning}
            >
              <Text style={styles.spinButtonText}>
                {isSpinning ? 'Spinning...' : 'Spin the Wheel'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Scoreboard players={players} currentPlayerIndex={currentPlayerIndex} />

      <TouchableOpacity style={styles.resetButton} onPress={onResetGame}>
        <Text style={styles.resetButtonText}>New Game</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a2a2a',
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  online: {
    backgroundColor: '#00cc00',
  },
  offline: {
    backgroundColor: '#ff4444',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusSubtext: {
    color: '#ccc',
    fontSize: 10,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
    marginBottom: 5,
  },
  currentPlayer: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  wheel: {
    width: width * 0.8,
    height: width * 0.8,
    maxWidth: 300,
    maxHeight: 300,
  },
  controls: {
    marginTop: 30,
    alignItems: 'center',
  },
  spinButton: {
    backgroundColor: '#00cc00',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
  },
  spinButtonDisabled: {
    backgroundColor: '#666',
  },
  spinButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#ffcc00',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 