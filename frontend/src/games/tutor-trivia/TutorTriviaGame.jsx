import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startGame, getGameState, submitGuess } from './tutorTriviaApi';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  RotateCcw,
  Star,
  Sparkles,
  User,
  Loader2,
} from 'lucide-react';

/* ─── sub-components ─── */

const FactsCard = ({ combinedFacts, roundLabel }) => (
  <motion.div
    key={combinedFacts}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-panel relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
    <div className="flex items-center gap-2 mb-4">
      <HelpCircle className="w-5 h-5 text-accent shrink-0" />
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
        {roundLabel}
      </span>
    </div>
    <p className="text-base sm:text-lg text-zinc-200 leading-relaxed font-medium">
      {combinedFacts}
    </p>
  </motion.div>
);

const NameButton = ({ name, disabled, onClick, loading }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.03, y: -2 } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    disabled={disabled || loading}
    onClick={onClick}
    className={`w-full text-left px-5 py-4 rounded-xl font-bold text-sm sm:text-base tracking-wide transition-all border
      ${
        disabled
          ? 'bg-zinc-800/30 border-zinc-800/40 text-zinc-600 cursor-not-allowed line-through'
          : 'bg-zinc-900/60 border-white/5 text-zinc-200 hover:border-accent/40 hover:bg-accent/5 cursor-pointer'
      }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          disabled ? 'bg-zinc-800/40' : 'bg-accent/10 border border-accent/20'
        }`}
      >
        {disabled ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
        ) : (
          <User className="w-4 h-4 text-accent" />
        )}
      </div>
      {name}
    </div>
  </motion.button>
);

const WrongGuessCard = ({ tutor, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.92 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 backdrop-blur-xl"
  >
    <div className="w-full max-w-md glass-panel relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <XCircle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">
            Not Quite!
          </h3>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
            −25 Points
          </p>
        </div>
      </div>

      <div className="mb-5 p-4 rounded-xl bg-zinc-800/50 border border-white/5">
        <p className="text-accent text-sm font-black uppercase tracking-wider mb-3">
          {tutor.name}
        </p>
        <ul className="space-y-2">
          {tutor.facts.map((fact, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              {fact}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onDismiss}
        className="w-full premium-gradient p-4 rounded-xl font-bold text-base hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-widest"
      >
        Try Again
      </button>
    </div>
  </motion.div>
);

const CorrectGuessCard = ({ tutorName, pointsEarned, onNext, isLast }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.92 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 backdrop-blur-xl"
  >
    <div className="w-full max-w-md glass-panel relative overflow-hidden text-center">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

      <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </div>

      <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
        Correct!
      </h3>
      <p className="text-accent text-lg font-black mb-1">{tutorName}</p>
      <p className="text-emerald-400 text-sm font-bold mb-6">
        +{pointsEarned} Points
      </p>

      <button
        onClick={onNext}
        className="w-full premium-gradient p-4 rounded-xl font-bold text-base hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2"
      >
        {isLast ? 'See Results' : 'Next Tutor'}
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  </motion.div>
);

const GameCompleteCard = ({ totalScore, maxScore, tutorCount, isRanked }) => {
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto glass-panel relative overflow-hidden text-center"
    >
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />

      <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
        <Trophy className="w-12 h-12 text-accent" />
      </div>

      <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-2">
        Day Complete!
      </h2>
      <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mb-8">
        All {tutorCount} tutors identified
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
          <p className="text-3xl font-black text-accent">{totalScore}</p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Points
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
          <p className="text-3xl font-black text-emerald-400">{pct}%</p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Accuracy
          </p>
        </div>
      </div>

      <p className={`text-xs uppercase tracking-widest font-bold ${isRanked ? 'text-zinc-600' : 'text-zinc-700'}`}>
        {isRanked ? 'Score recorded to leaderboard' : 'Practice round — Score not recorded'}
      </p>
    </motion.div>
  );
};

/* ─── main game component ─── */

const TutorTriviaGame = ({ currentDay }) => {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guessing, setGuessing] = useState(false);
  const [error, setError] = useState('');
  const [overlay, setOverlay] = useState(null); // { type: 'wrong'|'correct', ... }

  // Load or start game session
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        // start will return existing state if session already exists
        const data = await startGame(currentDay);
        if (!cancelled) setGameState(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'Failed to start game');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [currentDay]);

  const handleGuess = useCallback(async (tutorId) => {
    if (guessing) return;
    setGuessing(true);
    try {
      const result = await submitGuess(currentDay, tutorId);
      setGameState(result.state);

      if (result.correct) {
        setOverlay({
          type: 'correct',
          tutorName: result.tutor_name,
          pointsEarned: result.points_earned,
          isLast: result.is_last,
        });
      } else {
        setOverlay({
          type: 'wrong',
          tutor: result.guessed_tutor,
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Guess failed');
    } finally {
      setGuessing(false);
    }
  }, [currentDay, guessing]);

  const dismissOverlay = () => setOverlay(null);

  /* ── loading / error ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto glass-panel text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 font-bold">{error}</p>
      </div>
    );
  }

  if (!gameState) return null;

  const {
    names,
    guessed_ids: guessedIds,
    current_facts: currentFacts,
    current_index: currentIndex,
    total_tutors: totalTutors,
    total_score: totalScore,
    max_score: maxScore,
    completed,
    global_current_day,
  } = gameState;

  const isRanked = currentDay === global_current_day;

  /* ── game complete ── */
  if (completed) {
    return (
      <GameCompleteCard
        totalScore={totalScore}
        maxScore={maxScore}
        tutorCount={totalTutors}
        isRanked={isRanked}
      />
    );
  }

  const guessedSet = new Set(guessedIds);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-sm font-black text-white uppercase tracking-wider">
            Day {currentDay}
          </span>
          {isRanked && (
            <span className="bg-accent/20 text-accent text-[9px] font-black px-2 py-0.5 rounded-full border border-accent/20">
              RANKED
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
          <span>
            {currentIndex + 1}/{totalTutors}
          </span>
          <span className="text-accent">{totalScore} PTS</span>
        </div>
      </div>

      {/* progress bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full premium-gradient rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / totalTutors) * 100}%` }}
          transition={{ type: 'spring', stiffness: 120 }}
        />
      </div>

      {/* facts card */}
      {currentFacts && (
        <FactsCard
          combinedFacts={currentFacts}
          roundLabel={`Tutor ${currentIndex + 1} of ${totalTutors} — Who is this?`}
        />
      )}

      {/* name choices */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
          Select a tutor
        </p>
        <div className="grid gap-2.5">
          {names.map((t) => (
            <NameButton
              key={t.id}
              name={t.name}
              disabled={guessedSet.has(t.id)}
              loading={guessing}
              onClick={() => handleGuess(t.id)}
            />
          ))}
        </div>
      </div>

      {/* overlays */}
      <AnimatePresence>
        {overlay?.type === 'wrong' && overlay.tutor && (
          <WrongGuessCard tutor={overlay.tutor} onDismiss={dismissOverlay} />
        )}
        {overlay?.type === 'correct' && (
          <CorrectGuessCard
            tutorName={overlay.tutorName}
            pointsEarned={overlay.pointsEarned}
            onNext={dismissOverlay}
            isLast={overlay.isLast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorTriviaGame;
