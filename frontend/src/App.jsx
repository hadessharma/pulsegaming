import React, { useState, useEffect } from 'react';
import * as api from './api';
import WordleGame from './components/WordleGame';
import Leaderboard from './components/Leaderboard';

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [view, setView] = useState('game'); // 'game' or 'leaderboard'
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ email: 'Logged In' }); // Basic check, state fetch will confirm
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await api.login(email);
      setUser({ email });
      setError('');
    } catch (err) {
      setError('Email not whitelisted or error logging in.');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-5xl font-bold mb-8 tracking-tighter">PULSE WORDLE</h1>
        <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter Whitelisted Email"
            className="p-4 rounded bg-gray-800 border-2 border-border focus:border-correct outline-none text-center text-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="bg-correct p-4 rounded font-bold text-xl hover:bg-opacity-90 transition-all">
            ENTER COMPETITION
          </button>
          {error && <p className="text-red-500 text-center">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4 min-h-screen">
      <header className="flex justify-between items-center w-full mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tighter">PULSE WORDLE</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('game')}
            className={`font-bold ${view === 'game' ? 'text-correct' : 'text-gray-400'}`}
          >
            GAME
          </button>
          <button 
            onClick={() => setView('leaderboard')}
            className={`font-bold ${view === 'leaderboard' ? 'text-correct' : 'text-gray-400'}`}
          >
            LEADERBOARD
          </button>
          <button 
            onClick={() => { localStorage.removeItem('token'); setUser(null); }}
            className="text-gray-400 text-sm"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {view === 'game' ? <WordleGame /> : <Leaderboard />}
    </div>
  );
}

export default App;
