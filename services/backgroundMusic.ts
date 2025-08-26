import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import { THEME_PACKS, ThemePackId } from '../constants/theme';

class BackgroundMusicService {
  private backgroundMusic: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.3;
  private currentTheme: ThemePackId = THEME_PACKS.DEFAULT;

  // Theme to audio file mapping
  private themeAudioFiles: Record<ThemePackId, any> = {
    [THEME_PACKS.DEFAULT]: require('../assets/sounds/background-music.wav'),
    [THEME_PACKS.COLLEGE]: require('../assets/sounds/background-audio-college-theme.wav'),
    [THEME_PACKS.COUPLE]: require('../assets/sounds/background-audio-couple-theme.mpeg.wav'),
  };

  async initialize() {
    try {
      // Audio mode is already set by the main audio service
      // No need to set it again here

      // Set up app state listener for background/foreground
      AppState.addEventListener('change', this.handleAppStateChange.bind(this));

      console.log('Background music service initialized');
    } catch (error) {
      console.error('Failed to initialize background music service:', error);
    }
  }

  // Handle app state changes
  private handleAppStateChange(nextAppState: string) {
    if (nextAppState === 'active') {
      // App came to foreground - resume music
      this.playBackgroundMusic();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - pause music
      this.pauseBackgroundMusic();
    }
  }

  // Set the current theme and switch audio if needed
  async setTheme(themeId: ThemePackId) {
    if (this.currentTheme === themeId) {
      return; // No change needed
    }

    console.log(`🎵 BackgroundMusic: Switching theme from ${this.currentTheme} to ${themeId}`);
    this.currentTheme = themeId;

    // If music is currently playing, switch to new theme's audio
    if (this.isPlaying && !this.isMuted) {
      await this.switchThemeAudio();
    } else {
      // Even if not playing, ensure the new theme's audio is loaded
      await this.loadBackgroundMusic();
    }
  }

  // Check if background music is fully loaded and ready
  async isAudioReady(): Promise<boolean> {
    try {
      if (!this.backgroundMusic) {
        return false;
      }
      
      const status = await this.backgroundMusic.getStatusAsync();
      return 'isLoaded' in status && status.isLoaded;
    } catch (error) {
      console.error('❌ Error checking audio status:', error);
      return false;
    }
  }

  // Ensure audio is properly loaded for the current theme
  async ensureAudioLoaded(): Promise<boolean> {
    try {
      // If audio is already loaded and matches current theme, we're good
      if (this.backgroundMusic && await this.isAudioReady()) {
        return true;
      }
      
      // Load audio for current theme
      await this.loadBackgroundMusic();
      
      // Wait for it to be ready
      return await this.waitForAudioReady(3000);
    } catch (error) {
      console.error('❌ Failed to ensure audio is loaded:', error);
      return false;
    }
  }

