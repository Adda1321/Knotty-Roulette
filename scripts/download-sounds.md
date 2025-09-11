# 🎵 Sound Download Guide

## Quick Download Links

### **Option 1: Freesound.org (Recommended)**
1. Go to https://freesound.org/
2. Search for these terms and download MP3 files:

**Required Sounds:**
- **wheel-spin.mp3** - Search: "roulette wheel spin" or "mechanical spin"
- **challenge-complete.mp3** - Search: "success chime" or "achievement"
- **bonus-achieved.mp3** - Search: "bonus" or "power up"
- **button-press.mp3** - Search: "button click" or "ui click"
- **game-over.mp3** - Search: "game over" or "victory fanfare"
- **pass-challenge.mp3** - Search: "fail" or "wrong answer"

### **Option 2: Zapsplat.com**
1. Go to https://www.zapsplat.com/
2. Create free account
3. Search and download MP3 files

### **Option 3: Mixkit.co**
1. Go to https://mixkit.co/free-sound-effects/
2. Search for game sounds
3. Download MP3 files

## File Placement

After downloading, place the MP3 files in:
```
assets/sounds/
├── wheel-spin.mp3
├── challenge-complete.mp3
├── bonus-achieved.mp3
├── button-press.mp3
├── game-over.mp3
└── pass-challenge.mp3
```

## File Requirements

- **Format:** MP3
- **Duration:** 1-3 seconds each
- **Size:** Under 500KB each
- **Quality:** 44.1kHz, 128-192kbps

## Quick Test

After adding sound files:
1. Restart the development server
2. Check console logs for "Loaded sound: [filename]"
3. Test sounds in the game

## Fallback System

If no sound files are found, the app will automatically use Web Audio API as fallback. 