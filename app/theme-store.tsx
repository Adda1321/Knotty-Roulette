import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemeStore from "../components/ui/ThemeStore";
import { COLORS } from "../constants/theme";

export default function ThemeStoreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.BACKGROUND_DARK }}>
      <StatusBar style="light" />
      <ThemeStore />
    </SafeAreaView>
  );
} 