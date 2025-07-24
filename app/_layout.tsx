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

// Font loading configuration
const fontConfig = {
  "Dosis-Regular": require("../assets/fonts/Dosis-Regular.ttf"),
  "Dosis-Bold": require("../assets/fonts/Dosis-Bold.ttf"),
  FontdinerSwanky: require("../assets/fonts/FontdinerSwanky-Regular.ttf"),
  SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts(fontConfig);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