  // Wait for audio to be fully loaded
  async waitForAudioReady(timeoutMs: number = 3000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isAudioReady()) {
        return true;
      }
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('⚠️ BackgroundMusic: Audio loading timeout reached');
    return false;
  }

  // Switch to the new theme's audio file
  private async switchThemeAudio() {
    try {
      // Stop current music
      if (this.backgroundMusic) {
        await this.backgroundMusic.stopAsync();
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
      }

      // Load new theme's audio
      await this.loadBackgroundMusic();
      
      // Resume playing if it was playing before
      if (this.isPlaying && !this.isMuted) {
        await this.playBackgroundMusic();
      }
    } catch (error) {
      console.error('❌ Failed to switch theme audio:', error);
    }
  }

  async loadBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        // Already loaded
        return;
      }
      
      const audioFile = this.themeAudioFiles[this.currentTheme];
      console.log(`🎵 Loading background music for theme: ${this.currentTheme}`);
      
      const { sound } = await Audio.Sound.createAsync(
        audioFile,
        {
          shouldPlay: false, // Don't auto-play, we'll control it
          isLooping: true,
          volume: this.isMuted ? 0 : this.volume,
        }
      );
      this.backgroundMusic = sound;
      console.log(`✅ Background music loaded successfully for theme: ${this.currentTheme}`);
    } catch (error) {
      console.error(`❌ Failed to load background music for theme ${this.currentTheme}:`, error);
      // Try to recreate the sound
      try {
        console.log('🔄 Retrying background music load...');
        const audioFile = this.themeAudioFiles[this.currentTheme];
        const { sound } = await Audio.Sound.createAsync(
          audioFile,
          {
            shouldPlay: false,
            isLooping: true,
            volume: this.isMuted ? 0 : this.volume,
          }
        );
        this.backgroundMusic = sound;
        console.log(`✅ Background music loaded on retry for theme: ${this.currentTheme}`);
      } catch (retryError) {
        console.error(`❌ Background music load failed on retry for theme ${this.currentTheme}:`, retryError);
      }
    }
  }

  async playBackgroundMusic() {
    if (!this.backgroundMusic || this.isMuted) {
      console.log('⚠️ Background music not available or muted');
      return;
    }

    try {
      // Check if already playing
      const status = await this.backgroundMusic.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded && 'isPlaying' in status && !status.isPlaying) {
        await this.backgroundMusic.playAsync();
        this.isPlaying = true;
        console.log('✅ Background music started');
      } else if ('isPlaying' in status && status.isPlaying) {
        console.log('ℹ️ Background music already playing');
      } else {
        console.log('⚠️ Background music not loaded properly');
      }
    } catch (error) {
      console.error('❌ Failed to play background music:', error);
      // Try to reload and play
      try {
        console.log('🔄 Retrying background music play...');
        await this.loadBackgroundMusic();
        if (this.backgroundMusic) {
          await this.backgroundMusic.playAsync();
          this.isPlaying = true;
          console.log('✅ Background music started on retry');
        }
      } catch (retryError) {
        console.error('❌ Background music play failed on retry:', retryError);
      }
    }
  }

  async pauseBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      await this.backgroundMusic.pauseAsync();
      this.isPlaying = false;
      console.log('Background music paused');
    } catch (error) {
      console.error('Failed to pause background music:', error);
    }
  }

  async stopBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      await this.backgroundMusic.stopAsync();
      await this.backgroundMusic.setPositionAsync(0);
      this.isPlaying = false;
      console.log('Background music stopped');
    } catch (error) {
      console.error('Failed to stop background music:', error);
    }
  }

  async setVolume(volume: number) {
    this.volume = Math.min(Math.max(0, volume), 1); // Clamp between 0 and 1
    if (this.backgroundMusic && !this.isMuted) {
      await this.backgroundMusic.setVolumeAsync(this.volume);
    }
  }

  async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    if (this.backgroundMusic) {
      await this.backgroundMusic.setIsMutedAsync(this.isMuted);
      if (this.isMuted) {
        await this.backgroundMusic.pauseAsync();
      } else {
        await this.backgroundMusic.playAsync();
      }
    }
    return this.isMuted;
  }

  isMusicMuted(): boolean {
    return this.isMuted;
  }

  isMusicPlaying(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  async setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.backgroundMusic) {
      await this.backgroundMusic.setIsMutedAsync(this.isMuted);
      if (this.isMuted) {
        await this.backgroundMusic.pauseAsync();
      } else {
        await this.backgroundMusic.playAsync();
      }
    }
  }

  // Get current theme
  getCurrentTheme(): ThemePackId {
    return this.currentTheme;
  }

  // Get available themes
  getAvailableThemes(): ThemePackId[] {
    return Object.keys(this.themeAudioFiles) as ThemePackId[];
  }

  async cleanup() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
      }
      this.isPlaying = false;
      console.log('Background music service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup background music service:', error);
    }
  }
}

// Singleton instance
const backgroundMusicService = new BackgroundMusicService();

export default backgroundMusicService;
