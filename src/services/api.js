/**
 * FarmEasy API Client
 * Centralised axios instance with auto token injection + refresh.
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { setItem, getItem, deleteItem } from '../utils/storage';

// ── Config ────────────────────────────────────────────────────────────────────
// Web browser → server is at localhost (same machine).
// Physical device → server is at the Mac's LAN IP.
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:3001/api/v1'
  : 'http://192.168.1.4:3001/api/v1';

const TOKEN_KEY   = 'farmeasy_access_token';
const REFRESH_KEY = 'farmeasy_refresh_token';
const USER_ID_KEY = 'farmeasy_user_id';

// ── Token helpers ─────────────────────────────────────────────────────────────
export async function saveTokens({ accessToken, refreshToken, userId }) {
  await Promise.all([
    setItem(TOKEN_KEY,   accessToken),
    setItem(REFRESH_KEY, refreshToken),
    setItem(USER_ID_KEY, userId),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    deleteItem(TOKEN_KEY),
    deleteItem(REFRESH_KEY),
    deleteItem(USER_ID_KEY),
  ]);
}

export async function getAccessToken()  { return getItem(TOKEN_KEY); }
export async function getRefreshToken() { return getItem(REFRESH_KEY); }
export async function getUserId()       { return getItem(USER_ID_KEY); }

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry  = true;
    isRefreshing     = true;

    try {
      const [refreshToken, userId] = await Promise.all([
        getRefreshToken(),
        getUserId(),
      ]);

      if (!refreshToken || !userId) throw new Error('No refresh token');

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        userId,
        refreshToken,
      });

      await saveTokens({
        accessToken:  data.data.accessToken,
        refreshToken: data.data.refreshToken,
        userId,
      });

      processQueue(null, data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await clearTokens();
      // Signal to AuthContext that session expired
      return Promise.reject({ ...err, sessionExpired: true });
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
