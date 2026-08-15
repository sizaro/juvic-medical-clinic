import axios from 'axios';

const TOKEN_KEY = 'juvic_access_token';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080/api', timeout: 30_000 });
api.interceptors.request.use((config) => { const token = sessionStorage.getItem(TOKEN_KEY); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, (error) => { if (error.response?.status === 401) { sessionStorage.removeItem(TOKEN_KEY); if (location.pathname !== '/login') location.assign('/login'); } return Promise.reject(error); });
export const tokenStore = { get: () => sessionStorage.getItem(TOKEN_KEY), set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token), clear: () => sessionStorage.removeItem(TOKEN_KEY) };
