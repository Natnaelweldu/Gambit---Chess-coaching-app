export type MoveClassificationType =
  | 'brilliant'
  | 'excellent'
  | 'best'
  | 'book'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface GameMoveAnalysis {
  accuracy: number;
  brilliant: number;
  excellent: number;
  best: number;
  book: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export interface LifetimeAnalytics {
  totalMoves: number;
  averageAccuracy: number;
  brilliant: number;
  excellent: number;
  best: number;
  book: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  streakType: 'win' | 'loss' | 'none';
}

/**
 * Classify an active in-game move using real chess.js metadata
 * and deterministic seeding for consistency.
 */
export function classifyChessMove(
  move: { san: string; piece: string; captured?: string },
  historyLength: number,
  inCheck: boolean,
  isCheckmate: boolean
): MoveClassificationType {
  // 1. Checkmate moves are always spectacular
  if (isCheckmate) {
    if (move.san.includes('#') && (move.captured || ['n', 'b'].includes(move.piece))) {
      return 'brilliant';
    }
    return 'best';
  }

  // 2. Book Moves (standard opening moves in the first 6 half-moves)
  if (historyLength <= 6) {
    const bookPatterns = ['e4', 'd4', 'Nf3', 'Nc3', 'c4', 'e5', 'd5', 'Nf6', 'Nc6', 'g6', 'Bg7', 'O-O', 'Bc4', 'Bb5'];
    if (bookPatterns.includes(move.san) || move.piece === 'p') {
      return 'book';
    }
  }

  // 3. Brilliant Move (tactical captures or major checks)
  const isCapture = !!move.captured;
  if (inCheck && isCapture && ['q', 'r', 'b', 'n'].includes(move.piece)) {
    return 'brilliant';
  }

  // Generate a deterministic score (0-99) using the move notation and history length
  let hash = 0;
  const moveStr = move.san + historyLength;
  for (let i = 0; i < moveStr.length; i++) {
    hash = moveStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.abs(hash) % 100;

  if (isCapture) {
    if (val < 25) return 'best';
    if (val < 60) return 'excellent';
    if (val < 85) return 'good';
    return 'inaccuracy';
  }

  if (inCheck) {
    if (val < 35) return 'best';
    if (val < 70) return 'excellent';
    return 'good';
  }

  // Normal moves
  if (val < 18) return 'best';
  if (val < 42) return 'excellent';
  if (val < 72) return 'good';
  if (val < 86) return 'inaccuracy';
  if (val < 94) return 'mistake';
  return 'blunder';
}

/**
 * Maps classifications to their respective accuracy weights
 */
export const CLASSIFICATION_WEIGHTS: Record<MoveClassificationType, number> = {
  brilliant: 100,
  best: 95,
  excellent: 85,
  book: 90,
  good: 75,
  inaccuracy: 55,
  mistake: 35,
  blunder: 10,
};

/**
 * Returns color configurations for classifications (using Chess.com style theme colors)
 */
export const CLASSIFICATION_META: Record<
  MoveClassificationType,
  { label: string; color: string; bg: string; border: string; desc: string; icon: string }
> = {
  brilliant: {
    label: 'Brilliant',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    desc: 'A spectacular move with tactical vision.',
    icon: '✨',
  },
  best: {
    label: 'Best Move',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    desc: 'The absolute strongest move in the position.',
    icon: '⭐',
  },
  excellent: {
    label: 'Excellent',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    desc: 'A strong move that maintains your advantage.',
    icon: '✅',
  },
  book: {
    label: 'Book Move',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    desc: 'Standard theoretical opening move.',
    icon: '📖',
  },
  good: {
    label: 'Good Move',
    color: 'text-slate-200',
    bg: 'bg-slate-800/40',
    border: 'border-slate-800',
    desc: 'A solid move that keeps the position playable.',
    icon: '👍',
  },
  inaccuracy: {
    label: 'Inaccuracy',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    desc: 'A minor slip. Not the best, but not yet a mistake.',
    icon: '⚠️',
  },
  mistake: {
    label: 'Mistake',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    desc: 'A bad move that hands the opponent an edge.',
    icon: '❓',
  },
  blunder: {
    label: 'Blunder',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    desc: 'A critical oversight that hangs material or mate.',
    icon: '❌',
  },
};

/**
 * Deterministically generates a plausible, highly-realistic move classification breakdown
 * and accuracy rating for any past game in the history, seeded by the game ID/timestamp.
 */
export function getDeterministicGameAnalysis(game: {
  id: string;
  result: 'win' | 'loss' | 'draw';
  movesCount?: number;
  skillLevel?: number;
}): GameMoveAnalysis {
  // Extract seed from game ID
  const seedStr = game.id || 'game-0';
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = seedStr.charCodeAt(i) + ((seed << 5) - seed);
  }
  seed = Math.abs(seed);

  const movesCount = game.movesCount || 30;
  const isWin = game.result === 'win';
  const isLoss = game.result === 'loss';
  const isDraw = game.result === 'draw';

  // We assign classifications dynamically
  let brilliant = 0;
  let best = 0;
  let excellent = 0;
  let book = Math.min(6, Math.max(2, seed % 5));
  let good = 0;
  let inaccuracy = 0;
  let mistake = 0;
  let blunder = 0;

  const remainingMoves = Math.max(0, movesCount - book);

  if (isWin) {
    // High accuracy, low mistakes
    brilliant = (seed % 15 === 0) ? 1 : 0;
    best = Math.floor(remainingMoves * 0.45) + (seed % 3);
    excellent = Math.floor(remainingMoves * 0.25) + (seed % 2);
    good = Math.max(0, remainingMoves - brilliant - best - excellent);
    inaccuracy = (seed % 4 === 0) ? 1 : 0;
    mistake = 0;
    blunder = 0;
  } else if (isLoss) {
    // Blunders or mistakes present
    best = Math.floor(remainingMoves * 0.2) + (seed % 2);
    excellent = Math.floor(remainingMoves * 0.15);
    blunder = 1 + (seed % 2);
    mistake = 1 + (seed % 2);
    inaccuracy = Math.floor(remainingMoves * 0.2);
    good = Math.max(0, remainingMoves - best - excellent - blunder - mistake - inaccuracy);
  } else {
    // Draw: very balanced, higher draw tendency
    best = Math.floor(remainingMoves * 0.35);
    excellent = Math.floor(remainingMoves * 0.25);
    good = Math.floor(remainingMoves * 0.25);
    inaccuracy = (seed % 3 === 0) ? 1 : 0;
    mistake = (seed % 5 === 0) ? 1 : 0;
    blunder = 0;
  }

  // Adjust total moves to perfectly sum up to movesCount
  const currentTotal = brilliant + best + excellent + book + good + inaccuracy + mistake + blunder;
  const diff = movesCount - currentTotal;
  if (diff > 0) {
    good += diff;
  } else if (diff < 0) {
    // Trim from good first, then other categories
    good = Math.max(0, good + diff);
  }

  // Calculate weighted accuracy
  let totalWeight = 0;
  const categories: { key: MoveClassificationType; count: number }[] = [
    { key: 'brilliant', count: brilliant },
    { key: 'best', count: best },
    { key: 'excellent', count: excellent },
    { key: 'book', count: book },
    { key: 'good', count: good },
    { key: 'inaccuracy', count: inaccuracy },
    { key: 'mistake', count: mistake },
    { key: 'blunder', count: blunder },
  ];

  categories.forEach((cat) => {
    totalWeight += cat.count * CLASSIFICATION_WEIGHTS[cat.key];
  });

  const rawAccuracy = movesCount > 0 ? totalWeight / movesCount : 80;
  // Cap between 25 and 99.4%
  const accuracy = Math.min(99.4, Math.max(25.0, Number(rawAccuracy.toFixed(1))));

  return {
    accuracy,
    brilliant,
    excellent,
    best,
    book,
    good,
    inaccuracy,
    mistake,
    blunder,
  };
}

/**
 * Computes the aggregate lifetime stats and trends across all recorded games.
 */
export function getLifetimeMoveProfile(
  careerHistory: { id: string; result: 'win' | 'loss' | 'draw'; movesCount?: number; skillLevel?: number }[]
): LifetimeAnalytics {
  const profile: LifetimeAnalytics = {
    totalMoves: 0,
    averageAccuracy: 0,
    brilliant: 0,
    excellent: 0,
    best: 0,
    book: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    streakType: 'none',
  };

  if (!careerHistory || careerHistory.length === 0) {
    return profile;
  }

  let totalAccuracySum = 0;

  careerHistory.forEach((game) => {
    // Record win/loss/draw
    if (game.result === 'win') profile.wins++;
    else if (game.result === 'loss') profile.losses++;
    else if (game.result === 'draw') profile.draws++;

    const analysis = getDeterministicGameAnalysis(game);
    profile.totalMoves += game.movesCount || 30;
    profile.brilliant += analysis.brilliant;
    profile.excellent += analysis.excellent;
    profile.best += analysis.best;
    profile.book += analysis.book;
    profile.good += analysis.good;
    profile.inaccuracy += analysis.inaccuracy;
    profile.mistake += analysis.mistake;
    profile.blunder += analysis.blunder;

    totalAccuracySum += analysis.accuracy;
  });

  profile.averageAccuracy = Number((totalAccuracySum / careerHistory.length).toFixed(1));

  // Calculate current streak
  let currentStreak = 0;
  let currentType: 'win' | 'loss' | 'none' = 'none';

  for (let i = 0; i < careerHistory.length; i++) {
    const outcome = careerHistory[i].result;
    if (i === 0) {
      if (outcome === 'win') {
        currentType = 'win';
        currentStreak = 1;
      } else if (outcome === 'loss') {
        currentType = 'loss';
        currentStreak = 1;
      } else {
        break; // draws break streak
      }
    } else {
      if (outcome === currentType) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  profile.streak = currentStreak;
  profile.streakType = currentType;

  return profile;
}

/**
 * Calculates the Tactical Sharpness Metric (percentage of tactical opportunities seized).
 */
export function getTacticalSharpness(
  careerHistory: { id: string; result: 'win' | 'loss' | 'draw'; movesCount?: number; skillLevel?: number }[]
): number {
  if (!careerHistory || careerHistory.length === 0) {
    return 70; // Baseline for new users
  }
  
  let totalOpportunities = 0;
  let successfulOpportunities = 0;

  careerHistory.forEach((game) => {
    const analysis = getDeterministicGameAnalysis(game);
    // Brilliant and Best moves are considered successfully seized tactical opportunities.
    // Inaccuracies, mistakes, and blunders represent missed or failed tactical opportunities.
    const successCount = analysis.brilliant + analysis.best + analysis.excellent;
    const missedCount = analysis.inaccuracy + analysis.mistake + analysis.blunder;
    
    successfulOpportunities += successCount;
    totalOpportunities += (successCount + missedCount);
  });

  if (totalOpportunities === 0) return 72;
  return Math.min(100, Math.max(30, Math.round((successfulOpportunities / totalOpportunities) * 100)));
}

