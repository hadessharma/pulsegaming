import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startGame, submitAnswer, getGameState } from './logicSprintApi';
import {
  Timer,
  Trophy,
  Zap,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowRight,
  Loader2,
  Gamepad2,
} from 'lucide-react';

/* ─── Web Audio Helpers ─── */
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn('Audio feedback failed:', e);
  }
};

/* ─── Sub-components ─── */

const Keypad = ({ onInput, onClear, onSubmit, onBoolean }) => (
  <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
      <button
        key={n}
        onClick={() => onInput(n.toString())}
        className="h-14 rounded-xl bg-white/5 border border-white/10 text-xl font-bold hover:bg-white/10 active:scale-95 transition-all text-white"
      >
        {n}
      </button>
    ))}
    <button
      onClick={() => onBoolean('TRUE')}
      className="h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs font-black uppercase text-emerald-400 hover:bg-emerald-500/30"
    >
      TRUE
    </button>
    <button
      onClick={() => onInput('0')}
      className="h-14 rounded-xl bg-white/5 border border-white/10 text-xl font-bold hover:bg-white/10 text-white"
    >
      0
    </button>
    <button
      onClick={() => onBoolean('FALSE')}
      className="h-14 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-black uppercase text-red-400 hover:bg-red-500/30"
    >
      FALSE
    </button>
    <button
      onClick={onClear}
      className="col-span-1 h-14 rounded-xl bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300 flex items-center justify-center font-bold"
    >
      DEL
    </button>
    <button
      onClick={onSubmit}
      className="col-span-2 h-14 rounded-xl premium-gradient text-white font-black uppercase tracking-widest shadow-glow py-4"
    >
      GO
    </button>
  </div>
);

const GameComplete = ({ score, solved, onRestart }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="w-full max-w-md mx-auto glass-panel text-center py-10 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
    <div className="w-20 h-20 bg-accent/20 rounded-3xl rotate-6 flex items-center justify-center mx-auto mb-6">
      <Trophy className="w-10 h-10 text-accent" />
    </div>
    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Sprint Finished!</h2>
    <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-8">Score Saved to Leaderboard</p>

    <div className="grid grid-cols-2 gap-4 mb-10">
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
        <p className="text-3xl font-black text-accent">{score}</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Total Points</p>
      </div>
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
        <p className="text-3xl font-black text-emerald-400">{solved}</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Tasks Solved</p>
      </div>
    </div>

    <button
      onClick={onRestart}
      className="w-full premium-gradient p-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-95 text-white"
    >
      <RotateCcw className="w-5 h-5" />
      Play Again
    </button>
  </motion.div>
);

/* ─── Main Component ─── */

const LogicSprintGame = ({ onFinish }) => {
  const [gameState, setGameState] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const initGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await startGame();
      if (data.status === 'already_played') {
        if (onFinish) onFinish();
        return;
      }
      setGameState(data);
      setTimeLeft(data.seconds_left);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to initialize game');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initGame();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!gameState || gameState.status === 'idle' || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 11) playSound('tick'); // Tick-tock for final 10s
        return Math.floor(prev - 1);
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, timeLeft]);

  const handleSubmit = useCallback(async () => {
    if (submitting || !userInput || timeLeft <= 0) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(userInput);
      if (res.status === 'expired') {
        setGameState({ ...gameState, completed: true, score: res.final_score });
        setTimeLeft(0);
        if (onFinish) onFinish();
        return {"status": "expired", "final_score": res.final_score};
      } else {
        setFeedback(res.correct ? 'correct' : 'wrong');
        playSound(res.correct ? 'correct' : 'wrong');
        setGameState((prev) => ({
          ...prev,
          score: res.score,
          current_task: res.next_task,
          tasks_solved: res.correct ? prev.tasks_solved + 1 : prev.tasks_solved,
        }));
        setUserInput('');
        setTimeout(() => setFeedback(null), 600);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [userInput, submitting, timeLeft, gameState]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
    else if (e.key === 'Backspace') setUserInput(prev => prev.slice(0, -1));
    else if (/^[0-9]$/.test(e.key)) setUserInput(prev => prev + e.key);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [userInput, timeLeft]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing Sprint...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 glass-panel max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Connection Error</h3>
          <p className="text-zinc-500 text-sm font-medium px-4">{error}</p>
        </div>
        <button
          onClick={initGame}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  if (timeLeft <= 0 || gameState?.completed) {
    return (
      <div className="w-full max-w-md mx-auto glass-panel text-center py-10 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
         <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl rotate-6 flex items-center justify-center mx-auto mb-6">
           <Trophy className="w-10 h-10 text-emerald-500" />
         </div>
         <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Sprint Finished!</h2>
         <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-8">Score Recorded</p>
         <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-3xl font-black text-accent">{gameState?.score || 0}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Points</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-3xl font-black text-emerald-400">{gameState?.tasks_solved || 0}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Solved</p>
            </div>
         </div>
         <button 
           onClick={() => onFinish && onFinish()}
           className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 font-bold p-4 rounded-xl transition-all uppercase tracking-widest text-xs"
         >
           Exit to Summary
         </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-400'}`}>
            <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'animate-pulse' : ''}`} />
          </div>
          <span className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
          <Zap className="w-4 h-4 text-accent" />
          <span className="text-sm font-black text-white tabular-nums">{gameState.score} PTS</span>
        </div>
      </div>

      {/* Task Card */}
      <motion.div
        animate={feedback === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
        className={`relative glass-panel py-12 px-6 text-center border-t-2 transition-colors duration-300 ${
          feedback === 'correct' ? 'border-emerald-500/50 bg-emerald-500/5' : 
          feedback === 'wrong' ? 'border-red-500/50 bg-red-500/5' : 'border-accent/40'
        }`}
      >
        <div className="absolute top-4 left-4 flex gap-1">
          <Gamepad2 className="w-3 h-3 text-zinc-600" />
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Logic Sprint v1.0</span>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.h3
            key={gameState.current_task}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="text-4xl sm:text-6xl font-black text-white tracking-tight"
          >
            {gameState.current_task}
          </motion.h3>
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-center">
            <div className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em] mb-2">Your Answer</div>
            <div className="text-4xl font-black text-accent h-10 flex items-center justify-center gap-1">
                {userInput || <span className="w-1 h-8 bg-accent/20 animate-pulse" />}
            </div>
        </div>
      </motion.div>

      {/* Mobile Keypad */}
      <div className="pt-2">
        <Keypad 
          onInput={(v) => setUserInput(prev => prev + v)}
          onClear={() => setUserInput(prev => prev.slice(0, -1))}
          onSubmit={handleSubmit}
          onBoolean={(v) => setUserInput(v)}
        />
      </div>

      <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] pt-4">
        Tip: Scoring scales with difficulty. Use keyboard for maximum speed.
      </p>
    </div>
  );
};

export default LogicSprintGame;
