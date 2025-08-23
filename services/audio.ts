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

    // Try to play the sound, with fallback to buttonClick if buttonPress fails
    try {
      await this._playSoundInternal(soundName);
    } catch (error) {
      console.log(`⚠️ Primary sound failed: ${soundName}, trying fallback...`);
      // If buttonPress fails, try buttonClick as fallback
      if (soundName === 'buttonPress') {
        try {
          await this._playSoundInternal('buttonClick');
        } catch (fallbackError) {
          console.log(`⚠️ Fallback sound also failed: buttonClick`, fallbackError);
        }
      }
    }
  }

  private async _playSoundInternal(soundName: string) {

    try {
      // Ensure audio service is initialized
      if (!this.isLoaded) {
        console.log(`🎵 Initializing audio service for sound: ${soundName}`);
        await this.initialize();
        // Small delay to ensure audio context is ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Double-check that we have sounds loaded
      if (Object.keys(this.sounds).length === 0) {
        console.log(`🎵 No sounds loaded, reloading sound files...`);
        await this.loadSoundFiles();
      }

      // If still no sounds, try a full reload
      if (Object.keys(this.sounds).length === 0) {
        console.log(`🎵 Still no sounds, attempting full reload...`);
        await this.reloadSounds();
      }

      // Debug sound status if we're having issues
      if (Object.keys(this.sounds).length === 0) {
        console.log(`🎵 Critical: No sounds available after reload, debugging...`);
        await this.debugSoundStatus();
      }

      const sound = this.sounds[soundName];
      if (sound) {
        try {
          // Check if sound is loaded and valid
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            // Reset the sound to beginning and play
            await sound.setStatusAsync({ positionMillis: 0 });
            await sound.playAsync();
            console.log(`✅ Playing sound file: ${soundName}`);
            return;
          } else {
            console.log(`⚠️ Sound not loaded: ${soundName}`);
            // Try to recreate the sound
            await this.recreateSound(soundName);
          }
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
      throw error; // Re-throw to be caught by the main playSound method
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
        // Safely unload the old sound if it exists
        if (this.sounds[soundName]) {
          try {
            const oldSound = this.sounds[soundName];
            // Check if sound is still valid before unloading
            const status = await oldSound.getStatusAsync();
            if (status.isLoaded) {
              await oldSound.unloadAsync();
            }
          } catch (unloadError) {
            console.log(`⚠️ Failed to unload old sound: ${soundName}`, unloadError);
          }
          // Remove from sounds object regardless of unload success
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
        console.log(`✅ Recreated sound: ${soundName}`);
        
        // Now play the recreated sound
        try {
          await newSound.setStatusAsync({ positionMillis: 0 });
          await newSound.playAsync();
          console.log(`✅ Playing recreated sound: ${soundName}`);
        } catch (playError) {
          console.log(`⚠️ Failed to play recreated sound: ${soundName}`, playError);
        }
      }
    } catch (recreateError) {
      console.log(`❌ Failed to recreate sound: ${soundName}`, recreateError);
    }
  }

  isSoundAvailable(soundName: string): boolean {
    const sound = this.sounds[soundName];
    return sound !== undefined;
  }

  async reloadSounds() {
    try {
      console.log('🔄 Reloading all sounds...');
      // Unload all existing sounds
      for (const [key, sound] of Object.entries(this.sounds)) {
        try {
          if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              await sound.unloadAsync();
            }
          }
        } catch (error) {
          console.log(`⚠️ Error unloading sound ${key}:`, error);
        }
      }
      
      // Clear sounds object
      this.sounds = {};
      
      // Reload all sounds
      await this.loadSoundFiles();
      console.log('✅ All sounds reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload sounds:', error);
    }
  }

  async debugSoundStatus() {
    console.log('🔍 Sound Status Debug:');
    console.log(`Total sounds loaded: ${Object.keys(this.sounds).length}`);
    console.log(`Audio service initialized: ${this.isLoaded}`);
    console.log(`Sounds muted: ${this.soundsMuted}`);
    
    for (const [key, sound] of Object.entries(this.sounds)) {
      try {
        const status = await sound.getStatusAsync();
        console.log(`  ${key}: ${status.isLoaded ? '✅ Loaded' : '❌ Not Loaded'}`);
      } catch (error) {
        console.log(`  ${key}: ❌ Error checking status - ${error}`);
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
    } catch (error) {
      console.error('Failed to cleanup audio service:', error);
    }
  }
}

// Singleton instance
const audioService = new AudioService();

export default audioService;
