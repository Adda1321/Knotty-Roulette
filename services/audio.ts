import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class AudioService {
  private sounds: { [key: string]: Audio.Sound } = {};

  // Separate states for sounds and vibration
  private soundsMuted: boolean = false;
  private vibrationEnabled: boolean = true;

  private isLoaded: boolean = false;

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

      // Load sound files
      await this.loadSoundFiles();

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
    } catch (error) {
      console.error('Failed to load sound files:', error);
    }
  }

  async playSound(soundName: string) {
    if (this.soundsMuted) return;

    try {
      // Ensure audio service is initialized
      if (!this.isLoaded) {
        console.log(`🎵 Initializing audio service for sound: ${soundName}`);
        await this.initialize();
        // Small delay to ensure audio context is ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const sound = this.sounds[soundName];
      if (sound) {
        try {
          // Reset the sound to beginning and play
          await sound.setStatusAsync({ positionMillis: 0 });
          await sound.playAsync();
          console.log(`✅ Playing sound file: ${soundName}`);
          return;
        } catch (soundError) {
          console.log(`⚠️ Sound file error for: ${soundName}`, soundError);
          // Try to recreate the sound
          await this.recreateSound(soundName);
        }
      } else {
        console.log(`⚠️ Sound not found: ${soundName}`);
        // Try to create the sound
        await this.recreateSound(soundName);
      }
    } catch (error) {
      console.error(`❌ Failed to play sound ${soundName}:`, error);
    }
  }

  private async recreateSound(soundName: string) {
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
      
      if (soundFiles[soundName as keyof typeof soundFiles]) {
        // Unload the old sound if it exists
        if (this.sounds[soundName]) {
          try {
            await this.sounds[soundName].unloadAsync();
          } catch (unloadError) {
            console.log(`⚠️ Failed to unload old sound: ${soundName}`, unloadError);
          }
        }
        
        // Create new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          soundFiles[soundName as keyof typeof soundFiles],
          {
            shouldPlay: true,
            volume: 0.7,
            isMuted: this.soundsMuted,
          }
        );
        this.sounds[soundName] = newSound;
        console.log(`✅ Recreated and played sound: ${soundName}`);
      }
    } catch (recreateError) {
      console.log(`❌ Failed to recreate sound: ${soundName}`, recreateError);
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
    } catch (error) {
      console.error('Failed to cleanup audio service:', error);
    }
  }
}

// Singleton instance
const audioService = new AudioService();

export default audioService;
