import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Sparkles, Volume2, ShieldAlert, GraduationCap, CheckCircle2 } from 'lucide-react';
import { ChatMessage, CoachProfile } from '../types';

interface CoachChatSectionProps {
  coachProfile: CoachProfile;
  setCoachProfile: (profile: CoachProfile) => void;
  onHintTrigger: () => void;
  gameHistory: string[];
  inCheck: boolean;
  isGameOver: boolean;
  gameResult: 'win' | 'loss' | 'draw' | 'active';
  coachMemory: string;
  onMemoryUpdated: (newMemory: string) => void;
  onTagDetected?: (tag: string) => void;
}

const COACH_PROFILES: CoachProfile[] = [
  {
    name: 'Garry',
    title: 'Grandmaster AI Coach',
    avatar: '👨‍🏫',
    style: 'aggressive',
    description: 'Dynamic, tactical genius focusing on attacking lines and crushing sacrifices.',
    rating: 2850,
  },
  {
    name: 'Svetlana',
    title: 'Positional Strategist',
    avatar: '👩‍🏫',
    style: 'positional',
    description: 'Calm, methodical approach. Focuses on pawn structure, key squares, and long-term advantages.',
    rating: 2720,
  },
  {
    name: 'Sofia',
    title: 'Polgar Academy Tutor',
    avatar: '👩‍🎓',
    style: 'balanced',
    description: 'Patient, educational style. Focuses on core mating patterns, standard tactics, and general rules.',
    rating: 2600,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'coach',
    text: "Greetings, future Grandmaster! 👋 I've loaded your tactical puzzle. White is in an extremely promising position but needs precision.",
    timestamp: 'Just now',
  },
  {
    id: 'msg-2',
    sender: 'coach',
    text: "Look at Black's weak f7 pawn. How can you deploy your active Bishop on c4 and your Queen on h5 to orchestrate an unstoppable attack? Send me your thoughts, or click 'Analyze Position'!",
    timestamp: 'Just now',
  },
];

