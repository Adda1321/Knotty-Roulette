import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class AudioService {
  private sounds: { [key: string]: Audio.Sound } = {};

  // Separate states for sounds and vibration
  private soundsMuted: boolean = false;
  private vibrationEnabled: boolean = true;

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

      // Load other sound files
      await this.loadSoundFiles();

      // Fallback to Web Audio API if no sounds loaded
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
      const soundFiles = {
        wheelSpin: require('../assets/sounds/roulette-Spin-sound.wav'),
        challengeComplete: require('../assets/sounds/challenge-complete.wav'),
        bonusAchieved: require('../assets/sounds/bonus-achieved.wav'),
        buttonPress: require('../assets/sounds/button-press.wav'),
        gameOver: require('../assets/sounds/bonus-achieved.wav'),
        passChallenge: require('../assets/sounds/pass-challenge.wav'),
        buttonClick: require('../assets/sounds/button-click.wav'),
      };

      console.log('Loading sound files...');
      let loadedCount = 0;

      for (const [key, soundFile] of Object.entries(soundFiles)) {
        try {
          const { sound } = await Audio.Sound.createAsync(soundFile, {
            shouldPlay: false,
            volume: 0.7,
            isMuted: this.soundsMuted,
          });
          this.sounds[key] = sound;
          loadedCount++;
          console.log(`✅ Loaded sound: ${key}`);
        } catch (error) {
          console.log(`❌ Failed to load sound: ${key}`, error);
        }
      }

      console.log(`Sound loading complete: ${loadedCount}/${Object.keys(soundFiles).length} sounds loaded`);
      
      if (loadedCount === 0) {
        this.useWebAudio = true;
        if (typeof window !== 'undefined' && window.AudioContext) {
          this.audioContext = new AudioContext();
          console.log('✅ Web Audio API initialized as fallback');
        }
        console.log('⚠️ No sound files loaded, using Web Audio API fallback');
      } else if (loadedCount < Object.keys(soundFiles).length) {
        // Some sounds loaded, but not all - set up Web Audio as backup
        this.useWebAudio = true;
        if (typeof window !== 'undefined' && window.AudioContext) {
          this.audioContext = new AudioContext();
          console.log('✅ Web Audio API initialized as backup for missing sounds');
        }
      }
    } catch (error) {
      console.error('❌ Error in loadSoundFiles:', error);
      this.useWebAudio = true;
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new AudioContext();
      }
    }
  }

  private createSimpleSound(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (this.soundsMuted) return;

    try {
      // Create audio context if not available
      if (!this.audioContext) {
        if (typeof window !== 'undefined' && window.AudioContext) {
          this.audioContext = new AudioContext();
        } else {
          console.log('⚠️ Web Audio API not available');
          return;
        }
      }

      // Resume audio context if suspended (required on some browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

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
      
      console.log(`🎵 Web Audio sound created: ${frequency}Hz for ${duration}s`);
    } catch (error) {
      console.error('❌ Failed to create simple sound:', error);
    }
  }

  async playSound(soundName: string) {
    if (this.soundsMuted) return;

    try {
      // Ensure audio service is initialized
      if (!this.isLoaded) {
        await this.initialize();
      }

      const sound = this.sounds[soundName];
      if (sound) {
        try {
          await sound.replayAsync();
          console.log(`✅ Playing sound file: ${soundName}`);
          return;
        } catch (soundError) {
          console.log(`⚠️ Sound file error, falling back to Web Audio: ${soundName}`, soundError);
          // Fall through to Web Audio fallback
        }
      }

      // Fallback to Web Audio API if sound file not found or failed
      console.log(`🎵 Using Web Audio fallback for: ${soundName}`);
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
        case 'buttonClick':
          this.createSimpleSound(400, 0.1, 'square');
          break;
        case 'gameOver':
          this.createSimpleSound(300, 0.5, 'sine');
          setTimeout(() => this.createSimpleSound(400, 0.5, 'sine'), 200);
          setTimeout(() => this.createSimpleSound(500, 0.5, 'sine'), 400);
          break;
        case 'passChallenge':
          this.createSimpleSound(200, 0.3, 'sine');
          break;
        default:
          // Default button press sound for any unknown sound
          this.createSimpleSound(400, 0.1, 'square');
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to play sound ${soundName}:`, error);
      // Final fallback - try to create a simple sound
      try {
        this.createSimpleSound(400, 0.1, 'square');
      } catch (fallbackError) {
        console.error('❌ Web Audio fallback also failed:', fallbackError);
      }
    }
  }

  async playHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
    if (!this.vibrationEnabled) return;

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

  // Toggle and get methods

  toggleSoundsMute() {
    this.soundsMuted = !this.soundsMuted;
    // You can mute/unmute all sound instances here if needed
    Object.values(this.sounds).forEach(sound => sound.setIsMutedAsync(this.soundsMuted));
    return this.soundsMuted;
  }

  toggleVibration() {
    this.vibrationEnabled = !this.vibrationEnabled;
    return this.vibrationEnabled;
  }

  isSoundsMuted() {
    return this.soundsMuted;
  }

  isVibrationEnabled() {
    return this.vibrationEnabled;
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

// Singleton instance
const audioService = new AudioService();

export default audioService;
