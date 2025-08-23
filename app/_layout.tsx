import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { CustomThemeProvider } from '../contexts/ThemeContext';
import audioService from "../services/audio";
import backgroundMusic from "../services/backgroundMusic";

// Font loading configuration
const fontConfig = {
  "Dosis-Regular": require("../assets/fonts/Dosis-Regular.ttf"),
  "Dosis-Bold": require("../assets/fonts/Dosis-Bold.ttf"),
  "Dosis-Medium":require('../assets/fonts/Dosis-Medium.ttf'),
  FontdinerSwanky: require("../assets/fonts/FontdinerSwanky-Regular.ttf"),
  SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
};

// Initialize audio services immediately when app starts
const initializeAudioServices = async () => {
  try {
    // Initialize audio service first
    await audioService.initialize();
    console.log("🎵 Audio service initialized immediately");

    // Initialize background music
    await backgroundMusic.initialize();
    await backgroundMusic.loadBackgroundMusic();
    await backgroundMusic.playBackgroundMusic();
    console.log("🎵 Background music initialized immediately");
  } catch (error) {
    console.error("❌ Failed to initialize audio services immediately:", error);
  }
};

// Start audio initialization immediately
initializeAudioServices();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts(fontConfig);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <CustomThemeProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="theme-store" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </CustomThemeProvider>
  );
}
