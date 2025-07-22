import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { logVote } from '../../services/api';
import { Challenge } from '../../types/game';

interface ChallengeDisplayProps {
  challenge: Challenge;
  playerName: string;
  onComplete: () => void;
  onPass: () => void;
}

export default function ChallengeDisplay({
  challenge,
  playerName,
  onComplete,
  onPass,
}: ChallengeDisplayProps) {
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (hasVoted) return;

    try {
      await logVote({
        challengeId: challenge.id,
        challengeText: challenge.challenge_text,
        playerName,
        voteType,
      });
      setHasVoted(true);
      
      // Show success notification
      Toast.show({
        type: 'success',
        text1: 'Vote Submitted!',
        text2: `Your ${voteType} has been recorded`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('Error logging vote:', error);
      
      // Show error notification
      Toast.show({
        type: 'error',
        text1: 'Vote Failed',
        text2: 'Unable to submit your vote',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <View style={styles.container}>
      <View style={styles.challengeCard}>
        <Text style={styles.playerName}>{playerName}, your turn!</Text>
        
        <View style={styles.challengeTextContainer}>
          <Text style={styles.challengeText}>{challenge.challenge_text}</Text>
        </View>

        {challenge.has_bonus && (
          <View style={styles.bonusIndicator}>
            <Text style={styles.bonusText}>🎯 BONUS CHALLENGE AVAILABLE</Text>
          </View>
        )}

        {!hasVoted && (
          <View style={styles.voteSection}>
            <Text style={styles.voteQuestion}>Did you like this challenge?</Text>
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={styles.voteButton}
                onPress={() => handleVote('upvote')}
              >
                <Text style={styles.voteButtonText}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voteButton}
                onPress={() => handleVote('downvote')}
              >
                <Text style={styles.voteButtonText}>👎</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleComplete}
          >
            <Text style={styles.completeButtonText}>
              {challenge.has_bonus ? 'Complete +1' : 'Complete +1'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={onPass}
          >
            <Text style={styles.passButtonText}>Pass -1</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  challengeCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    alignItems: 'center',
    maxWidth: 350,
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffcc00',
    marginBottom: 15,
    textAlign: 'center',
  },
  challengeTextContainer: {
    backgroundColor: '#ffcc00',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    minHeight: 80,
    justifyContent: 'center',
  },
  challengeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    lineHeight: 22,
  },
  bonusIndicator: {
    backgroundColor: '#ff4444',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 15,
  },
  bonusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  voteSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  voteQuestion: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  voteButton: {
    backgroundColor: '#333',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffcc00',
  },
  voteButtonText: {
    fontSize: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#00cc00',
  },
  completeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passButton: {
    backgroundColor: '#ff4444',
  },
  passButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 