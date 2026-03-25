import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, RADIUS, SHADOWS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const STEPS = { PHONE: 'phone', OTP: 'otp', NAME: 'name' };

export default function LoginScreen() {
  const { sendOtp, verifyOtp } = useAuth();

  const [step,    setStep]    = useState(STEPS.PHONE);
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [isNew,   setIsNew]   = useState(false);
  const otpRef = useRef(null);

  // Focus the OTP input after step changes to OTP
  useEffect(() => {
    if (step === STEPS.OTP) {
      setTimeout(() => otpRef.current?.focus(), 300);
    }
  }, [step]);

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep(STEPS.OTP);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);
      if (result.isNewUser) {
        setIsNew(true);
        setStep(STEPS.NAME);
      }
      // If existing user → AuthContext sets user → AppNavigator switches to tabs
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: save name (new users only) ────────────────────────────────────
  async function handleSaveName() {
    if (name.trim().length < 2) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      // User is already logged in — just update the name
      const { default: api } = await import('../../services/api');
      await api.put('/users/me', { name: name.trim() });
      // Trigger re-fetch by touching auth context
      const { data } = await api.get('/users/me');
      // AuthContext.updateUser will be triggered by the parent re-render
    } catch {
      // Non-critical — proceed anyway
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={s.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>

          {/* Logo area */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>🌾</Text>
            </View>
            <Text style={s.appName}>FarmEasy</Text>
            <Text style={s.tagline}>Kisan Ki Awaaz</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {step === STEPS.PHONE && (
              <>
                <Text style={s.cardTitle}>Enter your mobile number</Text>
                <Text style={s.cardSub}>We'll send a 6-digit OTP to verify</Text>
                <View style={s.inputRow}>
                  <View style={s.countryCode}><Text style={s.countryTxt}>+91</Text></View>
                  <TextInput
                    style={s.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnTxt}>Send OTP</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {step === STEPS.OTP && (
              <>
                <TouchableOpacity onPress={() => setStep(STEPS.PHONE)} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={s.cardTitle}>Enter OTP</Text>
                <Text style={s.cardSub}>Sent to +91 {phone}</Text>
                <TextInput
                  ref={otpRef}
                  style={s.otpInput}
                  placeholder="_ _ _ _ _ _"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  editable={true}
                  caretHidden={false}
                  selectionColor={COLORS.primary}
                />
                <TouchableOpacity style={s.btn} onPress={handleVerifyOtp} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnTxt}>Verify & Login</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} style={s.resendBtn}>
                  <Text style={s.resendTxt}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {step === STEPS.NAME && (
              <>
                <Text style={s.cardTitle}>Welcome to FarmEasy!</Text>
                <Text style={s.cardSub}>What should we call you?</Text>
                <TextInput
                  style={s.input}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
                <TouchableOpacity style={s.btn} onPress={handleSaveName} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnTxt}>Get Started →</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={s.footer}>By continuing you agree to our Terms of Service</Text>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  gradient:{ flex: 1 },
  inner:   { flex: 1, justifyContent: 'center', padding: 24 },

  logoArea:   { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ffffff25', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoEmoji:  { fontSize: 40 },
  appName:    { fontSize: TYPE.size.xxl, fontWeight: TYPE.weight.black, color: COLORS.textWhite },
  tagline:    { fontSize: TYPE.size.sm, color: COLORS.primaryPale, marginTop: 4 },

  card:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 24, ...SHADOWS.large },
  cardTitle: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.textDark, marginBottom: 6 },
  cardSub:   { fontSize: TYPE.size.sm, color: COLORS.textMedium, marginBottom: 20 },

  inputRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  countryCode: { backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: COLORS.border },
  countryTxt:  { fontSize: TYPE.size.base, fontWeight: TYPE.weight.bold, color: COLORS.textDark },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: TYPE.size.base, color: COLORS.textDark, marginBottom: 16,
    backgroundColor: COLORS.inputBg,
  },
  otpInput: {
    width: '100%', borderWidth: 2, borderColor: COLORS.primary,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 24, fontWeight: '700', color: '#111827',
    backgroundColor: '#fff', marginBottom: 16,
  },

  btn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center', ...SHADOWS.small },
  btnTxt: { color: '#fff', fontSize: TYPE.size.base, fontWeight: TYPE.weight.bold },

  backBtn:   { marginBottom: 12 },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendTxt: { color: COLORS.primary, fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold },

  footer: { textAlign: 'center', color: COLORS.primaryPale, fontSize: 11, marginTop: 24 },
});
