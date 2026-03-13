import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion } from 'framer-motion';

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
      console.error(err);
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

  if (!gameState) return <div>Loading...</div>;

  const rows = [...gameState.guesses];
  if (rows.length < 6 && !gameState.completed) {
    rows.push(currentGuess.padEnd(5, ' '));
  }
  while (rows.length < 6) rows.push('     ');

  const getCellClass = (char, index, guessIdx) => {
    if (guessIdx >= gameState.guesses.length) return 'cell';
    const word = gameState.word_of_the_day || ""; // Only available if won/lost
    
    // In a real wordle, you'd need the word to color client-side
    // But since the backend handles it, we can just reveal the word if completed
    // Or simpler: just use basic logic if we have the word
    if (!word) return 'cell filled'; 

    if (char === word[index]) return 'cell correct';
    if (word.includes(char)) return 'cell present';
    return 'cell absent';
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="grid grid-rows-6 gap-2">
        {rows.map((guess, i) => (
          <div key={i} className="grid grid-cols-5 gap-2">
            {guess.split('').map((char, j) => (
              <motion.div 
                key={j} 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`${getCellClass(char, j, i)} ${char !== ' ' ? 'filled' : ''}`}
              >
                {char}
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        {message && <p className="bg-gray-800 p-2 rounded text-sm text-present font-bold uppercase">{message}</p>}
        
        {!gameState.completed && (
          <button 
            onClick={handleHint}
            className="bg-present px-6 py-2 rounded font-bold hover:scale-105 transition-all"
          >
            GET HINT (+1 PENALTY)
          </button>
        )}

        {gameState.completed && (
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{gameState.won ? 'VICTORY!' : 'DEFEAT'}</h2>
            <p className="text-xl">SCORE: {gameState.guesses.length + gameState.hints_used}</p>
            <p className="text-gray-400 mt-2 italic">The word was: {gameState.word_of_the_day}</p>
          </div>
        )}
      </div>

      {/* Simple Virtual Keyboard */}
      <div className="flex flex-col gap-2 max-w-lg w-full">
        {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {i === 2 && <button onClick={() => onKeyPress('ENTER')} className="key large">ENTER</button>}
            {row.split('').map(key => (
              <button key={key} onClick={() => onKeyPress(key)} className="key">{key}</button>
            ))}
            {i === 2 && <button onClick={() => onKeyPress('BACKSPACE')} className="key large">DEL</button>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordleGame;
