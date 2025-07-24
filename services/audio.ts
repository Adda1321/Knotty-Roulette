import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class AudioService {
  private sounds: { [key: string]: Audio.Sound } = {};
  private isMuted: boolean = false;
  private isLoaded: boolean = false;
  private audioContext: AudioContext | null = null;
  private useWebAudio: boolean = false;

  async initialize() {
    try {
      // Set audio mode for better performance
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Try to load sound files first
      await this.loadSoundFiles();
      
      // If no sound files loaded, fallback to Web Audio API
      if (Object.keys(this.sounds).length === 0) {
        this.useWebAudio = true;
        if (typeof window !== 'undefined' && window.AudioContext) {
          this.audioContext = new AudioContext();
        }
        console.log('Using Web Audio API fallback for sounds');
      }

      this.isLoaded = true;
      console.log('Audio service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
    }
  }

  private async loadSoundFiles() {
    try {
      // Try to load sound files - these will fail gracefully if files don't exist
      const soundFiles = {
        // wheelSpin: require('../assets/sounds/wheel-spin.mp3'),
        // challengeComplete: require('../assets/sounds/challenge-complete.mp3'),
        // bonusAchieved: require('../assets/sounds/bonus-achieved.mp3'),
        // buttonPress: require('../assets/sounds/button-press.mp3'),
        // gameOver: require('../assets/sounds/game-over.mp3'),
        // passChallenge: require('../assets/sounds/pass-challenge.mp3'),
      };

      for (const [key, soundFile] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(soundFile, {
            shouldPlay: false,
            volume: 0.7,
          });
          this.sounds[key] = sound;
          console.log(`Loaded sound: ${key}`);
        } catch (error) {
          console.log(`Sound file not found: ${key}`);
        }
      }
    } catch (error) {
      console.log('No sound files found, using Web Audio API');
    }
  }

  // Create simple sound effects using Web Audio API (fallback)
  private createSimpleSound(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext || this.isMuted) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.error('Failed to create simple sound:', error);
    }
  }

  async playSound(soundName: string) {
    if (this.isMuted || !this.isLoaded) return;

    try {
      // Try to play sound file first
      const sound = this.sounds[soundName];
      if (sound) {
        await sound.replayAsync();
        console.log(`Playing sound file: ${soundName}`);
        return;
      }

      // Fallback to Web Audio API if no sound file
      if (this.useWebAudio) {
        switch (soundName) {
          case 'wheelSpin':
            this.createSimpleSound(200, 0.5, 'sawtooth');
            break;
          case 'challengeComplete':
            this.createSimpleSound(800, 0.3, 'sine');
            setTimeout(() => this.createSimpleSound(1000, 0.3, 'sine'), 100);
            break;
          case 'bonusAchieved':
            this.createSimpleSound(600, 0.2, 'sine');
            setTimeout(() => this.createSimpleSound(800, 0.2, 'sine'), 100);
            setTimeout(() => this.createSimpleSound(1000, 0.2, 'sine'), 200);
            break;
          case 'buttonPress':
            this.createSimpleSound(400, 0.1, 'square');
            break;
          case 'gameOver':
            this.createSimpleSound(300, 0.5, 'sine');
            setTimeout(() => this.createSimpleSound(400, 0.5, 'sine'), 200);
            setTimeout(() => this.createSimpleSound(500, 0.5, 'sine'), 400);
            break;
          case 'passChallenge':
            this.createSimpleSound(200, 0.3, 'triangle');
            break;
          default:
            console.log(`Sound ${soundName} not available`);
        }
        console.log(`Playing Web Audio: ${soundName}`);
      } else {
        console.log(`Sound ${soundName} not available`);
      }
    } catch (error) {
      console.error(`Failed to play sound ${soundName}:`, error);
    }
  }

  async playHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
    if (this.isMuted) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.error('Failed to play haptic feedback:', error);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  isAudioMuted(): boolean {
    return this.isMuted;
  }

  async cleanup() {
    try {
      for (const sound of Object.values(this.sounds)) {
        await sound.unloadAsync();
      }
      this.sounds = {};
      this.isLoaded = false;
      
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
    } catch (error) {
      console.error('Failed to cleanup audio service:', error);
    }
  }
}

// Create singleton instance
const audioService = new AudioService();

export default audioService; 