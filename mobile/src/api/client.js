import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setToken(token) {
  if (token) await SecureStore.setItemAsync('token', token);
  else await SecureStore.deleteItemAsync('token');
}

export default api;