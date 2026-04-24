import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import WordlePage from './games/wordle/WordlePage.jsx';
import TutorTriviaPage from './games/tutor-trivia/TutorTriviaPage.jsx';
import LogicSprintPage from './games/logic-sprint/LogicSprintPage.jsx';
import ASUTriviaPage from './games/asu-trivia/ASUTriviaPage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
{/* <Route path="wordle" element={<WordlePage />} /> */}
// <Route path="tutor-trivia" element={<TutorTriviaPage />} />
          <Route path="logic-sprint" element={<LogicSprintPage />} />
          <Route path="asu-trivia" element={<ASUTriviaPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
