import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';

interface ModalSparklesProps {
  visible: boolean;
  onComplete?: () => void;
  staggerDelay?: number; // Delay between each sparkle (default: 100ms)
  fadeDelay?: number; // Delay before sparkles start fading (default: 200ms)
  fadeDuration?: number; // Duration of fade out animation (default: 300ms)
  appearDuration?: number; // Duration of appear animation (default: 300ms)
}

export default function ModalSparkles({ 
  visible, 
  onComplete,
  staggerDelay = 100,
  fadeDelay = 200,
  fadeDuration = 300,
  appearDuration = 300,
}: ModalSparklesProps) {
  const [sparkleAnimations, setSparkleAnimations] = useState<Animated.Value[]>([]);
  
  const positions = [
    { top: 20, left: 20 },
    { top: 40, right: 30 },
    { top: 60, left: 50 },
    { top: 80, right: 20 },
    { top: 30, right: 60 },
    { top: 70, left: 80 },
    { top: 50, right: 80 },
    { top: 90, left: 30 },
  ];

  // Initialize animations when component mounts
  useEffect(() => {
    const animations = positions.map(() => new Animated.Value(0));
    setSparkleAnimations(animations);
  }, []);

  // Start animation when visible changes
  useEffect(() => {
    if (!visible || sparkleAnimations.length === 0) return;

    // Reset all sparkles
    sparkleAnimations.forEach(sparkle => sparkle.setValue(0));

    // Create animation sequence for each sparkle
    const animations = sparkleAnimations.map((sparkle, index) => {
      return Animated.sequence([
        Animated.delay(index * staggerDelay), // Stagger the sparkles
        Animated.timing(sparkle, {
          toValue: 1,
          duration: appearDuration,
          useNativeDriver: true,
        }),
        Animated.delay(fadeDelay),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: fadeDuration,
          useNativeDriver: true,
        }),
      ]);
    });

    // Run all animations in parallel
    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, [visible, sparkleAnimations, onComplete, staggerDelay, fadeDelay, fadeDuration, appearDuration]);

  if (!visible || sparkleAnimations.length === 0) return null;

  return (
    <View style={styles.container}>
      {positions.map((position, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            position,
            {
              opacity: sparkleAnimations[index] || 0,
              transform: [
                {
                  scale: sparkleAnimations[index]?.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2],
                  }) || 0.5,
                },
              ],
            },
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
      ))}
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
    zIndex: 10,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 24,
    color: COLORS.YELLOW,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
}); 