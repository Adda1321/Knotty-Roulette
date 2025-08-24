import { THEME_PACKS } from '../constants/theme';

export interface SampleChallenge {
  challenge_text: string;
  has_bonus: boolean;
}

export function getSampleChallenges(themeId?: string): SampleChallenge[] {
  // Return different challenges based on theme using actual API data
  if (themeId === "college") {
    return [
      {
        challenge_text: "Swap shirts with the person to your left – 👕 Keep it on for one round.",
        has_bonus: false,
      },
      {
        challenge_text: "Read the last DM you sent out loud – 📱 No skipping.",
        has_bonus: false,
      },
      {
        challenge_text: "Post a random selfie in your story – 🤳 Delete after the game if you want.",
        has_bonus: false,
      },
    ];
  } else if (themeId === "couple") {
    return [
      {
        challenge_text: "Make a toast to your partner – The more ridiculous, the better.",
        has_bonus: false,
      },
      {
        challenge_text: "Share the story of your very first crush – Be honest.",
        has_bonus: false,
      },
      {
        challenge_text: "Serenade your partner with any song line – 🎤 Bonus if if it's off-key.",
        has_bonus: true,
      },
    ];
  }

  // Default theme challenges
  return [
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