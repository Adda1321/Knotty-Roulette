import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    View,
} from 'react-native';

interface RouletteWheelProps {
  isSpinning: boolean;
  style?: any;
}

export interface RouletteWheelRef {
  spin: (callback: () => void) => void;
}

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width * 0.8, 300);
const CENTER = WHEEL_SIZE / 2;
const RADIUS = (WHEEL_SIZE - 40) / 2;

// 13 segments like the original game
const SEGMENTS = [
  { color: '#ff0000', label: '1' },
  { color: '#000000', label: '2' },
  { color: '#ff0000', label: '3' },
  { color: '#000000', label: '4' },
  { color: '#ff0000', label: '5' },
  { color: '#000000', label: '6' },
  { color: '#ff0000', label: '7' },
  { color: '#000000', label: '8' },
  { color: '#ff0000', label: '9' },
  { color: '#000000', label: '10' },
  { color: '#ff0000', label: '11' },
  { color: '#000000', label: '12' },
  { color: '#ff0000', label: '13' },
];

const RouletteWheel = forwardRef<RouletteWheelRef, RouletteWheelProps>(
  ({ isSpinning, style }, ref) => {
    const [rotation] = useState(new Animated.Value(0));

    useImperativeHandle(ref, () => ({
      spin: (callback: () => void) => {
        const randomSpins = 3 + Math.random() * 2; // 3-5 full rotations
        const randomSegment = Math.floor(Math.random() * 13);
        const segmentAngle = (360 / 13) * randomSegment;
        const finalRotation = randomSpins * 360 + segmentAngle;

        Animated.timing(rotation, {
          toValue: finalRotation,
          duration: 3000,
          useNativeDriver: true,
        }).start(() => {
          callback();
        });
      },
    }));

    const renderSegments = () => {
      return SEGMENTS.map((segment, index) => {
        const angle = (360 / SEGMENTS.length) * index;
        const startAngle = angle - 90; // Start from top
        const endAngle = angle + (360 / SEGMENTS.length) - 90;

        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                transform: [
                  { rotate: `${angle}deg` },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.segmentInner,
                {
                  backgroundColor: segment.color,
                  transform: [
                    { rotate: `${-angle}deg` },
                  ],
                },
              ]}
            />
          </View>
        );
      });
    };

    return (
      <View style={[styles.container, style]}>
        <Animated.View
          style={[
            styles.wheel,
            {
              transform: [
                { rotate: rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }) },
              ],
            },
          ]}
        >
          {renderSegments()}
        </Animated.View>
        
        {/* Center pointer */}
        <View style={styles.pointer} />
        
        {/* Center circle */}
        <View style={styles.centerCircle}>
          <LinearGradient
            colors={['#ffcc00', '#ff9900']}
            style={styles.centerGradient}
          />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wheel: {
    width: WHEEL_SIZE - 40,
    height: WHEEL_SIZE - 40,
    borderRadius: (WHEEL_SIZE - 40) / 2,
    borderWidth: 4,
    borderColor: '#ffcc00',
    overflow: 'hidden',
    position: 'relative',
  },
  segment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentInner: {
    width: RADIUS,
    height: 2,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -RADIUS / 2,
    marginTop: -1,
  },
  pointer: {
    position: 'absolute',
    top: 10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffcc00',
    zIndex: 10,
  },
  centerCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 5,
  },
  centerGradient: {
    width: '100%',
    height: '100%',
  },
});

RouletteWheel.displayName = 'RouletteWheel';

export default RouletteWheel; 