export const CoachChatSection: React.FC<CoachChatSectionProps> = ({
  coachProfile,
  setCoachProfile,
  onHintTrigger,
  gameHistory,
  inCheck,
  isGameOver,
  gameResult,
  coachMemory,
  onMemoryUpdated,
  onTagDetected,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('chess_coach_chat_history');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch (e) {
      return INITIAL_MESSAGES;
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastHistoryLength = useRef(gameHistory.length);

  useEffect(() => {
    localStorage.setItem('chess_coach_chat_history', JSON.stringify(messages));
  }, [messages]);
  const analyzedGameEnd = useRef<string | null>(null);

  // Auto scroll chat to bottom when message arrives
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isCoachThinking]);

  // Scan recent messages for category hashtags and pass up to parent
  useEffect(() => {
    if (!onTagDetected) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.sender === 'coach') {
        const text = msg.text;
        const tags = ['#opening-principles', '#blunder-tactics', '#middlegame-strategy', '#endgame-finesse', '#positional-play'];
        for (const tag of tags) {
          if (text.includes(tag)) {
            onTagDetected(tag);
            return;
          }
        }
      }
    }
  }, [messages, onTagDetected]);

  // Read student profile info from localStorage
  const getUserProfile = () => {
    const skillLevel = localStorage.getItem('chess_coach_skill_level') || '1';
    const eloRating = localStorage.getItem('chess_coach_elo_rating') || '1200 Elo';
    let careerHistoryLength = 0;
    try {
      const rawHistory = localStorage.getItem('chess_coach_game_history');
      if (rawHistory) {
        careerHistoryLength = JSON.parse(rawHistory).length;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      skillLevel: parseInt(skillLevel, 10),
      eloRating,
      careerHistoryLength,
      coachMemory: coachMemory || '',
    };
  };

  // Consolidate recent context into coach memory asynchronously
  const triggerMemoryConsolidation = async (updatedHistory: ChatMessage[], isGameEndSignal = false) => {
    setIsSavingMemory(true);
    try {
      const userProfile = getUserProfile();
      const response = await fetch('/api/coach/summarize-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHistory: updatedHistory,
          previousMemory: coachMemory,
          userProfile,
          gameHistory,
          coachProfile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.coachMemory) {
          onMemoryUpdated(data.coachMemory);
          // Auto-open journal briefly if it was a game end to delight the user
          if (isGameEndSignal) {
            setIsJournalOpen(true);
          }
        }
      }
    } catch (e) {
      console.error('Failed to update training memory:', e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const getCoachResponseFromApi = async (
    userText: string,
    currentHistory: ChatMessage[],
    isGameEnd = false,
    endResult?: 'win' | 'loss' | 'draw' | 'active'
  ) => {
    setIsCoachThinking(true);
    try {
      const userProfile = getUserProfile();
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: currentHistory,
          coachProfile,
          userProfile,
          gameHistory,
          isGameEnd,
          gameResult: endResult || 'active',
        }),
      });

      if (!response.ok) {
        let errorMsg = 'API request failed';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (_) {
          try {
            const errText = await response.text();
            if (errText) errorMsg = errText;
          } catch (__) {}
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      const newCoachMessage = {
        id: `msg-coach-${Date.now()}`,
        sender: 'coach' as const,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => {
        const updated = [...prev, newCoachMessage];
        
        // Trigger a background memory summary update:
        // - After any finished game reviews (game-end coaching landmarks)
        // - Every 3 user questions to maintain current focus (highly token-efficient compression)
        const userMsgCount = updated.filter(m => m.sender === 'user').length;
        if (isGameEnd || (userMsgCount > 0 && userMsgCount % 3 === 0)) {
          setTimeout(() => triggerMemoryConsolidation(updated, isGameEnd), 100);
        }
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to get coach response:', error);
      // Fallback response with the required tag
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-coach-${Date.now()}`,
          sender: 'coach',
          text: `I'm having a bit of trouble connecting to the master class engine right now, but you played well. Keep practicing!\n\n(Error Details: ${error?.message || error || 'Unknown Error'})${
            isGameEnd ? '\n\n#positional-play' : ''
          }`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCoachThinking(false);
    }
  };

  // Handle active game move updates to trigger real-time AI coach feedback
  useEffect(() => {
    if (gameHistory.length === 0) {
      setMessages([
        {
          id: `msg-restart-${Date.now()}`,
          sender: 'coach',
          text: `Fresh board loaded! ${
            coachProfile.style === 'aggressive'
              ? "Let's launch a rapid attack. Look for direct lines and mating nets."
              : "Focus on establishing solid central control first."
          }`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
      lastHistoryLength.current = 0;
      analyzedGameEnd.current = null;
      return;
    }

    // Auto game-end analysis
    if (isGameOver && gameResult !== 'active') {
      const gameKey = `${gameHistory.length}-${gameResult}`;
      if (analyzedGameEnd.current !== gameKey) {
        analyzedGameEnd.current = gameKey;
        getCoachResponseFromApi(
          `The game has ended. I got a ${gameResult}. Please analyze my game moves and give me a full summary review of how I played.`,
          messages,
          true,
          gameResult
        );
      }
      return;
    }

    if (gameHistory.length > lastHistoryLength.current) {
      const lastMovePlayed = gameHistory[gameHistory.length - 1];
      const isPlayerTurnNow = gameHistory.length % 2 === 0; // Even means Black just played, now White's turn

      let feedback = '';
      if (isPlayerTurnNow) {
        // AI Stockfish made a move
        feedback = `Stockfish played **${lastMovePlayed}**. ${
          inCheck
            ? "⚠️ Careful! Your King is in CHECK. You must defend immediately!"
            : coachProfile.style === 'aggressive'
            ? "They are trying to consolidate. Look for forcing lines to breach their defenses!"
            : "A patient positional answer. Let's look for our next improving move."
        }`;
      } else {
        // Player made a move
        feedback = `You played **${lastMovePlayed}**! ${
          lastMovePlayed.includes('+')
            ? "Excellent check! You are applying severe pressure. 🎯"
            : lastMovePlayed.includes('#')
            ? "Outstanding checkmate! You completely solved the position. 🏆"
            : "A thoughtful continuation. Let's see what Stockfish's engine does next."
        }`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-auto-${Date.now()}`,
          sender: 'coach',
          text: feedback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      lastHistoryLength.current = gameHistory.length;
    }
  }, [gameHistory, inCheck, isGameOver, gameResult, coachProfile]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsgText = inputValue;
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setInputValue('');
    setMessages((prev) => {
      const updated = [...prev, userMessage];
      getCoachResponseFromApi(userMsgText, updated);
      return updated;
    });
  };

  const handleQuickPromptClick = (promptText: string) => {
    const userMessage: ChatMessage = {
      id: `msg-user-prompt-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      getCoachResponseFromApi(promptText, updated);
      return updated;
    });
  };

  return (
    <div id="coach-chat-container" className="flex flex-col h-full bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl overflow-hidden">
      
      {/* Coach Persona Panel */}
      <div className="pb-4 border-b border-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl bg-slate-900 w-11 h-11 rounded-xl flex items-center justify-center border border-slate-800 shadow">
              {coachProfile.avatar}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-bold text-white text-base leading-tight">Coach {coachProfile.name}</h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full font-mono border border-amber-500/20">
                  GM {coachProfile.rating}
                </span>
              </div>
              <p className="text-xs text-slate-400">{coachProfile.title}</p>
            </div>
          </div>
          <GraduationCap className="w-5 h-5 text-slate-500" />
        </div>

        {/* Coach selection tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-900">
          {COACH_PROFILES.map((profile) => (
            <button
              key={profile.name}
              id={`coach-tab-${profile.name.toLowerCase()}`}
              onClick={() => setCoachProfile(profile)}
              className={`text-[11px] py-1 px-1.5 rounded transition-all text-center ${
                coachProfile.name === profile.name
                  ? 'bg-slate-800 text-amber-300 font-medium shadow border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              {profile.name}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 italic mt-2.5 line-clamp-2">
          "{coachProfile.description}"
        </p>

        {/* Dynamic Coach Training Journal */}
        <div className="mt-3 border border-slate-900 rounded-xl overflow-hidden bg-slate-950/60 transition-all hover:border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsJournalOpen(!isJournalOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-amber-300 transition-all bg-slate-900/40"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🧠</span>
              <span>Coach's Training Journal</span>
              {isSavingMemory && (
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {isJournalOpen ? 'Collapse ▲' : 'Expand ▼'}
            </span>
          </button>
          
          <AnimatePresence>
            {isJournalOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 border-t border-slate-900 text-xs text-slate-300 leading-relaxed space-y-1 bg-slate-950/40">
                  {coachMemory ? (
                    <p className="italic text-slate-300">"{coachMemory}"</p>
                  ) : (
                    <p className="text-slate-500 italic">
                      Coach {coachProfile.name} is observing your playstyle. Your training notes will update automatically as we play and chat!
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-900/40 text-[10px] text-slate-500 font-mono">
                    <span>STATUS: {isSavingMemory ? 'Updating...' : 'Active & Synced'}</span>
                    {coachMemory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Reset training journal notes?')) {
                            onMemoryUpdated('');
                          }
                        }}
                        className="text-red-400 hover:text-red-300 underline transition-all"
                      >
                        Reset Notes
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat messages stream */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-amber-600 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800/80 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                  {msg.sender === 'user' ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Coach {coachProfile.name}</span>
                    </>
                  )}
                  <span className="ml-auto text-slate-500">{msg.timestamp}</span>
                </div>
                <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
              </div>
            </motion.div>
          ))}

          {isCoachThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl rounded-tl-none px-4 py-3 text-slate-200 shadow-lg">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>Coach {coachProfile.name} is thinking...</span>
                </div>
                <div className="flex items-center gap-1 mt-2.5 mb-1 pl-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested prompts / interaction starters */}
      <div className="mb-3 space-y-1.5 border-t border-slate-900 pt-3">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Ask your Coach</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            id="prompt-analyze"
            onClick={() => handleQuickPromptClick('Analyze current tactical position')}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-full px-2.5 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Analyze Position</span>
          </button>
          <button
            id="prompt-hint"
            onClick={() => handleQuickPromptClick('Can you suggest a tactical plan?')}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-full px-2.5 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Suggest Plan</span>
          </button>
          <button
            id="prompt-opening"
            onClick={() => handleQuickPromptClick('Explain the opening behind this setup')}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-full px-2.5 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
          >
            <GraduationCap className="w-3 h-3 text-sky-400" />
            <span>Explain Opening</span>
          </button>
        </div>
      </div>

      {/* Chat submission bar */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          id="chat-input-field"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Message Coach ${coachProfile.name}...`}
          className="flex-1 bg-slate-900/95 border border-slate-800 focus:border-amber-500/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all focus:ring-1 focus:ring-amber-500/40"
        />
        <button
          id="chat-submit-button"
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl px-3.5 py-2.5 transition-all shadow hover:shadow-amber-600/20 flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
