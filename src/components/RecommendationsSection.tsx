import React from 'react';
import { motion } from 'motion/react';
import { Recommendation, CoachProfile } from '../types';
import { Sparkles, Swords, BookOpen, Compass, CheckCircle2, AlertTriangle, ArrowRight, PlayCircle, X } from 'lucide-react';

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

// Safe mapper that formats any YouTube URL (standard, mobile, watch, shorts, etc.) to a proper embed URL
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
  activeRecommendationId: string | null;
  setActiveRecommendationId: (id: string | null) => void;
  onSelectRecommendation: (squares: string[]) => void;
  coachHintActive: boolean;
  activeVideoTag?: string | null;
  onClearVideoTag?: () => void;
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  coachProfile,
  activeRecommendationId,
  setActiveRecommendationId,
  onSelectRecommendation,
  coachHintActive,
  activeVideoTag,
  onClearVideoTag,
}) => {
  const videoData = (activeVideoTag && COACH_VIDEO_MAP[activeVideoTag]) ? COACH_VIDEO_MAP[activeVideoTag] : null;

  // Static recommendations mapped visually. We can toggle their emphasis.
  const getRecommendations = (): Recommendation[] => {
    const base: Recommendation[] = [
      {
        id: 'rec-1',
        type: 'tactical',
        title: 'Exploit the f7 Coordinate',
        description: 'Coordinate your Queen (h5) and Bishop (c4) for an immediate tactical strike. Black has no safe way to defend f7 if pressured correctly.',
        severity: 'danger',
        moveSymbol: 'Qxf7+ or Bxf7+',
        coordinate: 'f7',
      },
      {
        id: 'rec-2',
        type: 'positional',
        title: 'Establish Central Control',
        description: 'Support your e4 pawn. Maintain high knight activity on f3 to prevent any d5 pawn counters from Black.',
        severity: 'info',
        moveSymbol: 'Nf3-g5 or c3',
        coordinate: 'e4',
      },
      {
        id: 'rec-3',
        type: 'opening',
        title: 'Italian Game Theory Advantage',
        description: 'Your position is highly active. Book statistics show a +1.4 advantage for White when maintaining piece pressure on the kingside.',
        severity: 'success',
        moveSymbol: 'Italian Game setup',
        coordinate: 'c4',
      },
    ];

    // If Svetlana (positional coach) is selected, emphasize positional key first or adjust styling
    if (coachProfile.style === 'positional') {
      return [
        {
          id: 'rec-2',
          type: 'positional',
          title: 'Establish Central Control (Recommended)',
          description: 'Svetlana advises: Control the center. Maintain high knight activity on f3 to stifle Black\'s counterplay.',
          severity: 'info',
          moveSymbol: 'Nf3-g5 or c3',
          coordinate: 'e4',
        },
        {
          id: 'rec-1',
          type: 'tactical',
          title: 'Exploit the f7 Coordinate',
          description: 'Coordinate your Queen and Bishop. A classic tactical weak spot in the Italian opening.',
          severity: 'danger',
          moveSymbol: 'Qxf7+ or Bxf7+',
          coordinate: 'f7',
        },
        {
          id: 'rec-3',
          type: 'opening',
          title: 'Italian Game Theory Advantage',
          description: 'White holds a beautiful space advantage. Focus on slow expansion with c3 and d3.',
          severity: 'success',
          moveSymbol: 'Italian Game setup',
          coordinate: 'c4',
        },
      ];
    }

    return base;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tactical':
        return <Swords className="w-4 h-4 text-rose-400" />;
      case 'positional':
        return <Compass className="w-4 h-4 text-sky-400" />;
      case 'opening':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'danger':
        return <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono font-medium">Tactical Strike</span>;
      case 'warning':
        return <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-medium">Warning</span>;
      case 'success':
        return <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium">Book Theory</span>;
      case 'info':
      default:
        return <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono font-medium">Positional Plan</span>;
    }
  };

  const handleCardClick = (rec: Recommendation) => {
    if (activeRecommendationId === rec.id) {
      // Deselect
      setActiveRecommendationId(null);
      onSelectRecommendation([]);
    } else {
      setActiveRecommendationId(rec.id);
      
      // Map coordinate to chessboard squares
      if (rec.coordinate === 'f7') {
        onSelectRecommendation(['f7', 'c4', 'h5']);
      } else if (rec.coordinate === 'e4') {
        onSelectRecommendation(['e4', 'd4', 'f3']);
      } else if (rec.coordinate === 'c4') {
        onSelectRecommendation(['c4', 'e2', 'f3']);
      } else {
        onSelectRecommendation([]);
      }
    }
  };

  return (
    <div id="recommendations-container" className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl min-h-[290px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Coach Recommendations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Click any recommendation to visualize tactical lines and squares on the chessboard</p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
          Active Coach: <span className="text-amber-300 font-semibold">{coachProfile.name}</span>
        </div>
      </div>

      {videoData && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden border border-amber-500/20 bg-amber-500/[0.02] rounded-xl p-4 md:p-5 mb-5 relative"
        >
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <PlayCircle className="w-3.5 h-3.5" />
                    AI Recommended Video Lesson
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {getRecommendations().map((rec) => {
          const isActive = activeRecommendationId === rec.id;
          return (
            <motion.div
              key={rec.id}
              id={`recommendation-card-${rec.id}`}
              onClick={() => handleCardClick(rec)}
              className={`group relative rounded-xl p-4 transition-all duration-300 cursor-pointer border flex flex-col justify-between h-[185px] ${
                isActive
                  ? 'bg-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-950/60 hover:bg-slate-900/60 border-slate-900 hover:border-slate-800'
              }`}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-colors">
                      {getIcon(rec.type)}
                    </span>
                    <h3 className="font-display font-bold text-white text-xs tracking-wide group-hover:text-amber-300 transition-colors truncate max-w-[110px] sm:max-w-[130px] md:max-w-[100px] lg:max-w-[140px]">
                      {rec.title}
                    </h3>
                  </div>
                  {getSeverityBadge(rec.severity)}
                </div>

                <div className="h-16 overflow-y-auto pr-1 text-[11px] text-slate-400 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                  {rec.description}
                </div>
              </div>

              {/* Action and highlight tag at the bottom */}
              <div className="mt-2 pt-2 border-t border-slate-900/80 flex items-center justify-between text-[10px]">
                {rec.moveSymbol && (
                  <span className="font-mono bg-slate-900/80 text-amber-400 px-1.5 py-0.5 rounded border border-slate-800">
                    {rec.moveSymbol}
                  </span>
                )}
                
                <span className="text-slate-500 font-medium group-hover:text-amber-400 transition-colors flex items-center gap-1">
                  {isActive ? 'Showing Lines' : 'Visualize Lines'}
                  <ArrowRight className={`w-3 h-3 transition-transform ${isActive ? 'rotate-90 text-amber-400' : 'group-hover:translate-x-1'}`} />
                </span>
              </div>

              {/* Glowing active bar indicator */}
              {isActive && (
                <div className="absolute -left-px top-3 bottom-3 w-1 bg-amber-500 rounded-r" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
