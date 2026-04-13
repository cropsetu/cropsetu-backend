import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, RADIUS, SHADOWS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const STEPS = { PHONE: 'phone', OTP: 'otp', NAME: 'name' };

export default function LoginScreen() {
  const { sendOtp, verifyOtp, updateUser } = useAuth();
  const { t } = useLanguage();

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
      Alert.alert(t('login.invalidPhone'), t('login.invalidPhoneMsg'));
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp(phone);
      setStep(STEPS.OTP);
      // Dev mode: auto-fill OTP when server returns it (MSG91 not configured)
      if (result?.devOtp) setOtp(result.devOtp);
    } catch (err) {
      Alert.alert(t('login.error'), err.response?.data?.error?.message || t('login.otpError'));
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      Alert.alert(t('login.invalidOtp'), t('login.invalidOtpMsg'));
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
      Alert.alert(t('login.error'), err.response?.data?.error?.message || t('login.verifyError'));
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: save name (new users only) ────────────────────────────────────
  async function handleSaveName() {
    if (name.trim().length < 2) {
      Alert.alert(t('login.nameRequired'), t('login.nameRequiredMsg'));
      return;
    }
    setLoading(true);
    try {
      // User is already logged in — just update the name
      const { default: api } = await import('../../services/api');
      await api.put('/users/me', { name: name.trim() });
      updateUser({ name: name.trim() });
    } catch {
      // Non-critical — proceed anyway
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.gradient, { backgroundColor: COLORS.primary }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.inner}>

          {/* Logo area */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>🌾</Text>
            </View>
            <Text style={s.appName}>FarmEasy</Text>
            <Text style={s.tagline}>{t('login.tagline')}</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {step === STEPS.PHONE && (
              <>
                <Text style={s.cardTitle}>{t('login.enterPhone')}</Text>
                <Text style={s.cardSub}>{t('login.otpWillSend')}</Text>
                <View style={s.inputRow}>
                  <View style={s.countryCode}><Text style={s.countryTxt}>+91</Text></View>
                  <TextInput
                    style={s.input}
                    placeholder={t('login.phonePlaceholder')}
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
                    : <Text style={s.btnTxt}>{t('login.sendOtp')}</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {step === STEPS.OTP && (
              <>
                <TouchableOpacity onPress={() => setStep(STEPS.PHONE)} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={s.cardTitle}>{t('login.enterOtp')}</Text>
                <Text style={s.cardSub}>{t('login.otpSentTo', { phone })}</Text>
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
                    : <Text style={s.btnTxt}>{t('login.verifyLogin')}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} style={s.resendBtn}>
                  <Text style={s.resendTxt}>{t('login.resendOtp')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === STEPS.NAME && (
              <>
                <Text style={s.cardTitle}>{t('login.welcome')}</Text>
                <Text style={s.cardSub}>{t('login.yourName')}</Text>
                <TextInput
                  style={s.input}
                  placeholder={t('login.namePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
                <TouchableOpacity style={s.btn} onPress={handleSaveName} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnTxt}>{t('login.getStarted')}</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={s.footer}>{t('login.termsNote')}</Text>
        </KeyboardAvoidingView>
      </View>
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
