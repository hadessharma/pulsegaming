import React, { useState, useEffect } from 'react';
import * as api from './api';
import WordleGame from './components/WordleGame';
import Leaderboard from './components/Leaderboard';
import { motion } from 'framer-motion';
import { signInWithGoogle, logout, subscribeToAuthChanges } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('game'); // 'game' or 'leaderboard'
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      setError('');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please use a whitelisted email.');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-dark text-white font-sans antialiased overflow-x-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-panel relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
          
          <h1 className="text-5xl font-black mb-2 tracking-tighter text-center font-display">
            PULSE<span className="text-accent underline decoration-violet-500/30">WORDLE</span>
          </h1>
          <p className="text-zinc-500 text-center mb-8 text-sm font-medium uppercase tracking-widest">Elite Competition Series</p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleLogin}
              className="premium-gradient p-4 rounded-xl font-bold text-xl hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Sign in with Google
            </button>
            <p className="text-zinc-500 text-center text-xs">Must be an authorized competition participant.</p>
            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center text-sm font-medium">{error}</motion.p>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4 min-h-screen font-sans">
      <header className="flex justify-between items-center w-full mb-12 py-6 border-b border-white/5">
        <h1 className="text-2xl font-black tracking-tighter font-display">
          PULSE <span className="text-zinc-500 font-extralight">WORDLE</span>
        </h1>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView('game')}
            className={`font-bold text-sm tracking-widest uppercase transition-colors ${view === 'game' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Game
          </button>
          <button 
            onClick={() => setView('leaderboard')}
            className={`font-bold text-sm tracking-widest uppercase transition-colors ${view === 'leaderboard' ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Leaderboard
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <button 
            onClick={() => { logout(); setUser(null); }}
            className="text-zinc-600 hover:text-red-400 text-xs font-bold uppercase tracking-tighter transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="w-full">
        {view === 'game' ? <WordleGame /> : <Leaderboard />}
      </main>
    </div>
  );
}

export default App;
