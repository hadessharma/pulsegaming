import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Trophy, SkipForward, PlayCircle } from 'lucide-react';

const WordleGame = () => {
  const [gameState, setGameState] = useState(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const state = await api.getGameState();
      setGameState(state);
    } catch (err) {
      if (err.response?.status === 404) {
        setGameState({ inactive: true });
      } else {
        console.error(err);
      }
    }
  };

  const onKeyPress = (key) => {
    if (gameState?.completed) return;
    if (key === 'ENTER') {
      if (currentGuess.length === 5) handleGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => onKeyPress(e.key.toUpperCase());
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameState]);

  const handleGuess = async () => {
    try {
      await api.submitGuess(currentGuess);
      setCurrentGuess('');
      fetchState();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Error');
    }
  };

  const handleHint = async () => {
    try {
      const hint = await api.getHint();
      setMessage(`HINT: '${hint.letter}' is at position ${hint.position + 1}`);
      fetchState();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Error');
    }
  };

  if (!gameState) return <div className="p-8 text-center text-zinc-500 font-medium animate-pulse">Syncing with HQ...</div>;

  if (gameState.inactive) {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass-panel text-center max-w-md mx-auto">
        <PlayCircle className="w-16 h-16 text-zinc-700 mb-6" />
        <h2 className="text-2xl font-black font-display text-white mb-2 uppercase">Arena Offline</h2>
        <p className="text-zinc-500 max-w-sm">The competition hasn't started yet. Waiting for the administrator to set the target word.</p>
      </div>
    );
  }

  const rows = [...gameState.guesses];
  if (rows.length < 6 && !gameState.completed) {
    rows.push(currentGuess.padEnd(5, ' '));
  }
  while (rows.length < 6) rows.push('     ');

  const getCellClass = (char, index, guessIdx) => {
    // Current active row (not yet submitted)
    if (guessIdx === (gameState?.guesses?.length || 0) && !gameState?.completed) {
      return char !== ' ' ? 'cell filled border-border shadow-md' : 'cell border-border/20';
    }
    
    // Previous rows (using backend feedback)
    if (gameState?.feedback && gameState.feedback[guessIdx]) {
      const status = gameState.feedback[guessIdx][index];
      return `cell ${status} scale-100 shadow-lg`;
    }

    return 'cell border-border/20';
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-12 w-full max-w-md mx-auto">
      <div className="grid grid-rows-6 gap-1.5 sm:gap-2">
        {rows.map((guess, i) => (
          <div key={i} className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {guess.split('').map((char, j) => {
              const statusClass = getCellClass(char, j, i);
              const isFilled = char !== ' ' && i === gameState.guesses.length;
              return (
                <motion.div 
                  key={j} 
                  initial={false}
                  animate={{ 
                    scale: char !== ' ' && i === (gameState?.guesses?.length || 0) ? [1, 1.1, 1] : 1,
                    rotateX: statusClass.includes('correct') || statusClass.includes('present') || statusClass.includes('absent') ? [0, 90, 0] : 0
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: statusClass.includes('cell border') ? 0 : j * 0.1 
                  }}
                  className={`${statusClass} transition-colors duration-500`}
                >
                  {char}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        {message && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent/20 border border-accent/30 p-3 rounded-lg text-xs text-accent font-bold uppercase tracking-widest text-center"
          >
            {message}
          </motion.p>
        )}
        
        {!gameState.completed && (
          <button 
            onClick={handleHint}
            className="flex items-center gap-2 group text-zinc-500 hover:text-present text-xs font-bold uppercase tracking-widest transition-all"
          >
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-present transition-colors">?</div>
            Need a Hint? (+1 Penalty)
          </button>
        )}

        {gameState.completed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel w-full text-center relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${gameState.won ? 'bg-correct' : 'bg-red-500'}`} />
            <h2 className="text-4xl font-black mb-1 font-display uppercase tracking-tighter">
              {gameState.won ? 'Legendary' : 'Not This Time'}
            </h2>
            <p className="text-zinc-500 mb-6 text-sm font-medium uppercase tracking-widest">Initial assessment complete</p>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                <span className="block text-2xl font-black text-white">{gameState.guesses.length}</span>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Guesses</span>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                <span className="block text-2xl font-black text-present">{gameState.hints_used}</span>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Hints</span>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-xl border border-white/5 ring-1 ring-accent/30">
                <span className="block text-2xl font-black text-accent">{gameState.current_score}</span>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Score</span>
              </div>
            </div>
            
            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mb-2">Target Word</p>
            <div className="text-2xl font-black text-accent tracking-[0.5em]">{gameState.word_of_the_day}</div>
          </motion.div>
        )}
      </div>

      {/* Modern Virtual Keyboard */}
      <div className="flex flex-col gap-1.5 sm:gap-2 w-full mt-2 sm:mt-4 select-none px-1">
        {[
          ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
          ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
          ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
        ].map((row, i) => (
          <div key={i} className="flex justify-center gap-1 sm:gap-1.5 w-full">
            {row.map(key => {
              const isWide = key === 'ENTER' || key === 'DEL';
              
              // Key color logic
              let keyStatus = '';
              if (gameState?.guesses && gameState?.feedback) {
                gameState.guesses.forEach((g, gIdx) => {
                  const charIdx = g.indexOf(key);
                  if (charIdx !== -1) {
                    const status = gameState.feedback[gIdx][charIdx];
                    if (status === 'correct') keyStatus = 'correct';
                    else if (status === 'present' && keyStatus !== 'correct') keyStatus = 'present';
                    else if (status === 'absent' && !keyStatus) keyStatus = 'absent';
                  }
                });
              }

              return (
                <button 
                  key={key} 
                  onClick={() => onKeyPress(key === 'DEL' ? 'BACKSPACE' : key)} 
                  className={`key ${isWide ? 'large flex-1 sm:flex-none text-[9px] sm:text-[10px]' : 'flex-1 sm:flex-none'} ${keyStatus} hover:shadow-glow`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordleGame;
