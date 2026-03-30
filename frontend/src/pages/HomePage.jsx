import React from 'react';
import { motion } from 'framer-motion';
import GameCard from '../components/GameCard';
import { Gamepad2, Users } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tighter text-white mb-3">
          Choose Your <span className="text-accent">Arena</span>
        </h2>
        <p className="text-sm text-zinc-500 font-medium uppercase tracking-widest">
          Select a game to start competing
        </p>
      </motion.div>

      <div className="grid gap-4 sm:gap-5">
        <GameCard
          title="Tutor Trivia"
          description="Match facts to tutors. 100 points per correct guess, −25 for each miss."
          icon={Users}
          route="/tutor-trivia"
          accentColor="accent"
        />

        <GameCard
          title="Wordle"
          description="Guess the 5-letter word in 6 tries. Earn points for speed and accuracy."
          icon={Gamepad2}
          route="/wordle"
          accentColor="accent"
        />
      </div>
    </div>
  );
};

export default HomePage;
