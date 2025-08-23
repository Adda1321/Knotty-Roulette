import { WORDPRESS_CONFIG } from '../config/wordpress';
import { THEME_PACKS } from '../constants/theme';
import { Challenge, VoteData } from '../types/game';

// Helper function to map theme ID to backend name
function getThemeBackendName(themeId: string): string {
  switch (themeId) {
    case THEME_PACKS.DEFAULT:
      return 'Original Pack'; // Maps to backend "Original Pack"
    case THEME_PACKS.COLLEGE:
      return 'College Pack'; // Maps to backend "College Pack" 
    case THEME_PACKS.COUPLE:
      return 'Couple Pack'; // Maps to backend "Couple Pack"
    default:
      return 'Original Pack'; // Fallback to default
  }
}

export async function fetchChallenges(themeId?: string): Promise<Challenge[]> {
  try {
    console.log('=== fetchChallenges called ===');
    console.log('Theme ID:', themeId || 'default');
    
    // Map theme ID to backend name
    const backendThemeName = themeId ? getThemeBackendName(themeId) : 'Original Pack';
    console.log('Backend theme name:', backendThemeName);
    
    console.log('AJAX URL:', WORDPRESS_CONFIG.AJAX_URL);
    console.log('Action:', WORDPRESS_CONFIG.ACTIONS.GET_CHALLENGES);

    // Try with FormData first
    const formData = new FormData();
    formData.append('action', WORDPRESS_CONFIG.ACTIONS.GET_CHALLENGES);
    formData.append('card_pack', backendThemeName); // Add theme filter
    
    console.log('Sending request with FormData...');
    console.log('Theme filter:', backendThemeName);

    const response = await fetch(WORDPRESS_CONFIG.AJAX_URL, {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      // Try to get error details from response
      let errorText = '';
      try {
        errorText = await response.text();
        console.log('Error response body:', errorText);
      } catch (e) {
        console.log('Could not read error response body');
      }
      
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    
    console.log('=== RAW RESPONSE FROM BACKEND ===');
    console.log('Full response:', data);
    console.log('Response success:', data.success);
    console.log('Response data type:', typeof data.data);
    
    if (data.success && data.data) {
      console.log('✅ Fetched challenges from WordPress:', data.data.length, 'challenges');
      console.log('Sample challenge:', data.data[0]);
      console.log('Theme filter applied:', backendThemeName);
      
      // Analyze challenges by theme pack
      console.log('=== CHALLENGE THEME ANALYSIS ===');
      const challengesByTheme: { [key: string]: any[] } = {};
      
      data.data.forEach((challenge: any, index: number) => {
        const theme = challenge.card_pack || 'Default Theme';
        if (!challengesByTheme[theme]) {
          challengesByTheme[theme] = [];
        }
        challengesByTheme[theme].push(challenge);
        
        console.log(`Challenge ${index + 1}:`, {
          id: challenge.id || challenge.challenge_id,
          text: challenge.text || challenge.challenge_text,
          theme: theme,
          hasBonus: challenge.has_bonus,
          createdAt: challenge.created_at
        });
      });
      
      console.log('=== THEME BREAKDOWN ===');
      Object.keys(challengesByTheme).forEach(theme => {
        console.log(`${theme}: ${challengesByTheme[theme].length} challenges`);
      });
      
      // Convert has_bonus from string to boolean
      const processedChallenges = data.data.map((challenge: any) => ({
        ...challenge,
        has_bonus: challenge.has_bonus === "1" || challenge.has_bonus === 1 || challenge.has_bonus === true
      }));
      
      console.log('Processed challenge sample:', processedChallenges[0]);
      return processedChallenges;
    } else {
      console.warn('❌ Failed to fetch challenges from WordPress:', data.data);
      console.log('🔄 Using fallback challenges');
      // Return fallback challenges if API fails
      return getFallbackChallenges(themeId);
    }
  } catch (error) {
    console.error('=== ERROR FETCHING CHALLENGES ===');
    console.error('Error details:', error);
    
    // Try alternative request format as fallback
    try {
      console.log('🔄 Trying alternative request format...');
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('action', WORDPRESS_CONFIG.ACTIONS.GET_CHALLENGES);
      urlEncodedData.append('card_pack', themeId ? getThemeBackendName(themeId) : 'Original Pack');
      
      const altResponse = await fetch(WORDPRESS_CONFIG.AJAX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlEncodedData,
      });
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        console.log('✅ Alternative request succeeded:', altData);
        if (altData.success && altData.data) {
          return altData.data.map((challenge: any) => ({
            ...challenge,
            has_bonus: challenge.has_bonus === "1" || challenge.has_bonus === 1 || challenge.has_bonus === true
          }));
        }
      }
    } catch (altError) {
      console.error('Alternative request also failed:', altError);
    }
    
    // Return fallback challenges on error
    return getFallbackChallenges(themeId);
  }
}

