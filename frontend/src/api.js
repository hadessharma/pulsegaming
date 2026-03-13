import axios from 'axios';
import { auth } from './firebase';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email) => {
  const response = await api.post(`/token?email=${email}`);
  localStorage.setItem('token', response.data.access_token);
  return response.data;
};

export const getGameState = async () => {
  const response = await api.get('/state');
  return response.data;
};

export const submitGuess = async (guess) => {
  const response = await api.post('/guess', { guess });
  return response.data;
};

export const getHint = async () => {
  const response = await api.post('/hint');
  return response.data;
};

export const getLeaderboard = async () => {
  const response = await api.get('/leaderboard');
  return response.data;
};
