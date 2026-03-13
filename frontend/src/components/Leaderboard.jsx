import React, { useState, useEffect } from 'react';
import * as api from '../api';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full glass-panel overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
      <h2 className="text-2xl font-black mb-8 font-display tracking-tight text-center">COMPETITOR RANKINGS</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
            <tr>
              <th className="p-5">#</th>
              <th className="p-5">Competitor</th>
              <th className="p-5 text-center">Guesses</th>
              <th className="p-5 text-center">Hints</th>
              <th className="p-5 text-center">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {stats.map((row, i) => (
              <tr key={i} className={`group hover:bg-white/5 transition-colors ${i === 0 ? "bg-accent/5" : ""}`}>
                <td className="p-5">
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500 text-dark' : 'text-zinc-500'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="p-5 font-medium text-sm text-zinc-300">{row.email}</td>
                <td className="p-5 text-center font-mono text-xs">{row.guesses}</td>
                <td className="p-5 text-center font-mono text-xs text-zinc-500">{row.hints}</td>
                <td className="p-5 text-center">
                  <span className={`text-sm font-black ${i === 0 ? 'text-amber-500' : 'text-accent'}`}>
                    {row.score}
                  </span>
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan="5" className="p-12 text-center text-zinc-600 italic text-sm font-medium">
                  The arena is currently empty. Finish your session to qualify.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
