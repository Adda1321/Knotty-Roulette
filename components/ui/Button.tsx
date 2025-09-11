import { LinearGradient } from "expo-linear-gradient";

import React, { useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from "react-native";
import { COLORS, FONTS, SIZES } from "../../constants/theme";
import audioService from "../../services/audio";

interface ButtonProps extends TouchableOpacityProps {
  backgroundColor?: string;
  backgroundGradient?: [string, string, ...string[]];
  text: string | React.ReactNode;
  paddingHorizontal?: number;
  paddingVertical?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  fontFamily?: string;
  showGlare?: boolean;
  glareColor?: string;
  glareDuration?: number;
  glareDelay?: number;
  shadowIntensity?: number;
  shadowRadius?: number;
}

export default function Button({
  backgroundColor = COLORS.YELLOW, // Default to theme yellow color
  backgroundGradient,
  text, // Required text content
  paddingHorizontal = SIZES.PADDING_MEDIUM, // Default horizontal padding from theme
  paddingVertical = SIZES.PADDING_SMALL, // Default vertical padding from theme
  textColor = COLORS.TEXT_PRIMARY, // Default text color from theme
  fontSize = SIZES.CAPTION, // Default font size from theme
  fontWeight = "600", // Default semi-bold font weight
  fontFamily = FONTS.PRIMARY, // Default font family from theme
  showGlare = false, // Glare effect disabled by default
  glareColor = "rgba(255, 255, 255, 0.6)", // Semi-transparent white glare
  glareDuration = 2000, // 2 seconds for complete glare cycle
  glareDelay = 1000, // 1 second delay between glare cycles
  shadowIntensity = 0, // No shadow by default
  shadowRadius = 0, // No shadow blur by default

  style, // Additional custom styles
  ...props // All other TouchableOpacity props
}: ButtonProps) {
  const glareAnimation = useRef(new Animated.Value(-150)).current;
  const glareOpacity = useRef(new Animated.Value(0)).current;

  // useEffect(() => {
  //   if (showGlare) {
  //     const startGlare = () => {
  //       // Reset position and opacity
  //       glareAnimation.setValue(-200);
  //       glareOpacity.setValue(0);

  //       // Create smooth entry, movement, and exit sequence
  //       Animated.sequence([
  //         // Fade in
  //         Animated.timing(glareOpacity, {
  //           toValue: 0.9,
  //           duration: 300,
  //           useNativeDriver: true,
  //         }),
  //         // Move across with smooth transition
  //         Animated.parallel([
  //           Animated.timing(glareAnimation, {
  //             toValue: 250, // Increased to ensure it goes past the button edge
  //             duration: glareDuration - 600, // Reserve time for fade in/out
  //             useNativeDriver: true,
  //           }),
  //           Animated.timing(glareOpacity, {
  //             toValue: 0.7,
  //             duration: glareDuration - 600,
  //             useNativeDriver: true,
  //           }),
  //         ]),
  //         // Fade out
  //         Animated.timing(glareOpacity, {
  //           toValue: 0,
  //           duration: 300,
  //           useNativeDriver: true,
  //         }),
  //       ]).start(() => {
  //         // Restart the animation after a delay
  //         setTimeout(startGlare, glareDelay);
  //       });
  //     };

  //     startGlare();
  //   } else {
  //     // Fade out immediately when disabled
  //     Animated.timing(glareOpacity, {
  //       toValue: 0,
  //       duration: 200,
  //       useNativeDriver: true,
  //     }).start();
  //   }
  // }, [showGlare, glareAnimation, glareOpacity, glareDuration, glareDelay]);

  const handlePress = (event: any) => {
    // Play button press sound and haptic
    audioService.playSound("buttonPress");
    audioService.playHaptic("light");

    // Call the original onPress if provided
    if (props.onPress) {
      props.onPress(event);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          paddingHorizontal,
          paddingVertical,
          // borderRadius: SIZES.BORDER_RADIUS_SMALL,
          // overflow: "hidden",
             // Apply custom shadow if specified
          // ...(shadowIntensity > 0 && {
          //   // iOS shadow properties
          //   shadowColor: '#000000',
          //   shadowOffset: { width: 0, height: Math.min(shadowIntensity, 12) },
          //   shadowOpacity: Math.min(shadowIntensity * 0.08, 0.8),
          //   shadowRadius: Math.min(shadowRadius || shadowIntensity * 1.5, 20),
          //   // Android elevation
          //   elevation:  Math.min(shadowIntensity * 1.5, 20),
          // }),
        },
        style,
      ]}
      onPress={handlePress}
      {...props}
    >
      {backgroundGradient ? (
        <LinearGradient
          colors={backgroundGradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
      )}

      {/* Glare */}
      {/* <Animated.View
        style={[
          styles.glare,
          {
            opacity: glareOpacity,
            transform: [{ translateX: glareAnimation }, { rotate: "45deg" }],
          },
        ]}
      >
        <LinearGradient
          colors={["transparent", glareColor, glareColor, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View> */}

      {/* Text */}
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
    // width: "100%",
    borderRadius: SIZES.BORDER_RADIUS_SMALL,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // Important for glare effect
  },
  buttonText: {
    textAlign: "center",
  },
  glare: {
    position: "absolute",
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    width: 150, // Increased width for better coverage
    height: 25, // Slightly taller for better visibility
    borderRadius: 12,
  },
  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
});
