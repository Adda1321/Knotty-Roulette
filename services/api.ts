import AsyncStorage from "@react-native-async-storage/async-storage";
import { WORDPRESS_CONFIG } from "../config/wordpress";
import { THEME_PACKS } from "../constants/theme";
import { Challenge, VoteData } from "../types/game";

// Helper function to map theme ID to backend name
function getThemeBackendName(themeId: string): string {
  const backendName = (() => {
    switch (themeId) {
      case THEME_PACKS.DEFAULT:
        return "Original Pack";
      case THEME_PACKS.COLLEGE:
        return "College Pack";
      case THEME_PACKS.COUPLE:
        return "Romantic Pack"; // Changed from "Couple Pack" to match API response
      default:
        return "Original Pack";
    }
  })();
  
  console.log(`🎨 Theme mapping: "${themeId}" -> "${backendName}"`);
  return backendName;
}

// Helper function to get or generate a persistent anonymous ID
async function getAnonymousId(): Promise<string> {
  try {
    const storedId = await AsyncStorage.getItem("krt_anonymous_id");
    if (storedId) {
      return storedId;
    }

    // Generate new ID if none exists - simple and clean format
    const newId = `mobile_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await AsyncStorage.setItem("krt_anonymous_id", newId);
    return newId;
  } catch (error) {
    console.error("Error getting anonymous ID:", error);
    // Fallback to generating a new ID each time
    return `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Cache for all challenges to avoid repeated API calls
let allChallengesCache: Challenge[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch all challenges and cache them
export async function fetchAllChallenges(): Promise<Challenge[]> {
  try {
    const now = Date.now();
    if (allChallengesCache && now - lastFetchTime < CACHE_DURATION) {
      console.log(
        "📦 Using cached challenges (age:",
        Math.round((now - lastFetchTime) / 1000),
        "seconds)"
      );
      return allChallengesCache;
    }

    console.log("🔄 Fetching all challenges from REST API...");
    const url = `${WORDPRESS_CONFIG.REST_API_BASE}${WORDPRESS_CONFIG.ENDPOINTS.CHALLENGES}`;
    console.log("🌐 API URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const rawChallenges = await response.json();
    console.log("📡 Raw API Response:", rawChallenges);
    console.log("📡 Response type:", typeof rawChallenges);
    console.log(
      "📡 Response length:",
      Array.isArray(rawChallenges) ? rawChallenges.length : "Not an array"
    );

    if (Array.isArray(rawChallenges) && rawChallenges.length > 0) {
      console.log("✅ Processing challenges from API...");

      // Log first few raw challenges to see structure
      console.log("🔍 First 3 raw challenges:", rawChallenges.slice(0, 3));

      allChallengesCache = rawChallenges.map((challenge: any) => ({
        id: challenge.id,
        challenge_text: challenge.challenge_text,
        has_bonus: challenge.has_bonus === 1,
        card_pack: challenge.card_pack,
        created_at: challenge.created_at,
      }));

      // Debug: Log a few challenges to see the card_pack structure
      console.log("🔍 Sample challenges with card_pack:");
      allChallengesCache.slice(0, 5).forEach((challenge, index) => {
        console.log(`   Challenge ${index + 1}:`, {
          id: challenge.id,
          card_pack: challenge.card_pack,
          card_pack_type: typeof challenge.card_pack,
          text_preview: challenge.challenge_text.substring(0, 40) + "..."
        });
      });

      lastFetchTime = now;

      // Log theme breakdown
      const themeBreakdown = allChallengesCache.reduce(
        (acc: any, challenge) => {
          acc[challenge.card_pack || "Unknown"] =
            (acc[challenge.card_pack || "Unknown"] || 0) + 1;
          return acc;
        },
        {}
      );

      console.log("🎨 Theme breakdown:", themeBreakdown);
      console.log("📦 Total challenges cached:", allChallengesCache.length);

      return allChallengesCache;
    } else {
      throw new Error("No challenges returned from API");
    }
  } catch (error) {
    console.error("❌ Error fetching all challenges:", error);
    if (allChallengesCache) {
      console.log("📦 Returning cached challenges due to error");
      return allChallengesCache;
    }
    console.log("🆘 Using fallback challenges due to error");
    return getFallbackChallenges();
  }
}

// Function to get challenges by theme from cached data
export function getChallengesByTheme(themeId?: string): Challenge[] {
  if (!allChallengesCache) {
    console.log("❌ No challenges cache available, using fallback");
    return getFallbackChallenges(themeId);
  }

  const backendThemeName = themeId
    ? getThemeBackendName(themeId)
    : "Original Pack";
  console.log(
    `🔍 Filtering challenges for theme: "${themeId}" -> backend: "${backendThemeName}"`
  );

  const filteredChallenges = allChallengesCache.filter(
    (challenge) => challenge.card_pack === backendThemeName
  );

  console.log(`📊 Challenge filtering results:`);
  console.log(`   - Total cached challenges: ${allChallengesCache.length}`);
  console.log(
    `   - Challenges for "${backendThemeName}": ${filteredChallenges.length}`
  );
  console.log(`   - Available card_packs in cache:`, [
    ...new Set(allChallengesCache.map((c) => c.card_pack)),
  ]);

  if (filteredChallenges.length === 0) {
    console.log(
      `⚠️ No challenges found for theme "${backendThemeName}", using fallback`
    );
    return getFallbackChallenges(themeId);
  }

  // Log first few challenges for debugging
  console.log(
    `🎯 First 3 challenges for "${backendThemeName}":`,
    filteredChallenges.slice(0, 3).map((c) => ({
      id: c.id,
      text: c.challenge_text.substring(0, 50) + "...",
      card_pack: c.card_pack,
      has_bonus: c.has_bonus,
    }))
  );

  return filteredChallenges;
}

// Main function to fetch challenges for a specific theme
export async function fetchChallenges(themeId?: string): Promise<Challenge[]> {
  try {
    console.log(`🎯 fetchChallenges called with themeId: "${themeId}"`);

    await fetchAllChallenges(); // Ensure all challenges are cached
    const challenges = getChallengesByTheme(themeId); // Return challenges filtered by theme

    console.log(
      `✅ fetchChallenges returning ${challenges.length} challenges for theme "${themeId}"`
    );
    return challenges;
  } catch (error) {
    console.error(`❌ Error in fetchChallenges for theme "${themeId}":`, error);
    console.log(`🆘 Using fallback challenges for theme "${themeId}"`);
    return getFallbackChallenges(themeId);
  }
}

// Function to submit a vote (like/dislike)
export async function logVote(voteData: VoteData): Promise<{
  success: boolean;
  already_voted: boolean;
  likes: number;
  dislikes: number;
}> {
  try {
    const url = `${WORDPRESS_CONFIG.REST_API_BASE}${WORDPRESS_CONFIG.ENDPOINTS.VOTE}`;
    const anonId = await getAnonymousId();

    const payload = {
      challenge_id: voteData.challengeId,
      vote: voteData.voteType === "upvote" ? "like" : "dislike",
      anon_id: anonId,
    };

    console.log("Sending vote to REST API:", payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("Vote response:", data);

    if (!data.success) {
      throw new Error("Server error: Vote submission failed");
    }

    return {
      success: data.success,
      already_voted: data.already_voted || false,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
    };
  } catch (error) {
    console.error("Error logging vote:", error);

    // Re-throw with specific error messages
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: No internet connection");
    } else if (
      (error as any).name === "AbortError" ||
      (error instanceof Error && error.message.includes("timeout"))
    ) {
      throw new Error("Request timeout: Please try again");
    } else if (
      error instanceof Error &&
      error.message.includes("HTTP error! status: 500")
    ) {
      throw new Error("Server error: Please try again later");
    } else if (
      error instanceof Error &&
      error.message.includes("HTTP error! status: 404")
    ) {
      throw new Error("Server error: Service not found");
    } else {
      throw new Error(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
}

// Function to track game plays for analytics
export async function trackPlay(): Promise<{
  unique_players: number;
  total_plays: number;
} | null> {
  try {
    const url = `${WORDPRESS_CONFIG.REST_API_BASE}${WORDPRESS_CONFIG.ENDPOINTS.TRACK_PLAY}`;
    const anonId = await getAnonymousId();

    const payload = { anon_id: anonId };
    console.log("Tracking play with REST API:", payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("Track play response:", data);

    if (!data.success) {
      throw new Error("Server error: Play tracking failed");
    }

    return {
      unique_players: data.unique_players,
      total_plays: data.total_plays,
    };
  } catch (error) {
    console.error("Error tracking play:", error);
    // Don't throw error for tracking - it's not critical for gameplay
    return null;
  }
}

// Fallback challenges in case the API is not available
function getFallbackChallenges(themeId?: string): Challenge[] {
  const backendThemeName = themeId
    ? getThemeBackendName(themeId)
    : "Original Pack";
  const challenges: Challenge[] = [];

  if (backendThemeName === "Original Pack") {
    challenges.push(
      {
        id: 1,
        challenge_text:
          "Give a flirty compliment to someone in the group or a stranger – Bonus if a stranger!",
        has_bonus: true,
      },
      {
        id: 2,
        challenge_text:
          "Show off your best dance moves! – Bonus if you commit for at least 10 seconds!",
        has_bonus: true,
      },
      {
        id: 3,
        challenge_text:
          "Ask the bartender or a friend for their best flirting advice – Bonus if you actually try it on someone!",
        has_bonus: true,
      },
      {
        id: 4,
        challenge_text:
          "Flirt with someone using only song lyrics – Bonus if they don't notice!",
        has_bonus: true,
      },
      {
        id: 5,
        challenge_text:
          "Remove your can's tab and flick it like a football through someone's goalpost hands – Miss? Take a sip! Bonus if you make it. 🏈🍻",
        has_bonus: true,
      },
      {
        id: 6,
        challenge_text:
          "Do your best celebrity impression – Bonus if they guess who it is!",
        has_bonus: true,
      },
      {
        id: 7,
        challenge_text:
          "Reveal something about yourself that no one in the group knows – Bonus if it's Knotty!",
        has_bonus: true,
      },
      {
        id: 8,
        challenge_text:
          "Make a toast with only eye contact—no words! – Bonus if someone laughs first!",
        has_bonus: true,
      },
      {
        id: 9,
        challenge_text:
          'Ask the group: "Would you rather" and make up a wild scenario – Bonus if everyone answers!',
        has_bonus: true,
      },
      {
        id: 10,
        challenge_text:
          "Say something completely ridiculous with full confidence – Bonus if you get someone to believe it!",
        has_bonus: true,
      },
      {
        id: 11,
        challenge_text:
          "Challenge someone to a dance-off – Loser must finish their drink!",
        has_bonus: false,
      },
      {
        id: 12,
        challenge_text:
          "Challenge someone to a rock-paper-scissors match – Loser takes a sip!",
        has_bonus: false,
      },
      {
        id: 13,
        challenge_text:
          "Buy someone a Knotty Times – Your choice who gets lucky!",
        has_bonus: false,
      },
      {
        id: 14,
        challenge_text:
          "Bottoms up! – Whatever's left in your drink, finish it now!",
        has_bonus: false,
      },
      {
        id: 15,
        challenge_text:
          "Make a toast to the group – The more ridiculous, the better.",
        has_bonus: false,
      },
      {
        id: 16,
        challenge_text:
          "Blow a kiss to someone in the group – Make it obvious.",
        has_bonus: false,
      },
      {
        id: 17,
        challenge_text:
          "Secretly pick someone in the group until your next turn, copy their drink movements without getting caught – If they catch you, finish your drink!",
        has_bonus: false,
      },
      {
        id: 18,
        challenge_text:
          "Clink glasses with someone in the group - give them a ridiculous compliment.",
        has_bonus: false,
      },
      {
        id: 19,
        challenge_text:
          "Do a fake pickup line on someone in the group – The cheesier, the better!",
        has_bonus: false,
      },
      {
        id: 20,
        challenge_text:
          "Take a sip & stare at someone until they notice – No breaking eye contact!",
        has_bonus: false,
      },
      {
        id: 21,
        challenge_text:
          "Let the group decide if you should take a sip, take a shot, or skip this round - majority rules! 🍻🔥",
        has_bonus: false,
      },
      {
        id: 22,
        challenge_text:
          "Announce another player's drink choice like a sports commentator giving a play-by-play! – Hold your drink like a pretend mic while doing it!",
        has_bonus: false,
      },
      {
        id: 23,
        challenge_text: 'Start a chant – Even if it\'s just "One more round!"',
        has_bonus: false,
      },
      {
        id: 24,
        challenge_text: "Pretend you know a stranger for 30 seconds – Sell it!",
        has_bonus: false,
      },
      {
        id: 25,
        challenge_text:
          "Do an exaggerated sexy walk to the bathroom – Full confidence!",
        has_bonus: false,
      },
      {
        id: 26,
        challenge_text:
          "Take a selfie with someone in the group – Make it extra dramatic.",
        has_bonus: false,
      },
      {
        id: 27,
        challenge_text:
          "Try to get someone in the group to high-five you without asking – Be creative!",
        has_bonus: false,
      },
      {
        id: 28,
        challenge_text:
          "Let the person to your left make up a dare for you – No backing out!",
        has_bonus: false,
      },
      {
        id: 29,
        challenge_text:
          "Start an impromptu karaoke moment – Even if there's no karaoke.",
        has_bonus: false,
      },
      {
        id: 30,
        challenge_text:
          "Whisper a random word in someone's ear – Then walk away like nothing happened.",
        has_bonus: false,
      },
      {
        id: 31,
        challenge_text:
          "The group picks three people (real or fictional) and presents them to the chosen player. That player must decide who to Fuck, Marry, or Kill - no backing out!",
        has_bonus: false,
      },
      {
        id: 32,
        challenge_text:
          "Say something spicy in the most innocent voice possible – Keep a straight face!",
        has_bonus: false,
      },
      {
        id: 33,
        challenge_text:
          "Lick your lips & wink at someone in the group – See if they react.",
        has_bonus: false,
      },
      {
        id: 34,
        challenge_text:
          "Make eye contact with someone in the group for 10 seconds – No breaking first!",
        has_bonus: false,
      },
      {
        id: 35,
        challenge_text: "Take a sip without using your hands – Get creative!",
        has_bonus: false,
      },
      {
        id: 36,
        challenge_text:
          "Whisper a made-up secret to someone in the group – Make it juicy.",
        has_bonus: false,
      },
      {
        id: 37,
        challenge_text:
          "Tell the group your worst pickup line ever – Then try using it!",
        has_bonus: false,
      },
      {
        id: 38,
        challenge_text:
          "Get a stranger to fist-bump you – No explanation allowed.",
        has_bonus: false,
      },
      {
        id: 39,
        challenge_text:
          "Try to make someone in the group blush – No touching allowed!",
        has_bonus: false,
      },
      {
        id: 40,
        challenge_text:
          "Hold eye contact with someone while slowly sipping your drink – No blinking!",
        has_bonus: false,
      },
      {
        id: 41,
        challenge_text:
          "Tell the group about your most embarrassing night out moment – No holding back.",
        has_bonus: false,
      },
      {
        id: 42,
        challenge_text:
          "Pick a dance move and do it for the next 10 seconds – No stopping!",
        has_bonus: false,
      },
      {
        id: 43,
        challenge_text:
          "Do an over-the-top dramatic reaction to the next thing someone says – Oscar-worthy.",
        has_bonus: false,
      },
      {
        id: 44,
        challenge_text:
          'Ask someone in the group a "truth or dare" question – They must answer!',
        has_bonus: false,
      },
      {
        id: 45,
        challenge_text:
          'Let someone in the group come up with a "new name" for you – Use it for the rest of the game!',
        has_bonus: false,
      },
      {
        id: 46,
        challenge_text:
          "Find out a fun fact about the person sitting next to you – Then share it!",
        has_bonus: false,
      },
      {
        id: 47,
        challenge_text:
          "Make up a wild story about how you and another player met – Sell it like it's 100% true!",
        has_bonus: false,
      },
      {
        id: 48,
        challenge_text:
          "Fake a phone call and have a dramatic conversation – Keep it entertaining!",
        has_bonus: false,
      },
      {
        id: 49,
        challenge_text:
          "Give an overly dramatic apology to the group for something you didn't do the more ridiculous the better – No laughing!",
        has_bonus: false,
      },
      {
        id: 50,
        challenge_text:
          "Say a 'Never Have I Ever' statement - anyone who's done it takes a sip! 🍻🔥",
        has_bonus: false,
      },
      {
        id: 51,
        challenge_text:
          "Who is most likely to [do something wild or embarrassing]? – The group votes, and the person with the most votes drinks! 😆",
        has_bonus: false,
      },
      {
        id: 52,
        challenge_text:
          "Balance your drink on the back of your hand and try to take a sip without spilling. – Spill? Drink again! 🍹🎭",
        has_bonus: false,
      },
      {
        id: 53,
        challenge_text:
          "Drink, then flip your empty cup or coaster onto the table - first to land it wins! – Loser drinks! 🔄🍺",
        has_bonus: false,
      },
      {
        id: 54,
        challenge_text:
          "Go around the table counting aloud, but say 'Knotty' instead of any number with a 7 or a multiple of 7! - Mess up? Take a sip! 🔢🍻",
        has_bonus: false,
      },
      {
        id: 55,
        challenge_text:
          "Name a famous person. The next player must say a name that starts with the last letter of yours. – Can't think of one? Drink! 🎤🔥",
        has_bonus: false,
      },
      {
        id: 56,
        challenge_text:
          "Tell the group two truths and one lie about yourself. The group must guess which one is the lie. - Whoever guesses wrong must finish their drink!",
        has_bonus: false,
      },
      {
        id: 57,
        challenge_text:
          "The group picks an accent, and the chosen player must speak in that accent until their next turn - no backing out!",
        has_bonus: false,
      },
      {
        id: 58,
        challenge_text:
          "Say the alphabet backwards - If successful every other player must take a sip. If not, you need to.",
        has_bonus: false,
      },
      {
        id: 59,
        challenge_text:
          'Call someone you know and say "I need to hide a body" – No voice mail',
        has_bonus: false,
      },
      {
        id: 60,
        challenge_text:
          "Act out a charade no talking you have 2 minutes - if the group guesses correctly they drink if not you drink.",
        has_bonus: false,
      },
      {
        id: 61,
        challenge_text:
          "You must only refer to yourself by name for the next two rounds – Forget? drink.",
        has_bonus: false,
      },
      {
        id: 62,
        challenge_text:
          "Swap shirts with the person to your right for two rounds - No shirt, no swap, no excuses…",
        has_bonus: false,
      }
    );
  } else if (backendThemeName === "College Pack") {
    challenges.push(
      {
        id: 101,
        challenge_text:
          "Challenge someone to a dance-off – Loser must finish their drink!",
        has_bonus: false,
      },
      {
        id: 102,
        challenge_text: 'Start a chant – Even if it\'s just "One more round!"',
        has_bonus: false,
      },
      {
        id: 103,
        challenge_text: "Pretend you know a stranger for 30 seconds – Sell it!",
        has_bonus: false,
      },
      {
        id: 104,
        challenge_text:
          "Do an exaggerated sexy walk to the bathroom – Full confidence!",
        has_bonus: false,
      },
      {
        id: 105,
        challenge_text:
          "Take a selfie with someone in the group – Make it extra dramatic.",
        has_bonus: false,
      },
      {
        id: 106,
        challenge_text:
          "Try to get someone in the group to high-five you without asking – Be creative!",
        has_bonus: false,
      },
      {
        id: 107,
        challenge_text:
          "Let the person to your left make up a dare for you – No backing out!",
        has_bonus: false,
      },
      {
        id: 108,
        challenge_text:
          "Start an impromptu karaoke moment – Even if there's no karaoke.",
        has_bonus: false,
      },
      {
        id: 109,
        challenge_text:
          "Whisper a random word in someone's ear – Then walk away like nothing happened.",
        has_bonus: false,
      },
      {
        id: 110,
        challenge_text:
          "The group picks three people (real or fictional) and presents them to the chosen player. That player must decide who to Fuck, Marry, or Kill - no backing out!",
        has_bonus: false,
      },
      {
        id: 111,
        challenge_text:
          "Say something spicy in the most innocent voice possible – Keep a straight face!",
        has_bonus: false,
      },
      {
        id: 112,
        challenge_text:
          "Lick your lips & wink at someone in the group – See if they react.",
        has_bonus: false,
      },
      {
        id: 113,
        challenge_text:
          "Make eye contact with someone in the group for 10 seconds – No breaking first!",
        has_bonus: false,
      },
      {
        id: 114,
        challenge_text: "Take a sip without using your hands – Get creative!",
        has_bonus: false,
      },
      {
        id: 115,
        challenge_text:
          "Whisper a made-up secret to someone in the group – Make it juicy.",
        has_bonus: false,
      },
      {
        id: 116,
        challenge_text:
          "Tell the group your worst pickup line ever – Then try using it!",
        has_bonus: false,
      },
      {
        id: 117,
        challenge_text:
          "Get a stranger to fist-bump you – No explanation allowed.",
        has_bonus: false,
      },
      {
        id: 118,
        challenge_text:
          "Try to make someone in the group blush – No touching allowed!",
        has_bonus: false,
      },
      {
        id: 119,
        challenge_text:
          "Hold eye contact with someone while slowly sipping your drink – No blinking!",
        has_bonus: false,
      },
      {
        id: 120,
        challenge_text:
          "Tell the group about your most embarrassing night out moment – No holding back.",
        has_bonus: false,
      }
    );
  } else if (backendThemeName === "Romantic Pack") {
    challenges.push(
      {
        id: 201,
        challenge_text:
          "Make eye contact with someone in the group for 10 seconds – No breaking first!",
        has_bonus: false,
      },
      {
        id: 202,
        challenge_text:
          "Whisper a made-up secret to someone in the group – Make it juicy.",
        has_bonus: false,
      },
      {
        id: 203,
        challenge_text:
          "Try to make someone in the group blush – No touching allowed!",
        has_bonus: false,
      },
      {
        id: 204,
        challenge_text:
          "Hold eye contact with someone while slowly sipping your drink – No blinking!",
        has_bonus: false,
      },
      {
        id: 205,
        challenge_text:
          "Tell the group about your most embarrassing night out moment – No holding back.",
        has_bonus: false,
      },
      {
        id: 206,
        challenge_text:
          "Pick a dance move and do it for the next 10 seconds – No stopping!",
        has_bonus: false,
      },
      {
        id: 207,
        challenge_text:
          "Do an over-the-top dramatic reaction to the next thing someone says – Oscar-worthy.",
        has_bonus: false,
      },
      {
        id: 208,
        challenge_text:
          'Ask someone in the group a "truth or dare" question – They must answer!',
        has_bonus: false,
      },
      {
        id: 209,
        challenge_text:
          'Let someone in the group come up with a "new name" for you – Use it for the rest of the game!',
        has_bonus: false,
      },
      {
        id: 210,
        challenge_text:
          "Find out a fun fact about the person sitting next to you – Then share it!",
        has_bonus: false,
      },
      {
        id: 211,
        challenge_text:
          "Make up a wild story about how you and another player met – Sell it like it's 100% true!",
        has_bonus: false,
      },
      {
        id: 212,
        challenge_text:
          "Fake a phone call and have a dramatic conversation – Keep it entertaining!",
        has_bonus: false,
      },
      {
        id: 213,
        challenge_text:
          "Give an overly dramatic apology to the group for something you didn't do the more ridiculous the better – No laughing!",
        has_bonus: false,
      },
      {
        id: 214,
        challenge_text:
          "Say a 'Never Have I Ever' statement - anyone who's done it takes a sip! 🍻🔥",
        has_bonus: false,
      },
      {
        id: 215,
        challenge_text:
          "Who is most likely to [do something wild or embarrassing]? – The group votes, and the person with the most votes drinks! 😆",
        has_bonus: false,
      },
      {
        id: 216,
        challenge_text:
          "Balance your drink on the back of your hand and try to take a sip without spilling. – Spill? Drink again! 🍹🎭",
        has_bonus: false,
      },
      {
        id: 217,
        challenge_text:
          "Drink, then flip your empty cup or coaster onto the table - first to land it wins! – Loser drinks! 🔄🍺",
        has_bonus: false,
      },
      {
        id: 218,
        challenge_text:
          "Go around the table counting aloud, but say 'Knotty' instead of any number with a 7 or a multiple of 7! - Mess up? Take a sip! 🔢🍻",
        has_bonus: false,
      },
      {
        id: 219,
        challenge_text:
          "Name a famous person. The next player must say a name that starts with the last letter of yours. – Can't think of one? Drink! 🎤🔥",
        has_bonus: false,
      },
      {
        id: 220,
        challenge_text:
          "Tell the group two truths and one lie about yourself. The group must guess which one is the lie. - Whoever guesses wrong must finish their drink!",
        has_bonus: false,
      }
    );
  }

  console.log(
    `🎨 Using fallback challenges for theme: ${backendThemeName} (${challenges.length} challenges)`
  );
  return challenges;
}
