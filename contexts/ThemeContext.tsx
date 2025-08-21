import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_COLORS, THEME_PACKS, ThemePackId } from '../constants/theme';
import themePackService from '../services/themePackService';

interface ThemeContextType {
  currentTheme: ThemePackId;
  COLORS: typeof THEME_COLORS[ThemePackId]; // Current theme's colors
  switchTheme: (themeId: ThemePackId) => Promise<boolean>;
  refreshTheme: () => void;
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

  // Get current theme colors based on selected theme
  const COLORS = THEME_COLORS[currentTheme];

  // Debug logging
  console.log('🔧 ThemeContext: Current theme:', currentTheme);
  console.log('🔧 ThemeContext: Current COLORS:', COLORS);

  const refreshTheme = async () => {
    try {
      const activeTheme = await themePackService.getCurrentPack();
      console.log('🔧 ThemeContext: Refreshing theme to:', activeTheme);
      setCurrentTheme(activeTheme);
    } catch (error) {
      console.log('Error refreshing theme:', error);
      setCurrentTheme(THEME_PACKS.DEFAULT);
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
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 