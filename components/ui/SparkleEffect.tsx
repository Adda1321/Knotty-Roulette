import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { ANIMATION_VALUES } from '../../constants/animations';
import { COLORS } from '../../constants/theme';

interface SparkleEffectProps {
  visible: boolean;
  duration?: number;
  sparkleCount?: number;
  symbols?: string[];
  containerStyle?: any;
  onAnimationComplete?: () => void;
}

export default function SparkleEffect({
  visible,
  duration = 1200,
  sparkleCount = 5,
  symbols = ['✨', '⭐', '✨', '⭐', '✨'],
  containerStyle,
  onAnimationComplete,
}: SparkleEffectProps) {
  // Create sparkle animations using useMemo to avoid recreating on every render
  const sparkleAnimations = useMemo(() => {
    return Array.from({ length: sparkleCount }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.1), // Start even smaller for smoother appearance
    }));
  }, [sparkleCount]);

  useEffect(() => {
    if (!visible) return;

    // Reset all animations
    sparkleAnimations.forEach(({ opacity, scale }) => {
      opacity.setValue(0);
      scale.setValue(0.1); // Reset to very small scale
    });

    // Create sparkle animation function with equally smooth appearance and disappearance
    const createSparkleAnimation = (
      sparkleOpacity: Animated.Value,
      sparkleScale: Animated.Value,
      delay: number
    ) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: ANIMATION_VALUES.OPACITY_VISIBLE,
            duration: 800,
            easing: Easing.inOut(Easing.quad), // Same smooth easing as disappearance
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: ANIMATION_VALUES.SCALE_LARGE,
            duration: 800,
            easing: Easing.inOut(Easing.quad), // Same smooth easing as disappearance
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(600), // Hold sparkle visible longer
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: ANIMATION_VALUES.OPACITY_HIDDEN,
            duration: 800,
            easing: Easing.inOut(Easing.quad), // Same smooth easing as appearance
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: ANIMATION_VALUES.SCALE_NORMAL,
            duration: 800,
            easing: Easing.inOut(Easing.quad), // Same smooth easing as appearance
            useNativeDriver: true,
          }),
        ]),
      ]);
    };

    // Calculate delays for staggered effect
    const delayInterval = duration / sparkleCount;
    const animations = sparkleAnimations.map(({ opacity, scale }, index) =>
      createSparkleAnimation(opacity, scale, index * delayInterval)
    );

    // Run all sparkles in parallel
    Animated.parallel(animations).start(() => {
      onAnimationComplete?.();
    });
  }, [visible, duration, sparkleCount, onAnimationComplete, sparkleAnimations]);

  if (!visible) return null;

  return (
    <View style={[styles.container, containerStyle]}>
      {sparkleAnimations.map(({ opacity, scale }, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            styles[`sparkle${index + 1}` as keyof typeof styles] as any,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={styles.sparkleText}>
            {symbols[index % symbols.length]}
          </Text>
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
    zIndex: 1,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: -15,
    right: -15,
  },
  sparkle2: {
    top: -5,
    right: 10,
  },
  sparkle3: {
    top: 10,
    right: -5,
  },
  sparkle4: {
    top: -10,
    right: 20,
  },
  sparkle5: {
    top: 15,
    right: 15,
  },
  sparkleText: {
    fontSize: 20,
    color: COLORS.YELLOW,
  },
}); 