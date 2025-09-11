/**
 * Environment detection utilities
 * Uses Expo environment variables for reliable environment detection
 */

// Simple production detection using single environment variable
export const isProduction = () => {
  return process.env.EXPO_PUBLIC_IS_PRODUCTION === 'true';
};

export const isDevelopment = () => {
  return !isProduction();
};

// Get all environment info for debugging
export const getEnvironmentInfo = () => {
  return {
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    __DEV__: __DEV__,
    // Show the actual environment variable value
    envVar: process.env.EXPO_PUBLIC_IS_PRODUCTION,
  };
};
