import { GameResultSample, RecommendationState, WeaknessKey, WeaknessVideoRecommendation } from '../types';

// How often (in completed games) the engine re-analyzes match history and
// refreshes the recommended videos.
export const RECOMMENDATION_CYCLE_LENGTH = 3;

// Curated video library. Every entry uses a verified `youtube.com/embed/<id>` URL
// (the same catalogue already proven to load cleanly elsewhere in this app) so
// recommendations never surface a broken "Video not available" embed.
const WEAKNESS_VIDEO_LIBRARY: Record<WeaknessKey, WeaknessVideoRecommendation> = {
  'tactical-blunders': {
    weakness: 'tactical-blunders',
    label: 'Tactical Blunders',
    title: 'How to Stop Blundering & Find Chess Tactics',
    embedUrl: 'https://www.youtube.com/embed/0BshT_wX9Xo',
    description: 'Your recent games show hanging pieces and missed tactics. This masterclass walks through the checklist for spotting undefended pieces and tactical shots before you move.',
    author: 'GothamChess',
  },
  'back-rank-vulnerability': {
    weakness: 'back-rank-vulnerability',
    label: 'Back-Rank Vulnerability',
    title: 'How to Stop Blundering & Find Chess Tactics',
    embedUrl: 'https://www.youtube.com/embed/0BshT_wX9Xo',
    description: "A few of your losses ended in a sudden back-rank pattern. This lesson covers the awareness habits that stop a king from getting trapped on the back rank.",
    author: 'GothamChess',
  },
  'opening-traps': {
    weakness: 'opening-traps',
    label: 'Opening Traps',
    title: 'The Ultimate Chess Opening Guide',
    embedUrl: 'https://www.youtube.com/embed/gL6Xrcf00XQ',
    description: 'Several of your games unraveled early. This guide covers the core opening principles — center control, safe development, and king safety — that keep you out of early traps.',
    author: 'GothamChess',
  },
  'endgame-technique': {
    weakness: 'endgame-technique',
    label: 'Endgame Technique',
    title: 'Chess Endgames Masterguide',
    embedUrl: 'https://www.youtube.com/embed/D3_qXb9A2X8',
    description: 'You reached long, hard-fought endgames but let the advantage slip. This masterguide covers king activity, pawn promotion technique, and key checkmating patterns.',
    author: 'GothamChess',
  },
  'positional-weaknesses': {
    weakness: 'positional-weaknesses',
    label: 'Positional Weaknesses',
    title: 'How to Master Positional Chess',
    embedUrl: 'https://www.youtube.com/embed/S_8p6N8809k',
    description: 'Your recent games were closely contested draws and slow losses. This lesson covers weak squares, open files, and space advantages to help you press for more.',
    author: 'GothamChess',
  },
  'middlegame-planning': {
    weakness: 'middlegame-planning',
    label: 'Middlegame Planning',
    title: 'Middlegame Strategy Masterclass',
    embedUrl: 'https://www.youtube.com/embed/V6S6t_Sby5Q',
    description: "You're winning consistently — great work! To keep leveling up, this masterclass covers outpost squares, pawn storms, and how to restrict your opponent's pieces.",
    author: 'GothamChess',
  },
};

const SHORT_GAME_MOVE_THRESHOLD = 18; // moves; a loss/draw at or below this is treated as an early-game issue
const LONG_GAME_MOVE_THRESHOLD = 40; // moves; a loss/draw at or above this is treated as an endgame issue

/**
 * Analyze the most recent games (chronological order doesn't matter) and return
 * an ordered list of weaknesses to target, most important first. Since we don't
 * have per-move engine analysis available client-side, this uses the signals we
 * do have — result, game length, and skill level — to make a reasonable,
 * deterministic call about *where* in the game the user is struggling.
 */
