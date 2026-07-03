import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chess } from 'chess.js';
import { Sparkles, RefreshCw, Eye, EyeOff, Trophy, Flame, ChevronRight, Zap, Play, CheckCircle, Palette } from 'lucide-react';

// Standard, classic, and completely uniform Wikipedia chess pieces
const ChessPiece: React.FC<{ type: string; isWhite: boolean }> = ({ type, isWhite }) => {
  const pType = type.toLowerCase();
  const key = `${isWhite ? 'l' : 'd'}${pType}`;
  
  // Base URLs for standard Wikipedia chess pieces
  const pieceUrls: Record<string, string> = {
    lp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    lr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    ln: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    lb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    lq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    lk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    dp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    dr: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    dn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    db: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    dq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    dk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  };

  const url = pieceUrls[key];
  if (!url) return null;

  return (
    <img 
      src={url} 
      alt={`${isWhite ? 'White' : 'Black'} ${type}`} 
      className="w-[82%] h-[82%] object-contain select-none"
      draggable={false}
    />
  );
};

// CORS-safe synthetic audio synthesis
const playChessSound = (type: 'move' | 'capture' | 'check' | 'gameover') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'move') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'capture') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'check') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'gameover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Ignore autoplay policy blocks
  }
};

interface ChessboardSectionProps {
  onGameUpdate?: (data: {
    fen: string;
    history: string[];
    isGameOver: boolean;
    result: 'win' | 'loss' | 'draw' | 'active';
    inCheck: boolean;
    isAiThinking: boolean;
    lastMove: { from: string; to: string } | null;
  }) => void;
  highlightedSquares?: string[];
  coachHintActive: boolean;
  setCoachHintActive: (active: boolean) => void;
  skillLevel: number;
  setSkillLevel: (lvl: number) => void;
}

