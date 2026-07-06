import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Sparkles, Send, RefreshCw, AlertCircle, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, BookOpen, Volume2, Gamepad2 
} from 'lucide-react';
import { getSquareBg, playChessSound, ChessPiece } from '../lib/chessUtils';

const DEFAULT_PGN = `[Event "FIDE World Championship 2024"]
[Site "Singapore"]
[Date "2024.11.25"]
[Round "1"]
[White "Gukesh D"]
[Black "Ding Liren"]
[Result "0-1"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Bb4 5. cxd5 exd5 6. Bf4 O-O 7. e3 Bf5 8. Be2 Ne4 9. Qb3 Bxc3+ 10. bxc3 b6 11. Rd1 c6 12. O-O Nd7 13. c4 dxc4 14. Bxc4 b5 15. Be2 a6 16. Qb2 Re8 17. h3 Qe7 18. Rc1 Rac8 19. a4 Be6 20. Rfd1 Nb6 21. axb5 axb5 22. Ne5 Bd5 23. f3 Nd6 24. e4 Bc4 25. Nxc4 Nbxc4 26. Qb4 Red8 27. d5 g5 28. Bg3 cxd5 29. Rxd5 Qa7+ 30. Kh2 Qe3 31. Re1 h6 32. Bxc4 0-1`;

interface MatchAnalyzerProps {
  currentUser: any;
}

