import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/theme';

interface LoaderProps {
  size?: number;
  color?: string;
}

export default function Loader({ 
  size = 40, 
  color = COLORS.YELLOW 
}: LoaderProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spinning animation for the outer ring
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Pulsing animation for the logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Start animations
    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [spinValue, pulseValue]);

  

  const pulse = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  return (
    <View style={styles.container}>
      {/* Main content container */}
      <View style={styles.contentContainer}>
        

        {/* Logo container with pulsing effect */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/knotty-roulette.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Loading text */}
        {/* <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: pulseValue,
            },
          ]}
        >
          Loading...
        </Animated.Text> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.DARK_GREEN,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinningRing: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRadius: 50,
    position: 'absolute',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  loadingText: {
    marginTop: 30,
    fontSize: 18,
    color: COLORS.BACKGROUND_DARK,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 