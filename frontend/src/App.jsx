import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithGoogle, logout, subscribeToAuthChanges } from './firebase';
import * as api from './api';

import { User, Edit3, CheckCircle2, Menu, X } from 'lucide-react';

const NicknamePrompt = ({ onComplete }) => {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.updateNickname(nickname);
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update nickname');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/95 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
        
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">Set Nickname</h2>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Enter your name</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nickname</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="E.G. PULSE_PILOT"
                      className="w-full p-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-lg font-bold tracking-widest transition-all uppercase pl-12"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      maxLength={15}
                    />
                    <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-[9px] text-zinc-600 ml-1">3-15 chars. Letters, numbers, and underscores only.</p>
                </div>

                {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

                <button 
                  disabled={loading || nickname.length < 3}
                  className="w-full premium-gradient p-4 rounded-xl font-bold text-lg hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? "AUTHENTICATING..." : "CONTINUE"}
                  {!loading && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Access Granted</h2>
              <p className="text-zinc-400 font-medium mb-8">
                Identity verified. Welcome to the Pulse Arena, <span className="text-accent font-black">{nickname}</span>.
              </p>

              <button 
                onClick={onComplete}
                className="w-full premium-gradient p-5 rounded-xl font-black text-xl hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                Enter the Arena
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        fetchUserData();
      } else {
        setUser(null);
        setUserData(null);
      }
    });
  }, []);

  const fetchUserData = async () => {
    try {
      const data = await api.getMe();
      setUserData(data);
    } catch (err) {
      console.error("Failed to fetch user data", err);
      if (err.response?.status === 403) {
        setError(err.response.data.detail || "Login with your ASU ID");
        logout();
        setUser(null);
        setUserData(null);
      } else if (!err.response) {
        setError(err.message);
      }
    }
  };

  const handleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      if (err.message?.includes('missing initial state')) {
        setError('Login failed due to browser security settings. If you are on an iPhone/Safari, please go to Settings > Safari and turn OFF "Prevent Cross-Site Tracking".');
      } else {
        setError(err.message || 'Login failed. Please use a whitelisted email.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setUserData(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-dark text-white font-sans antialiased overflow-x-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-panel relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
          
          <h1 className="text-5xl font-black mb-2 tracking-tighter text-center font-display">
            PULSE<span className="text-accent underline decoration-violet-500/30">GAMING</span>
          </h1>
          
          <div className="flex flex-col gap-4 mt-8">
            <button 
              onClick={handleLogin}
              className="premium-gradient p-4 rounded-xl font-bold text-xl hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Sign in with Google
            </button>
            <p className="text-zinc-500 text-center text-xs">Sign in to start playing.</p>
            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center text-sm font-medium">{error}</motion.p>}
          </div>
        </motion.div>
      </div>
    );
  }

  const navLinkClass = ({ isActive }) =>
    `font-black text-xs sm:text-sm tracking-[0.2em] uppercase transition-all whitespace-nowrap ${isActive ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`;

  const mobileNavLinkClass = ({ isActive }) =>
    `text-4xl font-black tracking-tighter uppercase transition-all ${isActive ? 'text-accent' : 'text-white'}`;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 min-h-screen font-sans">
      <header className="flex justify-between items-center w-full mb-8 sm:mb-12 py-4 sm:py-6 border-b border-white/5 relative z-[100]">
        <h1 className="text-xl sm:text-2xl font-black tracking-tighter font-display cursor-pointer" onClick={() => { navigate('/'); setIsMenuOpen(false); }}>
          PULSE <span className="text-zinc-500 font-extralight text-lg sm:text-xl">GAMING</span>
        </h1>
        
        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>
            Games
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>
            Leaderboard
          </NavLink>
          {userData?.is_admin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
          <div className="h-4 w-[1px] bg-zinc-800 mx-2" />
          <button 
            onClick={handleLogout}
            className="text-zinc-600 hover:text-red-400 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            Logout
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden p-2 text-white hover:text-accent transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[90] bg-dark/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 sm:hidden"
            >
              <nav className="flex flex-col items-center gap-8 text-center">
                <NavLink 
                  to="/" 
                  end 
                  onClick={() => setIsMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  Games
                </NavLink>
                <NavLink 
                  to="/leaderboard" 
                  onClick={() => setIsMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  Leaderboard
                </NavLink>
                {userData?.is_admin && (
                  <NavLink 
                    to="/admin" 
                    onClick={() => setIsMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Admin
                  </NavLink>
                )}
                <div className="w-12 h-1 bg-white/10 my-4" />
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 text-xl font-black uppercase tracking-widest transition-colors"
                >
                  Logout
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="w-full">
        <Outlet />
      </main>

      {user && userData && !userData.nickname && (
        <NicknamePrompt onComplete={fetchUserData} />
      )}
    </div>
  );
}

export default App;