export const MatchAnalyzer: React.FC<MatchAnalyzerProps> = ({ currentUser }) => {
  const [pgnInput, setPgnInput] = useState(DEFAULT_PGN);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Parsed states
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [movesList, setMovesList] = useState<any[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Coach breakdown chat states
  const [messages, setMessages] = useState<any[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: "Welcome to the Gambit Match Analyzer! Paste any raw PGN from Chess.com, Lichess, or tournament archives, and I will parse it instantly. Use the playback panel below the board to navigate the positions, or click any move in the sheet! Click 'Ask Coach' on any move for a strategic deep-dive.",
      timestamp: 'Just now'
    }
  ]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Constants for coordinate mapping
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

  useEffect(() => {
    // Parse default game on mount
    handleAnalyze();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCoachThinking]);

  // Derived Board state for currently active playback index
  const currentFen = useMemo(() => {
    return fenHistory[currentMoveIndex] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }, [fenHistory, currentMoveIndex]);

  const activeBoard = useMemo(() => {
    try {
      const tempChess = new Chess(currentFen);
      return tempChess.board().map(row =>
        row.map(sq => {
          if (!sq) return null;
          return sq.color === 'w' ? sq.type.toUpperCase() : sq.type.toLowerCase();
        })
      );
    } catch (e) {
      // Empty board fallback
      return Array(8).fill(null).map(() => Array(8).fill(null));
    }
  }, [currentFen]);

  const squaresToRender = useMemo(() => {
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

  // Highlight moving squares for the current move index
  const activeMoveHighlight = useMemo(() => {
    if (currentMoveIndex === 0 || movesList.length === 0) return null;
    const move = movesList[currentMoveIndex - 1];
    if (move && move.from && move.to) {
      return { from: move.from, to: move.to };
    }
    return null;
  }, [movesList, currentMoveIndex]);

  const handleAnalyze = () => {
    if (!pgnInput.trim()) {
      setAnalysisError('Please paste a PGN string to begin analysis.');
      return;
    }

    try {
      const tempChess = new Chess();
      tempChess.loadPgn(pgnInput);

      // Extract PGN Headers
      const pgnHeaders = tempChess.header();
      setHeaders(pgnHeaders);

      // Step-by-step history trace to collect historical board snapshots
      const historyTracker = new Chess();
      const collectedFens = [historyTracker.fen()];
      const verboseMoves = tempChess.history({ verbose: true });

      verboseMoves.forEach(move => {
        historyTracker.move(move);
        collectedFens.push(historyTracker.fen());
      });

      setFenHistory(collectedFens);
      setMovesList(verboseMoves);
      setCurrentMoveIndex(verboseMoves.length); // Display the final move initially
      setAnalysisError(null);

      // Update Chat
      setMessages(prev => [
        ...prev,
        {
          id: `analyze-success-${Date.now()}`,
          sender: 'coach',
          text: `Successfully imported PGN match!\n🏆 **Event**: ${pgnHeaders.Event || 'Unknown'}\n⚪ **White**: ${pgnHeaders.White || 'Anonymous'} (${pgnHeaders.WhiteElo || 'N/A'})\n⚫ **Black**: ${pgnHeaders.Black || 'Anonymous'} (${pgnHeaders.BlackElo || 'N/A'})\n🎯 **Result**: ${pgnHeaders.Result || 'Draw'}\n\nI've loaded all ${verboseMoves.length} moves into your interactive viewer. Select any move in the side navigation panel to evaluate structural vulnerabilities or critical alternatives!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      playChessSound('move');
    } catch (err: any) {
      setAnalysisError('Failed to parse PGN. Please ensure standard Portable Game Notation layout.');
    }
  };

  // Group moves into standard round pairs for elegant bento grids
  const movePairs = useMemo(() => {
    const pairs: { round: number; white: any; black: any; whiteIdx: number; blackIdx: number }[] = [];
    for (let i = 0; i < movesList.length; i += 2) {
      pairs.push({
        round: Math.floor(i / 2) + 1,
        white: movesList[i],
        black: movesList[i + 1] || null,
        whiteIdx: i + 1,
        blackIdx: i + 2,
      });
    }
    return pairs;
  }, [movesList]);

  // Handle Coach Chat Submission
  const handleSendChatMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatInputValue;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customMessage) setChatInputValue('');
    setIsCoachThinking(true);

    try {
      const activeMove = currentMoveIndex > 0 ? movesList[currentMoveIndex - 1] : null;
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[PGN Match Analysis Mode]\nActive FEN: "${currentFen}"\nLast move played: ${activeMove ? activeMove.san : 'Initial state'}\nUser asks: "${textToSend}"`,
          history: messages.slice(-6),
          coachProfile: { name: 'Garry', style: 'aggressive', title: 'Grandmaster AI Coach', rating: 2850, description: 'Dynamic, tactical genius.' },
          userProfile: { skillLevel: 8, eloRating: '1600 Elo', careerHistoryLength: 12 },
          gameHistory: movesList.map(m => m.san),
          isGameEnd: false,
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev,
          {
            id: `coach-msg-${Date.now()}`,
            sender: 'coach',
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error('API failure');
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `coach-msg-err-${Date.now()}`,
          sender: 'coach',
          text: "I was unable to analyze this exact square orientation right now. Keep your pieces defended and develop your knights!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsCoachThinking(false);
    }
  };

  const handleAskCoachForActiveMove = () => {
    const activeMove = currentMoveIndex > 0 ? movesList[currentMoveIndex - 1] : null;
    const prompt = activeMove 
      ? `Can you analyze the position after move ${currentMoveIndex} (${activeMove.color === 'w' ? 'White played' : 'Black played'} ${activeMove.san})? Give me tactical and positional motifs, potential blunders, and target squares.`
      : "Can you analyze the initial board opening setups before any moves are made?";
    handleSendChatMessage(prompt);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* LEFT COLUMN: Chessboard Viewer & PGN Input */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-6 backdrop-blur-xl shadow-2xl flex flex-col items-center">
          
          {/* Match Info Header */}
          <div className="w-full flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-lg font-bold text-white">Interactive Match Replay</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                {headers.White ? `${headers.White} vs ${headers.Black}` : 'Paste a PGN below to load any tournament game'}
              </p>
            </div>

            <button
              id="analyzer-flip-button"
              onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              Flip Board
            </button>
          </div>

          {/* Core Interactive Chessboard View */}
          <div className="w-full max-w-[440px] aspect-square relative bg-slate-900/30 p-2 md:p-3 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
            {/* Vertical Ranks */}
            <div className="absolute left-1 top-3 bottom-3 flex flex-col justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none z-10 w-4 pl-0.5">
              {activeRanks.map(rank => (
                <div key={rank} className="h-full flex items-center justify-start">
                  {rank}
                </div>
              ))}
            </div>

            {/* Board Squares grid */}
            <div className="flex-1 grid grid-cols-8 grid-rows-8 gap-0 rounded-xl overflow-hidden border border-slate-950/80 pl-3 md:pl-4 pb-3 md:pb-4 relative">
              {squaresToRender.map(({ r, c, squareName }) => {
                const piece = activeBoard[r][c];
                const isWhite = piece ? piece === piece.toUpperCase() : false;
                const isLastMoveFrom = activeMoveHighlight?.from === squareName;
                const isLastMoveTo = activeMoveHighlight?.to === squareName;
                const isLast = isLastMoveFrom || isLastMoveTo;

                return (
                  <div
                    key={`${r}-${c}`}
                    id={`analyzer-square-${squareName}`}
                    className={`relative aspect-square flex items-center justify-center select-none ${getSquareBg(
                      r,
                      c,
                      false,
                      false,
                      false,
                      isLast,
                      'midnight'
                    )}`}
                  >
                    {/* Render Chess Piece */}
                    {piece && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full h-full flex items-center justify-center z-10"
                      >
                        <ChessPiece type={piece} isWhite={isWhite} />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Horizontal Files */}
            <div className="h-4 pl-4 md:pl-5 flex justify-between text-[10px] md:text-xs font-mono font-bold text-slate-500 pointer-events-none select-none">
              {activeFiles.map(file => (
                <div key={file} className="w-full text-center">
                  {file}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Playback Control buttons */}
          <div className="flex items-center justify-center gap-2 mt-5 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl shadow-lg w-full max-w-[440px]">
            <button
              id="analyzer-playback-first"
              onClick={() => {
                setCurrentMoveIndex(0);
                playChessSound('move');
              }}
              disabled={currentMoveIndex === 0}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 rounded transition-all cursor-pointer"
              title="First move"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              id="analyzer-playback-prev"
              onClick={() => {
                setCurrentMoveIndex(prev => Math.max(0, prev - 1));
                playChessSound('move');
              }}
              disabled={currentMoveIndex === 0}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 rounded transition-all cursor-pointer"
              title="Previous move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 px-3 min-w-[120px] text-center">
              {currentMoveIndex === 0 ? 'Initial Position' : `Move ${currentMoveIndex} / ${fenHistory.length - 1}`}
            </span>
            <button
              id="analyzer-playback-next"
              onClick={() => {
                setCurrentMoveIndex(prev => Math.min(fenHistory.length - 1, prev + 1));
                playChessSound('move');
              }}
              disabled={currentMoveIndex === fenHistory.length - 1}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 rounded transition-all cursor-pointer"
              title="Next move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              id="analyzer-playback-last"
              onClick={() => {
                setCurrentMoveIndex(fenHistory.length - 1);
                playChessSound('move');
              }}
              disabled={currentMoveIndex === fenHistory.length - 1}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 rounded transition-all cursor-pointer"
              title="Last move"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Ask Coach trigger */}
          <button
            id="analyzer-ask-coach-button"
            onClick={handleAskCoachForActiveMove}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold font-mono text-slate-950 bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer uppercase tracking-wider shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            Analyze Position with Coach
          </button>
        </div>

        {/* PGN Paste input area */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
          <div>
            <h3 className="font-display font-bold text-white text-sm tracking-wide">Import Match PGN</h3>
            <p className="text-xs text-slate-400 mt-1">Paste standard Portable Game Notation chess archives below to map out the entire match.</p>
          </div>

          <textarea
            id="pgn-input-textarea"
            rows={5}
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500/50 resize-none"
            placeholder="[Event 'World Championship'] ..."
          />

          {analysisError && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          <button
            id="pgn-submit-button"
            onClick={handleAnalyze}
            className="flex items-center justify-center gap-1.5 text-xs font-bold font-mono text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            <Gamepad2 className="w-4 h-4 text-amber-500" />
            Analyze Game
          </button>
        </div>
      </div>

      {/* MIDDLE & RIGHT PANEL: Parse moves sheet & coach chat */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* PARSED MOVE SHEET */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col h-[300px] lg:h-[350px]">
          <h3 className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3 pb-2 border-b border-slate-900">Moves Sheet</h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
            {movePairs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No parsed moves loaded yet.</div>
            ) : (
              movePairs.map(pair => (
                <div key={pair.round} className="grid grid-cols-12 text-xs items-center py-1 border-b border-slate-900/40 hover:bg-slate-900/20 rounded">
                  <div className="col-span-2 font-mono text-slate-500 font-bold text-right pr-2">
                    {pair.round}.
                  </div>
                  
                  {/* White's move button */}
                  <div className="col-span-5">
                    <button
                      onClick={() => {
                        setCurrentMoveIndex(pair.whiteIdx);
                        playChessSound('move');
                      }}
                      className={`w-full text-left px-2 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                        currentMoveIndex === pair.whiteIdx
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {pair.white.san}
                    </button>
                  </div>

                  {/* Black's move button */}
                  <div className="col-span-5">
                    {pair.black && (
                      <button
                        onClick={() => {
                          setCurrentMoveIndex(pair.blackIdx);
                          playChessSound('move');
                        }}
                        className={`w-full text-left px-2 py-1 rounded font-mono font-medium transition-colors cursor-pointer ${
                          currentMoveIndex === pair.blackIdx
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {pair.black.san}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COACH BREAKDOWN CHAT WINDOW */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl flex flex-col h-[400px] lg:h-[450px]">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm shadow-inner">
              👨‍🏫
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-xs">Coach Breakdown</h3>
              <p className="text-[10px] text-amber-500 font-mono tracking-wider uppercase">Live tactical evaluation</p>
            </div>
          </div>

          {/* Chat Messages flow */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-3 pr-1">
            {messages.map((msg) => {
              const isCoach = msg.sender === 'coach';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isCoach ? 'self-start' : 'self-end'}`}
                >
                  <div
                    className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isCoach
                        ? 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/60'
                        : 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className={`text-[9px] text-slate-500 mt-1 font-mono ${isCoach ? 'text-left' : 'text-right'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isCoachThinking && (
              <div className="self-start max-w-[85%] flex flex-col gap-1">
                <div className="bg-slate-900 text-slate-300 border border-slate-800/60 rounded-2xl rounded-tl-none px-3 py-2.5 text-xs flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Coach Garry is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat text Input container */}
          <div className="flex gap-2">
            <input
              id="analyzer-chat-input"
              type="text"
              value={chatInputValue}
              onChange={(e) => setChatInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChatMessage();
              }}
              placeholder="Ask coach about active structural plans..."
              className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
            />
            <button
              id="analyzer-chat-send"
              onClick={() => handleSendChatMessage()}
              className="p-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-950"
            >
              <Send className="w-4 h-4 fill-slate-950 stroke-[2]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
