import GameBoard from "@/components/game/GameBoard";
import UpsellModal from "@/components/ui/UpsellModal";
import purchaseService from "@/services/purchaseService";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import PlayerSetup from "../../components/game/PlayerSetup";
import CustomModal from "../../components/ui/CustomModal";
import Loader from "../../components/ui/Loader";
import PurchaseCelebrationModal from "../../components/ui/PurchaseCelebrationModal";
import { COLORS, FONTS, GAME_CONFIG, SIZES } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import adService from "../../services/adService";
import { fetchChallenges } from "../../services/api";
import audioService from "../../services/audio";
import { themePackService } from "../../services/themePackService";
import upsellService, { UpsellOffer, UpsellType } from "../../services/upsellService";
import userService from "../../services/userService";
import { Challenge, GameState, Player } from "../../types/game";

export default function HomeScreen() {
  const [gameState, setGameState] = useState<GameState>("setup");
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isNewGame, setIsNewGame] = useState(false);
  
  // Upsell state
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [currentUpsellOffer, setCurrentUpsellOffer] = useState<UpsellOffer | null>(null);

  // Purchase celebration state
  const [showPurchaseCelebrationModal, setShowPurchaseCelebrationModal] =
    useState(false);
  const [purchaseType, setPurchaseType] = useState<
    "ad_free" | "theme_packs" | "all_in_bundle" | "complete_set" | null
  >(null);

  // Get theme context
  const { onThemeChange } = useTheme();

  // Handle purchase completion from upsell modal
  const handlePurchaseComplete = (
    type: "ad_free" | "theme_packs" | "all_in_bundle" | "complete_set"
  ) => {
    setPurchaseType(type);
    setShowPurchaseCelebrationModal(true);
  };

  const loadChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get current theme from theme pack service
      const currentTheme = themePackService.getCurrentPack();
      console.log("🎨 Loading challenges for theme:", currentTheme);

      const fetchedChallenges = await fetchChallenges(currentTheme);
      setChallenges(fetchedChallenges);
      setIsOnline(true); // Success means we're online
    } catch (error) {
      console.error("Error loading challenges:", error);
      setIsOnline(false); // Error means we're offline
      // Don't show alert, just use fallback challenges
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeServices = useCallback(async () => {
    try {
      // Initialize user service first
      await userService.initialize();

      // Initialize ad service (depends on user service)
      await adService.initialize();
      await purchaseService.initialize();

      // Load challenges with current theme
      await loadChallenges();
    } catch (error) {
      console.error("Error initializing services:", error);
      // Still try to load challenges even if services fail
      await loadChallenges();
    }
  }, [loadChallenges]);

  useEffect(() => {
    initializeServices();
  }, [initializeServices]);

  // Listen for theme changes and refresh challenges
  useEffect(() => {
    const unsubscribe = onThemeChange(async (newThemeId) => {
      console.log(
        "🎨 Theme changed to:",
        newThemeId,
        "- refreshing challenges..."
      );
      await loadChallenges();
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [onThemeChange, loadChallenges]);

  // Refresh challenges when screen comes into focus (e.g., returning from theme store)
  useFocusEffect(
    useCallback(() => {
      console.log(
        "🎯 HomeScreen focused - checking if challenges need refresh..."
      );
      // Only refresh if we're not in the middle of a game
      if (gameState === "setup") {
        loadChallenges();
      }
    }, [gameState, loadChallenges])
  );

  const startGame = (playerNames: string[]) => {
    console.log("Received player names:", playerNames);
    const newPlayers = playerNames.map((name, index) => ({
      id: index,
      name,
      points: 0,
    }));
    console.log("Created players:", newPlayers);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setGameState("playing");
    setIsNewGame(true); // Set flag for new game

    // Reset ad service spin counter for new game
    adService.resetSpinCounter();
  };

  const resetGame = () => {
    setGameState("setup");
    setPlayers([]);
    setCurrentPlayerIndex(0);
    setIsNewGame(false); // Reset flag when game is reset
  };

  // Handle upsell display
  const handleUpsellDisplay = async (upsellType: UpsellType) => {
    if (upsellType === "none") return;

    // Determine the correct trigger type based on the upsell type
    let triggerType: "ad_based" | "game_over" | "shop_entry" | "passive" =
      "ad_based";

    // If this is coming from the game board after a spin, it's ad-based
    // If this is coming from game over, it's game_over
    // We'll determine this based on the current game state
    if (gameState === "gameOver") {
      triggerType = "game_over";
    }

    const offer = upsellService.getUpsellOffer(upsellType, triggerType);
    if (offer) {
      setCurrentUpsellOffer(offer);
      setShowUpsellModal(true);
      await upsellService.markUpsellShown(upsellType);
    }
  };

  // Handle upsell purchase success
  const handleUpsellPurchaseSuccess = async () => {
    setShowUpsellModal(false);
    setCurrentUpsellOffer(null);

    // Check for next upsell
    const nextUpsell = await upsellService.checkPostPurchaseUpsell("ad_free");
    if (nextUpsell !== "none") {
      handleUpsellDisplay(nextUpsell);
    }
  };

  // Function to check and display game over upsell
  const checkGameOverUpsell = async () => {
    try {
      const upsellType = await upsellService.trackGameOver();
      if (upsellType !== "none") {
        const offer = upsellService.getUpsellOffer(upsellType, "game_over");
        if (offer) {
          setCurrentUpsellOffer(offer);
          setShowUpsellModal(true);
        }
      }
    } catch (error) {
      console.error("Error checking game over upsell:", error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loader />
        <Toast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {gameState === "setup" ? (
        <PlayerSetup onStartGame={startGame} />
      ) : (
        <GameBoard
          players={players}
          challenges={challenges}
          currentPlayerIndex={currentPlayerIndex}
          isOnline={isOnline}
          isNewGame={isNewGame}
          onPlayerTurnComplete={(playerIndex, points) => {
            const updatedPlayers = [...players];
            updatedPlayers[playerIndex].points += points;
            setPlayers(updatedPlayers);

            // Check for winner (first to reach winning score)
            if (
              updatedPlayers[playerIndex].points >= GAME_CONFIG.WINNING_SCORE
            ) {
              // Play game over sound and haptic
              audioService.playSound("gameOver");
              audioService.playHaptic("success");

              // Check for game over upsell (for Ad-Free users) when game actually ends
              checkGameOverUpsell();

              setGameState("gameOver");
              setWinner(updatedPlayers[playerIndex]);
              setShowGameOverModal(true);
            } else {
              // Move to next player
              setCurrentPlayerIndex((playerIndex + 1) % players.length);
            }
          }}
          onResetGame={resetGame}
          onRulesShown={() => setIsNewGame(false)} // Reset flag when rules are shown
          onUpsellTrigger={handleUpsellDisplay}
        />
      )}

      {/* Game Over Modal */}
      <CustomModal
        visible={showGameOverModal}
        onClose={() => {
          audioService.playHaptic("medium");
          setShowGameOverModal(false);
          resetGame();
        }}
        title="Game Over!"
        message={
          winner ? `${winner.name} wins with ${winner.points} points!` : ""
        }
        showCloseButton={true}
        closeButtonText="New Game"
        showConfirmButton={false}
        showSparkles={true}
      />

      {/* Upsell Modal */}
      {currentUpsellOffer && (
        <UpsellModal
          visible={showUpsellModal}
          onClose={() => setShowUpsellModal(false)}
          onPurchaseSuccess={handleUpsellPurchaseSuccess}
          onPurchaseComplete={handlePurchaseComplete}
          offer={currentUpsellOffer}
        />
      )}

      {/* Purchase Celebration Modal */}
      {showPurchaseCelebrationModal && purchaseType && (
        <PurchaseCelebrationModal
          visible={showPurchaseCelebrationModal}
          onClose={() => setShowPurchaseCelebrationModal(false)}
          purchaseType={purchaseType}
        />
      )}

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_DARK,
    padding: 0,
    margin: 0,
  },
  loadingText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: SIZES.SUBTITLE,
    fontFamily: FONTS.PRIMARY,
  },
});
