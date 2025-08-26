import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_COLORS, THEME_PACKS, ThemePackId } from '../constants/theme';
import backgroundMusic from '../services/backgroundMusic';
import themePackService from '../services/themePackService';

interface ThemeContextType {
  currentTheme: ThemePackId;
  COLORS: typeof THEME_COLORS[ThemePackId]; // Current theme's colors
  switchTheme: (themeId: ThemePackId) => Promise<boolean>;
  refreshTheme: () => Promise<void>;
  onThemeChange: (callback: (themeId: ThemePackId) => void) => () => void; // Add callback system
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePackId>(THEME_PACKS.DEFAULT);
  const [themeChangeCallbacks, setThemeChangeCallbacks] = useState<Set<(themeId: ThemePackId) => void>>(new Set());

  // Get current theme colors based on selected theme
  const COLORS = THEME_COLORS[currentTheme];

  // Debug logging
  console.log('🔧 ThemeContext: Current theme:', currentTheme);
  console.log('🔧 ThemeContext: Current COLORS:', COLORS);

  // Function to register theme change callbacks
  const onThemeChange = useCallback((callback: (themeId: ThemePackId) => void) => {
    setThemeChangeCallbacks(prev => new Set(prev).add(callback));
    
    // Return unsubscribe function
    return () => {
      setThemeChangeCallbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  }, []);

  // Function to notify all callbacks of theme change
  const notifyThemeChange = useCallback((themeId: ThemePackId) => {
    themeChangeCallbacks.forEach(callback => {
      try {
        callback(themeId);
      } catch (error) {
        console.error('Error in theme change callback:', error);
      }
    });
  }, [themeChangeCallbacks]);

  const refreshTheme = async () => {
    try {
      const activeTheme = await themePackService.getCurrentPack();
      console.log('🔧 ThemeContext: Refreshing theme to:', activeTheme);
      setCurrentTheme(activeTheme);
      
      // Ensure background music service is synchronized with current theme
      try {
        await backgroundMusic.setTheme(activeTheme);
        console.log('🎵 ThemeContext: Background music synchronized with refreshed theme');
      } catch (error) {
        console.error('❌ ThemeContext: Failed to synchronize background music with refreshed theme:', error);
      }
    } catch (error) {
      console.log('Error refreshing theme:', error);
      setCurrentTheme(THEME_PACKS.DEFAULT);
      
      // Ensure background music service is synchronized with default theme
      try {
        await backgroundMusic.setTheme(THEME_PACKS.DEFAULT);
        console.log('🎵 ThemeContext: Background music synchronized with default theme');
      } catch (error) {
        console.error('❌ ThemeContext: Failed to synchronize background music with default theme:', error);
      }
    }
  };

  const switchTheme = async (themeId: ThemePackId): Promise<boolean> => {
    try {
      console.log('🔧 ThemeContext: Switching theme to:', themeId);
      console.log('🔧 ThemeContext: Available themes:', Object.keys(THEME_COLORS));
      console.log('🔧 ThemeContext: College theme colors:', THEME_COLORS[THEME_PACKS.COLLEGE]);
      
      const success = await themePackService.setCurrentPack(themeId);
      if (success) {
        console.log('🔧 ThemeContext: Theme switch successful, updating to:', themeId);
        console.log('🔧 ThemeContext: New colors will be:', THEME_COLORS[themeId]);
        setCurrentTheme(themeId);
        
        // Notify background music service of theme change
        try {
          await backgroundMusic.setTheme(themeId);
          console.log('🎵 ThemeContext: Background music theme updated successfully');
        } catch (error) {
          console.error('❌ ThemeContext: Failed to update background music theme:', error);
        }
        
        // Notify all callbacks of theme change
        notifyThemeChange(themeId);
        return true;
      } else {
        console.log('🔧 ThemeContext: Theme switch failed for:', themeId);
        return false;
      }
    } catch (error) {
      console.log('Error switching theme:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('🔧 ThemeContext: Initializing with theme:', currentTheme);
    refreshTheme();
  }, []);

  // Debug effect to log theme changes
  useEffect(() => {
    console.log('🔧 ThemeContext: Theme changed to:', currentTheme);
    console.log('🔧 ThemeContext: New COLORS:', COLORS);
  }, [currentTheme, COLORS]);

  const value: ThemeContextType = {
    currentTheme,
    COLORS, // This provides the current theme's colors
    switchTheme,
    refreshTheme,
    onThemeChange, // Add callback system
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 