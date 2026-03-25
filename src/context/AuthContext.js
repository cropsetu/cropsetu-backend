/**
 * AuthContext — manages auth state (login, logout, current user).
 * Wrap your app root with <AuthProvider>.
 * Use useAuth() anywhere to access { user, isLoggedIn, login, logout, loading }.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api, {
  saveTokens, clearTokens,
  getAccessToken, getUserId,
  getRefreshToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true while checking saved token

  // ── On app launch: restore session ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, userId] = await Promise.all([getAccessToken(), getUserId()]);
        if (token && userId) {
          const { data } = await api.get('/users/me');
          setUser(data.data);
        }
      } catch {
        // Token expired or invalid — clear it silently
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Step 1: request OTP ─────────────────────────────────────────────────────
  async function sendOtp(phone) {
    const { data } = await api.post('/auth/send-otp', { phone });
    return data.data; // { sessionId }
  }

  // ── Step 2: verify OTP → receive tokens ────────────────────────────────────
  async function verifyOtp(phone, otp, name = null) {
    const body = { phone, otp };
    if (name) body.name = name;

    const { data } = await api.post('/auth/verify-otp', body);
    const { accessToken, refreshToken, user: u } = data.data;

    await saveTokens({ accessToken, refreshToken, userId: u.id });
    setUser(u);
    return data.data; // includes isNewUser
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function logout() {
    try {
      const refreshToken = await getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    await clearTokens();
    setUser(null);
  }

  // ── Update local user after profile edit ────────────────────────────────────
  function updateUser(patch) {
    setUser((prev) => ({ ...prev, ...patch }));
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      loading,
      sendOtp,
      verifyOtp,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
