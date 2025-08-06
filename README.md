# Knotty Roulette Mobile App

A React Native mobile app version of the Knotty Roulette drinking game, built with Expo and TypeScript.

## Project Overview

This is a minimal mobile implementation of the existing Knotty Roulette web game, designed to integrate with the current WordPress backend while providing a native mobile experience.

### Key Features

- **Player Setup**: Add 2-8 players to start the game
- **Roulette Wheel**: 13-segment spinning wheel with animations
- **Challenge System**: Random challenges with bonus options
- **Voting System**: Players can vote on challenges (upvote/downvote)
- **Score Tracking**: Real-time scoreboard with current player indicator
- **WordPress Integration**: Connects to existing backend for challenges and voting data

### Game Rules

1. Players take turns spinning the roulette wheel
2. Each spin reveals a random challenge
3. Players must vote on the challenge before completing it
4. Completing a challenge earns +1 point
5. Bonus challenges offer +2 points if attempted
6. Passing a challenge results in -1 point
7. First player to reach 10 points wins

## Project Structure

```
knotty-roulette/
├── app/
│   └── index.tsx                 # Main game screen
├── components/
│   └── game/
│       ├── PlayerSetup.tsx       # Player registration screen
│       ├── GameBoard.tsx         # Main game interface
│       ├── RouletteWheel.tsx     # Spinning wheel component
│       ├── ChallengeDisplay.tsx  # Challenge overlay
│       └── Scoreboard.tsx        # Player scores display
├── services/
│   └── api.ts                    # WordPress backend integration
├── types/
│   └── game.ts                   # TypeScript interfaces
└── Game Rules and Requirements and Assets/  # Original game assets (read-only)
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd knotty-roulette
```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure WordPress backend:
   - Update `services/api.ts` with your WordPress site URL
   - Set the correct nonce for AJAX requests
   - Ensure the WordPress plugin is active

4. Start the development server:
```bash
npm start
```

5. Run on device/simulator:
   ```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## WordPress Backend Integration

The app integrates with the existing WordPress backend using the following endpoints:

- `krt_get_challenges`: Fetches available challenges
- `krt_log_response`: Logs player votes on challenges

### Configuration

Update the following in `services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-wordpress-site.com/wp-admin/admin-ajax.php';
const NONCE = 'your-nonce-here';
```

### Fallback System

If the WordPress backend is unavailable, the app includes fallback challenges to ensure the game remains playable.

## Development Notes

### Dependencies Added

- `expo-linear-gradient`: For wheel center gradient effects

### Key Components

1. **PlayerSetup**: Handles player registration with validation
2. **GameBoard**: Main game controller with state management
3. **RouletteWheel**: Animated 13-segment wheel with spin mechanics
4. **ChallengeDisplay**: Modal overlay for challenge presentation
5. **Scoreboard**: Real-time score tracking with current player highlighting

### State Management

The app uses React's built-in state management with:
- Local state for game flow
- Props for component communication
- Async/await for API calls

### Styling

- Dark theme with yellow accents matching the original game
- Responsive design for different screen sizes
- Consistent color scheme throughout

## Deployment

### Expo Build

1. Configure app.json for your app details
2. Build for production:
```bash
expo build:android
expo build:ios
```

For Development:
```bash
eas build --platform android --profile development

```
### Store Submission

1. Follow Expo's deployment guide for app store submission
2. Configure AdMob and in-app purchases as needed
3. Test thoroughly on both iOS and Android

## Troubleshooting

### Common Issues

1. **API Connection Errors**: Check WordPress site URL and nonce configuration
2. **Build Errors**: Ensure all dependencies are installed
3. **Performance Issues**: Optimize animations and reduce re-renders

### Debug Mode

Enable debug logging by checking the console for:
- Challenge loading status
- Vote submission results
- Game state changes

## Future Enhancements

- AdMob integration for monetization
- In-app purchases for premium features
- Push notifications for game invites
- Social sharing features
- Offline mode with local challenge storage
- Multiplayer support across devices

## License

This project is part of the Knotty Roulette game ecosystem.