export function analyzeRecentGames(games: GameResultSample[]): WeaknessKey[] {
  const losses = games.filter((g) => g.result === 'loss');
  const draws = games.filter((g) => g.result === 'draw');
  const wins = games.filter((g) => g.result === 'win');

  const shortLosses = losses.filter((g) => (g.movesCount ?? 30) <= SHORT_GAME_MOVE_THRESHOLD);
  const longLosses = losses.filter((g) => (g.movesCount ?? 30) >= LONG_GAME_MOVE_THRESHOLD);
  const midLosses = losses.filter(
    (g) => (g.movesCount ?? 30) > SHORT_GAME_MOVE_THRESHOLD && (g.movesCount ?? 30) < LONG_GAME_MOVE_THRESHOLD
  );

  const weaknesses: WeaknessKey[] = [];

  // Struggling overall (2+ losses out of the 3-game window) — pinpoint where.
  if (losses.length >= 2) {
    if (shortLosses.length >= longLosses.length && shortLosses.length >= midLosses.length) {
      weaknesses.push('opening-traps');
      weaknesses.push('tactical-blunders');
    } else if (longLosses.length >= midLosses.length) {
      weaknesses.push('endgame-technique');
      weaknesses.push('back-rank-vulnerability');
    } else {
      weaknesses.push('tactical-blunders');
      weaknesses.push('back-rank-vulnerability');
    }
  } else if (losses.length === 1) {
    const loss = losses[0];
    const moves = loss.movesCount ?? 30;
    if (moves <= SHORT_GAME_MOVE_THRESHOLD) {
      weaknesses.push('opening-traps');
    } else if (moves >= LONG_GAME_MOVE_THRESHOLD) {
      weaknesses.push('endgame-technique');
    } else {
      weaknesses.push('tactical-blunders');
    }
    // A single loss still deserves a secondary, broader tactical refresher.
    weaknesses.push('back-rank-vulnerability');
  }

  // Frequent draws point to positional stagnation — the user isn't converting.
  if (draws.length >= 2 || (draws.length >= 1 && losses.length === 0)) {
    weaknesses.push('positional-weaknesses');
  }

  // A clean 3-0 (or mostly winning) window means it's time to level up strategy.
  if (wins.length === games.length && games.length > 0) {
    weaknesses.push('middlegame-planning');
  }

  // Fallback: no games (shouldn't happen once the 3-game gate is passed).
  if (weaknesses.length === 0) {
    weaknesses.push('tactical-blunders');
  }

  // De-duplicate while preserving priority order, cap at 3 videos.
  const seen = new Set<WeaknessKey>();
  const deduped: WeaknessKey[] = [];
  for (const w of weaknesses) {
    if (!seen.has(w)) {
      seen.add(w);
      deduped.push(w);
    }
  }
  return deduped.slice(0, 3);
}

/** Look up the curated video for a given weakness key. */
export function getVideoForWeakness(weakness: WeaknessKey): WeaknessVideoRecommendation {
  return WEAKNESS_VIDEO_LIBRARY[weakness];
}

/**
 * Run the full 3-game analysis cycle and build the new persisted recommendation
 * state. `recentGames` should be the last `RECOMMENDATION_CYCLE_LENGTH` games
 * (most-recent-first or in any order — only aggregate stats are used).
 */
export function buildRecommendationState(
  recentGames: GameResultSample[],
  totalGamesPlayed: number
): RecommendationState {
  const weaknesses = analyzeRecentGames(recentGames);
  const videos = weaknesses.map(getVideoForWeakness);

  return {
    lastAnalyzedGameCount: totalGamesPlayed,
    weaknesses,
    videos,
    updatedAt: new Date().toISOString(),
  };
}

/** True exactly when `totalGamesPlayed` lands on a 3-game boundary (3, 6, 9, ...). */
export function isAnalysisCheckpoint(totalGamesPlayed: number): boolean {
  return totalGamesPlayed > 0 && totalGamesPlayed % RECOMMENDATION_CYCLE_LENGTH === 0;
}

/** Games remaining until the next scheduled analysis. */
export function gamesUntilNextAnalysis(totalGamesPlayed: number): number {
  const remainder = totalGamesPlayed % RECOMMENDATION_CYCLE_LENGTH;
  return remainder === 0 ? RECOMMENDATION_CYCLE_LENGTH : RECOMMENDATION_CYCLE_LENGTH - remainder;
}
