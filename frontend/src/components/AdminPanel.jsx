import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserPlus, Trash2, Mail, CheckCircle2, Gamepad2, PlayCircle, StopCircle } from 'lucide-react';

const AdminPanel = () => {
  const [whitelist, setWhitelist] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newWord, setNewWord] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchWhitelist(), fetchGameConfig()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchWhitelist = async () => {
    try {
      const data = await api.getWhitelist();
      setWhitelist(data);
    } catch (err) {
      console.error(err);
      setStatus({ message: 'Failed to load whitelist.', type: 'error' });
    }
  };

  const fetchGameConfig = async () => {
    try {
      const data = await api.getGameConfig();
      setActiveGame(data.word_of_the_day ? data : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await api.addToWhitelist(newEmail);
      setNewEmail('');
      setStatus({ message: `Successfully added ${newEmail}`, type: 'success' });
      fetchWhitelist();
      setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    } catch (err) {
      setStatus({ message: 'Failed to add email.', type: 'error' });
    }
  };

  const handleDelete = async (email) => {
    try {
      await api.removeFromWhitelist(email);
      setStatus({ message: `Removed ${email}`, type: 'success' });
      fetchWhitelist();
      setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    } catch (err) {
      setStatus({ message: 'Failed to remove email.', type: 'error' });
    }
  };

  const handleSetGame = async (e) => {
    e.preventDefault();
    if (newWord.length !== 5) {
      setStatus({ message: 'Word must be exactly 5 letters.', type: 'error' });
      return;
    }
    try {
      await api.setGame(newWord);
      setNewWord('');
      setStatus({ message: `Game launched: ${newWord.toUpperCase()}`, type: 'success' });
      fetchGameConfig();
      setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    } catch (err) {
      setStatus({ message: 'Failed to set game word.', type: 'error' });
    }
  };

  const handleStopGame = async () => {
    if (!window.confirm("CRITICAL: This will delete the current word and ALL player progress. Continue?")) return;
    try {
      await api.stopGame();
      setStatus({ message: 'ARENA PURGED. All data cleared.', type: 'success' });
      setActiveGame(null);
      setTimeout(() => setStatus({ message: '', type: '' }), 3000);
    } catch (err) {
      setStatus({ message: 'Failed to wipe arena.', type: 'error' });
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 font-medium animate-pulse">Accessing Secure Vault...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-8 pb-12"
    >
      <header className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-accent/20 rounded-2xl border border-accent/20">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-white uppercase">Arena Command</h2>
          <p className="text-zinc-500 text-sm font-medium">Control the word and competitor access.</p>
        </div>
      </header>

      {/* Game Control Section */}
      <section className="glass-panel space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-lg uppercase tracking-tight text-white">Active Game Control</h3>
          </div>
          {activeGame && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active: {activeGame.word_of_the_day}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSetGame} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              maxLength={5}
              placeholder="SET 5-LETTER WORD"
              className="flex-1 p-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center font-black tracking-[0.5em] text-xl transition-all uppercase"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            />
            <button className="premium-gradient py-4 sm:py-0 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]">
              <PlayCircle className="w-5 h-5" />
              LAUNCH
            </button>
          </form>
          
          <button 
            onClick={handleStopGame}
            className="px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all active:scale-[0.98]"
          >
            <StopCircle className="w-5 h-5" />
            WIPE ARENA
          </button>
        </div>
      </section>

      {/* Whitelist Section */}
      <section className="glass-panel">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-lg uppercase tracking-tight text-white">Competitor Whitelist</h3>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="email"
              placeholder="Competitor's Email"
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-sm sm:text-base text-white"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <button className="bg-zinc-800 hover:bg-zinc-700 py-4 px-8 rounded-xl font-bold transition-all active:scale-[0.98]">
            AUTHORIZE
          </button>
        </form>

        <AnimatePresence>
          {status.message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`mt-4 p-4 rounded-lg flex items-center gap-3 text-sm font-bold ${
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="glass-panel overflow-hidden p-0">
        <div className="p-6 border-b border-white/5 bg-zinc-950/20">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Authorized Personnel ({whitelist.length})</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
          {whitelist.map((item, i) => (
            <div key={i} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors group">
              <span className="text-zinc-300 font-medium">{item.email}</span>
              <button 
                onClick={() => handleDelete(item.email)}
                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                title="Revoke Access"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {whitelist.length === 0 && (
            <div className="p-12 text-center text-zinc-600 italic">No competitors authorized yet.</div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default AdminPanel;
