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
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Text style={styles.completeButtonText}>Complete Challenge</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.passButton}
            onPress={onPass}
          >
            <Text style={styles.passButtonText}>Pass (-1 point)</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  challengeTextContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    width: '100%',
  },
  challengeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  bonusIndicator: {
    backgroundColor: '#ffcc00',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  voteSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  voteQuestion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  voteButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 20,
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  completeButton: {
    backgroundColor: '#00cc00',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  passButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 