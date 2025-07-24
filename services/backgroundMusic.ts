import { Audio } from 'expo-av';

class BackgroundMusicService {
  private backgroundMusic: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.3;

  async initialize() {
    try {
      // Set audio mode for background music
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Background music service initialized');
    } catch (error) {
      console.error('Failed to initialize background music service:', error);
    }
  }

  async loadBackgroundMusic() {
    try {
      // TODO: Add background music file
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../assets/sounds/background-music.mp3'),
      //   {
      //     shouldPlay: false,
      //     isLooping: true,
      //     volume: this.volume,
      //   }
      // );
      // this.backgroundMusic = sound;
      console.log('Background music loaded (file not added yet)');
    } catch (error) {
      console.error('Failed to load background music:', error);
    }
  }

  async playBackgroundMusic() {
    if (!this.backgroundMusic || this.isMuted) return;

    try {
      await this.backgroundMusic.playAsync();
      this.isPlaying = true;
      console.log('Background music started');
    } catch (error) {
      console.error('Failed to play background music:', error);
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

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.setVolumeAsync(this.volume);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.backgroundMusic) {
      this.backgroundMusic.setVolumeAsync(this.isMuted ? 0 : this.volume);
    }
    return this.isMuted;
  }

  isMusicPlaying(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  async cleanup() {
    try {
      if (this.backgroundMusic) {
        await this.backgroundMusic.unloadAsync();
        this.backgroundMusic = null;
      }
      this.isPlaying = false;
    } catch (error) {
      console.error('Failed to cleanup background music service:', error);
    }
  }
}

// Create singleton instance
const backgroundMusicService = new BackgroundMusicService();

export default backgroundMusicService; 