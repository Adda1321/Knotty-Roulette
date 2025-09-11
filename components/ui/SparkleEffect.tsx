import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ANIMATION_VALUES } from "../../constants/animations";
import { COLORS } from "../../constants/theme";

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
  symbols = ["✨", "⭐", "✨", "⭐", "✨"],
  containerStyle,
  onAnimationComplete,
}: SparkleEffectProps) {
  // Use refs to store animation values to avoid recreation
  const animationRefs = useRef<
    {
      opacity: Animated.Value;
      scale: Animated.Value;
    }[]
  >([]);

  // Initialize animation refs only once
  useEffect(() => {
    if (animationRefs.current.length === 0) {
      animationRefs.current = Array.from({ length: sparkleCount }, () => ({
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.1),
      }));
    }
  }, [sparkleCount]);

  const startAnimation = useCallback(() => {
    if (!visible) return;

    // Reset all animations
    animationRefs.current.forEach(({ opacity, scale }) => {
      opacity.setValue(0);
      scale.setValue(0.1);
    });

    // Create sparkle animation function
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
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: ANIMATION_VALUES.SCALE_LARGE,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: ANIMATION_VALUES.OPACITY_HIDDEN,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleScale, {
            toValue: ANIMATION_VALUES.SCALE_NORMAL,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]);
    };

    // Calculate delays for staggered effect
    const delayInterval = duration / sparkleCount;
    const animations = animationRefs.current.map(({ opacity, scale }, index) =>
      createSparkleAnimation(opacity, scale, index * delayInterval)
    );

    // Run all sparkles in parallel
    Animated.parallel(animations).start(() => {
      onAnimationComplete?.();
    });
  }, [visible, duration, sparkleCount, onAnimationComplete]);

  // Start animation when visible changes
  useEffect(() => {
    if (visible) {
      // Use setTimeout to defer the animation start to avoid React rendering conflicts
      const timer = setTimeout(() => {
        startAnimation();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [visible, startAnimation]);

  if (!visible) return null;

  return (
    <View style={[styles.container, containerStyle]}>
      {animationRefs.current.map(({ opacity, scale }, index) => (
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  sparkle: {
    position: "absolute",
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
