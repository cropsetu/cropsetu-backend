/**
 * AuthContext — manages auth state (login, logout, current user).
 * Wrap your app root with <AuthProvider>.
 * Use useAuth() anywhere to access the context value.
 */
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import api, { saveTokens, clearTokens, getAccessToken, getUserId, getRefreshToken } from '../services/api';
import { resetSocket } from '../services/socket';
import { isTokenStale } from '../utils/storage';
import {
  OTP_RESEND_COOLDOWN_SEC,
  OTP_MAX_ATTEMPTS,
} from '../constants/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── OTP rate-limiting state (client-side guard; server enforces too) ─────────
  const otpCooldownRef  = useRef(0);   // epoch-ms when next send is allowed
  const otpAttemptsRef  = useRef(0);   // verify attempts since last sendOtp

  // ── On app launch: restore session ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [token, userId] = await Promise.all([getAccessToken(), getUserId()]);
        if (token && userId) {
          // Reject client-side stale tokens before hitting the network
          const stale = await isTokenStale();
          if (stale) { await clearTokens(); return; }

          const { data } = await api.get('/users/me');
          setUser(data.data);
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Step 1: request OTP ──────────────────────────────────────────────────────
  async function sendOtp(phone) {
    const now = Date.now();
    if (now < otpCooldownRef.current) {
      const wait = Math.ceil((otpCooldownRef.current - now) / 1000);
      throw Object.assign(
        new Error(`Please wait ${wait}s before requesting a new code.`),
        { clientSide: true },
      );
    }

    // Normalise phone: strip leading +91 / 0, keep only digits
    const normalised = phone.replace(/\D/g, '').replace(/^(91|0)/, '');
    if (!/^[6-9]\d{9}$/.test(normalised)) {
      throw Object.assign(
        new Error('Please enter a valid 10-digit mobile number.'),
        { clientSide: true },
      );
    }

    const { data } = await api.post('/auth/send-otp', { phone: normalised });

    // Arm the cooldown and reset the attempt counter for this new code
    otpCooldownRef.current = Date.now() + OTP_RESEND_COOLDOWN_SEC * 1000;
    otpAttemptsRef.current = 0;

    return data.data; // { sessionId }
  }

  // ── Step 2: verify OTP → receive tokens ─────────────────────────────────────
  async function verifyOtp(phone, otp, name = null) {
    if (otpAttemptsRef.current >= OTP_MAX_ATTEMPTS) {
      throw Object.assign(
        new Error('Too many incorrect attempts. Please request a new code.'),
        { clientSide: true },
      );
    }

    otpAttemptsRef.current += 1;

    const body = { phone, otp };
    if (name) body.name = name;

    const { data } = await api.post('/auth/verify-otp', body);
    const { accessToken, refreshToken, user: u } = data.data;

    await saveTokens({ accessToken, refreshToken, userId: u.id });
    otpAttemptsRef.current = 0; // reset on success
    setUser(u);
    return data.data; // includes isNewUser
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  async function logout() {
    try {
      const refreshToken = await getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch { /* best-effort server-side invalidation */ }

    // Destroy the socket before clearing tokens so the old session
    // cannot deliver messages to a subsequent user in the same process.
    resetSocket();

    await clearTokens();
    setUser(null);
    otpAttemptsRef.current = 0;
    otpCooldownRef.current = 0;
  }

  // ── Update local user after profile edit ────────────────────────────────────
  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
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
      otpCooldownSec: OTP_RESEND_COOLDOWN_SEC,
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