export async function logVote(voteData: VoteData): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('action', WORDPRESS_CONFIG.ACTIONS.LOG_RESPONSE);
    formData.append('response_type', voteData.voteType);
    formData.append('challenge_id', voteData.challengeId.toString());
    formData.append('challenge_text', voteData.challengeText);
    // No nonce required for public API calls

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(WORDPRESS_CONFIG.AJAX_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Server error: Vote submission failed');
    }
    
    return data.success;
  } catch (error) {
    console.error('Error logging vote:', error);
    
    // Re-throw the error with more specific information
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: No internet connection');
    } else if ((error as any).name === 'AbortError' || error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Request timeout: Please try again');
    } else if (error instanceof Error && error.message.includes('HTTP error! status: 500')) {
      throw new Error('Server error: Please try again later');
    } else if (error instanceof Error && error.message.includes('HTTP error! status: 404')) {
      throw new Error('Server error: Service not found');
    } else {
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}

// Fallback challenges in case the API is not available
function getFallbackChallenges(themeId?: string): Challenge[] {
  const backendThemeName = themeId ? getThemeBackendName(themeId) : 'Original Pack';
  const challenges: Challenge[] = [];

  if (backendThemeName === 'Original Pack') {
    challenges.push({
      id: 1,
      challenge_text: "Give a flirty compliment to someone in the group or a stranger – Bonus if a stranger!",
      has_bonus: true,
    });
    challenges.push({
      id: 2,
      challenge_text: "Show off your best dance moves! – Bonus if you commit for at least 10 seconds!",
      has_bonus: true,
    });
    challenges.push({
      id: 3,
      challenge_text: "Ask the bartender or a friend for their best flirting advice – Bonus if you actually try it on someone!",
      has_bonus: true,
    });
    challenges.push({
      id: 4,
      challenge_text: "Flirt with someone using only song lyrics – Bonus if they don't notice!",
      has_bonus: true,
    });
    challenges.push({
      id: 5,
      challenge_text: "Remove your can's tab and flick it like a football through someone's goalpost hands – Miss? Take a sip! Bonus if you make it. 🏈🍻",
      has_bonus: true,
    });
    challenges.push({
      id: 6,
      challenge_text: "Do your best celebrity impression – Bonus if they guess who it is!",
      has_bonus: true,
    });
    challenges.push({
      id: 7,
      challenge_text: "Reveal something about yourself that no one in the group knows – Bonus if it's Knotty!",
      has_bonus: true,
    });
    challenges.push({
      id: 8,
      challenge_text: "Make a toast with only eye contact—no words! – Bonus if someone laughs first!",
      has_bonus: true,
    });
    challenges.push({
      id: 9,
      challenge_text: "Ask the group: \"Would you rather\" and make up a wild scenario – Bonus if everyone answers!",
      has_bonus: true,
    });
    challenges.push({
      id: 10,
      challenge_text: "Say something completely ridiculous with full confidence – Bonus if you get someone to believe it!",
      has_bonus: true,
    });
    challenges.push({
      id: 11,
      challenge_text: "Challenge someone to a dance-off – Loser must finish their drink!",
      has_bonus: false,
    });
    challenges.push({
      id: 12,
      challenge_text: "Challenge someone to a rock-paper-scissors match – Loser takes a sip!",
      has_bonus: false,
    });
    challenges.push({
      id: 13,
      challenge_text: "Buy someone a Knotty Times – Your choice who gets lucky!",
      has_bonus: false,
    });
    challenges.push({
      id: 14,
      challenge_text: "Bottoms up! – Whatever's left in your drink, finish it now!",
      has_bonus: false,
    });
    challenges.push({
      id: 15,
      challenge_text: "Make a toast to the group – The more ridiculous, the better.",
      has_bonus: false,
    });
    challenges.push({
      id: 16,
      challenge_text: "Blow a kiss to someone in the group – Make it obvious.",
      has_bonus: false,
    });
    challenges.push({
      id: 17,
      challenge_text: "Secretly pick someone in the group until your next turn, copy their drink movements without getting caught – If they catch you, finish your drink!",
      has_bonus: false,
    });
    challenges.push({
      id: 18,
      challenge_text: "Clink glasses with someone in the group - give them a ridiculous compliment.",
      has_bonus: false,
    });
    challenges.push({
      id: 19,
      challenge_text: "Do a fake pickup line on someone in the group – The cheesier, the better!",
      has_bonus: false,
    });
    challenges.push({
      id: 20,
      challenge_text: "Take a sip & stare at someone until they notice – No breaking eye contact!",
      has_bonus: false,
    });
    challenges.push({
      id: 21,
      challenge_text: "Let the group decide if you should take a sip, take a shot, or skip this round - majority rules! 🍻🔥",
      has_bonus: false,
    });
    challenges.push({
      id: 22,
      challenge_text: "Announce another player's drink choice like a sports commentator giving a play-by-play! – Hold your drink like a pretend mic while doing it!",
      has_bonus: false,
    });
    challenges.push({
      id: 23,
      challenge_text: "Start a chant – Even if it's just \"One more round!\"",
      has_bonus: false,
    });
    challenges.push({
      id: 24,
      challenge_text: "Pretend you know a stranger for 30 seconds – Sell it!",
      has_bonus: false,
    });
    challenges.push({
      id: 25,
      challenge_text: "Do an exaggerated sexy walk to the bathroom – Full confidence!",
      has_bonus: false,
    });
    challenges.push({
      id: 26,
      challenge_text: "Take a selfie with someone in the group – Make it extra dramatic.",
      has_bonus: false,
    });
    challenges.push({
      id: 27,
      challenge_text: "Try to get someone in the group to high-five you without asking – Be creative!",
      has_bonus: false,
    });
    challenges.push({
      id: 28,
      challenge_text: "Let the person to your left make up a dare for you – No backing out!",
      has_bonus: false,
    });
    challenges.push({
      id: 29,
      challenge_text: "Start an impromptu karaoke moment – Even if there's no karaoke.",
      has_bonus: false,
    });
    challenges.push({
      id: 30,
      challenge_text: "Whisper a random word in someone's ear – Then walk away like nothing happened.",
      has_bonus: false,
    });
    challenges.push({
      id: 31,
      challenge_text: "The group picks three people (real or fictional) and presents them to the chosen player. That player must decide who to Fuck, Marry, or Kill - no backing out!",
      has_bonus: false,
    });
    challenges.push({
      id: 32,
      challenge_text: "Say something spicy in the most innocent voice possible – Keep a straight face!",
      has_bonus: false,
    });
    challenges.push({
      id: 33,
      challenge_text: "Lick your lips & wink at someone in the group – See if they react.",
      has_bonus: false,
    });
    challenges.push({
      id: 34,
      challenge_text: "Make eye contact with someone in the group for 10 seconds – No breaking first!",
      has_bonus: false,
    });
    challenges.push({
      id: 35,
      challenge_text: "Take a sip without using your hands – Get creative!",
      has_bonus: false,
    });
    challenges.push({
      id: 36,
      challenge_text: "Whisper a made-up secret to someone in the group – Make it juicy.",
      has_bonus: false,
    });
    challenges.push({
      id: 37,
      challenge_text: "Tell the group your worst pickup line ever – Then try using it!",
      has_bonus: false,
    });
    challenges.push({
      id: 38,
      challenge_text: "Get a stranger to fist-bump you – No explanation allowed.",
      has_bonus: false,
    });
    challenges.push({
      id: 39,
      challenge_text: "Try to make someone in the group blush – No touching allowed!",
      has_bonus: false,
    });
    challenges.push({
      id: 40,
      challenge_text: "Hold eye contact with someone while slowly sipping your drink – No blinking!",
      has_bonus: false,
    });
    challenges.push({
      id: 41,
      challenge_text: "Tell the group about your most embarrassing night out moment – No holding back.",
      has_bonus: false,
    });
    challenges.push({
      id: 42,
      challenge_text: "Pick a dance move and do it for the next 10 seconds – No stopping!",
      has_bonus: false,
    });
    challenges.push({
      id: 43,
      challenge_text: "Do an over-the-top dramatic reaction to the next thing someone says – Oscar-worthy.",
      has_bonus: false,
    });
    challenges.push({
      id: 44,
      challenge_text: "Ask someone in the group a \"truth or dare\" question – They must answer!",
      has_bonus: false,
    });
    challenges.push({
      id: 45,
      challenge_text: "Let someone in the group come up with a \"new name\" for you – Use it for the rest of the game!",
      has_bonus: false,
    });
    challenges.push({
      id: 46,
      challenge_text: "Find out a fun fact about the person sitting next to you – Then share it!",
      has_bonus: false,
    });
    challenges.push({
      id: 47,
      challenge_text: "Make up a wild story about how you and another player met – Sell it like it's 100% true!",
      has_bonus: false,
    });
    challenges.push({
      id: 48,
      challenge_text: "Fake a phone call and have a dramatic conversation – Keep it entertaining!",
      has_bonus: false,
    });
    challenges.push({
      id: 49,
      challenge_text: "Give an overly dramatic apology to the group for something you didn't do the more ridiculous the better – No laughing!",
      has_bonus: false,
    });
    challenges.push({
      id: 50,
      challenge_text: "Say a 'Never Have I Ever' statement - anyone who's done it takes a sip! 🍻🔥",
      has_bonus: false,
    });
    challenges.push({
      id: 51,
      challenge_text: "Who is most likely to [do something wild or embarrassing]? – The group votes, and the person with the most votes drinks! 😆",
      has_bonus: false,
    });
    challenges.push({
      id: 52,
      challenge_text: "Balance your drink on the back of your hand and try to take a sip without spilling. – Spill? Drink again! 🍹🎭",
      has_bonus: false,
    });
    challenges.push({
      id: 53,
      challenge_text: "Drink, then flip your empty cup or coaster onto the table - first to land it wins! – Loser drinks! 🔄🍺",
      has_bonus: false,
    });
    challenges.push({
      id: 54,
      challenge_text: "Go around the table counting aloud, but say 'Knotty' instead of any number with a 7 or a multiple of 7! - Mess up? Take a sip! 🔢🍻",
      has_bonus: false,
    });
    challenges.push({
      id: 55,
      challenge_text: "Name a famous person. The next player must say a name that starts with the last letter of yours. – Can't think of one? Drink! 🎤🔥",
      has_bonus: false,
    });
    challenges.push({
      id: 56,
      challenge_text: "Tell the group two truths and one lie about yourself. The group must guess which one is the lie. - Whoever guesses wrong must finish their drink!",
      has_bonus: false,
    });
    challenges.push({
      id: 57,
      challenge_text: "The group picks an accent, and the chosen player must speak in that accent until their next turn - no backing out!",
      has_bonus: false,
    });
    challenges.push({
      id: 58,
      challenge_text: "Say the alphabet backwards - If successful every other player must take a sip. If not, you need to.",
      has_bonus: false,
    });
    challenges.push({
      id: 59,
      challenge_text: "Call someone you know and say \"I need to hide a body\" – No voice mail",
      has_bonus: false,
    });
    challenges.push({
      id: 60,
      challenge_text: "Act out a charade no talking you have 2 minutes - if the group guesses correctly they drink if not you drink.",
      has_bonus: false,
    });
    challenges.push({
      id: 61,
      challenge_text: "You must only refer to yourself by name for the next two rounds – Forget? drink.",
      has_bonus: false,
    });
    challenges.push({
      id: 62,
      challenge_text: "Swap shirts with the person to your right for two rounds - No shirt, no swap, no excuses…",
      has_bonus: false,
    });
  } else if (backendThemeName === 'College Pack') {
    // College-themed challenges
    challenges.push({
      id: 101,
      challenge_text: "Challenge someone to a dance-off – Loser must finish their drink!",
      has_bonus: false,
    });
    challenges.push({
      id: 102,
      challenge_text: "Start a chant – Even if it's just \"One more round!\"",
      has_bonus: false,
    });
    challenges.push({
      id: 103,
      challenge_text: "Pretend you know a stranger for 30 seconds – Sell it!",
      has_bonus: false,
    });
    challenges.push({
      id: 104,
      challenge_text: "Do an exaggerated sexy walk to the bathroom – Full confidence!",
      has_bonus: false,
    });
    challenges.push({
      id: 105,
      challenge_text: "Take a selfie with someone in the group – Make it extra dramatic.",
      has_bonus: false,
    });
    challenges.push({
      id: 106,
      challenge_text: "Try to get someone in the group to high-five you without asking – Be creative!",
      has_bonus: false,
    });
    challenges.push({
      id: 107,
      challenge_text: "Let the person to your left make up a dare for you – No backing out!",
      has_bonus: false,
    });
    challenges.push({
      id: 108,
      challenge_text: "Start an impromptu karaoke moment – Even if there's no karaoke.",
      has_bonus: false,
    });
    challenges.push({
      id: 109,
      challenge_text: "Whisper a random word in someone's ear – Then walk away like nothing happened.",
      has_bonus: false,
    });
    challenges.push({
      id: 110,
      challenge_text: "The group picks three people (real or fictional) and presents them to the chosen player. That player must decide who to Fuck, Marry, or Kill - no backing out!",
      has_bonus: false,
    });
    challenges.push({
      id: 111,
      challenge_text: "Say something spicy in the most innocent voice possible – Keep a straight face!",
      has_bonus: false,
    });
    challenges.push({
      id: 112,
      challenge_text: "Lick your lips & wink at someone in the group – See if they react.",
      has_bonus: false,
    });
    challenges.push({
      id: 113,
      challenge_text: "Make eye contact with someone in the group for 10 seconds – No breaking first!",
      has_bonus: false,
    });
    challenges.push({
      id: 114,
      challenge_text: "Take a sip without using your hands – Get creative!",
      has_bonus: false,
    });
    challenges.push({
      id: 115,
      challenge_text: "Whisper a made-up secret to someone in the group – Make it juicy.",
      has_bonus: false,
    });
    challenges.push({
      id: 116,
      challenge_text: "Tell the group your worst pickup line ever – Then try using it!",
      has_bonus: false,
    });
    challenges.push({
      id: 117,
      challenge_text: "Get a stranger to fist-bump you – No explanation allowed.",
      has_bonus: false,
    });
    challenges.push({
      id: 118,
      challenge_text: "Try to make someone in the group blush – No touching allowed!",
      has_bonus: false,
    });
    challenges.push({
      id: 119,
      challenge_text: "Hold eye contact with someone while slowly sipping your drink – No blinking!",
      has_bonus: false,
    });
    challenges.push({
      id: 120,
      challenge_text: "Tell the group about your most embarrassing night out moment – No holding back.",
      has_bonus: false,
    });
  } else if (backendThemeName === 'Couple Pack') {
    // Couple-themed challenges
    challenges.push({
      id: 201,
      challenge_text: "Make eye contact with someone in the group for 10 seconds – No breaking first!",
      has_bonus: false,
    });
    challenges.push({
      id: 202,
      challenge_text: "Whisper a made-up secret to someone in the group – Make it juicy.",
      has_bonus: false,
    });
    challenges.push({
      id: 203,
      challenge_text: "Try to make someone in the group blush – No touching allowed!",
      has_bonus: false,
    });
    challenges.push({
      id: 204,
      challenge_text: "Hold eye contact with someone while slowly sipping your drink – No blinking!",
      has_bonus: false,
    });
    challenges.push({
      id: 205,
      challenge_text: "Tell the group about your most embarrassing night out moment – No holding back.",
      has_bonus: false,
    });
    challenges.push({
      id: 206,
      challenge_text: "Pick a dance move and do it for the next 10 seconds – No stopping!",
      has_bonus: false,
    });
    challenges.push({
      id: 207,
      challenge_text: "Do an over-the-top dramatic reaction to the next thing someone says – Oscar-worthy.",
      has_bonus: false,
    });
    challenges.push({
      id: 208,
      challenge_text: "Ask someone in the group a \"truth or dare\" question – They must answer!",
      has_bonus: false,
    });
    challenges.push({
      id: 209,
      challenge_text: "Let someone in the group come up with a \"new name\" for you – Use it for the rest of the game!",
      has_bonus: false,
    });
    challenges.push({
      id: 210,
      challenge_text: "Find out a fun fact about the person sitting next to you – Then share it!",
      has_bonus: false,
    });
    challenges.push({
      id: 211,
      challenge_text: "Make up a wild story about how you and another player met – Sell it like it's 100% true!",
      has_bonus: false,
    });
    challenges.push({
      id: 212,
      challenge_text: "Fake a phone call and have a dramatic conversation – Keep it entertaining!",
      has_bonus: false,
    });
    challenges.push({
      id: 213,
      challenge_text: "Give an overly dramatic apology to the group for something you didn't do the more ridiculous the better – No laughing!",
      has_bonus: false,
    });
    challenges.push({
      id: 214,
      challenge_text: "Say a 'Never Have I Ever' statement - anyone who's done it takes a sip! 🍻🔥",
      has_bonus: false,
    });
    challenges.push({
      id: 215,
      challenge_text: "Who is most likely to [do something wild or embarrassing]? – The group votes, and the person with the most votes drinks! 😆",
      has_bonus: false,
    });
    challenges.push({
      id: 216,
      challenge_text: "Balance your drink on the back of your hand and try to take a sip without spilling. – Spill? Drink again! 🍹🎭",
      has_bonus: false,
    });
    challenges.push({
      id: 217,
      challenge_text: "Drink, then flip your empty cup or coaster onto the table - first to land it wins! – Loser drinks! 🔄🍺",
      has_bonus: false,
    });
    challenges.push({
      id: 218,
      challenge_text: "Go around the table counting aloud, but say 'Knotty' instead of any number with a 7 or a multiple of 7! - Mess up? Take a sip! 🔢🍻",
      has_bonus: false,
    });
    challenges.push({
      id: 219,
      challenge_text: "Name a famous person. The next player must say a name that starts with the last letter of yours. – Can't think of one? Drink! 🎤🔥",
      has_bonus: false,
    });
    challenges.push({
      id: 220,
      challenge_text: "Tell the group two truths and one lie about yourself. The group must guess which one is the lie. - Whoever guesses wrong must finish their drink!",
      has_bonus: false,
    });
  }
  
  console.log(`🎨 Using fallback challenges for theme: ${backendThemeName} (${challenges.length} challenges)`);
  return challenges;
} 