import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CoachProfile, RecommendationState } from '../types';
import { Sparkles, PlayCircle, X, Lock, Film, TrendingUp } from 'lucide-react';
import { RECOMMENDATION_CYCLE_LENGTH, gamesUntilNextAnalysis } from '../lib/recommendationEngine';

// Coach-chat triggered "quick lesson" videos. Independent from the 3-game
// progression tracker below — this map powers the callout that appears when
// Coach Garry mentions a topic hashtag in the live chat.
export const COACH_VIDEO_MAP: Record<string, { title: string; embedUrl: string; description: string; author: string }> = {
  '#opening-principles': {
    title: 'The Ultimate Chess Opening Guide',
    embedUrl: 'https://www.youtube.com/embed/gL6Xrcf00XQ',
    description: 'Learn the foundational rules of chess openings: fight for the center, develop with threats, and get your king to safety!',
    author: 'GothamChess'
  },
  '#blunder-tactics': {
    title: 'How to Stop Blundering & Find Chess Tactics',
    embedUrl: 'https://www.youtube.com/embed/0BshT_wX9Xo',
    description: 'Stop giving away free pieces! Master the checklist to identify hanging squares, undefended threats, and tactical combinations.',
    author: 'GothamChess'
  },
  '#middlegame-strategy': {
    title: 'Middlegame Strategy Masterclass',
    embedUrl: 'https://www.youtube.com/embed/V6S6t_Sby5Q',
    description: 'Formulate winning plans in the middlegame. Learn how to locate outpost squares, launch pawn storms, and restrict opponent pieces.',
    author: 'GothamChess'
  },
  '#endgame-finesse': {
    title: 'Chess Endgames Masterguide',
    embedUrl: 'https://www.youtube.com/embed/D3_qXb9A2X8',
    description: 'Convert your advantage with precise endgames. Study king activity, pawn promotion mechanics, and key checkmating patterns.',
    author: 'GothamChess'
  },
  '#positional-play': {
    title: 'How to Master Positional Chess',
    embedUrl: 'https://www.youtube.com/embed/S_8p6N8809k',
    description: 'Gain a strategic advantage without tactics. Master open file control, weak squares, passive piece targets, and space advantages.',
    author: 'GothamChess'
  }
};

// Safe mapper that formats any YouTube URL (standard, mobile, watch, shorts, etc.) into a
// proper `/embed/VIDEO_ID` iframe URL so recommendations never surface a broken player.
const getEmbedUrl = (url: string): string => {
  if (!url) return '';
  let videoId = '';
  try {
    if (url.includes('youtube.com/embed/')) {
      return url; // Already formatted
    } else if (url.includes('youtube.com/watch')) {
      const parts = url.split('v=');
      if (parts.length > 1) {
        videoId = parts[1].split('&')[0];
      }
    } else if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts.length > 1) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else if (url.includes('youtube.com/shorts/')) {
      const parts = url.split('youtube.com/shorts/');
      if (parts.length > 1) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else {
      const match = url.match(/[a-zA-Z0-9_-]{11}/);
      if (match) {
        videoId = match[0];
      }
    }
  } catch (e) {
    // Parser fallback
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
};

interface RecommendationsSectionProps {
  coachProfile: CoachProfile;
  gamesPlayed: number;
  recommendationState: RecommendationState | null;
  activeVideoTag?: string | null;
  onClearVideoTag?: () => void;
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  coachProfile,
  gamesPlayed,
  recommendationState,
  activeVideoTag,
  onClearVideoTag,
}) => {
  const videoData = (activeVideoTag && COACH_VIDEO_MAP[activeVideoTag]) ? COACH_VIDEO_MAP[activeVideoTag] : null;

  const hasUnlockedRecommendations = gamesPlayed >= RECOMMENDATION_CYCLE_LENGTH && !!recommendationState;
  const remainingGames = gamesUntilNextAnalysis(gamesPlayed);

  return (
    <div id="recommendations-container" className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl min-h-[290px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Coach Recommendations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalized video lessons targeting your weaknesses, refreshed every {RECOMMENDATION_CYCLE_LENGTH} games
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
          Active Coach: <span className="text-amber-300 font-semibold">{coachProfile.name}</span>
        </div>
      </div>

      {/* Coach-chat triggered quick lesson callout (independent of the 3-game tracker) */}
      <AnimatePresence>
        {videoData && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden border border-amber-500/20 bg-amber-500/[0.02] rounded-xl p-4 md:p-5 relative"
          >
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5" />
                      Coach Chat Suggested This Lesson
                    </span>
                    <span className="text-slate-500 text-xs font-mono">{activeVideoTag}</span>
                  </div>
                  <h3 className="font-display font-black text-white text-base md:text-lg mb-1.5">
                    {videoData.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                    {videoData.description}
                  </p>
                  <p className="text-[11px] text-amber-500/70 font-semibold mt-3">
                    Presenter: {videoData.author}
                  </p>
                </div>

                {onClearVideoTag && (
                  <button
                    onClick={onClearVideoTag}
                    className="mt-4 self-start flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss Video Lesson
                  </button>
                )}
              </div>

              <div className="w-full lg:w-[360px] xl:w-[440px] aspect-video rounded-lg overflow-hidden border border-slate-800 shadow-xl bg-black">
                <iframe
                  className="w-full h-full"
                  src={getEmbedUrl(videoData.embedUrl)}
                  title={videoData.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 3-Game Video Progression Tracker --- */}
      {!hasUnlockedRecommendations ? (
        // NEW USER / LOCKED STATE: fewer than 3 games played, or no analysis run yet.
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-white text-sm md:text-base tracking-wide mb-2">
            Play {RECOMMENDATION_CYCLE_LENGTH} games to unlock personalized video recommendations from Coach Garry.
          </h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
            Coach Garry analyzes your last {RECOMMENDATION_CYCLE_LENGTH} games for recurring weaknesses — tactical blunders,
            back-rank vulnerabilities, opening traps — and hand-picks video lessons to fix them.
          </p>
          <div className="w-full max-w-[220px]">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1.5">
              <span>Progress</span>
              <span>{Math.min(gamesPlayed, RECOMMENDATION_CYCLE_LENGTH)} / {RECOMMENDATION_CYCLE_LENGTH} games</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
              <div
                className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${(Math.min(gamesPlayed, RECOMMENDATION_CYCLE_LENGTH) / RECOMMENDATION_CYCLE_LENGTH) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Based on your last {RECOMMENDATION_CYCLE_LENGTH} games (analyzed at game #{recommendationState!.lastAnalyzedGameCount})
            </span>
            <span className="text-slate-500 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
              Next refresh in {remainingGames} game{remainingGames === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {recommendationState!.videos.map((video) => (
              <motion.div
                key={video.weakness}
                id={`recommendation-video-${video.weakness}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-slate-900 bg-slate-950/60 overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-black">
                  <iframe
                    className="w-full h-full"
                    src={getEmbedUrl(video.embedUrl)}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="p-3.5 flex flex-col gap-2 flex-1">
                  <span className="self-start text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    Targeting: {video.label}
                  </span>
                  <h3 className="font-display font-bold text-white text-xs tracking-wide leading-snug">
                    {video.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {video.description}
                  </p>
                  <p className="text-[10px] text-amber-500/70 font-semibold mt-auto pt-1">
                    Presenter: {video.author}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
