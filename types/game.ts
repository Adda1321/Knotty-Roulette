export type GameState = 'setup' | 'playing' | 'gameOver';

export interface Player {
  id: number;
  name: string;
  points: number;
}

export interface Challenge {
  id: number;
  challenge_text: string;
  has_bonus: boolean;
  card_pack?: string; // Theme pack name (e.g., "Original Pack", "College Pack", "Couple Pack")
  created_at?: string;
}

export interface GameResponse {
  id: number;
  response_type: 'upvote' | 'downvote';
  challenge_id: number;
  challenge_text: string;
  response_date: string;
  response_time: string;
}

export interface WheelSegment {
  id: number;
  angle: number;
  color: string;
  action: string;
}

export interface VoteData {
  challengeId: number;
  challengeText: string;
  playerName: string;
  voteType: 'upvote' | 'downvote';
} 