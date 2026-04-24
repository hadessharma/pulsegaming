import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserPlus, Trash2, Mail, CheckCircle2, Gamepad2, PlayCircle, StopCircle, Users as UsersIcon, Calendar, ArrowRightCircle } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users'
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
      await Promise.all([fetchWhitelist(), fetchConfig()]);
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

  const handleSetLogicSprintDay = async (day) => {
    try {
      await api.updateLogicSprintDay(day);
      showStatus(`Logic Sprint set to Day ${day}`);
      fetchConfig();
    } catch (err) {
      showStatus('Failed to update Logic Sprint day.', 'error');
    }
  };

  const handleSetASUTriviaDay = async (day) => {
    try {
      await api.updateASUTriviaDay(day);
      showStatus(`ASU Trivia set to Day ${day}`);
      fetchConfig();
    } catch (err) {
      showStatus('Failed to update ASU Trivia day.', 'error');
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
          { id: 'users', label: 'Users', icon: UsersIcon },
          { id: 'games', label: 'Games', icon: Gamepad2 },
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

          {activeTab === 'games' && (
            <div className="space-y-8">
              {/* Logic Sprint Day Control */}
              {/* <section className="glass-panel">
                <div className="flex items-center gap-2 mb-6">
                  <PlayCircle className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg uppercase tracking-tight text-white">Logic Sprint Configuration</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-4">Active Logic Sprint Day (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <button
                          key={day}
                          onClick={() => handleSetLogicSprintDay(day)}
                          className={`flex-1 py-4 rounded-xl font-black transition-all border ${
                            config?.logic_sprint_day === day
                              ? 'bg-accent text-white border-accent'
                              : 'bg-zinc-950/50 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                          }`}
                        >
                          DAY {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <p className="text-sm text-zinc-400">
                      <span className="text-accent font-bold">INFO:</span> Advancing the day will limit tutors to one 60-second session for that specific day. Tutors will receive a random set of questions they haven't played yet.
                    </p>
                  </div>
                </div>
              </section> */}

              {/* ASU Trivia Day Control */}
              <section className="glass-panel">
                <div className="flex items-center gap-2 mb-6">
                  <PlayCircle className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg uppercase tracking-tight text-white">ASU Trivia Configuration</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-4">Active ASU Trivia Day (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <button
                          key={day}
                          onClick={() => handleSetASUTriviaDay(day)}
                          className={`flex-1 py-4 rounded-xl font-black transition-all border ${
                            config?.asu_trivia_day === day
                              ? 'bg-accent text-white border-accent'
                              : 'bg-zinc-950/50 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                          }`}
                        >
                          DAY {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <p className="text-sm text-zinc-400">
                      <span className="text-accent font-bold">INFO:</span> Advancing the day allows players to do 5 random ASU Trivia questions per day.
                    </p>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              <section className="glass-panel border-red-500/20">
                <div className="flex items-center gap-2 mb-6">
                  <StopCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-lg uppercase tracking-tight text-white">System Overrides</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleResetLeaderboard}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl font-bold bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    RESET LEADERBOARD
                  </button>
                  <button 
                    onClick={handleStopGame}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl font-bold bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    PURGE ARENA
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Wordle and Tutor Trivia sections disabled */}
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
