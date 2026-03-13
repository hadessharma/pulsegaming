import React, { useState, useEffect } from 'react';
import * as api from './api';
import WordleGame from './components/WordleGame';
import Leaderboard from './components/Leaderboard';
import { motion } from 'framer-motion';
import { signInWithGoogle, logout, subscribeToAuthChanges } from './firebase';

import AdminPanel from './components/AdminPanel';
import { User, Edit3, CheckCircle2 } from 'lucide-react';

const NicknamePrompt = ({ onComplete }) => {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.updateNickname(nickname);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update nickname');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">Identity Required</h2>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Entry into the arena</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Arena Handle</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="E.G. PULSE_PILOT"
                  className="w-full p-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-lg font-bold tracking-widest transition-all uppercase pl-12"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  maxLength={15}
                />
                <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-[9px] text-zinc-600 ml-1">3-15 chars. Letters, numbers, and underscores only.</p>
            </div>

            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

            <button 
              disabled={loading || nickname.length < 3}
              className="w-full premium-gradient p-4 rounded-xl font-bold text-lg hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "AUTHENTICATING..." : "ENTER ARENA"}
              {!loading && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('game'); // 'game', 'leaderboard', 'admin'
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        fetchUserData();
      } else {
        setUser(null);
        setUserData(null);
      }
    });
  }, []);

  const fetchUserData = async () => {
    try {
      const data = await api.getMe();
      setUserData(data);
    } catch (err) {
      console.error("Failed to fetch user data", err);
    }
  };

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
    // ... existing login UI (minimized for brevity in target content)
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

  const renderView = () => {
    switch(view) {
      case 'leaderboard': return <Leaderboard />;
      case 'admin': return <AdminPanel />;
      default: return <WordleGame />;
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 min-h-screen font-sans">
      <header className="flex justify-between items-center w-full mb-12 py-6 border-b border-white/5">
        <h1 className="text-2xl font-black tracking-tighter font-display cursor-pointer" onClick={() => setView('game')}>
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
          {userData?.is_admin && (
            <button 
              onClick={() => setView('admin')}
              className={`font-bold text-sm tracking-widest uppercase transition-colors ${view === 'admin' ? 'text-accent shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Admin
            </button>
          )}
          <div className="h-4 w-[1px] bg-zinc-800" />
          <button 
            onClick={() => { logout(); setUser(null); setUserData(null); }}
            className="text-zinc-600 hover:text-red-400 text-xs font-bold uppercase tracking-tighter transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="w-full">
        {renderView()}
      </main>

      {user && userData && !userData.nickname && (
        <NicknamePrompt onComplete={fetchUserData} />
      )}
    </div>
  );
}

export default App;
