import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserPlus, Trash2, Mail, CheckCircle2, Gamepad2, PlayCircle, StopCircle, Users as UsersIcon, Calendar, ArrowRightCircle } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('tutor-trivia'); // 'tutor-trivia', 'wordle', 'users'
  const [whitelist, setWhitelist] = useState([]);
  const [config, setConfig] = useState(null);
  const [wordleSchedule, setWordleSchedule] = useState([]);
  const [selectedWordleDay, setSelectedWordleDay] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newHint, setNewHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchWhitelist(), fetchConfig(), fetchWordleSchedule()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchWordleSchedule = async () => {
    try {
      const data = await api.getWordleSchedule();
      setWordleSchedule(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWhitelist = async () => {
    try {
      const data = await api.getWhitelist();
      setWhitelist(data);
    } catch (err) {
      console.error(err);
      setStatus({ message: 'Failed to load whitelist.', type: 'error' });
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await api.getGameConfig();
      setConfig(data);
    } catch (err) {
      console.error(err);
    }
  };

  const showStatus = (message, type = 'success') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: '' }), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    try {
      await api.addToWhitelist(newEmail);
      setNewEmail('');
      showStatus(`Successfully added ${newEmail}`);
      fetchWhitelist();
    } catch (err) {
      showStatus('Failed to add email.', 'error');
    }
  };

  const handleDelete = async (email) => {
    try {
      await api.removeFromWhitelist(email);
      showStatus(`Removed ${email}`);
      fetchWhitelist();
    } catch (err) {
      showStatus('Failed to remove email.', 'error');
    }
  };

  const handleSetGame = async (e) => {
    e.preventDefault();
    if (newWord.length !== 5) {
      showStatus('Word must be exactly 5 letters.', 'error');
      return;
    }
    try {
      await api.setWordleSchedule(selectedWordleDay, newWord, newHint);
      setNewWord('');
      setNewHint('');
      showStatus(`Day ${selectedWordleDay} updated: ${newWord.toUpperCase()}`);
      fetchWordleSchedule();
      fetchConfig();
    } catch (err) {
      showStatus('Failed to update scheduled word.', 'error');
    }
  };

  const handleSetActiveWordleDay = async (day) => {
    try {
      await api.setWordleActiveDay(day);
      showStatus(`Wordle Active Day set to: ${day}`);
      fetchConfig();
    } catch (err) {
      showStatus('Failed to set active day.', 'error');
    }
  };

  const handleStopGame = async () => {
    if (!window.confirm("CRITICAL: This will delete the current word and ALL player progress. Continue?")) return;
    try {
      await api.stopGame();
      showStatus('ARENA PURGED. All data cleared.');
      fetchConfig();
    } catch (err) {
      showStatus('Failed to wipe arena.', 'error');
    }
  };
  
  const handleResetLeaderboard = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL cumulative scores and history from the leaderboard. This cannot be undone. Proceed?")) return;
    try {
      await api.clearLeaderboard();
      showStatus('Leaderboard history fully cleared.');
    } catch (err) {
      showStatus('Failed to reset leaderboard.', 'error');
    }
  };

  const handleNextTutorDay = async () => {
    try {
      const res = await api.incrementTutorDay();
      showStatus(`Tutor Trivia advanced to Day ${res.tutor_trivia_day}`);
      fetchConfig();
    } catch (err) {
      showStatus('Failed to advance Tutor Trivia day.', 'error');
    }
  };

  const handleSetTutorDay = async (day) => {
    try {
      await api.updateTutorDay(day);
      showStatus(`Tutor Trivia set to Day ${day}`);
      fetchConfig();
    } catch (err) {
      showStatus('Failed to update Tutor Trivia day.', 'error');
    }
  };
  
  if (loading) return <div className="p-8 text-center text-zinc-500 font-medium animate-pulse">Accessing Secure Vault...</div>;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-8 pb-12"
    >
      <header className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-accent/20 rounded-2xl border border-accent/20">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight text-white uppercase">Arena Command</h2>
          <p className="text-zinc-500 text-sm font-medium">Global platform configuration and access control.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-sm">
        {[
          { id: 'tutor-trivia', label: 'Tutor Trivia', icon: Calendar },
          { id: 'wordle', label: 'Wordle', icon: Gamepad2 },
          { id: 'users', label: 'Users', icon: UsersIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-zinc-800 text-white shadow-lg border border-white/5' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-accent' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'users' && (
            <div className="space-y-8">
              {/* Whitelist Section */}
              <section className="glass-panel">
                <div className="flex items-center gap-2 mb-6">
                  <UserPlus className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg uppercase tracking-tight text-white">Competitor Authorization</h3>
                </div>
                <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="email"
                      placeholder="Competitor's Email"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none transition-all text-sm sm:text-base text-white"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button className="bg-accent hover:bg-accent/80 text-white py-4 px-8 rounded-xl font-bold transition-all active:scale-[0.98]">
                    AUTHORIZE
                  </button>
                </form>
              </section>

              <section className="glass-panel overflow-hidden p-0">
                <div className="p-6 border-b border-white/5 bg-zinc-950/20 flex justify-between items-center">
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
            </div>
          )}

          {activeTab === 'wordle' && (
            <div className="space-y-8">
              <section className="glass-panel space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-accent" />
                    <h3 className="font-bold text-lg uppercase tracking-tight text-white">Active Word Control</h3>
                  </div>
                  {config?.word_of_the_day && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active: {config.word_of_the_day}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-6">
                  {/* Day Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Select Day to Configure (1-7)</label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const scheduled = wordleSchedule.find(s => s.day === day);
                        const isActive = config?.wordle_day === day;
                        return (
                          <div key={day} className="flex flex-col gap-1">
                            <button
                              onClick={() => setSelectedWordleDay(day)}
                              className={`w-12 h-12 rounded-xl font-black flex items-center justify-center transition-all border relative ${
                                selectedWordleDay === day
                                  ? 'bg-zinc-800 border-accent text-white shadow-glow'
                                  : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20'
                              }`}
                            >
                              {day}
                              {scheduled && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900" title="Word Scheduled" />}
                              {isActive && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-zinc-900" title="Active Day" />}
                            </button>
                            {selectedWordleDay === day && (
                              <button 
                                onClick={() => handleSetActiveWordleDay(day)}
                                className={`text-[10px] font-black uppercase tracking-tighter py-1 rounded-md transition-all ${
                                  isActive ? 'text-zinc-600 cursor-default' : 'text-accent hover:bg-accent/10'
                                }`}
                                disabled={isActive}
                              >
                                {isActive ? 'ACTIVE' : 'ACTIVATE'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Config Form */}
                  <div className="p-6 rounded-2xl bg-zinc-950/30 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-zinc-400 uppercase tracking-tight">Configuring Day {selectedWordleDay}</h4>
                      {wordleSchedule.find(s => s.day === selectedWordleDay) && (
                        <div className="text-[10px] font-black text-emerald-500 uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/10">
                          WORD: {wordleSchedule.find(s => s.day === selectedWordleDay).word}
                        </div>
                      )}
                    </div>
                    
                    <form onSubmit={handleSetGame} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        maxLength={5}
                        placeholder={wordleSchedule.find(s => s.day === selectedWordleDay)?.word || "SET 5-LETTER WORD"}
                        className="flex-1 p-4 rounded-xl bg-zinc-950 border border-border focus:border-accent outline-none text-center font-black tracking-[0.5em] text-xl transition-all uppercase"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                      />
                      <textarea
                        placeholder={wordleSchedule.find(s => s.day === selectedWordleDay)?.hint || "OPTIONAL GAME HINT"}
                        className="flex-1 p-4 rounded-xl bg-zinc-950 border border-border focus:border-accent outline-none text-sm transition-all resize-none h-14"
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                      />
                      <button className="premium-gradient py-4 sm:py-0 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]">
                        <CheckCircle2 className="w-5 h-5" />
                        SAVE
                      </button>
                    </form>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={handleStopGame}
                      className="flex-1 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all active:scale-[0.98]"
                    >
                      <StopCircle className="w-5 h-5" />
                      WIPE ARENA
                    </button>
                    <button 
                      onClick={handleResetLeaderboard}
                      className="flex-1 px-6 py-4 rounded-xl bg-zinc-800/50 border border-white/5 text-zinc-400 font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98]"
                    >
                      <Trash2 className="w-5 h-5" />
                      RESET LEADERBOARD
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tutor-trivia' && (
            <div className="space-y-8">
              <section className="glass-panel space-y-6 text-center py-12">
                <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-accent/20">
                  <Calendar className="w-10 h-10 text-accent" />
                </div>
                
                <div>
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Tutor Trivia Admin</h3>
                  <p className="text-zinc-500 text-sm font-medium mb-8">Current Active Day: <span className="text-accent font-black">{config?.tutor_trivia_day || 1}</span></p>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((day) => (
                      <button
                        key={day}
                        onClick={() => handleSetTutorDay(day)}
                        className={`w-12 h-12 rounded-xl font-black flex items-center justify-center transition-all border ${
                          config?.tutor_trivia_day === day
                            ? 'premium-gradient border-transparent text-white shadow-glow'
                            : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-accent/30 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleNextTutorDay}
                    className="premium-gradient py-5 px-12 rounded-2xl font-black text-xl flex items-center gap-3 hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-widest"
                  >
                    Go To Next Day
                    <ArrowRightCircle className="w-6 h-6" />
                  </button>
                  <p className="text-xs text-zinc-600 font-medium">Scores are only ranked on the current global day.</p>
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {status.message && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 p-4 rounded-xl flex items-center gap-3 text-sm font-bold shadow-2xl z-50 ${
              status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminPanel;
