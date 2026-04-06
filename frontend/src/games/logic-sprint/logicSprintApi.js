import { api } from '../../api';

// Add interceptor to include token if stored in localStorage (PulseGaming uses firebase usually, but let's check auth.js)
// Looking at App.jsx, it uses a custom auth context.
// Tutor Trivia game uses ./tutorTriviaApi.js. Let's check that.

export const startGame = async () => {
  const response = await api.post('/logic-sprint/start');
  return response.data;
};

export const submitAnswer = async (answer) => {
  const response = await api.post('/logic-sprint/submit', { answer: String(answer) });
  return response.data;
};

export const getGameState = async () => {
  const response = await api.get('/logic-sprint/state');
  return response.data;
};
