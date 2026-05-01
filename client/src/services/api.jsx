import axios from 'axios';

const API_URL = '/api/games';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createGame = async (gameData) => {
  const response = await api.post('/', gameData);
  return response.data;
};

export const getGames = async () => {
  const response = await api.get('/');
  return response.data;
};

export const getGame = async (id) => {
  const response = await api.get(`/${id}`);
  return response.data;
};

export const updateGame = async (id, gameData) => {
  const response = await api.put(`/${id}`, gameData);
  return response.data;
};

export const deleteGame = async (id) => {
  const response = await api.delete(`/${id}`);
  return response.data;
};

export default api;
