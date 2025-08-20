import { THEME_PACKS } from '../constants/theme';

export interface SampleChallenge {
  challenge_text: string;
  has_bonus: boolean;
}

export function getSampleChallenges(themeId?: string): SampleChallenge[] {
  const defaultChallenges = [
    {
      challenge_text: "Give a flirty compliment to someone in the group or a stranger – Bonus if a stranger!",
      has_bonus: true,
    },
    {
      challenge_text: "Show off your best dance moves! – Bonus if you commit for at least 10 seconds!",
      has_bonus: true,
    },
    {
      challenge_text: "Ask the bartender or a friend for their best flirting advice – Bonus if you actually try it on someone!",
      has_bonus: true,
    },
  ];

  // Return different challenges based on theme
  if (themeId === "college") {
    return [
      {
        challenge_text: "Challenge someone to a dance-off – Loser must finish their drink!",
        has_bonus: false,
      },
      {
        challenge_text: 'Start a chant – Even if it\'s just "One more round!"',
        has_bonus: false,
      },
      {
        challenge_text: "Pretend you know a stranger for 30 seconds – Sell it!",
        has_bonus: false,
      },
    ];
  } else if (themeId === "couple") {
    return [
      {
        challenge_text: "Make eye contact with someone in the group for 10 seconds – No breaking first!",
        has_bonus: false,
      },
      {
        challenge_text: "Whisper a made-up secret to someone in the group – Make it juicy.",
        has_bonus: false,
      },
      {
        challenge_text: "Try to make someone in the group blush – No touching allowed!",
        has_bonus: false,
      },
    ];
  }

  return defaultChallenges;
}

export function getThemePackDisplayName(themeId: string): string {
  switch (themeId) {
    case THEME_PACKS.DEFAULT:
      return "Default Theme";
    case THEME_PACKS.COLLEGE:
      return "College Theme";
    case THEME_PACKS.COUPLE:
      return "Couple Theme";
    default:
      return "Unknown Theme";
  }
}

export function getThemePackEmoji(themeId: string): string {
  switch (themeId) {
    case THEME_PACKS.DEFAULT:
      return "🎯";
    case THEME_PACKS.COLLEGE:
      return "🎓";
    case THEME_PACKS.COUPLE:
      return "💕";
    default:
      return "❓";
  }
} 