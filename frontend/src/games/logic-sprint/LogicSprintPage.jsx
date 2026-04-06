import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LogicSprintGame from './LogicSprintGame';
import { motion } from 'framer-motion';
import { Zap, Timer, Brain, Rocket, Trophy, Calendar } from 'lucide-react';
import * as logicSprintApi from './logicSprintApi';

const LogicSprintPage = () => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const state = await logicSprintApi.getGameState();
      setGameState(state);
      if (state.status === 'playing') {
        setPlaying(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Scanning Neural Network...</div>;

  if (playing) {
    return <LogicSprintGame onFinish={fetchState} />;
  }

  if (gameState?.status === 'already_played') {
    return (
        <div className="flex items-center justify-center w-full p-4 py-4 sm:py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md glass-panel relative overflow-hidden text-center"
            >
                <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-8 rotate-3 transition-transform duration-500">
                    <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-1 sm:mb-2">
                    DAY <span className="text-accent underline decoration-violet-500/30">COMPLETE</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mb-4 sm:mb-8 px-4">
                    You've finished your sprint for today. Great performance! 
                </p>
                
                <div className="flex flex-col items-center gap-1 sm:gap-2 p-4 sm:p-8 rounded-2xl bg-white/5 border border-white/5 mb-6 sm:mb-8 mx-6">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Your Score</p>
                    <p className="text-4xl sm:text-5xl font-black text-white">{gameState.score}</p>
                </div>

                <div className="px-6 pb-6 space-y-4">
                     <div className="p-4 bg-zinc-950/50 rounded-xl border border-white/5 flex items-center gap-3">
                         <Calendar className="w-5 h-5 text-accent" />
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-left">
                             CONGRATS! RETURN TOMORROW FOR A NEW SET OF CHALLENGES.
                         </p>
                     </div>
                     
                     <button 
                        onClick={() => navigate('/leaderboard')}
                        className="w-full premium-gradient p-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-95 text-white"
                     >
                        <Trophy className="w-5 h-5" />
                        View Leaderboard
                     </button>
                 </div>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full p-4 py-4 sm:py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />

        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-accent/10 border border-accent/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Brain className="w-8 h-8 sm:w-12 sm:h-12 text-accent" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-1 sm:mb-2">
          Logic <span className="text-accent underline decoration-violet-500/30">Sprint</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 mb-4 sm:mb-8 px-4">
          Think fast. You have 60 seconds to solve as many logic and math hurdles as possible.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 sm:mb-10 px-4">
            <div className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5">
                <Timer className="w-5 h-5 text-zinc-400" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">60s Window</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5">
                <Rocket className="w-5 h-5 text-zinc-400" />
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Scaling Difficulty</p>
            </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => setPlaying(true)}
            className="w-full p-4 sm:p-6 rounded-2xl font-black text-xl sm:text-2xl premium-gradient hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 group text-white"
          >
            START SPRINT
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-white group-hover:scale-125 transition-transform" />
          </button>
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-2 sm:mt-4">
            Scores are dynamically calculated and recorded to the global leaderboard
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LogicSprintPage;
