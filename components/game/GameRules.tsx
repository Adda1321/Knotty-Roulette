import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface GameRulesProps {
  visible: boolean;
  onClose: () => void;
}

export default function GameRules({ visible, onClose }: GameRulesProps) {
  const rules = [
    {
      number: 1,
      text: "Grab a Knotty Times - No drink? no play.",
    },
    {
      number: 2,
      text: "Round up at least 2 players - The more, the knotty-er. 😏",
    },
    {
      number: 3,
      text: "Tap \"Spin\" - The wheel decides your fate!",
    },
    {
      number: 4,
      text: "Complete the challenge - It might be fun... or a little knotty. 😈",
      subtext: "Chicken out? Finish your drink and lose 1 point!",
    },
    {
      number: 5,
      text: "Earn points",
      subtext: "• Complete the action = 1 point\n• If the action has a \"Bonus\" challenge, nail it for 2 points!\n• First player to 11 points wins!",
    },
    {
      number: 6,
      text: "Pass the phone - Next player spins, and the game rolls on!",
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Knotty Roulette</Text>
            <Text style={styles.subtitle}>(Party Game)</Text>
          </View>

          {/* Rules Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {rules.map((rule, index) => (
              <View key={index} style={styles.ruleContainer}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>{rule.number}</Text>
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleText}>{rule.text}</Text>
                  {rule.subtext && (
                    <Text style={styles.ruleSubtext}>{rule.subtext}</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  header: {
    backgroundColor: '#00cc00',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffcc00',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ffcc00',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  ruleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  ruleNumber: {
    backgroundColor: '#ffcc00',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  ruleNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  ruleContent: {
    flex: 1,
  },
  ruleText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 5,
  },
  ruleSubtext: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#ffcc00',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
}); 