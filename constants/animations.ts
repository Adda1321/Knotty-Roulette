import { Easing } from 'react-native';

export const ANIMATION_CONFIGS = {
  BOUNCE_IN: {
    duration: 600,
    easing: Easing.bounce,
    useNativeDriver: true,
  },
  ELASTIC_IN: {
    duration: 800,
    easing: Easing.elastic(1),
    useNativeDriver: true,
  },
  FADE_IN: {
    duration: 300,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  SCALE_IN: {
    duration: 400,
    easing: Easing.out(Easing.back(1.2)),
    useNativeDriver: true,
  },
  SPIN_WHEEL: {
    duration: 3000,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  PULSE: {
    duration: 1000,
    easing: Easing.inOut(Easing.quad),
    useNativeDriver: true,
  },
};

export const ANIMATION_VALUES = {
  SCALE_NORMAL: 1,
  SCALE_SMALL: 0.8,
  SCALE_LARGE: 1.1,
  OPACITY_VISIBLE: 1,
  OPACITY_HIDDEN: 0,
  ROTATION_360: '360deg',
}; 