import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  ChevronLeft, 
  Zap, 
  Users, 
  RefreshCw, 
  Plus, 
  Award, 
  CheckCircle, 
  ShieldAlert, 
  Crown,
  Target,
  Sparkles,
  Search,
  UserCheck
} from 'lucide-react';
import { getDeterministicGameAnalysis, getLifetimeMoveProfile, getTacticalSharpness } from '../lib/analytics';

interface PerformanceHubProps {
  careerHistory: any[];
  unlockedAchievements: string[];
  eloRating: string;
  skillLevel: number;
  onBack: () => void;
}

interface Rival {
  username: string;
  avatar: string;
  rating: number;
  weeklyDelta: number;
  status: 'online' | 'offline' | 'ingame';
}

const DEFAULT_RIVALS: Rival[] = [
  { username: 'BethHarmon_99', avatar: '👑', rating: 1650, weeklyDelta: 110, status: 'online' },
  { username: 'HikaruFanatic', avatar: '🍍', rating: 1420, weeklyDelta: 85, status: 'ingame' },
  { username: 'GarryJr', avatar: '🦁', rating: 1350, weeklyDelta: 40, status: 'offline' },
  { username: 'MagnusApprentice', avatar: '🦉', rating: 1510, weeklyDelta: -15, status: 'online' },
];

