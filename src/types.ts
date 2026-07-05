export interface ChatMessage {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: string;
  isThinking?: boolean;
}

export type CoachStyle = 'aggressive' | 'positional' | 'balanced' | 'historical';

export interface CoachProfile {
  name: string;
  title: string;
  avatar: string;
  style: CoachStyle;
  description: string;
  rating: number;
}

// A lightweight, serializable view of a completed game — just enough for the
// recommendation engine to spot patterns without depending on the full career
// history record shape used elsewhere in the app.
export interface GameResultSample {
  result: 'win' | 'loss' | 'draw';
  movesCount?: number;
  skillLevel?: number;
}

// The concrete weaknesses the 3-game analysis engine can identify. Each maps to
// exactly one curated video in the recommendation engine's video library.
export type WeaknessKey =
  | 'tactical-blunders'
  | 'back-rank-vulnerability'
  | 'opening-traps'
  | 'endgame-technique'
  | 'positional-weaknesses'
  | 'middlegame-planning';

export interface WeaknessVideoRecommendation {
  weakness: WeaknessKey;
  label: string;
  title: string;
  embedUrl: string;
  description: string;
  author: string;
}

// Persisted recommendation state — only ever updated once every 3 games, and
// synced to Supabase so it survives page refreshes.
export interface RecommendationState {
  lastAnalyzedGameCount: number;
  weaknesses: WeaknessKey[];
  videos: WeaknessVideoRecommendation[];
  updatedAt: string;
}
