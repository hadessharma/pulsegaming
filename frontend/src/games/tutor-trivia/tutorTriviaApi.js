import axios from 'axios';
import { auth } from '../../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const startGame = async (day) => {
  const response = await client.post('/tutor-trivia/start', { day });
  return response.data;
};

export const getGameState = async (day) => {
  const response = await client.get('/tutor-trivia/state', { params: { day } });
  return response.data;
};

export const submitGuess = async (day, tutorId) => {
  const response = await client.post('/tutor-trivia/guess', { day, tutor_id: tutorId });
  return response.data;
};

export const getTutorConfig = async () => {
  const response = await client.get('/tutor-trivia/config');
  return response.data;
};
