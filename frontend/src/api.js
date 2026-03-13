import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const getMe = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const updateNickname = async (nickname) => {
  const response = await api.post('/me/nickname', { nickname });
  return response.data;
};

export const getWhitelist = async () => {
  const response = await api.get('/admin/whitelist');
  return response.data;
};

export const addToWhitelist = async (email) => {
  const response = await api.post('/admin/whitelist', { email });
  return response.data;
};

export const removeFromWhitelist = async (email) => {
  const response = await api.delete(`/admin/whitelist/${email}`);
  return response.data;
};

export const setGame = async (word) => {
  const response = await api.post('/admin/game', { word });
  return response.data;
};

export const stopGame = async () => {
  const response = await api.delete('/admin/game');
  return response.data;
};

export const getGameConfig = async () => {
  const response = await api.get('/admin/game');
  return response.data;
};
