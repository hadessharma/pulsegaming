import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { Zap, Trophy, Users, ChevronDown, ChevronUp, Calendar, CheckSquare, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const FILTERS = [
  { key: 'asu_trivia', label: 'ASU Trivia', icon: BookOpen },
];

const Leaderboard = () => {
  const [stats, setStats] = useState([]);
  const [activeFilter, setActiveFilter] = useState('asu_trivia');
  const [expandedId, setExpandedId] = useState(null);

  const fetchLeaderboard = async (gameType) => {
    try {
      const data = await api.getLeaderboard(gameType);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeFilter);
  }, [activeFilter]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full glass-panel overflow-hidden relative p-0 sm:p-0"
    >
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
      
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-black mb-6 font-display tracking-tight text-center">COMPETITOR RANKINGS</h2>

        {/* Game filter tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === key
                  ? 'premium-gradient text-white shadow-glow'
                  : 'bg-zinc-900/60 text-zinc-500 border border-white/5 hover:text-zinc-300 hover:border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        {/* Header - Hidden on very small mobile if desired, but good for context */}
        <div className="hidden sm:grid grid-cols-[60px_1fr_80px_80px_120px] bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5 px-6 py-4">
          <div>#</div>
          <div>Competitor</div>
          <div className="text-center">Days</div>
          <div className="text-center">Solved</div>
          <div className="text-right">Score</div>
        </div>

        <div className="divide-y divide-white/5">
          {stats.map((row, i) => {
            const isExpanded = expandedId === i;
            return (
              <div key={i} className={`group transition-all ${i === 0 ? "bg-accent/5" : "hover:bg-white/5"}`}>
                {/* Main Row */}
                <div 
                  onClick={() => toggleExpand(i)}
                  className="grid grid-cols-[50px_1fr_auto] sm:grid-cols-[60px_1fr_80px_80px_120px] items-center px-4 sm:px-6 py-4 cursor-pointer sm:cursor-default"
                >
                  {/* Rank */}
                  <div className="flex items-center justify-start">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] sm:text-xs font-black ${i === 0 ? 'bg-amber-500 text-dark' : 'text-zinc-500'}`}>
                      {i + 1}
                    </span>
                  </div>

                  {/* Competitor */}
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <span className="font-bold text-sm text-zinc-300 truncate">{row.nickname}</span>
                    {i === 0 && <Trophy className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  </div>

                  {/* Days (Desktop only) */}
                  <div className="hidden sm:block text-center font-mono text-xs text-zinc-400">{row.games}</div>
                  
                  {/* Solved (Desktop only) */}
                  <div className="hidden sm:block text-center font-mono text-xs text-emerald-400/80">{row.solved}</div>

                  {/* Score & Toggle */}
                  <div className="flex items-center justify-end gap-3">
                    <span className={`text-sm sm:text-base font-black ${i === 0 ? 'text-amber-500' : 'text-accent'}`}>
                      {row.score.toLocaleString()}
                    </span>
                    {/* Toggle Icon - Mobile Only */}
                    <div className="sm:hidden text-zinc-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details - Mobile Only */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="sm:hidden overflow-hidden bg-zinc-950/30 border-t border-white/5"
                    >
                      <div className="grid grid-cols-2 gap-4 px-14 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            <Calendar className="w-3 h-3" /> Sessions
                          </div>
                          <span className="font-mono text-xs text-zinc-300">{row.games} Days</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            <CheckSquare className="w-3 h-3" /> Solved
                          </div>
                          <span className="font-mono text-xs text-emerald-400/80">{row.solved} Tasks</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {stats.length === 0 && (
            <div className="p-12 text-center text-zinc-600 italic text-sm font-medium">
              The arena is currently empty. Finish your session to qualify.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
