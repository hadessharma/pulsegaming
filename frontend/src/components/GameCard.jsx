import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const GameCard = ({ title, description, icon: Icon, route, accentColor = 'accent', comingSoon = false }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      onClick={() => !comingSoon && navigate(route)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!comingSoon ? { scale: 1.03, y: -4 } : {}}
      whileTap={!comingSoon ? { scale: 0.98 } : {}}
      className={`relative overflow-hidden glass-panel text-left w-full group cursor-pointer ${comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
      
      <div className="flex items-start gap-5">
        <div className={`w-14 h-14 bg-${accentColor}/10 border border-${accentColor}/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:rotate-3 transition-transform duration-500`}>
          <Icon className={`w-7 h-7 text-${accentColor}`} />
        </div>
        
        <div className="min-w-0">
          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {comingSoon && (
        <div className="absolute top-4 right-4">
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] bg-zinc-800 px-3 py-1.5 rounded-full">
            Coming Soon
          </span>
        </div>
      )}
    </motion.button>
  );
};

export default GameCard;
