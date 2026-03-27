import React, { useState } from 'react';
import WordleGame from './WordleGame';
import { motion } from 'framer-motion';
import { Gamepad2, Zap } from 'lucide-react';

const EnterGameCard = ({ onEnter }) => {
  return (
    <div className="flex items-center justify-center w-full p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
        
        <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Gamepad2 className="w-12 h-12 text-accent" />
        </div>

        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Pulse <span className="text-accent underline decoration-violet-500/30">Wordle</span>
        </h2>
        
        <div className="space-y-4">
          <button 
            onClick={onEnter}
            className="w-full premium-gradient p-5 rounded-2xl font-black text-xl hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 group"
          >
            Enter Game
            <Zap className="w-6 h-6 fill-white group-hover:scale-125 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const WordlePage = () => {
  const [hasEnteredGame, setHasEnteredGame] = useState(false);

  if (!hasEnteredGame) {
    return <EnterGameCard onEnter={() => setHasEnteredGame(true)} />;
  }

  return <WordleGame />;
};

export default WordlePage;
