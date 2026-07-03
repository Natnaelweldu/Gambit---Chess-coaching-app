export type RecommendationType = 'tactical' | 'positional' | 'opening' | 'blunder';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  moveSymbol?: string;
  coordinate?: string;
}

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
