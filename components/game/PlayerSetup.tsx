import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface PlayerSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [players, setPlayers] = useState<string[]>(['', '']); // Default two empty players
  const [playerName, setPlayerName] = useState('');

  const addPlayer = () => {
    if (players.length < 8) {
      setPlayers([...players, '']); // Add empty player field
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) { // Prevent removing below minimum 2 players
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

    onStartGame(validPlayers);
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Text style={styles.title}>KNOTTY ROULETTE</Text>
            <Text style={styles.subtitle}>Add Players to Begin</Text>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.playerList}>
              {players.map((player, index) => (
                <View key={index}>
                  <View style={styles.playerInputContainer}>
                    <TextInput
                      style={styles.playerInput}
                      placeholder={`Player ${index + 1}`}
                      placeholderTextColor="#a1a1a1"
                      value={player}
                      onChangeText={(text) => updatePlayer(index, text)}
                      maxLength={20}
                      selectionColor="#e94560"
                    />
                    {/* Show remove button only when more than minimum players */}
                    {players.length > 2 && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removePlayer(index)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Add Player button after each field when under max */}
                  {index === players.length - 1 && players.length < 8 && (
                    <TouchableOpacity
                      style={styles.addPlayerButton}
                      onPress={addPlayer}
                    >
                      <Text style={styles.addPlayerButtonText}>+ Add Player</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.tagline}>A Little Knotty, All Fun</Text>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  players.filter(p => p.trim()).length < 2 && styles.startButtonDisabled
                ]}
                onPress={startGame}
                disabled={players.filter(p => p.trim()).length < 2}
              >
                <Text style={styles.startButtonText}>START GAME</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.DARK_GREEN,
    padding: SIZES.PADDING_MEDIUM,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.PADDING_XLARGE,
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.YELLOW,
    fontFamily: FONTS.PRIMARY,
    marginBottom: SIZES.PADDING_SMALL,
    marginTop: SIZES.PADDING_LARGE,
    
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: FONTS.PRIMARY,
    textAlign: 'center',
    marginBottom: SIZES.PADDING_LARGE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
  },
  playerList: {
    marginBottom: 20,
  },
  playerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    ...SIZES.SHADOW_SMALL,
  },
  playerInput: {
    flex: 1,
    fontSize: SIZES.BODY,
    color: COLORS.TEXT_DARK,
    paddingVertical: 12,
    fontFamily: FONTS.PRIMARY,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.OFFLINE,
  },
  removeButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
  },
  addPlayerButton: {
    backgroundColor: COLORS.DARK_GREEN,
    paddingVertical: 10,
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.DARK_GREEN,
    ...SIZES.SHADOW_SMALL,
  },
  addPlayerButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.BODY,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  tagline: {
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: COLORS.YELLOW,
    paddingVertical: SIZES.PADDING_LARGE,
    borderRadius: SIZES.BORDER_RADIUS_MEDIUM,
    marginTop: SIZES.PADDING_LARGE,
    ...SIZES.SHADOW_MEDIUM,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: COLORS.TEXT_DARK,
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.PRIMARY,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});