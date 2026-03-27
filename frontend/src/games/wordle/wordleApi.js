import axios from 'axios';
import { auth } from '../../firebase';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response || (error.response.status >= 502 && error.response.status <= 504)) {
      error.message = "Wait a minute or 2 for the backend to start.";
    }
    return Promise.reject(error);
  }
);

export const getGameState = async () => {
  const response = await api.get('/wordle/state');
  return response.data;
};

export const submitGuess = async (guess) => {
  const response = await api.post('/wordle/guess', { guess });
  return response.data;
};

export const getHint = async () => {
  const response = await api.post('/wordle/hint');
  return response.data;
};
