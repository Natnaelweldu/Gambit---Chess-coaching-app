import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chess } from 'chess.js';
import { Sparkles, RefreshCw, Eye, EyeOff, Trophy, Flame, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Zap, Play, CheckCircle, Palette, Activity, Copy } from 'lucide-react';
import { classifyChessMove, CLASSIFICATION_META, MoveClassificationType, CLASSIFICATION_WEIGHTS } from '../lib/analytics';
import { CoachProfile } from '../types';

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
    resigned?: boolean;
  }) => void;
  highlightedSquares?: string[];
  coachHintActive: boolean;
  setCoachHintActive: (active: boolean) => void;
  skillLevel: number;
  setSkillLevel: (lvl: number) => void;
  coachProfile: CoachProfile;
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
  coachProfile,
}) => {
  const [gameMode, setGameMode] = useState<'standard' | 'puzzle'>('standard');
  const [boardTheme, setBoardTheme] = useState<'classic' | 'ocean' | 'forest' | 'midnight' | 'wood'>('midnight');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [fenHistory, setFenHistory] = useState<string[]>([STANDARD_FEN]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);

  // Setup options
  const [isGameSetupOpen, setIsGameSetupOpen] = useState<boolean>(true);
  const [userColor, setUserColor] = useState<'white' | 'black'>('white');
  const [timeControl, setTimeControl] = useState<'casual' | '3min' | '5min' | '10min' | '30min'>('casual');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [copiedPgn, setCopiedPgn] = useState<boolean>(false);
  const [copiedPng, setCopiedPng] = useState<boolean>(false);

  // Temporary configuration choices
  const [tempColor, setTempColor] = useState<'white' | 'black'>('white');
  const [tempTime, setTempTime] = useState<'casual' | '3min' | '5min' | '10min' | '30min'>('casual');
  const [tempLevel, setTempLevel] = useState<number>(skillLevel || 1);

  // Sync tempLevel when skillLevel prop updates
  useEffect(() => {
    setTempLevel(skillLevel);
  }, [skillLevel]);

  // Chess.js instance management
  const chessRef = useRef<Chess>(new Chess(STANDARD_FEN));
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

  // Live Move Review/Analysis classifications
  const [liveMoveClassifications, setLiveMoveClassifications] = useState<{
    san: string;
    classification: MoveClassificationType;
    player: 'white' | 'black';
  }[]>([]);

  const userAccuracy = React.useMemo(() => {
    const userMoves = liveMoveClassifications.filter((c) => c.player === userColor);
    if (userMoves.length === 0) return null;
    const totalWeight = userMoves.reduce((sum, m) => sum + CLASSIFICATION_WEIGHTS[m.classification], 0);
    return Math.round(totalWeight / userMoves.length);
  }, [liveMoveClassifications, userColor]);

  const currentFen = fenHistory[currentMoveIndex] || chessRef.current.fen();

  const activeBoard = React.useMemo(() => {
    try {
      const tempChess = new Chess(currentFen);
      return tempChess.board().map((row) =>
        row.map((sq) => {
          if (!sq) return null;
          return sq.color === 'w' ? sq.type.toUpperCase() : sq.type.toLowerCase();
        })
      );
    } catch (e) {
      return board;
    }
  }, [currentFen, board]);

  const activeInCheck = React.useMemo(() => {
    try {
      const tempChess = new Chess(currentFen);
      return tempChess.inCheck();
    } catch (e) {
      return false;
    }
  }, [currentFen]);

  const squaresToRender = React.useMemo(() => {
    const list = [];
    if (boardOrientation === 'white') {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          list.push({ r, c, squareName: `${FILES[c]}${RANKS[r]}` });
        }
      }
    } else {
      for (let r = 7; r >= 0; r--) {
        for (let c = 7; c >= 0; c--) {
          list.push({ r, c, squareName: `${FILES[c]}${RANKS[r]}` });
        }
      }
    }
    return list;
  }, [boardOrientation]);

  const activeRanks = boardOrientation === 'white' ? RANKS : [...RANKS].reverse();
  const activeFiles = boardOrientation === 'white' ? FILES : [...FILES].reverse();

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
      const moveResult = chessRef.current.move({ from, to, promotion });
      
      if (moveResult) {
        const isGameOver = chessRef.current.isGameOver();
        const isCheckmate = chessRef.current.isCheckmate();
        const classification = classifyChessMove(
          { san: moveResult.san, piece: moveResult.piece, captured: moveResult.captured || undefined },
          chessRef.current.history().length,
          chessRef.current.inCheck(),
          isCheckmate
        );
        const aiColor = userColor === 'white' ? 'black' : 'white';
        setLiveMoveClassifications((prev) => [
          ...prev,
          { san: moveResult.san, classification, player: aiColor as any }
        ]);
      }
      
      setLastMove({ from, to });
      setIsAiThinking(false);
      
      // Sync board visual representation
      syncBoardFromChess();

      // Append to FEN history and advance active pointer
      const newFen = chessRef.current.fen();
      setFenHistory(prev => {
        const nextHist = [...prev, newFen];
        setCurrentMoveIndex(nextHist.length - 1);
        return nextHist;
      });

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

  const isUserTurn = () => {
    if (chessRef.current.isGameOver()) return false;
    const turn = chessRef.current.turn();
    return (userColor === 'white' && turn === 'w') || (userColor === 'black' && turn === 'b');
  };

  // Trigger AI evaluation and play
  const requestAiResponse = () => {
    if (chessRef.current.isGameOver() || isUserTurn()) return;
    
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
    const isBrowsingHistory = currentMoveIndex < fenHistory.length - 1;
    if (isAiThinking || chessRef.current.isGameOver() || isBrowsingHistory || !isUserTurn()) return;

    const squareName = getSquareName(r, c);
    const piece = chessRef.current.get(squareName as any);
    const userTurnCode = userColor === 'white' ? 'w' : 'b';

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

          // Classify User's move
          const isCheckmate = chessRef.current.isCheckmate();
          const classification = classifyChessMove(
            { san: moveResult.san, piece: moveResult.piece, captured: moveResult.captured || undefined },
            chessRef.current.history().length,
            chessRef.current.inCheck(),
            isCheckmate
          );
          setLiveMoveClassifications((prev) => [
            ...prev,
            { san: moveResult.san, classification, player: userColor }
          ]);

          // Sync game states immediately
          syncBoardFromChess();

          // Append to FEN history and advance active pointer
          const newFen = chessRef.current.fen();
          setFenHistory(prev => {
            const nextHist = [...prev, newFen];
            setCurrentMoveIndex(nextHist.length - 1);
            return nextHist;
          });

          // Pass control to Stockfish
          setTimeout(() => {
            requestAiResponse();
          }, 400);
          return;
        }
      } catch (e) {
        // Move was invalid. If clicked another of user's own pieces, select that instead!
        if (piece && piece.color === userTurnCode) {
          selectPiece(r, c, squareName);
          return;
        }
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    } else {
      // Select piece if it belongs to the user
      if (piece && piece.color === userTurnCode) {
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

  const handleStartGame = (selectedColor: 'white' | 'black', selectedTime: typeof timeControl, selectedLevel: number) => {
    setUserColor(selectedColor);
    setBoardOrientation(selectedColor);
    setTimeControl(selectedTime);
    setSkillLevel(selectedLevel);
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMove(null);
    setGameOverResult(null);
    setIsAiThinking(false);
    setCoachHintActive(false);
    setLiveMoveClassifications([]); // Clear live move review!
    
    const initialFen = STANDARD_FEN;
    chessRef.current = new Chess(initialFen);
    setFenHistory([initialFen]);
    setCurrentMoveIndex(0);

    // Set up times
    const initialSeconds = selectedTime === '3min' ? 180 : selectedTime === '5min' ? 300 : selectedTime === '10min' ? 600 : selectedTime === '30min' ? 1800 : 300;
    setWhiteTime(initialSeconds);
    setBlackTime(initialSeconds);

    setIsGameSetupOpen(false);
    syncBoardFromChess();

    // If user is Black, AI moves first as White!
    if (selectedColor === 'black') {
      setIsAiThinking(true);
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage(`position fen ${initialFen}`);
          workerRef.current.postMessage('go depth 5');
        }
      }, 500);
    }
  };

  // Helper to format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyPgn = () => {
    try {
      const pgn = chessRef.current.pgn() || "No moves played yet.";
      navigator.clipboard.writeText(pgn);
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 1500);
    } catch (e) {
      console.error('Failed to copy PGN:', e);
    }
  };

  const handleCopyPng = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = 480;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const squareSize = size / 8;
      const THEME_COLORS: Record<string, { dark: string, light: string }> = {
        classic: { dark: '#769656', light: '#eeeed2' },
        ocean: { dark: '#2f6291', light: '#dee5ed' },
        forest: { dark: '#224d34', light: '#e3eec0' },
        midnight: { dark: '#111827', light: '#1e293b' },
        wood: { dark: '#6b3a0e', light: '#cfab7a' },
      };
      const colors = THEME_COLORS[boardTheme] || THEME_COLORS.classic;

      // Draw squares
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isDark = (r + c) % 2 === 1;
          ctx.fillStyle = isDark ? colors.dark : colors.light;
          ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
          
          // Draw subtle labels if on edge
          ctx.fillStyle = isDark ? colors.light : colors.dark;
          ctx.font = 'bold 9px sans-serif';
          ctx.globalAlpha = 0.35;
          if (c === 0) {
            // Rank label on left edge
            const labelRank = boardOrientation === 'white' ? RANKS[r] : RANKS[7 - r];
            ctx.fillText(labelRank, 4, r * squareSize + 12);
          }
          if (r === 7) {
            // File label on bottom edge
            const labelFile = boardOrientation === 'white' ? FILES[c] : FILES[7 - c];
            ctx.fillText(labelFile, (c + 1) * squareSize - 10, size - 4);
          }
          ctx.globalAlpha = 1.0;
        }
      }

      // Draw pieces
      const pieceSymbols: Record<string, string> = {
        'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
      };

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          // Adjust for orientation
          const sourceR = boardOrientation === 'white' ? r : 7 - r;
          const sourceC = boardOrientation === 'white' ? c : 7 - c;
          const pieceChar = activeBoard[sourceR]?.[sourceC];
          if (pieceChar) {
            const symbol = pieceSymbols[pieceChar];
            if (symbol) {
              const isWhitePiece = pieceChar === pieceChar.toUpperCase();
              
              // Shadow effect for the pieces
              ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetX = 1;
              ctx.shadowOffsetY = 2;

              ctx.fillStyle = isWhitePiece ? '#ffffff' : '#1e1b4b'; // rich black/slate
              ctx.strokeStyle = isWhitePiece ? '#0f172a' : '#f8fafc'; // high contrast outlines
              ctx.lineWidth = 2.5;
              ctx.font = 'bold 44px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              const x = c * squareSize + squareSize / 2;
              const y = r * squareSize + squareSize / 2;
              
              ctx.fillText(symbol, x, y);
              // Disable shadow for stroke to prevent fuzzy stroke
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
              ctx.strokeText(symbol, x, y);
            }
          }
        }
      }

      // Copy or fall back to download
      canvas.toBlob((blob) => {
        if (blob) {
          try {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              setCopiedPng(true);
              setTimeout(() => setCopiedPng(false), 1500);
            }).catch(() => {
              // Trigger download fallback
              const link = document.createElement('a');
              link.download = `gambit-chessboard-${Date.now()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
              setCopiedPng(true);
              setTimeout(() => setCopiedPng(false), 1500);
            });
          } catch (err) {
            // Safe fallback
            const link = document.createElement('a');
            link.download = `gambit-chessboard-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            setCopiedPng(true);
            setTimeout(() => setCopiedPng(false), 1500);
          }
        }
      });
    } catch (e) {
      console.error('Failed to copy PNG:', e);
    }
  };

  // Timer tick effect
  useEffect(() => {
    if (isGameSetupOpen || timeControl === 'casual' || gameOverResult) return;
    if (fenHistory.length <= 1) return; // Only start timer after first move is made

    const interval = setInterval(() => {
      const turn = chessRef.current.turn(); // 'w' or 'b'
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameOverResult(userColor === 'white' ? 'loss' : 'win');
            playChessSound('gameover');
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameOverResult(userColor === 'black' ? 'loss' : 'win');
            playChessSound('gameover');
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameSetupOpen, timeControl, gameOverResult, fenHistory, userColor]);

  // Re-initialization for board game modes
  const handleResetOrChangeMode = (mode: 'standard' | 'puzzle') => {
    handleStartGame(userColor, timeControl, skillLevel);
  };

  const handleDemandResignation = () => {
    // Check if at least 4 half-moves (2 full moves) or a basic count is completed
    const moves = chessRef.current.history();
    if (moves.length < 4) {
      alert("The AI Coach Stockfish refuses to resign this early! Play at least 2 full moves (4 half-moves) first.");
      return;
    }

    // Force engine concession
    setGameOverResult('win');
    playChessSound('gameover');

    if (onGameUpdate) {
      onGameUpdate({
        fen: chessRef.current.fen(),
        history: chessRef.current.history(),
        isGameOver: true,
        result: 'win',
        inCheck: chessRef.current.inCheck(),
        isAiThinking: false,
        lastMove,
        resigned: true,
      });
    }
  };

  // IMPORTANT: every branch below must only use non-dimensional properties (background
  // color + inset box-shadow via `ring-*` utilities). Never mix in `border`/`margin`/
  // `padding` here since those alter the box model and were the root cause of the whole
  // page "jumping" whenever a square's state changed (e.g. selecting a piece). Every
  // state now uses the same `ring-2 ... ring-inset` treatment so toggling never adds or
  // removes a box-shadow layer, keeping every square's rendered box perfectly stable.
  const getSquareBg = (r: number, c: number, isSelected: boolean, isHighlighted: boolean, isHint: boolean, isLastMove: boolean) => {
    const isDark = (r + c) % 2 === 1;

    if (isSelected) {
      return 'bg-amber-500/30 ring-2 ring-amber-400 ring-inset';
    }
    if (isHint) {
      return 'bg-emerald-500/20 ring-2 ring-emerald-400 ring-inset animate-pulse';
    }
    if (isHighlighted) {
      return 'bg-sky-500/25 ring-2 ring-sky-400 ring-inset';
    }
    if (isLastMove) {
      return isDark
        ? 'bg-amber-900/30 ring-2 ring-amber-500/25 ring-inset'
        : 'bg-amber-100/15 ring-2 ring-amber-500/25 ring-inset';
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
    <div id="chessboard-container" className="flex flex-col h-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur-xl shadow-2xl overflow-y-auto lg:overflow-hidden relative touch-manipulation overscroll-contain">
      
      {isGameSetupOpen ? (
        <div id="chessboard-setup-screen" className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full py-4 relative">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 mb-3 shadow shadow-amber-500/5">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="font-display text-xl font-extrabold text-white tracking-tight">Arena Setup</h2>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Configure your chess training settings to face Grandmaster Stockfish and receive real-time, step-by-step coaching.
            </p>
          </div>

          {/* Section 1: Choose Side */}
          <div className="mb-5">
            <label className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block mb-2.5">
              1. Select Your Color
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTempColor('white')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  tempColor === 'white'
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/35'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xl shadow-md border border-slate-200 text-slate-950 font-bold select-none">
                    ♔
                  </div>
                  {tempColor === 'white' && (
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-bold text-xs block text-white">Play as White</span>
                  <span className="text-[9px] text-slate-400 block">Move first, seize initiative</span>
                </div>
              </button>

              <button
                onClick={() => setTempColor('black')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  tempColor === 'black'
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/35'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-xl shadow-md border border-slate-800 text-white font-bold select-none">
                    ♚
                  </div>
                  {tempColor === 'black' && (
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-bold text-xs block text-white">Play as Black</span>
                  <span className="text-[9px] text-slate-400 block">AI moves first, counter-strike</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Choose Time Constraint */}
          <div className="mb-5">
            <label className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block mb-2">
              2. Select Time Control
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'casual', label: 'Casual', desc: 'No timer' },
                { id: '3min', label: '3 min', desc: 'Blitz' },
                { id: '5min', label: '5 min', desc: 'Blitz' },
                { id: '10min', label: '10 min', desc: 'Rapid' },
                { id: '30min', label: '30 min', desc: 'Classic' },
              ].map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setTempTime(tc.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    tempTime === tc.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold ring-1 ring-amber-500/25'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] block font-bold leading-none">{tc.label}</span>
                  <span className="text-[8px] opacity-75 font-mono block leading-none">{tc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: AI Skill level */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block">
                3. AI Skill Level
              </label>
              <span className="text-[10px] font-mono font-bold text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                Level {tempLevel} / 20
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="20"
              value={tempLevel}
              onChange={(e) => setTempLevel(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer focus:outline-none mb-2"
            />

            <div className="bg-slate-900/40 border border-slate-900/80 p-2.5 rounded-xl">
              <span className="text-xs font-bold text-white block leading-none">
                {tempLevel <= 4 
                  ? 'Beginner Coach (800 - 1100 ELO)' 
                  : tempLevel <= 9 
                    ? 'Intermediate Coach (1200 - 1500 ELO)' 
                    : tempLevel <= 15 
                      ? 'Expert Coach (1600 - 2000 ELO)' 
                      : 'Grandmaster Coach (2100 - 2800 ELO)'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1 leading-normal">
                {tempLevel <= 4 
                  ? 'Ideal for learning basic coordinates, standard captures, and avoiding simple blunders.' 
                  : tempLevel <= 9 
                    ? 'Presents decent structural challenges, castling priorities, and defensive structures.' 
                    : tempLevel <= 15 
                      ? 'Plays sharp tactical combinations and seeks minor positional advantages immediately.' 
                      : 'Strict, punishing grandmaster-level chess. Requires master-class calculation.'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleStartGame(tempColor, tempTime, tempLevel)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-black text-xs tracking-wider uppercase py-3 rounded-xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Launch Match</span>
          </button>
        </div>
      ) : (
        <>
          {/* Header and Configuration Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 md:mb-3 pb-2 md:pb-3 border-b border-slate-900">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="font-display text-lg md:text-xl font-bold text-white tracking-wide">Play vs AI Coach</h2>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {timeControl === 'casual' ? 'Casual Play' : `Timed: ${timeControl}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAiThinking ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                {isAiThinking 
                  ? 'AI is computing its strategy...' 
                  : isUserTurn() 
                    ? `Your move (${userColor === 'white' ? 'White' : 'Black'})` 
                    : `AI's turn (${userColor === 'white' ? 'Black' : 'White'})`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* New Match Button */}
              <button
                id="new-match-setup-button"
                onClick={() => setIsGameSetupOpen(true)}
                className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-amber-500/5 active:scale-95 animate-pulse"
                title="Configure and start a new training match"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span className="text-xs font-bold">New Match</span>
              </button>

              {/* Reset button */}
              <button
                id="reset-board-button"
                onClick={() => handleResetOrChangeMode('standard')}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="Restart current match settings"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Restart</span>
              </button>

              {/* Flip Board button */}
              <button
                id="flip-board-button"
                onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="Flip Board Orientation"
              >
                <RefreshCw className="w-3.5 h-3.5 rotate-90 text-amber-400" />
                <span className="text-xs font-semibold">Flip Board</span>
              </button>

              {/* Concede Stockfish button */}
              {!gameOverResult && (
                <button
                  id="demand-ai-resignation-button"
                  onClick={handleDemandResignation}
                  className="p-2 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-950/50 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  title="Demand Stockfish Resignation"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold">Concede Stockfish</span>
                </button>
              )}
            </div>
          </div>

          {/* Board Theme Palette Switcher */}
          <div id="board-palette-switcher" className="flex flex-wrap items-center gap-2 mb-2 bg-slate-900/40 p-1.5 md:p-2 rounded-xl border border-slate-900/60 text-xs z-20">
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
          <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-6 py-2 relative min-h-0">
            
            {/* Left Side: Interactive Board with Player Bars */}
            <div className="flex-1 flex flex-col items-center justify-start min-h-[320px] md:min-h-[400px] relative">
              
              {/* Opponent Bar */}
              <div className="w-full max-w-[460px] flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-1 mb-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-inner select-none">
                      {coachProfile.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${!isUserTurn() && !gameOverResult ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">GM Coach {coachProfile.name}</span>
                      <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-400 font-mono rounded font-bold">Lvl {skillLevel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm border border-slate-700 ${userColor === 'white' ? 'bg-slate-950' : 'bg-white'}`} />
                      <span className="text-[9px] text-slate-400 font-medium">Playing {userColor === 'white' ? 'Black' : 'White'}</span>
                    </div>
                  </div>
                </div>
                
                {timeControl !== 'casual' && (
                  <div className={`px-2.5 py-0.5 rounded font-mono font-black text-xs transition-all duration-300 ${
                    !isUserTurn() && !gameOverResult
                      ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20 scale-105' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {formatTime(userColor === 'white' ? blackTime : whiteTime)}
                  </div>
                )}
              </div>

              {/* Actual Chess Board */}
              <div className="w-full max-w-[440px] xl:max-w-[460px] aspect-square relative bg-slate-900/30 p-2 md:p-3 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
                
                {/* Vertical Ranks labels (Numbers on Left side) */}
                <div className="absolute left-1 top-3 bottom-3 flex flex-col justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none z-10 w-4 pl-0.5">
                  {activeRanks.map((rank) => (
                    <div key={rank} className="h-full flex items-center justify-start">
                      {rank}
                    </div>
                  ))}
                </div>

                {/* Actual 8x8 Board Container */}
                <div className="flex-1 grid grid-cols-8 grid-rows-8 gap-0 rounded-xl overflow-hidden border border-slate-950/80 pl-3 md:pl-4 pb-3 md:pb-4 relative">
                  {squaresToRender.map(({ r, c, squareName }) => {
                    const piece = activeBoard[r][c];
                    const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                    const isHighlighted = highlightedSquares.includes(squareName);
                    const isHint = isHintSquare(squareName);
                    const isLast = (lastMove?.from === squareName || lastMove?.to === squareName);
                    const isTarget = legalTargets.includes(squareName);
                    const isWhite = piece ? piece === piece.toUpperCase() : false;
                    const kingInCheck = isKingInCheckSquare(squareName);

                    return (
                      <div
                        key={`${r}-${c}`}
                        id={`square-${squareName}`}
                        onClick={() => handleSquareClick(r, c)}
                        className={`relative aspect-square flex items-center justify-center cursor-pointer transition-colors duration-150 select-none touch-manipulation ${getSquareBg(
                          r,
                          c,
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
                  })}
                </div>

                {/* Horizontal Files labels (Letters on Bottom) */}
                <div className="h-4 pl-4 md:pl-5 flex justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none select-none">
                  {activeFiles.map((file) => (
                    <div key={file} className="w-full text-center">
                      {file}
                    </div>
                  ))}
                </div>

              </div>

              {/* User Bar */}
              <div className="w-full max-w-[460px] flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-1 mt-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-inner select-none">
                      👤
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${isUserTurn() && !gameOverResult ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">You</span>
                      <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-400 font-mono rounded font-bold">1190 Elo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm border border-slate-700 ${userColor === 'white' ? 'bg-white' : 'bg-slate-950'}`} />
                      <span className="text-[9px] text-slate-400 font-medium">Playing {userColor === 'white' ? 'White' : 'Black'}</span>
                    </div>
                  </div>
                </div>
                
                {timeControl !== 'casual' && (
                  <div className={`px-2.5 py-0.5 rounded font-mono font-black text-xs transition-all duration-300 ${
                    isUserTurn() && !gameOverResult
                      ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20 scale-105' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {formatTime(userColor === 'white' ? whiteTime : blackTime)}
                  </div>
                )}
              </div>

              {/* Move Playback Navigation Controls */}
              <div className="flex items-center justify-center gap-2 mt-2 md:mt-2.5 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-xl shadow-lg w-full max-w-[460px] z-10">
                <button
                  id="playback-first"
                  onClick={() => setCurrentMoveIndex(0)}
                  disabled={currentMoveIndex === 0}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                  title="Go to Start"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  id="playback-prev"
                  onClick={() => setCurrentMoveIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentMoveIndex === 0}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                  title="Previous Move"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-300 px-2 min-w-[100px] text-center">
                  {currentMoveIndex === 0 ? 'Start' : `Move ${currentMoveIndex} / ${fenHistory.length - 1}`}
                </span>
                <button
                  id="playback-next"
                  onClick={() => setCurrentMoveIndex(prev => Math.min(fenHistory.length - 1, prev + 1))}
                  disabled={currentMoveIndex === fenHistory.length - 1}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                  title="Next Move"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  id="playback-last"
                  onClick={() => setCurrentMoveIndex(fenHistory.length - 1)}
                  disabled={currentMoveIndex === fenHistory.length - 1}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent rounded transition-all cursor-pointer"
                  title="Go to End"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
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
                          ? 'The AI delivered checkmate or you ran out of time. Let\'s review your mistakes and try again!' 
                          : 'A beautifully contested game ending in an equal draw.'}
                    </p>
                    <button
                      id="play-again-button"
                      onClick={() => setIsGameSetupOpen(true)}
                      className="mt-6 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Play Again</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

        {/* Right Side: Live Move Review Sidebar */}
        <div className="w-full lg:w-[260px] xl:w-[280px] bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900/60">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-semibold text-xs text-white uppercase tracking-wider">Live Move Analysis</h3>
          </div>
          
          {/* Accuracy Gauge / Metric */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">My Accuracy</span>
              <span className="text-xl font-display font-black text-emerald-400 font-mono">
                {userAccuracy !== null ? `${userAccuracy}%` : '—'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 max-w-[130px] text-right italic leading-snug">
              {userAccuracy === null 
                ? "Play a move to start evaluation!"
                : userAccuracy > 85 
                  ? "Masterful play!"
                  : userAccuracy > 65 
                    ? "Solid chess." 
                    : "Inaccuracies spotted."}
            </div>
          </div>

          {/* Classification chiclets counters */}
          <div className="grid grid-cols-4 gap-1 text-center">
            {Object.keys(CLASSIFICATION_META).map((type) => {
              const meta = CLASSIFICATION_META[type as MoveClassificationType];
              const count = liveMoveClassifications.filter(c => c.player === userColor && c.classification === type).length;
              return (
                <div key={type} className="bg-slate-900/20 border border-slate-900/40 rounded py-1 px-0.5" title={`${meta.label}: ${meta.desc}`}>
                  <div className="text-xs">{meta.icon}</div>
                  <div className="text-[8px] font-semibold text-slate-500 truncate">{meta.label.split(' ')[0]}</div>
                  <div className={`text-[10px] font-mono font-bold ${meta.color}`}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Move Feed List */}
          <div className="flex-1 overflow-y-auto max-h-[140px] lg:max-h-[220px] divide-y divide-slate-900/40 pr-1 flex flex-col gap-1.5 scrollbar-thin">
            {liveMoveClassifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                <span className="text-xl">📊</span>
                <span className="text-[9px] mt-1.5 font-mono uppercase tracking-wider text-slate-500">Awaiting Moves</span>
              </div>
            ) : (
              [...liveMoveClassifications].reverse().map((move, idx) => {
                const meta = CLASSIFICATION_META[move.classification];
                return (
                  <div key={idx} className="flex items-center justify-between py-1.5 text-xs first:pt-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${move.player === userColor ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
                      <span className="font-mono text-slate-300 font-bold">{move.san}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase">{move.player === userColor ? 'You' : 'Stockfish'}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${meta.bg} ${meta.color} ${meta.border} border`}>
                      <span>{meta.icon}</span>
                      <span className="font-bold tracking-wide">{meta.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Board bottom metadata / PGN history bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-900/60 mt-auto">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Game Mode: <strong className="text-orange-400 font-semibold">{timeControl === 'casual' ? 'Casual Standard Play' : `Timed Match (${timeControl})`}</strong></span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="copy-pgn-button"
            onClick={handleCopyPgn}
            className="text-[11px] bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer font-mono shrink-0 select-none font-semibold active:scale-95"
            title="Copy match moves as Portable Game Notation (PGN)"
          >
            <Copy className="w-3 h-3 text-emerald-500" />
            <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
          </button>
          
          <button
            id="copy-png-button"
            onClick={handleCopyPng}
            className="text-[11px] bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer font-mono shrink-0 select-none font-semibold active:scale-95"
            title="Export or Copy Chessboard as a PNG image"
          >
            <Palette className="w-3 h-3 text-amber-500" />
            <span>{copiedPng ? 'PNG Exported!' : 'Copy PNG'}</span>
          </button>
        </div>
      </div>
    </>)}

    </div>
  );
};
