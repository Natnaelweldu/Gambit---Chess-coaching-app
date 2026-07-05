import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChessboardSection } from './components/ChessboardSection';
import { CoachChatSection } from './components/CoachChatSection';
import { RecommendationsSection } from './components/RecommendationsSection';
import { ChessReportCard } from './components/ChessReportCard';
import { CoachProfile, RecommendationState } from './types';
import { Shield, Sparkles, Trophy, BookOpen, Clock, Activity, Users, History, TrendingUp, Trash2, Award, Loader2 } from 'lucide-react';
import { supabase, loadUserStats, saveUserStats } from './lib/supabase';
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { AuthGateway } from './components/AuthGateway';
import { buildRecommendationState, isAnalysisCheckpoint, RECOMMENDATION_CYCLE_LENGTH } from './lib/recommendationEngine';

const DEFAULT_COACH: CoachProfile = {
  name: 'Garry',
  title: 'Grandmaster AI Coach',
  avatar: '👨‍🏫',
  style: 'aggressive',
  description: 'Dynamic, tactical genius focusing on attacking lines and crushing sacrifices.',
  rating: 2850,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'report' | 'career'>('recommendations');
  const [coachProfile, setCoachProfile] = useState<CoachProfile>(DEFAULT_COACH);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [coachHintActive, setCoachHintActive] = useState<boolean>(false);
  const [activeVideoTag, setActiveVideoTag] = useState<string | null>(null);

  // Supabase Auth and Sync States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Live game state trackers
  const [gameFen, setGameFen] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [inCheck, setInCheck] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | 'active'>('active');

  // Outcome tracker state to prevent double-recording
  const [outcomeRecorded, setOutcomeRecorded] = useState<boolean>(false);

  // Profile States from localStorage
  const [skillLevel, setSkillLevelState] = useState<number>(() => {
    const saved = localStorage.getItem('chess_coach_skill_level');
    return saved ? Math.min(20, Math.max(1, parseInt(saved, 10))) : 1;
  });

  const [eloRating, setEloRating] = useState<string>(() => {
    return localStorage.getItem('chess_coach_elo_rating') || '1200 Elo';
  });

  const [careerHistory, setCareerHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('chess_coach_game_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachMemory, setCoachMemory] = useState<string>(() => {
    return localStorage.getItem('chess_coach_memory') || '';
  });

  // Video-driven, 3-game-cycle recommendation state (persisted to Supabase / localStorage)
  const [recommendationState, setRecommendationState] = useState<RecommendationState | null>(() => {
    try {
      const saved = localStorage.getItem('chessCoach_recommendationState');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Setter wrapper that propagates to state and localStorage (and Supabase if authenticated)
  const setSkillLevel = (lvl: number) => {
    const clamped = Math.min(20, Math.max(1, lvl));
    setSkillLevelState(clamped);
    localStorage.setItem('chess_coach_skill_level', clamped.toString());

    let reportCardObj = null;
    try {
      const raw = localStorage.getItem('chessCoach_reportCard');
      if (raw) reportCardObj = JSON.parse(raw);
    } catch (e) {}

    saveUserStats(currentUser, {
      skillLevel: clamped,
      eloRating: eloRating,
      careerHistory: careerHistory,
      reportCard: reportCardObj,
      recommendationState: recommendationState,
      coachMemory: coachMemory,
    });
  };

  // Load and sync stats when user logs in or auth state changes
  const handleFetchAndSyncStats = async (user: any) => {
    const stats = await loadUserStats(user);
    setSkillLevelState(stats.skillLevel);
    setEloRating(stats.eloRating);
    setCareerHistory(stats.careerHistory);
    setRecommendationState(stats.recommendationState || null);
    setCoachMemory(stats.coachMemory || '');
    if (stats.reportCard) {
      localStorage.setItem('chessCoach_reportCard', JSON.stringify(stats.reportCard));
      window.dispatchEvent(new Event("reportCardUpdated"));
    }
  };

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        handleFetchAndSyncStats(session.user).finally(() => {
          setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    }).catch(() => {
      setAuthLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await handleFetchAndSyncStats(session.user);
      } else {
        setCurrentUser(null);
        // Reset to guest localStorage values
        const savedSkill = localStorage.getItem('chess_coach_skill_level');
        const localSkill = savedSkill ? Math.min(20, Math.max(1, parseInt(savedSkill, 10))) : 1;
        const localElo = localStorage.getItem('chess_coach_elo_rating') || '1200 Elo';
        let localHistory = [];
        try {
          const rawHist = localStorage.getItem('chess_coach_game_history');
          if (rawHist) localHistory = JSON.parse(rawHist);
        } catch (e) {}
        let localRecommendationState: RecommendationState | null = null;
        try {
          const rawRec = localStorage.getItem('chessCoach_recommendationState');
          if (rawRec) localRecommendationState = JSON.parse(rawRec);
        } catch (e) {}
        const localMemory = localStorage.getItem('chess_coach_memory') || '';
        setSkillLevelState(localSkill);
        setEloRating(localElo);
        setCareerHistory(localHistory);
        setRecommendationState(localRecommendationState);
        setCoachMemory(localMemory);
        window.dispatchEvent(new Event("reportCardUpdated"));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to asynchronously generate recommendations via our new dynamic backend endpoint
  const fetchDynamicRecommendations = async (updatedHistory: any[], targetSkill: number, targetElo: string, reportCardObj: any) => {
    try {
      const recentGames = updatedHistory.slice(0, RECOMMENDATION_CYCLE_LENGTH).map((g) => ({
        result: g.result,
        movesCount: g.movesCount,
        skillLevel: g.skillLevel,
      }));

      // Gather chat history from localStorage
      let chatHistory = [];
      try {
        const rawChat = localStorage.getItem('chess_coach_chat_history');
        if (rawChat) chatHistory = JSON.parse(rawChat);
      } catch (e) {}

      const response = await fetch('/api/coach/analyze-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentGames,
          chatHistory,
          coachProfile,
          userProfile: {
            skillLevel: targetSkill,
            eloRating: targetElo,
            totalGamesPlayed: updatedHistory.length,
          }
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setRecommendationState(data);
      localStorage.setItem('chessCoach_recommendationState', JSON.stringify(data));

      saveUserStats(currentUser, {
        skillLevel: targetSkill,
        eloRating: targetElo,
        careerHistory: updatedHistory,
        reportCard: reportCardObj,
        recommendationState: data,
        coachMemory: coachMemory,
      });
    } catch (err) {
      console.error('Failed to retrieve dynamic recommendations, using local generator fallback:', err);
      const fallbackState = buildRecommendationState(
        updatedHistory.slice(0, RECOMMENDATION_CYCLE_LENGTH).map((g) => ({
          result: g.result,
          movesCount: g.movesCount,
          skillLevel: g.skillLevel,
        })),
        updatedHistory.length
      );
      setRecommendationState(fallbackState);
      localStorage.setItem('chessCoach_recommendationState', JSON.stringify(fallbackState));

      saveUserStats(currentUser, {
        skillLevel: targetSkill,
        eloRating: targetElo,
        careerHistory: updatedHistory,
        reportCard: reportCardObj,
        recommendationState: fallbackState,
        coachMemory: coachMemory,
      });
    }
  };

  // Function to process a finished game
  const trackGameOutcome = (result: 'win' | 'loss' | 'draw') => {
    if (outcomeRecorded) return;
    setOutcomeRecorded(true);

    const currentEloNum = parseInt(eloRating) || 1200;
    let eloChange = 0;
    let newSkill = skillLevel;

    if (result === 'win') {
      newSkill = Math.min(20, skillLevel + 1);
      eloChange = 15 + Math.floor(Math.random() * 10); // +15 to +24
    } else if (result === 'loss') {
      eloChange = -(10 + Math.floor(Math.random() * 5)); // -10 to -14
    } else {
      eloChange = -2 + Math.floor(Math.random() * 5); // -2 to +2
    }

    const newEloNum = Math.max(800, currentEloNum + eloChange);
    const newEloStr = `${newEloNum} Elo`;

    setSkillLevelState(newSkill);
    setEloRating(newEloStr);

    const newRecord = {
      id: `game-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      result,
      skillLevel: skillLevel,
      eloBefore: `${currentEloNum} Elo`,
      eloAfter: newEloStr,
      eloChange: eloChange >= 0 ? `+${eloChange}` : `${eloChange}`,
      movesCount: gameHistory.length || 1,
    };

    const updatedHistory = [newRecord, ...careerHistory];
    setCareerHistory(updatedHistory);

    localStorage.setItem('chess_coach_skill_level', newSkill.toString());
    localStorage.setItem('chess_coach_elo_rating', newEloStr);
    localStorage.setItem('chess_coach_game_history', JSON.stringify(updatedHistory));

    // --- 3-game recommendation cycle ---
    // Only re-analyze and refresh the video recommendations exactly every 3 games
    // (game_count === 3, 6, 9, ...). Every other game, the existing recommendation
    // state is simply carried forward unchanged.
    const isCheckpoint = isAnalysisCheckpoint(updatedHistory.length);

    // Update chessCoach_reportCard in localStorage
    let reportCard: any = null;
    try {
      const raw = localStorage.getItem('chessCoach_reportCard');
      if (raw) {
        reportCard = JSON.parse(raw);
      }
    } catch (e) {
      console.error(e);
    }

    if (!reportCard) {
      reportCard = {
        player: {
          name: "Alex Morgan",
          initials: "AM",
          rankTitle: newEloNum < 1200 ? "Beginner" : newEloNum < 1600 ? "Class C \u00b7 Rising" : "Tactical Specialist",
          currentRating: newEloNum,
        },
        ratingHistory: [
          { game: 1, elo: 1392, result: "loss" },
          { game: 2, elo: 1405, result: "win" },
          { game: 3, elo: 1398, result: "loss" },
          { game: 4, elo: 1421, result: "win" },
          { game: 5, elo: 1440, result: "win" },
          { game: 6, elo: 1435, result: "loss" },
          { game: 7, elo: 1458, result: "win" },
          { game: 8, elo: 1470, result: "win" },
          { game: 9, elo: 1465, result: "loss" },
          { game: 10, elo: newEloNum, result: result },
        ],
        level: {
          current: Math.max(1, Math.floor(newSkill / 3) + 1),
          next: Math.max(1, Math.floor(newSkill / 3) + 2),
          label: newSkill < 5 ? "Tactical Apprentice" : newSkill < 12 ? "Positional Strategist" : "Master Class",
          nextLabel: newSkill < 5 ? "Positional Strategist" : "Master Class",
          xp: (newSkill * 40) % 400,
          xpNeeded: 400,
        },
        badges: [
          {
            id: "zero-blunders",
            glyph: "\u265B",
            title: "Zero Blunders",
            desc: "No blunders across your last 5 rated games",
            earned: "2 days ago",
          },
          {
            id: "endgame-ace",
            glyph: "\u265A",
            title: "Endgame Ace",
            desc: "92% conversion rate in won endgames",
            earned: "5 days ago",
          },
          {
            id: "five-streak",
            glyph: "\u265E",
            title: "5-Game Streak",
            desc: "Five consecutive wins without a loss",
            earned: "1 week ago",
          },
          {
            id: "opening-scholar",
            glyph: "\u265D",
            title: "Opening Scholar",
            desc: "Studied 12 opening lines in depth this month",
            earned: "1 week ago",
          },
        ],
      };
    } else {
      reportCard.player.currentRating = newEloNum;
      reportCard.player.rankTitle = newEloNum < 1200 ? "Beginner" : newEloNum < 1600 ? "Class C \u00b7 Rising" : "Tactical Specialist";
      
      const newGameIndex = reportCard.ratingHistory.length + 1;
      reportCard.ratingHistory.push({
        game: newGameIndex,
        elo: newEloNum,
        result: result
      });
      
      if (reportCard.ratingHistory.length > 10) {
        reportCard.ratingHistory = reportCard.ratingHistory.slice(-10).map((h: any, idx: number) => ({
          ...h,
          game: idx + 1
        }));
      }

      reportCard.level = {
        current: Math.max(1, Math.floor(newSkill / 3) + 1),
        next: Math.max(1, Math.floor(newSkill / 3) + 2),
        label: newSkill < 5 ? "Tactical Apprentice" : newSkill < 12 ? "Positional Strategist" : "Master Class",
        nextLabel: newSkill < 5 ? "Positional Strategist" : "Master Class",
        xp: (newSkill * 40) % 400,
        xpNeeded: 400,
      };
    }

    // Unlock special dynamic badges!
    if (result === 'win') {
      const hasKnight = reportCard.badges.some((b: any) => b.id === 'stockfish-slayer');
      if (!hasKnight) {
        reportCard.badges.unshift({
          id: 'stockfish-slayer',
          glyph: "\u265E",
          title: "Stockfish Slayer",
          desc: `Defeated the engine at level ${skillLevel}!`,
          earned: "Just now"
        });
      }
    } else if (result === 'loss') {
      const hasPawn = reportCard.badges.some((b: any) => b.id === 'valiant-effort');
      if (!hasPawn) {
        reportCard.badges.unshift({
          id: 'valiant-effort',
          glyph: "\u265F",
          title: "Valiant Effort",
          desc: "Fought standard theory against advanced engines.",
          earned: "Just now"
        });
      }
    }

    localStorage.setItem('chessCoach_reportCard', JSON.stringify(reportCard));

    if (isCheckpoint) {
      fetchDynamicRecommendations(updatedHistory, newSkill, newEloStr, reportCard);
    } else {
      saveUserStats(currentUser, {
        skillLevel: newSkill,
        eloRating: newEloStr,
        careerHistory: updatedHistory,
        reportCard: reportCard,
        recommendationState: recommendationState,
        coachMemory: coachMemory,
      });
    }
    window.dispatchEvent(new Event("reportCardUpdated"));
  };

  const handleResetCareer = () => {
    if (confirm('Are you sure you want to reset all your career profile statistics and game history?')) {
      localStorage.removeItem('chess_coach_skill_level');
      localStorage.removeItem('chess_coach_elo_rating');
      localStorage.removeItem('chess_coach_game_history');
      localStorage.removeItem('chessCoach_reportCard');
      localStorage.removeItem('chessCoach_recommendationState');
      localStorage.removeItem('chess_coach_memory');
      localStorage.removeItem('chess_coach_chat_history');
      setSkillLevelState(1);
      setEloRating('1200 Elo');
      setCareerHistory([]);
      setRecommendationState(null);
      setCoachMemory('');
      setOutcomeRecorded(false);

      saveUserStats(currentUser, {
        skillLevel: 1,
        eloRating: '1200 Elo',
        careerHistory: [],
        reportCard: null,
        recommendationState: null,
        coachMemory: '',
      });

      window.dispatchEvent(new Event("reportCardUpdated"));
      window.location.reload();
    }
  };

  // Synchronized callback when a user triggers coach hint in the chat or on the board
  const handleHintTrigger = () => {
    setCoachHintActive(true);
    setHighlightedSquares(['f7', 'c4', 'h5']);
  };

  const handleGameUpdate = (data: {
    fen: string;
    history: string[];
    isGameOver: boolean;
    result: 'win' | 'loss' | 'draw' | 'active';
    inCheck: boolean;
    isAiThinking: boolean;
    lastMove: { from: string; to: string } | null;
  }) => {
    setGameFen(data.fen);
    setGameHistory(data.history);
    setInCheck(data.inCheck);
    setIsAiThinking(data.isAiThinking);
    setLastMove(data.lastMove);
    setIsGameOver(data.isGameOver);
    setGameResult(data.result);

    // Auto-reset outcome tracking when game starts fresh
    if (data.history.length === 0) {
      setOutcomeRecorded(false);
    }

    // Process game completion
    if (data.isGameOver && data.result !== 'active') {
      trackGameOutcome(data.result);
    }
    
    // Auto-clear visual board highlights when a new move is made
    setHighlightedSquares([]);
  };

  const getSimulatedEval = () => {
    if (inCheck) {
      return gameHistory.length % 2 === 0 ? '-1.85 (Check!)' : '+2.40 (Check!)';
    }
    if (gameHistory.length === 0) return '+0.45';
    
    // Generate a beautiful, move-dependent simulated evaluation value
    const swing = Math.sin(gameHistory.length) * 0.75;
    const baseEval = 0.45 + swing + (gameHistory.length * 0.05);
    const sign = baseEval >= 0 ? '+' : '';
    return `${sign}${baseEval.toFixed(2)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-center items-center relative font-sans">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-mono tracking-wider text-slate-400 uppercase">Verifying Security Session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthGateway
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          handleFetchAndSyncStats(user);
        }}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-600 to-amber-400 p-2.5 rounded-xl shadow-lg shadow-amber-600/10 border border-amber-500/20">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-white text-lg tracking-widest sm:text-xl uppercase">GAMBIT</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Studio</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">PREMIER AI MENTORSHIP</p>
            </div>
          </div>

          {/* Quick Stats Toolbar (visible on tablet+) */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2 border-r border-slate-900 pr-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">Estimated Rating</p>
                <p className="font-semibold text-amber-400 font-mono">{eloRating}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-r border-slate-900 pr-4">
              <Activity className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">Position Eval</p>
                <p className="font-semibold text-emerald-400 font-mono">{getSimulatedEval()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-[10px] text-slate-500 font-medium">AI Skill Level</p>
                <p className="font-semibold text-slate-200 font-mono">Level {skillLevel}</p>
              </div>
            </div>
          </div>

          {/* Header Action CTA & User Auth */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <span className={`inline-block w-2 h-2 rounded-full ${isAiThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
              <span>{isAiThinking ? 'Stockfish calculating...' : 'Coach Engine Live'}</span>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-900 px-2 py-1 rounded-xl">
                <div className="flex flex-col items-end hidden md:flex mr-1">
                  <span className="text-[10px] text-slate-400 font-mono max-w-[120px] truncate">{currentUser.email}</span>
                  <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Cloud Sync</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                  {currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    } else {
                      setCurrentUser(null);
                    }
                  }}
                  className="text-xs font-bold font-mono text-slate-400 hover:text-red-400 transition-colors border border-slate-800/80 hover:border-red-500/20 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalMode('signin');
                    setAuthModalOpen(true);
                  }}
                  className="text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/40 border border-slate-800 px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 transition-all px-3.5 py-2 rounded-lg active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Page Stage Body */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 min-h-0">
        
        {/* Upper Dashboard Grid (Board & Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-[600px] xl:h-[660px] shrink-0 min-h-0">
          
          {/* Main Chessboard Area Container (Left) */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
            <ChessboardSection
              onGameUpdate={handleGameUpdate}
              highlightedSquares={highlightedSquares}
              coachHintActive={coachHintActive}
              setCoachHintActive={setCoachHintActive}
              skillLevel={skillLevel}
              setSkillLevel={setSkillLevel}
            />
          </div>

          {/* Coach Chat Sidebar (Right) */}
          <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
            <CoachChatSection
              coachProfile={coachProfile}
              setCoachProfile={setCoachProfile}
              onHintTrigger={handleHintTrigger}
              gameHistory={gameHistory}
              inCheck={inCheck}
              isGameOver={isGameOver}
              gameResult={gameResult}
              coachMemory={coachMemory}
              onMemoryUpdated={(newMemory) => {
                setCoachMemory(newMemory);
                let reportCardObj = null;
                try {
                  const raw = localStorage.getItem('chessCoach_reportCard');
                  if (raw) reportCardObj = JSON.parse(raw);
                } catch (e) {}
                saveUserStats(currentUser, {
                  skillLevel,
                  eloRating,
                  careerHistory,
                  reportCard: reportCardObj,
                  recommendationState,
                  coachMemory: newMemory
                });
              }}
              onTagDetected={(tag) => {
                setActiveVideoTag(tag);
                setActiveTab('recommendations');
              }}
            />
          </div>

        </div>

        {/* Navigation Tabs for Bottom Dashboard */}
        <div className="flex border-b border-slate-900/80 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Tactical & Positional Insights
          </button>
          
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            Premium AI Report Card
            <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded ml-1 animate-pulse">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('career')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'career'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
            }`}
          >
            <History className="w-4 h-4 text-sky-400" />
            Match Logs & Career Overview
          </button>
        </div>

        {/* Tab Content Rendering */}
        <div className="w-full">
          {activeTab === 'recommendations' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <RecommendationsSection
                coachProfile={coachProfile}
                gamesPlayed={careerHistory.length}
                recommendationState={recommendationState}
                activeVideoTag={activeVideoTag}
                onClearVideoTag={() => setActiveVideoTag(null)}
              />
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-4xl mx-auto"
            >
              <ChessReportCard />
            </motion.div>
          )}

          {activeTab === 'career' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              id="career-progress-container"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Progress Overview Panel (Left) */}
              <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-900/80">
                    <h3 className="font-display font-bold text-white text-sm tracking-wide flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      Career Profile & Progress
                    </h3>
                    <button
                      id="reset-career-button"
                      onClick={handleResetCareer}
                      className="text-slate-500 hover:text-red-400 transition-colors text-[11px] flex items-center gap-1 cursor-pointer font-semibold"
                      title="Clear all performance statistics"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset Stats</span>
                    </button>
                  </div>

                  {/* Progress Stats Block */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-900 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Estimated Elo</span>
                      <span className="text-lg md:text-xl font-display font-black text-amber-400 font-mono block">
                        {eloRating}
                      </span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-900 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">AI Coach Level</span>
                      <span className="text-lg md:text-xl font-display font-black text-sky-400 font-mono block">
                        Lv. {skillLevel}
                      </span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-900 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Total Games</span>
                      <span className="text-lg md:text-xl font-display font-black text-emerald-400 font-mono block">
                        {careerHistory.length}
                      </span>
                    </div>
                  </div>

                  {/* Rating Milestones Progress Bar */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
                      <span className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        Coach Difficulty Tier
                      </span>
                      <span className="font-mono text-slate-400 font-bold">
                        {skillLevel < 5 ? 'Beginner' : skillLevel < 12 ? 'Intermediate' : 'Expert'} (Max Level 20)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-900">
                      <div
                        className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(skillLevel / 20) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic">
                      *Defeat the Stockfish AI Coach to increase difficulty and boost your rating!
                    </p>
                  </div>
                </div>

                {/* Quick Record Performance Badges */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3 text-xs text-slate-400 flex justify-between items-center mt-2">
                  <span className="font-semibold">Career Record:</span>
                  <div className="flex gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold text-[10px]" title="Wins">
                      W: {careerHistory.filter((g) => g.result === 'win').length}
                    </span>
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold text-[10px]" title="Losses">
                      L: {careerHistory.filter((g) => g.result === 'loss').length}
                    </span>
                    <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]" title="Draws">
                      D: {careerHistory.filter((g) => g.result === 'draw').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Career Game History Table (Right) */}
              <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-900/80">
                    <History className="w-5 h-5 text-sky-400" />
                    <h3 className="font-display font-bold text-white text-base tracking-wide">Match History Logs</h3>
                  </div>

                  {careerHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800/80 text-slate-500 flex items-center justify-center mb-3">
                        <History className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">No recorded matches in this profile session yet.</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">Play a full game to checkmate or draw and see your ratings persist dynamically here!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[220px] scrollbar-thin scrollbar-thumb-slate-900">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-900 text-[10px] uppercase text-slate-500 font-bold">
                            <th className="pb-2">Date / Time</th>
                            <th className="pb-2">Outcome</th>
                            <th className="pb-2">AI Opponent</th>
                            <th className="pb-2 text-right">Rating Adjustment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60 text-xs">
                          {careerHistory.slice(0, 10).map((game) => (
                            <tr key={game.id} className="hover:bg-slate-900/30">
                              <td className="py-2.5 text-slate-400 font-medium">
                                {game.date} <span className="text-[10px] text-slate-500 ml-1">{game.time}</span>
                              </td>
                              <td className="py-2.5">
                                {game.result === 'win' ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">Victory</span>
                                ) : game.result === 'loss' ? (
                                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">Defeat</span>
                                ) : (
                                  <span className="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">Draw</span>
                                )}
                              </td>
                              <td className="py-2.5 text-slate-400 font-mono">
                                Stockfish Lv. {game.skillLevel}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold">
                                <span className={game.result === 'win' ? 'text-emerald-400' : game.result === 'loss' ? 'text-rose-400' : 'text-slate-400'}>
                                  {game.eloChange}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal ml-1.5">({game.eloAfter})</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {careerHistory.length > 0 && (
                  <div className="text-[10px] text-slate-500 mt-3 text-right">
                    Showing the last {Math.min(10, careerHistory.length)} matches • Preserved locally inside localStorage
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* Sub Footer details */}
      <footer className="border-t border-slate-900/60 bg-slate-950/30 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Gambit Chess Studio. Crafted with advanced coaching algorithms.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Interactive Rules</span>
            <span className="hover:text-slate-300 cursor-pointer">PGN Export</span>
            <span className="hover:text-slate-300 cursor-pointer">Support</span>
          </div>
        </div>
      </footer>

      <SupabaseAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          handleFetchAndSyncStats(user);
        }}
      />

    </div>
  );
}
