import React, { useState, useEffect } from 'react';
import * as api from '../api';

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
    <div className="w-full bg-gray-900 rounded-lg overflow-hidden border border-border">
      <table className="w-full text-left">
        <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
          <tr>
            <th className="p-4">Rank</th>
            <th className="p-4">Competitor</th>
            <th className="p-4 text-center">Guesses</th>
            <th className="p-4 text-center">Hints</th>
            <th className="p-4 text-center">Total Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {stats.map((row, i) => (
            <tr key={i} className={i === 0 ? "bg-correct bg-opacity-10" : ""}>
              <td className="p-4 font-bold">{i + 1}</td>
              <td className="p-4">{row.email}</td>
              <td className="p-4 text-center">{row.guesses}</td>
              <td className="p-4 text-center">{row.hints}</td>
              <td className="p-4 text-center font-bold text-present">{row.score}</td>
            </tr>
          ))}
          {stats.length === 0 && (
            <tr>
              <td colSpan="5" className="p-8 text-center text-gray-500">No results yet. Finish the game to appear here!</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
