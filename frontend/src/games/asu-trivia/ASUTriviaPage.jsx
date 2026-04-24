import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api';
import { BookOpen, CheckCircle2, ArrowRight, PlayCircle, Loader2, Award, Info, Timer } from 'lucide-react';
import clsx from 'clsx';

const ASUTriviaPage = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('loading'); // loading, idle, playing, already_played, finished
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { correct, fact, correct_answer_index, next_question, ... }

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && !submitResult) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, submitResult]);

  useEffect(() => {
    const init = async () => {
      try {
        const state = await api.getASUTriviaState();
        if (state.status === 'playing') {
          setGameState('playing');
          setScore(state.score);
          setCurrentQuestion(state.current_question);
          setCurrentIndex(state.current_index);
          setTotalQuestions(state.total_questions);
          setTotalQuestions(state.total_questions);
        } else if (state.status === 'already_played') {
          setGameState('already_played');
          setScore(state.score);
        } else {
          setGameState('idle');
        }
      } catch (err) {
        console.error(err);
        setGameState('idle');
      }
    };
    init();
  }, []);

  const handleStart = async () => {
    setGameState('loading');
    try {
      const res = await api.startASUTrivia();
      if (res.status === 'already_played') {
        setGameState('already_played');
        setScore(res.score);
      } else {
        setGameState('playing');
        setScore(res.score);
        setCurrentQuestion(res.current_question);
        setCurrentIndex(res.current_index);
        setTotalQuestions(res.total_questions);
        setTotalQuestions(res.total_questions);
      }
    } catch (err) {
      console.error(err);
      setGameState('idle');
    }
  };

  const handleOptionClick = (index) => {
    if (submitResult || isSubmitting) return;
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (selectedOption === null || isSubmitting || submitResult) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitASUTriviaAnswer(selectedOption);
      setSubmitResult(res);
      setScore(res.score);
      if (res.status === 'finished') {
        // Will show finished screen after next is clicked
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!submitResult) return;

    if (submitResult.status === 'finished') {
      setGameState('finished');
    } else {
      setCurrentQuestion(submitResult.next_question);
      setCurrentIndex(submitResult.current_index);
      setCurrentIndex(submitResult.current_index);
    }
    
    // Reset selection state
    setSelectedOption(null);
    setSubmitResult(null);
  };

  const renderContent = () => {
    if (gameState === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Loading Arena...</p>
        </div>
      );
    }

    if (gameState === 'idle') {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-accent/30 shadow-[0_0_50px_-12px] shadow-accent/50">
            <BookOpen className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-4xl font-black font-display uppercase tracking-tighter text-white mb-4">ASU Trivia</h2>
          <p className="text-zinc-400 font-medium mb-8 max-w-md mx-auto">
            Test your knowledge of ASU's rich history, iconic campus, and legendary sports. 5 random questions a day. Are you ready?
          </p>

          <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-2xl max-w-sm mx-auto mb-8 text-left">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" /> Scoring Matrix
            </h3>
            <ul className="space-y-3 text-sm font-medium text-zinc-400">
              <li className="flex justify-between items-center">
                <span>Correct Answer Base</span>
                <span className="text-emerald-400 font-black">+100</span>
              </li>
              <li className="flex justify-between items-center">
                <span>Time Penalty</span>
                <span className="text-red-400 font-black">-5 / sec</span>
              </li>
              <li className="flex justify-between items-center pt-2 border-t border-white/5">
                <span>Wrong Answer</span>
                <span className="text-red-500 font-black">-25</span>
              </li>
            </ul>
          </div>
          <button
            onClick={handleStart}
            className="w-full sm:w-auto premium-gradient px-12 py-4 rounded-xl font-bold text-xl hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-3 mx-auto uppercase tracking-widest"
          >
            <PlayCircle className="w-6 h-6" /> Start Trivia
          </button>
        </motion.div>
      );
    }

    if (gameState === 'already_played' || gameState === 'finished') {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-4xl font-black font-display uppercase tracking-tighter text-white mb-2">
            {gameState === 'finished' ? 'Trivia Complete!' : 'Already Played'}
          </h2>
          <p className="text-zinc-400 font-medium mb-8 uppercase tracking-widest text-sm">
            {gameState === 'finished' ? "You've answered all questions for today." : "You've already played today's trivia."}
          </p>
          
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 inline-block mb-8">
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">Today's Score</p>
            <p className="text-5xl font-black text-white">{score}</p>
          </div>

          <div>
            <button
              onClick={() => navigate('/')}
              className="text-zinc-500 hover:text-white font-bold uppercase tracking-widest text-sm transition-colors border border-zinc-800 hover:border-zinc-600 px-6 py-3 rounded-lg"
            >
              Return to Games
            </button>
          </div>
        </motion.div>
      );
    }

    if (gameState === 'playing' && currentQuestion) {
      return (
        <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
            <div>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Question {currentIndex + 1} of {totalQuestions}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-1 bg-accent/20 text-accent rounded text-[10px] font-bold uppercase tracking-widest">
                  {currentQuestion.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Score</p>
              <p className="text-2xl font-black text-white flex items-center gap-1 justify-end">
                <Award className="w-5 h-5 text-accent" /> {score}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 bg-zinc-950/50 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 flex-1 justify-center">
              <Timer className="w-5 h-5 text-accent" />
              <span className="font-black text-xl text-white tracking-widest font-mono">
                {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <h3 className="text-xl sm:text-3xl font-black text-white leading-tight mb-8">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, idx) => {
              let btnClass = "w-full p-4 rounded-xl text-left font-bold transition-all border outline-none ";
              
              if (submitResult) {
                // Post-submit state
                if (idx === submitResult.correct_answer_index) {
                  btnClass += "bg-emerald-500/20 border-emerald-500/50 text-white";
                } else if (idx === selectedOption) {
                  btnClass += "bg-red-500/20 border-red-500/50 text-white";
                } else {
                  btnClass += "bg-zinc-900/50 border-white/5 text-zinc-500 opacity-50";
                }
              } else {
                // Pre-submit state
                if (idx === selectedOption) {
                  btnClass += "bg-accent border-accent text-white shadow-glow";
                } else {
                  btnClass += "bg-zinc-900/50 border-white/5 text-zinc-300 hover:border-white/20 hover:bg-zinc-800/80 cursor-pointer";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  className={btnClass}
                  disabled={submitResult !== null || isSubmitting}
                >
                  <span className="mr-3 opacity-50">{['A', 'B', 'C', 'D'][idx]}</span>
                  {option}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {submitResult && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                className="overflow-hidden"
              >
                <div className={clsx(
                  "p-5 rounded-2xl border mb-6 flex gap-4",
                  submitResult.correct ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                )}>
                  <div className="shrink-0 mt-1">
                    {submitResult.correct ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Info className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <h4 className={clsx(
                      "font-black uppercase tracking-widest text-sm mb-1",
                      submitResult.correct ? "text-emerald-500" : "text-red-500"
                    )}>
                      {submitResult.correct ? `Correct! +${submitResult.points_earned}` : `Incorrect ${submitResult.points_earned}`}
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      {submitResult.fact}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!submitResult ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null || isSubmitting}
              className={clsx(
                "w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all",
                selectedOption !== null && !isSubmitting
                  ? "premium-gradient text-white hover:shadow-glow active:scale-[0.98]"
                  : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Submit Answer"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all bg-white text-black hover:bg-zinc-200 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {submitResult.status === 'finished' ? "Finish" : "Next Question"} <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <div className="glass-panel min-h-[400px] flex flex-col justify-center relative overflow-hidden p-6 sm:p-10">
        {renderContent()}
      </div>
    </div>
  );
};

export default ASUTriviaPage;
