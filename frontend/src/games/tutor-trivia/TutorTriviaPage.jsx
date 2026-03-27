import React, { useState } from 'react';
import TutorTriviaGame from './TutorTriviaGame';
import { motion } from 'framer-motion';
import { Users, Zap, Calendar, Lock } from 'lucide-react';

const DAY_OPTIONS = [1, 2, 3, 4, 5];

const EnterGameCard = ({ onEnter }) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [currentRankedDay, setCurrentRankedDay] = useState(null);

  React.useEffect(() => {
    import('./tutorTriviaApi').then(api => api.getTutorConfig()).then(res => {
      setCurrentRankedDay(res.current_day);
      setSelectedDay(res.current_day);
    }).catch(console.error);
  }, []);

  return (
    <div className="flex items-center justify-center w-full p-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel relative overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />

        <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Users className="w-12 h-12 text-accent" />
        </div>

        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
          Tutor <span className="text-accent underline decoration-violet-500/30">Trivia</span>
        </h2>
        <p className="text-sm text-zinc-500 mb-8">
          Match the facts to the tutor. 100 points per correct guess, −25 for each miss.
        </p>

        {/* Day selector */}
        <div className="mb-8">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Select Event Day
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DAY_OPTIONS.map((day) => {
              const isLocked = currentRankedDay !== null && day > currentRankedDay;
              return (
                <div key={day} className="relative">
                  <button
                    onClick={() => !isLocked && setSelectedDay(day)}
                    disabled={isLocked}
                    className={`w-12 h-12 rounded-xl font-black text-lg transition-all border flex items-center justify-center
                      ${
                        selectedDay === day
                          ? 'premium-gradient border-transparent shadow-glow text-white scale-110'
                          : isLocked
                          ? 'bg-zinc-900/40 border-white/5 text-zinc-700 cursor-not-allowed'
                          : 'bg-zinc-800/60 border-white/5 text-zinc-400 hover:border-accent/30 hover:text-white'
                      }`}
                  >
                    {isLocked ? <Lock className="w-4 h-4" /> : day}
                  </button>
                  {currentRankedDay === day && (
                    <div className="absolute -top-2 -right-2 bg-accent text-[8px] font-black text-white px-1.5 py-0.5 rounded-full shadow-lg border border-white/20 animate-bounce">
                      RANKED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onEnter(selectedDay)}
            disabled={currentRankedDay !== null && selectedDay > currentRankedDay}
            className={`w-full p-5 rounded-2xl font-black text-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 group
              ${
                currentRankedDay !== null && selectedDay > currentRankedDay
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'premium-gradient hover:shadow-glow active:scale-[0.98]'
              }`}
          >
            {selectedDay === currentRankedDay ? 'Enter Ranked Game' : 'Enter Practice Mode'}
            <Zap className="w-6 h-6 fill-white group-hover:scale-125 transition-transform" />
          </button>
          {selectedDay !== currentRankedDay && (
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Practice scores do not count towards leaderboard
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TutorTriviaPage = () => {
  const [gameDay, setGameDay] = useState(null);

  if (gameDay === null) {
    return <EnterGameCard onEnter={(day) => setGameDay(day)} />;
  }

  return <TutorTriviaGame currentDay={gameDay} />;
};

export default TutorTriviaPage;
