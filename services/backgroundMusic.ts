import { Audio } from 'expo-av';
import { AppState } from 'react-native';

class BackgroundMusicService {
  private backgroundMusic: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.3;

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

  async loadBackgroundMusic() {
    try {
      if (this.backgroundMusic) {
        // Already loaded
        return;
      }
      
      console.log('Loading background music...');
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/background-music.wav'),
        {
          shouldPlay: false, // Don't auto-play, we'll control it
          isLooping: true,
          volume: this.isMuted ? 0 : this.volume,
        }
      );
      this.backgroundMusic = sound;
      console.log('✅ Background music loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load background music:', error);
      // Try to recreate the sound
      try {
        console.log('🔄 Retrying background music load...');
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/background-music.wav'),
          {
            shouldPlay: false,
            isLooping: true,
            volume: this.isMuted ? 0 : this.volume,
          }
        );
        this.backgroundMusic = sound;
        console.log('✅ Background music loaded on retry');
      } catch (retryError) {
        console.error('❌ Background music load failed on retry:', retryError);
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