export const PerformanceHub: React.FC<PerformanceHubProps> = ({
  careerHistory,
  unlockedAchievements,
  eloRating,
  skillLevel,
  onBack,
}) => {
  // Local state for interactive Rivalry Sync simulations
  const [rivals, setRivals] = useState<Rival[]>(DEFAULT_RIVALS);
  const [syncing, setSyncing] = useState(false);
  const [newRivalUsername, setNewRivalUsername] = useState('');
  const [rivalError, setRivalError] = useState('');

  // Calculations
  const profile = useMemo(() => {
    return getLifetimeMoveProfile(careerHistory);
  }, [careerHistory]);

  const tacticalSharpness = useMemo(() => {
    return getTacticalSharpness(careerHistory);
  }, [careerHistory]);

  const totalGames = careerHistory.length;
  const winCount = profile.wins;
  const lossCount = profile.losses;
  const drawCount = profile.draws;
  const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0;

  // Streak calculations
  const isWinStreak = profile.streakType === 'win';
  const streakCount = profile.streak;

  // Form Guide: get last 6 games and show them
  const recentForm = useMemo(() => {
    return [...careerHistory].slice(0, 6).reverse(); // Oldest of the 6 first
  }, [careerHistory]);

  // Handle Rivalry Synchronization Delta Refresh
  const handleRivalSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setRivals((prev) => {
        return prev.map((r) => {
          // Add some dynamic jitter to deltas to simulate rolling weekly changes
          const deltaJitter = Math.floor(Math.random() * 30) - 15; // -15 to +15 Elo
          return {
            ...r,
            rating: Math.max(800, r.rating + (deltaJitter > 0 ? 5 : -5)),
            weeklyDelta: r.weeklyDelta + deltaJitter,
          };
        }).sort((a, b) => b.weeklyDelta - a.weeklyDelta); // Maintain sorting by Weekly Delta
      });
      setSyncing(false);
    }, 800);
  };

  // Add customized friends
  const handleAddRival = (e: React.FormEvent) => {
    e.preventDefault();
    setRivalError('');
    const trimmed = newRivalUsername.trim();
    if (!trimmed) return;
    
    if (trimmed.length < 3) {
      setRivalError('Username must be at least 3 characters.');
      return;
    }

    if (rivals.some((r) => r.username.toLowerCase() === trimmed.toLowerCase())) {
      setRivalError('Rival already connected to sync pipeline.');
      return;
    }

    const newRival: Rival = {
      username: trimmed,
      avatar: ['🦊', '🐱', '🐼', '🐯', '🤖', '👾'][Math.floor(Math.random() * 6)],
      rating: 1100 + Math.floor(Math.random() * 400),
      weeklyDelta: 10 + Math.floor(Math.random() * 90),
      status: 'online',
    };

    setRivals((prev) => [...prev, newRival].sort((a, b) => b.weeklyDelta - a.weeklyDelta));
    setNewRivalUsername('');
  };

  // Achievements Definition mapping for the Trophy Room
  const ACHIEVEMENTS_DETAILS = [
    {
      id: 'first-blood',
      title: 'First Blood',
      desc: 'Unlock on your first victory against the Stockfish AI Coach.',
      glyph: '🩸',
      unlockedDesc: 'Defeated the engine in a rated battle!',
      category: 'Combat',
      progressText: winCount >= 1 ? '1/1' : '0/1',
      progressPercent: winCount >= 1 ? 100 : 0,
      isUnlocked: unlockedAchievements.includes('first-blood'),
    },
    {
      id: 'ruthless-efficiency',
      title: 'Ruthless Efficiency',
      desc: 'Unlocks if checkmate is reached in under 20 moves.',
      glyph: '⚡',
      unlockedDesc: 'Demolished the opponent in record time!',
      category: 'Tactics',
      progressText: careerHistory.some((g) => g.result === 'win' && g.movesCount <= 20) ? '1/1' : '0/1',
      progressPercent: careerHistory.some((g) => g.result === 'win' && g.movesCount <= 20) ? 100 : 0,
      isUnlocked: unlockedAchievements.includes('ruthless-efficiency'),
    },
    {
      id: 'tactical-overkill',
      title: 'Tactical Overkill',
      desc: 'Unlocks if a match is finished with a calculated accuracy > 85%.',
      glyph: '🎯',
      unlockedDesc: 'Achieved tactical mastermind accuracy (> 85%)!',
      category: 'Precision',
      progressText: careerHistory.some((g) => {
        if (g.result !== 'win') return false;
        const analysis = getDeterministicGameAnalysis(g);
        return analysis.accuracy > 85;
      }) ? '1/1' : '0/1',
      progressPercent: careerHistory.some((g) => {
        if (g.result !== 'win') return false;
        const analysis = getDeterministicGameAnalysis(g);
        return analysis.accuracy > 85;
      }) ? 100 : 0,
      isUnlocked: unlockedAchievements.includes('tactical-overkill'),
    },
    {
      id: 'existential-dread',
      title: 'Existential Dread',
      desc: 'Unlocks if the AI coach engine registers an opponent resignation.',
      glyph: '😱',
      unlockedDesc: 'Forced Garry to resign on behalf of Stockfish!',
      category: 'Psychological',
      progressText: careerHistory.some((g) => g.result === 'win' && g.resigned) ? '1/1' : '0/1',
      progressPercent: careerHistory.some((g) => g.result === 'win' && g.resigned) ? 100 : 0,
      isUnlocked: unlockedAchievements.includes('existential-dread'),
    },
  ];

  // Neon-glowing SVG Line Graph Timeline logic
  const ratingData = useMemo(() => {
    // Collect the rating points of the last 10 games
    const last10 = [...careerHistory].slice(-10);
    if (last10.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({ game: i + 1, elo: 1200 }));
    }
    
    // Convert history points to numeric sequence
    return last10.map((game, idx) => {
      const eloNum = parseInt(game.eloAfter) || 1200;
      return {
        game: idx + 1,
        elo: eloNum,
        result: game.result
      };
    });
  }, [careerHistory]);

  const svgChartDimensions = useMemo(() => {
    const elos = ratingData.map(d => d.elo);
    const minElo = Math.min(...elos, 1100) - 20;
    const maxElo = Math.max(...elos, 1300) + 20;
    const range = maxElo - minElo;

    const width = 500;
    const height = 180;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Generate coordinate points for SVG path
    const points = ratingData.map((d, idx) => {
      const x = paddingLeft + (idx / Math.max(1, ratingData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((d.elo - minElo) / range) * chartHeight;
      return { x, y, elo: d.elo, game: d.game, result: (d as any).result };
    });

    return { width, height, points, minElo, maxElo, range, paddingLeft, paddingBottom, chartWidth, chartHeight };
  }, [ratingData]);

  // Sort Rivals by weekly acceleration delta (Weekly Delta descending)
  const sortedRivals = useMemo(() => {
    return [...rivals].sort((a, b) => b.weeklyDelta - a.weeklyDelta);
  }, [rivals]);

  return (
    <div id="performance-hub-container" className="w-full flex flex-col gap-6 select-none pb-12">
      
      {/* Header and Back Button Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3">
          <button
            id="perf-back-button"
            onClick={onBack}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs font-bold font-mono uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4 text-amber-500" />
            <span>Game Space</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h1 className="font-display text-2xl font-black text-white tracking-wide uppercase">Performance Hub</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">Gamified performance diagnostics, locked trophies, and active rivalry synchronization.</p>
          </div>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-900 px-4 py-2.5 rounded-xl">
          <div className="text-left border-r border-slate-900/80 pr-4">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Career Rating</span>
            <span className="text-lg font-display font-black text-amber-400 font-mono">{eloRating}</span>
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Trophies Unlocked</span>
            <span className="text-lg font-display font-black text-emerald-400 font-mono">
              {unlockedAchievements.length} <span className="text-slate-600 text-xs font-normal">/ 4</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Core Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Career Statistics Bento (8-Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Timeline and Stats Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Interactive SVG Rating Timeline (8-Cols on Desktop) */}
            <div className="md:col-span-7 bg-slate-950/80 border border-slate-900 p-5 rounded-2xl flex flex-col relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">Elo Rating Timeline</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Last {ratingData.length} Matches</span>
              </div>

              {/* Glowing SVG Chart Canvas */}
              <div className="flex-1 min-h-[180px] w-full mt-4 flex items-center justify-center relative">
                {careerHistory.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-2xl mb-1.5">📈</span>
                    <p className="text-xs text-slate-500 uppercase font-mono tracking-wider">Awaiting matches to plot career timeline</p>
                  </div>
                ) : null}

                <svg 
                  viewBox={`0 0 ${svgChartDimensions.width} ${svgChartDimensions.height}`} 
                  className="w-full h-full select-none overflow-visible"
                >
                  <defs>
                    {/* Glowing effect filter for the SVG line */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {/* Gradient under the curve */}
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const yVal = svgChartDimensions.height - svgChartDimensions.paddingBottom - (i * svgChartDimensions.chartHeight / 3);
                    const eloLabel = Math.round(svgChartDimensions.minElo + (i * svgChartDimensions.range / 3));
                    return (
                      <g key={i} className="opacity-40">
                        <line 
                          x1={svgChartDimensions.paddingLeft} 
                          y1={yVal} 
                          x2={svgChartDimensions.width - 15} 
                          y2={yVal} 
                          stroke="#1e293b" 
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text 
                          x={svgChartDimensions.paddingLeft - 8} 
                          y={yVal + 3} 
                          fill="#475569" 
                          fontSize="9" 
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          {eloLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill path under rating line */}
                  {svgChartDimensions.points.length > 1 && (
                    <path
                      d={`
                        M ${svgChartDimensions.points[0].x} ${svgChartDimensions.height - svgChartDimensions.paddingBottom}
                        ${svgChartDimensions.points.map(p => `L ${p.x} ${p.y}`).join(' ')}
                        L ${svgChartDimensions.points[svgChartDimensions.points.length - 1].x} ${svgChartDimensions.height - svgChartDimensions.paddingBottom}
                        Z
                      `}
                      fill="url(#chartGradient)"
                    />
                  )}

                  {/* Rating Line Plot */}
                  {svgChartDimensions.points.length > 1 && (
                    <path
                      d={svgChartDimensions.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      filter="url(#glow)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Custom Dot markers for each game */}
                  {svgChartDimensions.points.map((p, idx) => {
                    const isWin = p.result === 'win';
                    const isLoss = p.result === 'loss';
                    const pointColor = isWin ? '#34d399' : isLoss ? '#f87171' : '#94a3b8';
                    return (
                      <g key={idx} className="group cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="#090d16"
                          stroke={pointColor}
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          fill="#f8fafc"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 px-1 py-0.5 rounded text-[8px] z-20 pointer-events-none"
                        >
                          {p.elo}
                        </text>
                        {/* Game label coordinates below axes */}
                        <text
                          x={p.x}
                          y={svgChartDimensions.height - 8}
                          fill="#475569"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="black"
                          textAnchor="middle"
                        >
                          G{p.game}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Circular Win Rate Gauge Bento card (5-Cols) */}
            <div className="md:col-span-5 bg-slate-950/80 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">Win Rate Analysis</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">{winRate}% Wins</span>
              </div>

              {/* Graphical Circular Gauge */}
              <div className="flex-1 flex items-center justify-center my-4 relative">
                <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
                  {/* Track ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="8"
                  />
                  {/* Wins Segment (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - winCount / Math.max(1, totalGames))}`}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text details */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-display font-black text-slate-100 font-mono">{winRate}%</span>
                  <span className="text-[8px] uppercase tracking-wider font-semibold text-slate-500 font-mono">Conversion</span>
                </div>
              </div>

              {/* Categoric wins breakdown footer */}
              <div className="flex items-center justify-between text-center bg-slate-900/30 border border-slate-900/50 p-2 rounded-xl text-xs">
                <div>
                  <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Wins</span>
                  <span className="font-mono text-emerald-400 font-bold">{winCount}</span>
                </div>
                <div className="border-l border-slate-900/60 h-4" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Draws</span>
                  <span className="font-mono text-slate-400 font-bold">{drawCount}</span>
                </div>
                <div className="border-l border-slate-900/60 h-4" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 block uppercase font-bold">Losses</span>
                  <span className="font-mono text-rose-400 font-bold">{lossCount}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Tactical Sharpness & Hot Streak Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Tactical Sharpness Gauge Dashboard (7-Cols) */}
            <div className="md:col-span-7 bg-slate-950/80 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between relative shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">Tactical Sharpness Metric</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-mono tracking-wide">ACTIVE ANALYSIS</span>
                </div>

                <div className="flex items-center gap-5 mt-4">
                  {/* Gauge indicator value */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center bg-slate-900/40 border border-slate-900 rounded-full shadow-inner">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                      <path
                        className="text-slate-800"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-amber-500"
                        strokeWidth="2.5"
                        strokeDasharray={`${tacticalSharpness}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-display font-black text-white font-mono">{tacticalSharpness}%</span>
                    </div>
                  </div>

                  {/* Descriptive text detail */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-display font-bold text-slate-200">
                      {tacticalSharpness > 80 
                        ? 'Lethal Sharpness' 
                        : tacticalSharpness > 60 
                          ? 'Sufficient Accuracy' 
                          : 'Incipient Blunder Propensity'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Measures the ratio of tactical successes (Brilliant, Best, Excellent moves) executed versus critical blunders or slipups across your games.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail list elements */}
              <div className="mt-4 pt-4 border-t border-slate-900/50 grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-900/50 flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Tactical Hits:</span>
                  <span className="text-emerald-400 font-black">{profile.brilliant + profile.best + profile.excellent}</span>
                </div>
                <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-900/50 flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Tactical Misses:</span>
                  <span className="text-rose-400 font-black">{profile.inaccuracy + profile.mistake + profile.blunder}</span>
                </div>
              </div>
            </div>

            {/* Streak & Form guide Bento Card (5-Cols) */}
            <div className="md:col-span-5 bg-slate-950/80 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">Streaks & Form Guide</span>
                </div>
              </div>

              {/* Flame Hot Streak Counter */}
              <div className="my-3 py-2 flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xl shadow-lg shadow-orange-500/10">
                    🔥
                  </div>
                  {isWinStreak && streakCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block font-mono">Active Win Streak</span>
                  <span className="text-base font-display font-black text-white">
                    {isWinStreak && streakCount > 0 
                      ? `${streakCount} Matches Consecutively` 
                      : 'No Active Streak'}
                  </span>
                </div>
              </div>

              {/* Form Guide Outcomes layout */}
              <div className="pt-3 border-t border-slate-900/50">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block font-mono mb-2">Recent Match Outcomes</span>
                <div className="flex items-center gap-2">
                  {recentForm.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">No games played yet.</span>
                  ) : (
                    recentForm.map((g, idx) => {
                      const isW = g.result === 'win';
                      const isL = g.result === 'loss';
                      return (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-black border transition-all ${
                            isW 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/5 hover:scale-105' 
                              : isL 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:scale-105' 
                                : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:scale-105'
                          }`}
                          title={`G${idx + 1}: ${isW ? 'Win' : isL ? 'Loss' : 'Draw'} (${g.movesCount} moves)`}
                        >
                          {isW ? 'W' : isL ? 'L' : 'D'}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Rivalry Velocity Synchronization Leaderboard (4-Columns) */}
        <div className="lg:col-span-4 bg-slate-950/80 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="font-display font-bold text-xs text-slate-200 uppercase tracking-wider">Rivalry Sync Pipeline</span>
              </div>
              
              <button
                id="sync-rivals-button"
                onClick={handleRivalSync}
                disabled={syncing}
                className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                title="Synchronize friends delta"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              Tracking **Weekly Delta**—sorted dynamically by rating acceleration over a rolling 7-day window. Generate direct competitive acceleration.
            </p>

            {/* Leaderboard Table List */}
            <div className="mt-4 flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
              {sortedRivals.map((rival, index) => {
                const isPositive = rival.weeklyDelta >= 0;
                return (
                  <div 
                    key={rival.username} 
                    className="flex items-center justify-between p-2.5 bg-slate-900/20 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Rank Indicator Badge */}
                      <span className="font-mono text-[10px] font-black text-slate-600 w-4 text-center">
                        #{index + 1}
                      </span>
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sm shadow-inner">
                        {rival.avatar}
                      </div>
                      {/* Name and Rating */}
                      <div className="flex flex-col">
                        <span className="text-xs font-display font-bold text-slate-300 tracking-wide truncate max-w-[110px]" title={rival.username}>
                          {rival.username}
                        </span>
                        <span className="text-[9px] font-mono font-semibold text-slate-500">
                          {rival.rating} Elo
                        </span>
                      </div>
                    </div>

                    {/* Acceleration / Weekly Delta Metric */}
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold font-black ${
                        isPositive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isPositive ? '+' : ''}{rival.weeklyDelta} Δ
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block font-mono mt-0.5">
                        Weekly Delta
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connect Friends Input Section */}
          <div className="mt-5 pt-4 border-t border-slate-900/60">
            <form onSubmit={handleAddRival} className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block font-mono">
                Connect New Rival Profile
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={newRivalUsername}
                    onChange={(e) => setNewRivalUsername(e.target.value)}
                    placeholder="Enter friend username..."
                    className="w-full bg-slate-900 border border-slate-850 focus:border-violet-500 focus:outline-none rounded-xl text-xs pl-8.5 pr-3 py-2 text-slate-200 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="p-2 bg-violet-600 hover:bg-violet-500 text-slate-950 font-bold rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                </button>
              </div>
              {rivalError && (
                <span className="text-[10px] text-rose-400 font-mono italic mt-1 leading-normal block">
                  ⚠️ {rivalError}
                </span>
              )}
            </form>
          </div>

        </div>

      </div>

      {/* Trophy Room Section (Achievements Visual Tracker with Progress Bars) */}
      <div className="bg-slate-950/80 border border-slate-900 p-6 rounded-2xl shadow-xl flex flex-col gap-5 mt-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-black text-white uppercase tracking-wide">The Trophy Room</h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-900">
            Unlocked: {unlockedAchievements.length} / 4
          </span>
        </div>

        {/* 4-Achievement Cards Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACHIEVEMENTS_DETAILS.map((ach) => {
            return (
              <div
                key={ach.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all overflow-hidden ${
                  ach.isUnlocked
                    ? 'bg-amber-950/5 border-amber-500/30 hover:border-amber-500/50 shadow-md shadow-amber-950/5'
                    : 'bg-slate-900/10 border-slate-900 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Visual Accent Corner for Unlocked items */}
                {ach.isUnlocked && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/15 rounded-bl-full flex items-center justify-center font-bold text-[9px] text-amber-400 pointer-events-none select-none">
                    ✨
                  </div>
                )}

                <div>
                  <div className="flex items-start gap-3">
                    {/* Glyph element (large size) */}
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0 border ${
                      ach.isUnlocked
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                        : 'bg-slate-900/60 border-slate-800 text-slate-600 grayscale'
                    }`}>
                      {ach.glyph}
                    </div>
                    {/* Title and Category */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] uppercase tracking-widest font-bold text-slate-500 font-mono">
                        {ach.category}
                      </span>
                      <h3 className="text-xs font-display font-bold text-slate-200 truncate mt-0.5">
                        {ach.title}
                      </h3>
                    </div>
                  </div>

                  {/* Achievement details */}
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-3">
                    {ach.isUnlocked ? ach.unlockedDesc : ach.desc}
                  </p>
                </div>

                {/* Progress bar metrics */}
                <div className="mt-4 pt-3 border-t border-slate-900/50">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 font-bold pb-1.5">
                    <span className="uppercase text-[9px]">{ach.isUnlocked ? 'Unlocked' : 'In Progress'}</span>
                    <span>{ach.progressText}</span>
                  </div>
                  {/* Outer track */}
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    {/* Inner progress */}
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        ach.isUnlocked 
                          ? 'bg-amber-500 shadow-sm shadow-amber-500/50' 
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${ach.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
