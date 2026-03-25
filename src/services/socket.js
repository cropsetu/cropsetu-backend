/**
 * Socket.IO client service for FarmEasy real-time features.
 * Singleton pattern — one connection across the whole app.
 */
import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { getAccessToken } from './api';

const SERVER_URL = Platform.OS === 'web'
  ? 'http://localhost:3000'
  : 'http://192.168.1.4:3000';

let socket = null;

export function getSocket() {
  return socket;
}

export async function connectSocket() {
  if (socket?.connected) return socket;

  const token = await getAccessToken();
  if (!token) return null;

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
