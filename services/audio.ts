import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class AudioService {
  private sounds: { [key: string]: Audio.Sound } = {};
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
      const sound = this.sounds[soundName];
      if (!sound) {
        console.log(`⚠️ Sound not found: ${soundName}`);
        return;
      }

      // Check if sound is loaded and valid
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        // Reset the sound to beginning and play
        await sound.setStatusAsync({ positionMillis: 0 });
        await sound.playAsync();
        console.log(`✅ Playing sound: ${soundName}`);
      } else {
        console.log(`⚠️ Sound not loaded: ${soundName}`);
        // Try to reload the specific sound
        await this.reloadSound(soundName);
      }
    } catch (error) {
      console.error(`❌ Failed to play sound ${soundName}:`, error);
      // Try to reload the sound on error
      try {
        await this.reloadSound(soundName);
      } catch (reloadError) {
        console.error(`❌ Failed to reload sound ${soundName}:`, reloadError);
      }
    }
  }

  private async reloadSound(soundName: string) {
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
        // Safely unload the old sound if it exists
        if (this.sounds[soundName]) {
          try {
            const oldSound = this.sounds[soundName];
            const status = await oldSound.getStatusAsync();
            if (status.isLoaded) {
              await oldSound.unloadAsync();
            }
          } catch (unloadError) {
            console.log(`⚠️ Failed to unload old sound: ${soundName}`, unloadError);
          }
          delete this.sounds[soundName];
        }
        
        // Create new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          soundFiles[soundName as keyof typeof soundFiles],
          {
            shouldPlay: false,
            volume: 0.7,
            isMuted: this.soundsMuted,
          }
        );
        this.sounds[soundName] = newSound;
        console.log(`✅ Reloaded sound: ${soundName}`);
        
        // Try to play the reloaded sound
        try {
          await newSound.setStatusAsync({ positionMillis: 0 });
          await newSound.playAsync();
          console.log(`✅ Playing reloaded sound: ${soundName}`);
        } catch (playError) {
          console.log(`⚠️ Failed to play reloaded sound: ${soundName}`, playError);
        }
      }
    } catch (reloadError) {
      console.log(`❌ Failed to reload sound: ${soundName}`, reloadError);
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
    // Mute/unmute all sound instances
    Object.values(this.sounds).forEach(sound => {
      try {
        sound.setIsMutedAsync(this.soundsMuted);
      } catch (error) {
        console.log('Error muting sound:', error);
      }
    });
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

}

// Singleton instance
const audioService = new AudioService();

export default audioService;