const PUZZLE_FEN = 'r1bq1rk1/ppp1bppp/2np1n2/4p2Q/2B1P3/5N2/PPPP1PPP/RNBR2K1 w - - 0 1';
const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessboardSection: React.FC<ChessboardSectionProps> = ({
  onGameUpdate,
  highlightedSquares = [],
  coachHintActive,
  setCoachHintActive,
  skillLevel,
  setSkillLevel,
}) => {
  const [gameMode, setGameMode] = useState<'standard' | 'puzzle'>('puzzle');
  const [boardTheme, setBoardTheme] = useState<'classic' | 'ocean' | 'forest' | 'midnight' | 'wood'>('midnight');

  // Chess.js instance management
  const chessRef = useRef<Chess>(new Chess(PUZZLE_FEN));
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  
  // Game Status
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [inCheck, setInCheck] = useState<boolean>(false);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  // Stockfish Web Worker
  const workerRef = useRef<Worker | null>(null);

  // Parse Chess.js 2D board state
  const syncBoardFromChess = () => {
    const cBoard = chessRef.current.board();
    const formatted: (string | null)[][] = cBoard.map((row) =>
      row.map((sq) => {
        if (!sq) return null;
        return sq.color === 'w' ? sq.type.toUpperCase() : sq.type.toLowerCase();
      })
    );
    setBoard(formatted);
    setInCheck(chessRef.current.inCheck());

    // Evaluate game over conditions
    let outcome: 'win' | 'loss' | 'draw' | 'active' = 'active';
    if (chessRef.current.isGameOver()) {
      if (chessRef.current.isCheckmate()) {
        // Since User is always White (White's turn code is 'w')
        outcome = chessRef.current.turn() === 'b' ? 'win' : 'loss';
        setGameOverResult(outcome);
        playChessSound('gameover');
      } else {
        outcome = 'draw';
        setGameOverResult('draw');
        playChessSound('gameover');
      }
    }

    // Call upstream sync
    if (onGameUpdate) {
      onGameUpdate({
        fen: chessRef.current.fen(),
        history: chessRef.current.history(),
        isGameOver: chessRef.current.isGameOver(),
        result: outcome,
        inCheck: chessRef.current.inCheck(),
        isAiThinking,
        lastMove,
      });
    }
  };

  // Setup Web Worker for Stockfish running in the browser
  useEffect(() => {
    const blobCode = `
      self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
    `;
    let worker: Worker | null = null;
    try {
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      workerRef.current = worker;

      worker.postMessage('uci');
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      worker.postMessage('isready');

      worker.onmessage = (event) => {
        const line = event.data;
        if (typeof line === 'string' && line.startsWith('bestmove')) {
          const match = line.match(/^bestmove\s+(\S+)/);
          if (match) {
            const bestMove = match[1];
            if (bestMove && bestMove !== '(none)') {
              handleExecutionOfAiMove(bestMove);
            }
          }
        }
      };
    } catch (err) {
      console.error('Failed to create Stockfish Worker:', err);
    }

    // Sync initial state
    syncBoardFromChess();

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  // Sync Skill Level changes directly to running worker
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage(`setoption name Skill Level value ${skillLevel}`);
    }
  }, [skillLevel]);

  // Execute AI Stockfish Move
  const handleExecutionOfAiMove = (uciMove: string) => {
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined;

    try {
      const isCapture = chessRef.current.get(to as any) !== null;
      chessRef.current.move({ from, to, promotion });
      
      setLastMove({ from, to });
      setIsAiThinking(false);
      
      // Sync board visual representation
      syncBoardFromChess();

      // Sounds
      if (chessRef.current.inCheck()) {
        playChessSound('check');
      } else if (isCapture) {
        playChessSound('capture');
      } else {
        playChessSound('move');
      }
    } catch (e) {
      console.error('AI attempted illegal move or logic error:', uciMove, e);
      setIsAiThinking(false);
    }
  };

  // Trigger AI evaluation and play
  const requestAiResponse = () => {
    if (chessRef.current.isGameOver() || chessRef.current.turn() !== 'b') return;
    
    setIsAiThinking(true);
    if (workerRef.current) {
      workerRef.current.postMessage(`position fen ${chessRef.current.fen()}`);
      // Query depth depending on skill level
      workerRef.current.postMessage('go depth 5');
    }
  };

  const getSquareName = (r: number, c: number) => `${FILES[c]}${RANKS[r]}`;

  // Interactive user click handler
  const handleSquareClick = (r: number, c: number) => {
    if (isAiThinking || chessRef.current.isGameOver()) return;

    const squareName = getSquareName(r, c);
    const piece = chessRef.current.get(squareName as any);

    // If a piece is already selected
    if (selectedSquare) {
      const selectedSqName = getSquareName(selectedSquare.r, selectedSquare.c);
      
      if (selectedSquare.r === r && selectedSquare.c === c) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      // Try making the move
      try {
        const targetPiece = chessRef.current.get(squareName as any);
        const isCapture = targetPiece !== null;

        // Auto-promote to queen to avoid complicated prompt layouts
        const moveResult = chessRef.current.move({
          from: selectedSqName,
          to: squareName,
          promotion: 'q',
        });

        if (moveResult) {
          playChessSound(isCapture ? 'capture' : 'move');
          setLastMove({ from: selectedSqName, to: squareName });
          setSelectedSquare(null);
          setLegalTargets([]);
          setCoachHintActive(false);

          // Sync game states immediately
          syncBoardFromChess();

          // Pass control to Stockfish
          setTimeout(() => {
            requestAiResponse();
          }, 400);
          return;
        }
      } catch (e) {
        // Move was invalid. If clicked another White piece, select that instead!
        if (piece && piece.color === 'w') {
          selectPiece(r, c, squareName);
          return;
        }
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    } else {
      // Select piece if it is white (User pieces are white)
      if (piece && piece.color === 'w') {
        selectPiece(r, c, squareName);
      }
    }
  };

  // Helper to select piece and calculate legal moves
  const selectPiece = (r: number, c: number, squareName: string) => {
    setSelectedSquare({ r, c });
    const moves = chessRef.current.moves({ square: squareName as any, verbose: true });
    setLegalTargets(moves.map((m) => m.to));
  };

  // Re-initialization for board game modes
  const handleResetOrChangeMode = (mode: 'standard' | 'puzzle') => {
    const fen = mode === 'puzzle' ? PUZZLE_FEN : STANDARD_FEN;
    chessRef.current = new Chess(fen);
    setGameMode(mode);
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    setGameOverResult(null);
    setIsAiThinking(false);
    setCoachHintActive(false);

    // Initial sync
    syncBoardFromChess();
  };

  const getSquareBg = (r: number, c: number, isSelected: boolean, isHighlighted: boolean, isHint: boolean, isLastMove: boolean) => {
    const isDark = (r + c) % 2 === 1;
    
    if (isSelected) {
      return 'bg-amber-500/30 ring-2 ring-amber-400 ring-inset shadow-inner';
    }
    if (isHint) {
      return 'bg-emerald-500/20 ring-2 ring-emerald-400 ring-inset shadow-inner animate-pulse';
    }
    if (isHighlighted) {
      return 'bg-sky-500/25 ring-2 ring-sky-400 ring-inset';
    }
    if (isLastMove) {
      return isDark ? 'bg-amber-900/30 border border-amber-500/25' : 'bg-amber-100/15 border border-amber-500/25';
    }

    switch (boardTheme) {
      case 'classic':
        return isDark ? 'bg-[#769656] text-[#eeeed2]' : 'bg-[#eeeed2] text-[#769656]';
      case 'ocean':
        return isDark ? 'bg-[#2f6291] text-[#dee5ed]' : 'bg-[#dee5ed] text-[#2f6291]';
      case 'forest':
        return isDark ? 'bg-[#224d34] text-[#e3eec0]' : 'bg-[#e3eec0] text-[#224d34]';
      case 'wood':
        return isDark ? 'bg-[#6b3a0e] text-amber-100' : 'bg-[#cfab7a] text-[#6b3a0e]';
      case 'midnight':
      default:
        return isDark ? 'bg-[#111827] text-[#475569]' : 'bg-[#1e293b] text-[#94a3b8]';
    }
  };

  const isHintSquare = (squareName: string) => {
    if (!coachHintActive) return false;
    return ['f7', 'c4', 'h5'].includes(squareName);
  };

  // Find King coordinates for check glow
  const isKingInCheckSquare = (squareName: string) => {
    if (!inCheck) return false;
    const piece = chessRef.current.get(squareName as any);
    return piece && piece.type === 'k' && piece.color === chessRef.current.turn();
  };

  return (
    <div id="chessboard-container" className="flex flex-col h-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur-xl shadow-2xl overflow-hidden relative">
      
      {/* Game Mode Selector and Configuration Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-white tracking-wide">Play vs AI Coach</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isAiThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            {isAiThinking ? 'AI is computing its strategy...' : 'Your move (White)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* FEN Mode Toggles */}
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              id="mode-puzzle"
              onClick={() => handleResetOrChangeMode('puzzle')}
              className={`px-3 py-1.5 rounded-lg transition-all ${gameMode === 'puzzle' ? 'bg-slate-800 text-white font-medium shadow border border-slate-700/30' : 'text-slate-400 hover:text-white'}`}
            >
              f7 Attack Setup
            </button>
            <button
              id="mode-standard"
              onClick={() => handleResetOrChangeMode('standard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${gameMode === 'standard' ? 'bg-slate-800 text-white font-medium shadow border border-slate-700/30' : 'text-slate-400 hover:text-white'}`}
            >
              Standard Game
            </button>
          </div>

          {/* AI Skill Level Selection */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">AI Skill:</span>
            <select
              id="skill-level-select"
              value={skillLevel}
              onChange={(e) => setSkillLevel(Number(e.target.value))}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 5, 8, 12, 16, 20].map((lvl) => (
                <option key={lvl} value={lvl} className="bg-slate-950 text-slate-200">
                  Level {lvl} {lvl === 1 ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <button
            id="reset-board-button"
            onClick={() => handleResetOrChangeMode(gameMode)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Restart Game"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Restart</span>
          </button>
        </div>
      </div>

      {/* Board Theme Palette Switcher */}
      <div id="board-palette-switcher" className="flex flex-wrap items-center gap-2 mb-4 bg-slate-900/40 p-2 md:p-2.5 rounded-xl border border-slate-900/60 text-xs z-20">
        <span className="text-slate-400 font-semibold flex items-center gap-1.5 ml-1">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          Board Palette:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'classic', label: 'Classic', desc: 'Standard club green', darkBg: '#769656', lightBg: '#eeeed2' },
            { id: 'ocean', label: 'Ocean', desc: 'Misty sea blue', darkBg: '#2f6291', lightBg: '#dee5ed' },
            { id: 'forest', label: 'Forest', desc: 'Lush leaf green', darkBg: '#224d34', lightBg: '#e3eec0' },
            { id: 'midnight', label: 'Midnight', desc: 'Cosmic deep slate', darkBg: '#111827', lightBg: '#1e293b' },
            { id: 'wood', label: 'Wood', desc: 'Warm walnut wood', darkBg: '#6b3a0e', lightBg: '#cfab7a' },
          ].map((themeOption) => (
            <button
              key={themeOption.id}
              id={`palette-theme-${themeOption.id}`}
              onClick={() => setBoardTheme(themeOption.id as any)}
              className={`flex items-center gap-2 px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg border transition-all cursor-pointer ${
                boardTheme === themeOption.id
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50 shadow font-bold'
                  : 'bg-slate-950/40 text-slate-400 hover:text-white border-slate-800/80 hover:border-slate-700'
              }`}
              title={themeOption.desc}
            >
              <span className="relative flex w-3 h-3 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
                <span className="absolute left-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: themeOption.lightBg }} />
                <span className="absolute right-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: themeOption.darkBg }} />
              </span>
              <span>{themeOption.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Board Stage wrapper */}
      <div className="flex-1 flex items-center justify-center min-h-[320px] md:min-h-[400px] py-2 relative">
        <div className="w-full max-w-[460px] aspect-square relative bg-slate-900/30 p-2 md:p-3 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
          
          {/* Vertical Ranks labels (Numbers on Left side) */}
          <div className="absolute left-1 top-3 bottom-3 flex flex-col justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none z-10 w-4 pl-0.5">
            {RANKS.map((rank) => (
              <div key={rank} className="h-full flex items-center justify-start">
                {rank}
              </div>
            ))}
          </div>

          {/* Actual 8x8 Board Container */}
          <div className="flex-1 grid grid-cols-8 grid-rows-8 gap-0 rounded-xl overflow-hidden border border-slate-950/80 pl-3 md:pl-4 pb-3 md:pb-4 relative">
            {board.map((row, rIdx) =>
              row.map((piece, cIdx) => {
                const squareName = getSquareName(rIdx, cIdx);
                const isSelected = selectedSquare?.r === rIdx && selectedSquare?.c === cIdx;
                const isHighlighted = highlightedSquares.includes(squareName);
                const isHint = isHintSquare(squareName);
                const isLast = (lastMove?.from === squareName || lastMove?.to === squareName);
                const isTarget = legalTargets.includes(squareName);
                const isWhite = piece ? piece === piece.toUpperCase() : false;
                const kingInCheck = isKingInCheckSquare(squareName);

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    id={`square-${squareName}`}
                    onClick={() => handleSquareClick(rIdx, cIdx)}
                    className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${getSquareBg(
                      rIdx,
                      cIdx,
                      isSelected,
                      isHighlighted,
                      isHint,
                      isLast
                    )}`}
                  >
                    {/* Glowing coordinate lines when Hint is Active */}
                    {coachHintActive && squareName === 'f7' && (
                      <div className="absolute inset-0 bg-red-500/10 ring-4 ring-red-500/70 animate-pulse rounded-sm pointer-events-none" />
                    )}

                    {/* Glowing coordinate red circle when King is in Check */}
                    {kingInCheck && (
                      <div className="absolute inset-0 bg-rose-500/30 ring-4 ring-rose-500 shadow-lg shadow-rose-500/50 animate-pulse rounded-md pointer-events-none z-10" />
                    )}

                    {/* Chess Piece with animation */}
                    {piece && (
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full h-full flex items-center justify-center z-10 hover:scale-105 transition-transform"
                      >
                        <ChessPiece type={piece} isWhite={isWhite} />
                      </motion.div>
                    )}

                    {/* Legal target move visual indicator dots */}
                    {isTarget && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        {piece ? (
                          // Capture target: bracket layout ring
                          <div className="w-4/5 h-4/5 border-2 border-dashed border-amber-500/80 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
                        ) : (
                          // Standard move target: central solid dot
                          <div className="w-3 h-3 rounded-full bg-amber-500/75 shadow-lg shadow-amber-500/50" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Horizontal Files labels (Letters on Bottom) */}
          <div className="h-4 pl-4 md:pl-5 flex justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none select-none">
            {FILES.map((file) => (
              <div key={file} className="w-full text-center">
                {file}
              </div>
            ))}
          </div>

        </div>

        {/* GameOver overlay */}
        <AnimatePresence>
          {gameOverResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-slate-800 z-50 backdrop-blur-md"
            >
              <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30 mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="font-display font-black text-2xl text-white tracking-wide">
                {gameOverResult === 'win' ? 'Victory is Yours!' : gameOverResult === 'loss' ? 'Better Luck Next Time!' : 'Stalemate / Draw!'}
              </h3>
              <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
                {gameOverResult === 'win' 
                  ? 'Fantastic execution! You completely outmaneuvered Stockfish AI.' 
                  : gameOverResult === 'loss' 
                    ? 'The AI delivered checkmate. Let\'s review your mistakes and try again!' 
                    : 'A beautifully contested game ending in an equal draw.'}
              </p>
              <button
                id="play-again-button"
                onClick={() => handleResetOrChangeMode(gameMode)}
                className="mt-6 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Board bottom metadata / PGN history bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-900/60 mt-auto">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Game Mode: <strong className="text-orange-400 font-semibold">{gameMode === 'puzzle' ? 'Tactical f7 Attack' : 'Standard Play'}</strong></span>
        </div>
        <div className="text-slate-500 text-[11px] font-mono select-all truncate max-w-[180px] md:max-w-xs" title="Current Board position FEN code">
          {chessRef.current.fen()}
        </div>
      </div>


    </div>
  );
};
