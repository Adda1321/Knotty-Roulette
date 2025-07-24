import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  backgroundColor?: string;
  text: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontFamily?: string;
  showGlare?: boolean;
  glareColor?: string;
  glareDuration?: number;
  glareDelay?: number;
}

export default function Button({
  backgroundColor = COLORS.YELLOW,
  text,
  paddingHorizontal = SIZES.PADDING_MEDIUM,
  paddingVertical = SIZES.PADDING_SMALL,
  textColor = COLORS.TEXT_PRIMARY,
  fontSize = SIZES.CAPTION,
  fontWeight = '600',
  fontFamily = FONTS.PRIMARY,
  showGlare = false,
  glareColor = 'rgba(255, 255, 255, 0.6)',
  glareDuration = 2000,
  glareDelay = 1000,
  style,
  ...props
}: ButtonProps) {
  const glareAnimation = useRef(new Animated.Value(-150)).current;
  const glareOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showGlare) {
      const startGlare = () => {
        // Reset position and opacity
        glareAnimation.setValue(-150);
        glareOpacity.setValue(0);
        
        // Create smooth entry, movement, and exit sequence
        Animated.sequence([
          // Fade in
          Animated.timing(glareOpacity, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }),
          // Move across with smooth transition
          Animated.parallel([
            Animated.timing(glareAnimation, {
              toValue: 150,
              duration: glareDuration - 800, // Reserve time for fade in/out
              useNativeDriver: true,
            }),
            Animated.timing(glareOpacity, {
              toValue: 0.6,
              duration: glareDuration - 800,
              useNativeDriver: true,
            }),
          ]),
          // Fade out
          Animated.timing(glareOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Restart the animation after a delay
          setTimeout(startGlare, glareDelay);
        });
      };
      
      startGlare();
    } else {
      // Fade out immediately when disabled
      Animated.timing(glareOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showGlare, glareAnimation, glareOpacity, glareDuration, glareDelay]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          paddingHorizontal,
          paddingVertical,
        },
        style,
      ]}
      {...props}
    >
      {/* Glare Effect */}
      <Animated.View
        style={[
          styles.glare,
          {
            opacity: glareOpacity,
            transform: [
              { translateX: glareAnimation },
              { rotate: '45deg' },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', glareColor, glareColor, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
      
      <Text
        style={[
          styles.buttonText,
          {
            color: textColor,
            fontSize,
            fontWeight,
            fontFamily,
          },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Important for glare effect
    ...SIZES.SHADOW_SMALL,
  },
  buttonText: {
    textAlign: 'center',
  },
  glare: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    width: 120,
    height: 20,
    borderRadius: 10,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
}); 