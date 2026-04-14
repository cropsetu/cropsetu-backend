import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, StatusBar, Dimensions, Alert, Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import {
  sendChatMessage, sendVoiceMessage,
  getConversationMessages, getConversations, getScanSessions,
} from '../../services/aiApi';
import { useFarm } from '../../context/FarmContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

// ─── Light Color Tokens ───────────────────────────────────────────────────────
const BG       = '#FFFFFF';
const CHAT_BG  = '#F4F8F5';
const PRIMARY  = '#16A34A';
const P_LIGHT  = '#22C55E';
const ACCENT   = '#0D9488';
const A_LIGHT  = '#14B8A6';
const BORDER   = '#D4EDD6';
const SURFACE  = '#F0F7F1';
const TEXT     = '#1A2E1A';
const TEXT2    = '#4A6E4A';
const MUTED    = '#8AAE8A';
const USER_A   = '#16A34A';
const USER_B   = '#0D9488';
const DANGER   = '#EF4444';

// ─── Voice modal dark tokens ──────────────────────────────────────────────────
const V_BG    = '#071009';
const V_GLASS = 'rgba(34,197,94,0.07)';
const V_BORD  = 'rgba(34,197,94,0.18)';
const V_TEXT  = '#F0FDF4';
const V_MUTED = 'rgba(134,239,172,0.55)';

// ─── Orbital Particle Sphere ──────────────────────────────────────────────────
const SPHERE_H  = H * 0.46;
const SPHERE_CX = W / 2;
const SPHERE_CY = SPHERE_H / 2;
const SPHERE_R  = Math.min(W, SPHERE_H) * 0.40;
const N_STEPS   = 17;
const IN_RANGE  = Array.from({ length: N_STEPS }, (_, i) => i / (N_STEPS - 1));

const RING_DEFS = [
  { frac: 0.22, count: 6,  dur: 2600,  color: P_LIGHT,    size: 6 },
  { frac: 0.38, count: 8,  dur: 3800,  color: '#4ADE80',  size: 5 },
  { frac: 0.54, count: 10, dur: 5200,  color: A_LIGHT,    size: 4 },
  { frac: 0.68, count: 12, dur: 6800,  color: '#2DD4BF',  size: 3.5 },
  { frac: 0.82, count: 14, dur: 8400,  color: '#06B6D4',  size: 3 },
  { frac: 1.00, count: 18, dur: 10200, color: '#38BDF8',  size: 2 },
];

function buildRings() {
  return RING_DEFS.map(def => {
    const radius = SPHERE_R * def.frac;
    const anim   = new Animated.Value(0);
    const particles = Array.from({ length: def.count }, (_, pi) => {
      const ph = pi / def.count;
      return {
        translateX: anim.interpolate({ inputRange: IN_RANGE, outputRange: IN_RANGE.map(t => Math.cos((t + ph) * 2 * Math.PI) * radius) }),
        translateY: anim.interpolate({ inputRange: IN_RANGE, outputRange: IN_RANGE.map(t => Math.sin((t + ph) * 2 * Math.PI) * radius) }),
      };
    });
    return { ...def, radius, anim, particles };
  });
}

function VoiceSphere({ isListening, audioLevel }) {
  const ringsRef    = useRef(null);
  if (!ringsRef.current) ringsRef.current = buildRings();
  const rings       = ringsRef.current;
  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.18)).current;
  const dotOpacity  = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loops = rings.map(ring =>
      Animated.loop(Animated.timing(ring.anim, { toValue: 1, duration: ring.dur, easing: Easing.linear, useNativeDriver: true }))
    );
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowScale, { toValue: 1.45, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowScale, { toValue: 0.80, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loops.forEach(l => l.start());
    glowLoop.start();
    return () => { loops.forEach(l => l.stop()); glowLoop.stop(); };
  }, []);

  useEffect(() => {
    Animated.spring(dotOpacity,  { toValue: isListening ? 0.75 + audioLevel * 0.25 : 0.55, speed: 20, bounciness: 3, useNativeDriver: true }).start();
    Animated.spring(glowOpacity, { toValue: isListening ? 0.30 + audioLevel * 0.25 : 0.18, speed: 20, bounciness: 3, useNativeDriver: true }).start();
  }, [isListening, audioLevel]);

  return (
    <View style={{ width: W, height: SPHERE_H }}>
      <Animated.View style={{ position: 'absolute', width: 72, height: 72, borderRadius: 36, left: SPHERE_CX - 36, top: SPHERE_CY - 36, backgroundColor: P_LIGHT, opacity: glowOpacity, transform: [{ scale: glowScale }], shadowColor: P_LIGHT, shadowRadius: 32, shadowOpacity: 1, elevation: 10 }} />
      <View style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, left: SPHERE_CX - 8, top: SPHERE_CY - 8, backgroundColor: '#fff', opacity: 0.7 }} />
      {rings.map((ring, ri) =>
        ring.particles.map((p, pi) => (
          <Animated.View key={`${ri}-${pi}`} style={{ position: 'absolute', width: ring.size, height: ring.size, borderRadius: ring.size / 2, backgroundColor: ring.color, left: SPHERE_CX - ring.size / 2, top: SPHERE_CY - ring.size / 2, opacity: dotOpacity, transform: [{ translateX: p.translateX }, { translateY: p.translateY }] }} />
        ))
      )}
    </View>
  );
}

// ─── Voice full-screen modal (slides up, dark bg so particles look great) ─────
function VoiceModal({ visible, isRecording, isProcessing, audioLevel, recordDuration, voiceResult, onStart, onSend, onCancel, onClose, insets }) {
  const slideAnim = useRef(new Animated.Value(H)).current;
  const transFade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: H, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true })
        .start(() => setMounted(false));
    }
  }, [visible]);

  useEffect(() => {
    if (voiceResult?.transcription) Animated.timing(transFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    else transFade.setValue(0);
  }, [voiceResult]);

  if (!mounted) return null;

  const mins = Math.floor(recordDuration / 60).toString().padStart(2, '0');
  const secs = (recordDuration % 60).toString().padStart(2, '0');
  const statusLabel = isProcessing ? 'Analysing…' : isRecording ? `Listening  ${mins}:${secs}` : 'Tap mic to speak';

  return (
    <Animated.View style={[VM.root, { transform: [{ translateY: slideAnim }] }]}>
      {/* Close / header */}
      <View style={[VM.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={VM.closeBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={24} color={V_MUTED} />
        </TouchableOpacity>
        <Text style={VM.headerTitle}>Voice Assistant</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Sphere */}
      <VoiceSphere isListening={isRecording} audioLevel={audioLevel} />

      {/* Status */}
      <View style={[VM.statusPill, isRecording && VM.statusPillActive]}>
        <View style={[VM.statusDot, { backgroundColor: isProcessing ? '#F59E0B' : isRecording ? P_LIGHT : V_MUTED }]} />
        <Text style={VM.statusLabel}>{statusLabel}</Text>
      </View>

      {/* Transcript result */}
      {voiceResult && !isRecording && !isProcessing && (
        <Animated.View style={[VM.resultCard, { opacity: transFade }]}>
          {voiceResult.error ? (
            <Text style={VM.errorText}>⚠ {voiceResult.error}</Text>
          ) : (
            <>
              <View style={VM.resultRow}><Ionicons name="mic-outline" size={13} color={V_MUTED} /><Text style={VM.resultTrans} numberOfLines={2}>{voiceResult.transcription}</Text></View>
              <View style={[VM.resultRow, { marginTop: 8 }]}><Ionicons name="leaf-outline" size={13} color={P_LIGHT} /><Text style={VM.resultReply} numberOfLines={3}>{voiceResult.reply}</Text></View>
              <TouchableOpacity style={VM.viewChatBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={VM.viewChatText}>View full reply in Chat →</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {/* Controls */}
      <View style={[VM.controls, { paddingBottom: insets.bottom + 24 }]}>
        {isProcessing ? (
          <ActivityIndicator color={P_LIGHT} size="large" />
        ) : isRecording ? (
          <View style={VM.activeRow}>
            <TouchableOpacity style={VM.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={DANGER} />
            </TouchableOpacity>
            <TouchableOpacity style={VM.sendRecBtn} onPress={onSend} activeOpacity={0.8}>
              <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VM.sendRecGrad}>
                <Ionicons name="arrow-up" size={22} color="#FFF" />
                <Text style={VM.sendRecText}>Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={VM.micBtn} onPress={onStart} activeOpacity={0.8}>
            <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VM.micGrad}>
              <Ionicons name="mic" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={VM.hint}>
          {isRecording ? 'Tap send when done, or cancel' : isProcessing ? 'Processing your voice…' : 'Speak in Hindi, Marathi, English or any Indian language'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Chat sub-components (light theme)
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    Animated.parallel(dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]))
    )).start();
  }, []);
  return (
    <View style={S.dotsRow}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[S.dot, { opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] }]} />
      ))}
    </View>
  );
}

function DiagnosisCard({ data, onBuyMedicine }) {
  const sevColor = { low: PRIMARY, moderate: '#D97706', high: '#DC2626', critical: '#9B1C1C' }[data.severity] || MUTED;
  const steps = Array.isArray(data.treatment)
    ? data.treatment
    : data.treatment && typeof data.treatment === 'object'
      ? Object.entries(data.treatment).filter(([, v]) => v).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      : [];
  const note = data.prevention || data.expectedRecovery || data.additionalNotes || '';
  return (
    <View style={S.diagCard}>
      <View style={S.diagHeader}>
        <View style={[S.diagSevDot, { backgroundColor: sevColor }]} />
        <Text style={S.diagName}>{data.disease || data.name}</Text>
        <View style={[S.diagConf, { backgroundColor: `${sevColor}18` }]}>
          <Text style={[S.diagConfText, { color: sevColor }]}>{data.confidence}% match</Text>
        </View>
      </View>
      <View style={S.diagMeta}><Ionicons name="leaf-outline" size={12} color={MUTED} /><Text style={S.diagMetaText}>{data.crop ? `${data.crop} · ` : ''}{data.severity}</Text></View>
      <View style={S.diagDivider} />
      <Text style={S.diagSectionLabel}>Treatment Plan</Text>
      {steps.map((step, i) => (
        <View key={i} style={S.diagStep}>
          <View style={S.diagStepNum}><Text style={S.diagStepNumText}>{i + 1}</Text></View>
          <Text style={S.diagStepText}>{typeof step === 'string' ? step : step.action}</Text>
        </View>
      ))}
      {!!note && <View style={S.diagTip}><Ionicons name="shield-checkmark-outline" size={12} color={PRIMARY} /><Text style={S.diagTipText}>{note}</Text></View>}
      <TouchableOpacity style={S.buyBtn} onPress={onBuyMedicine} activeOpacity={0.8}>
        <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.buyBtnGrad}>
          <Ionicons name="cart-outline" size={14} color="#FFF" />
          <Text style={S.buyBtnText}>Buy Products</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function MarketCard({ data }) {
  const prices  = data.prices || [];
  const insight = data.insight || data.sellingAdvice || '';
  const metaRows = [
    data.msp         && { label: 'MSP',         value: data.msp },
    data.marketRange && { label: 'Market range', value: data.marketRange },
    data.trend       && { label: 'Trend',        value: data.trend },
    data.bestMarket  && { label: 'Best market',  value: data.bestMarket },
  ].filter(Boolean);
  return (
    <View style={S.mktCard}>
      <Text style={S.mktCrop}>{data.crop} Prices Today</Text>
      {prices.map((p, i) => <View key={i} style={S.mktRow}><Text style={S.mktMandi}>{p.mandi}</Text><Text style={S.mktPrice}>₹{(p.price || 0).toLocaleString()}</Text></View>)}
      {metaRows.map((r, i) => <View key={i} style={S.mktRow}><Text style={S.mktMandi}>{r.label}</Text><Text style={S.mktPrice}>{r.value}</Text></View>)}
      {!!insight && <View style={S.mktTip}><Ionicons name="bulb-outline" size={12} color="#D97706" /><Text style={S.mktTipText}>{insight}</Text></View>}
    </View>
  );
}

function MessageBubble({ msg, onBuyMedicine }) {
  const isUser = msg.role === 'user';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);
  const formatText = (text) =>
    (text || '').split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>
    );
  if (isUser) {
    return (
      <Animated.View style={[S.userBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.userBubble}>
          {msg.isVoice && <View style={S.voiceTag}><Ionicons name="mic" size={10} color="rgba(255,255,255,0.7)" /><Text style={S.voiceTagText}>voice</Text></View>}
          <Text style={S.userBubbleText}>{msg.transcribing ? '…' : msg.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={[S.aiBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={S.aiAvatar}><Ionicons name="leaf" size={13} color={PRIMARY} /></View>
      <View style={{ flex: 1, gap: 8 }}>
        {msg.text && <View style={S.aiBubble}><Text style={S.aiBubbleText}>{formatText(msg.text)}</Text></View>}
        {msg.diagnosisData && <DiagnosisCard data={msg.diagnosisData} onBuyMedicine={onBuyMedicine} />}
        {msg.marketData    && <MarketCard data={msg.marketData} />}
      </View>
    </Animated.View>
  );
}

// ── Sidebar (light theme) ──────────────────────────────────────────────────
function Sidebar({ isOpen, onClose, sessions, historyLoading, onSessionPress, onNewChat, insets }) {
  const translateX     = useRef(new Animated.Value(-W * 0.82)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX,     { toValue: isOpen ? 0 : -W * 0.82, speed: 18, bounciness: 0, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: isOpen ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[SB.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[SB.panel, { paddingTop: insets.top + 12, transform: [{ translateX }] }]}>
        <View style={SB.panelHeader}>
          <View style={SB.panelTitleRow}>
            <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={SB.panelAvatar}>
              <Ionicons name="leaf" size={14} color="#FFF" />
            </LinearGradient>
            <Text style={SB.panelTitle}>FarmMind AI</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={SB.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={SB.newChatBtn} onPress={() => { onNewChat(); onClose(); }} activeOpacity={0.8}>
          <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={SB.newChatGrad}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={SB.newChatText}>New Chat</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={SB.sectionLabel}>Recent History</Text>
        {historyLoading ? (
          <View style={SB.loaderRow}>
            <ActivityIndicator color={PRIMARY} size="small" />
            <Text style={SB.loaderText}>Loading…</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Text style={SB.emptyText}>No conversations yet</Text>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={s => s.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => {
              const isScan  = item.isScanSession;
              const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              return (
                <TouchableOpacity style={SB.sessionRow} onPress={() => { onSessionPress(item); onClose(); }} activeOpacity={0.75}>
                  <View style={[SB.sessionIcon, { backgroundColor: isScan ? 'rgba(22,163,74,0.10)' : 'rgba(13,148,136,0.10)' }]}>
                    <Ionicons name={isScan ? 'scan-outline' : 'chatbubble-ellipses-outline'} size={16} color={isScan ? PRIMARY : ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={SB.sessionTitle} numberOfLines={1}>{item.title || 'AI Chat'}</Text>
                    <Text style={SB.sessionMeta}>{dateStr} · {item._count?.messages || item.messages?.length || 0} msgs</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const farmCtx      = useFarm();
  const getAIContext = farmCtx?.getAIContext || (() => ({}));

  const initialMsg             = route?.params?.initialMessage;
  const existingConversationId = route?.params?.conversationId;

  // ── State ───────────────────────────────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(route?.params?.voiceMode || false);

  const [messages, setMessages]     = useState([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
  const [input,    setInput]        = useState('');
  const [typing,   setTyping]       = useState(false);
  const [conversationId, setConvId] = useState(existingConversationId || null);
  const flatRef    = useRef(null);
  const lastSentAt = useRef(0);

  const [isRecording,  setIsRecording]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordDuration, setRecDur]     = useState(0);
  const [audioLevel,   setAudioLevel]   = useState(0);
  const [voiceResult,  setVoiceResult]  = useState(null);
  const recordRef   = useRef(null);
  const recTimerRef = useRef(null);

  const [sessions,       setSessions]  = useState([]);
  const [historyLoading, setHLoading]  = useState(false);
  const [historyLoaded,  setHLoaded]   = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: String(Date.now() + Math.random()), ...msg }]);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    const now = Date.now();
    if (now - lastSentAt.current < 6000) {
      addMessage({ role: 'ai', text: `Please wait ${Math.ceil((6000 - (now - lastSentAt.current)) / 1000)}s before sending another message.` });
      return;
    }
    lastSentAt.current = now;
    setInput('');
    addMessage({ role: 'user', text: msg });
    setTyping(true);
    try {
      const result = await sendChatMessage(msg, conversationId, getAIContext());
      if (result.conversationId && !conversationId) setConvId(result.conversationId);
      const aiMsg = { role: 'ai', text: result.reply };
      if (result.type === 'diagnosis' && result.card) aiMsg.diagnosisData = result.card;
      if (result.type === 'market'    && result.card) aiMsg.marketData    = result.card;
      addMessage(aiMsg);
    } catch (err) {
      addMessage({ role: 'ai', text: `⚠ ${err.response?.status === 429 ? 'Too many requests — wait 30s.' : 'Could not reach FarmMind AI. Check your connection.'}` });
    } finally { setTyping(false); }
  }, [input, typing, conversationId, addMessage, getAIContext]);

  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Microphone Permission', 'Please allow microphone access in settings.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({ ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true });
      let lastUpdate = 0;
      recording.setOnRecordingStatusUpdate((s) => {
        const now = Date.now();
        if (s.isRecording && s.metering !== undefined && now - lastUpdate > 90) {
          lastUpdate = now;
          setAudioLevel(Math.max(0, Math.min(1, (s.metering + 60) / 48)));
        }
      });
      recordRef.current = recording;
      setIsRecording(true); setVoiceResult(null); setRecDur(0); setAudioLevel(0);
      recTimerRef.current = setInterval(() => setRecDur(d => d + 1), 1000);
    } catch { Alert.alert('Error', 'Could not start recording. Please try again.'); }
  }, [isProcessing]);

  const stopAndSend = useCallback(async () => {
    if (!recordRef.current) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false); setIsProcessing(true); setAudioLevel(0);
    try {
      await recordRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordRef.current.getURI();
      recordRef.current = null;
      if (!uri) { setIsProcessing(false); return; }
      const result = await sendVoiceMessage(uri, conversationId, getAIContext());
      if (result.conversationId && !conversationId) setConvId(result.conversationId);
      setVoiceResult(result);
      addMessage({ role: 'user', text: result.transcription || '(voice)', isVoice: true });
      const aiMsg = { role: 'ai', text: result.reply };
      if (result.type === 'diagnosis' && result.card) aiMsg.diagnosisData = result.card;
      if (result.type === 'market'    && result.card) aiMsg.marketData    = result.card;
      addMessage(aiMsg);
    } catch (err) {
      recordRef.current = null;
      setVoiceResult({ error: err.response?.status === 429 ? 'Rate limit — wait 30s.' : 'Processing failed. Try again.' });
    } finally { setIsProcessing(false); setRecDur(0); }
  }, [conversationId, addMessage, getAIContext]);

  const cancelRecording = useCallback(async () => {
    clearInterval(recTimerRef.current);
    if (recordRef.current) {
      try { await recordRef.current.stopAndUnloadAsync(); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch { }
      recordRef.current = null;
    }
    setIsRecording(false); setIsProcessing(false); setRecDur(0); setAudioLevel(0);
  }, []);

  const loadHistory = useCallback(async () => {
    if (historyLoading) return;
    setHLoading(true);
    try {
      const [convos, scans] = await Promise.allSettled([getConversations(), getScanSessions()]);
      const convoList = convos.status === 'fulfilled' ? (convos.value || []).map(c => ({ ...c, isScanSession: false })) : [];
      const scanList  = scans.status  === 'fulfilled' ? (scans.value  || []).map(s => ({ ...s, isScanSession: true  })) : [];
      setSessions([...convoList, ...scanList].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
      setHLoaded(true);
    } finally { setHLoading(false); }
  }, [historyLoading]);

  useEffect(() => { if (sidebarOpen && !historyLoaded) loadHistory(); }, [sidebarOpen]);

  useEffect(() => {
    if (existingConversationId) {
      getConversationMessages(existingConversationId)
        .then(convo => {
          if (convo?.messages?.length) {
            setMessages(convo.messages.map(m => ({
              id: m.id, role: m.role === 'assistant' ? 'ai' : 'user', text: m.content,
              diagnosisData: m.messageType === 'diagnosis' ? m.structuredData : null,
              marketData:    m.messageType === 'market'    ? m.structuredData : null,
            })));
          }
        }).catch(() => {});
    }
  }, []);

  useEffect(() => { if (initialMsg) setTimeout(() => sendMessage(initialMsg), 600); }, []);
  useEffect(() => { setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80); }, [messages, typing]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => setSidebarOpen(true)} style={S.headerBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.headerAvatar}>
            <Ionicons name="leaf" size={14} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={S.headerTitle}>FarmMind AI</Text>
            <View style={S.onlineRow}><View style={S.onlineDot} /><Text style={S.onlineText}>Online</Text></View>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={TEXT2} />
        </TouchableOpacity>
      </View>

      {/* ── Chat ── */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: CHAT_BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={S.msgList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MessageBubble msg={item} onBuyMedicine={() => navigation.navigate('AgriStore')} />
          )}
          ListFooterComponent={typing ? (
            <View style={S.aiBubbleWrap}>
              <View style={S.aiAvatar}><Ionicons name="leaf" size={13} color={PRIMARY} /></View>
              <View style={S.aiBubble}><TypingDots /></View>
            </View>
          ) : null}
        />

        {/* Compact suggestion chips */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsList}>
            {['Brown spots on tomato', 'Fertilizer for wheat', 'PM-KISAN details', 'Mandi price today', 'Pest scouting'].map((s, i) => (
              <TouchableOpacity key={i} style={S.chip} onPress={() => sendMessage(s)} activeOpacity={0.7}>
                <Text style={S.chipText} numberOfLines={1}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar — mic inside left, send on right */}
        <View style={[S.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={S.inputRow}>
            {/* Mic button — inside input row, left side */}
            <TouchableOpacity
              style={S.micInBtn}
              onPress={() => setVoiceVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="mic" size={20} color={PRIMARY} />
            </TouchableOpacity>

            <TextInput
              style={S.textInput}
              placeholder="Ask about crops, diseases, prices…"
              placeholderTextColor={MUTED}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => sendMessage()}
            />

            {/* Send button — right side */}
            <TouchableOpacity
              style={[S.sendBtn, (!input.trim() || typing) && S.sendBtnOff]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || typing}
              activeOpacity={0.8}
            >
              {typing ? (
                <ActivityIndicator size="small" color={MUTED} />
              ) : (
                <LinearGradient
                  colors={input.trim() ? [USER_A, USER_B] : [SURFACE, SURFACE]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={S.sendBtnGrad}
                >
                  <Ionicons name="arrow-up" size={17} color={input.trim() ? '#FFF' : MUTED} />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Voice modal (slides up, dark bg) ── */}
      <VoiceModal
        visible={voiceVisible}
        isRecording={isRecording}
        isProcessing={isProcessing}
        audioLevel={audioLevel}
        recordDuration={recordDuration}
        voiceResult={voiceResult}
        insets={insets}
        onStart={startRecording}
        onSend={stopAndSend}
        onCancel={cancelRecording}
        onClose={() => {
          if (isRecording) cancelRecording();
          setVoiceVisible(false);
        }}
      />

      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        historyLoading={historyLoading}
        insets={insets}
        onNewChat={() => {
          setMessages([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
          setConvId(null);
        }}
        onSessionPress={(item) => navigation.push('AIChat', { conversationId: item.id })}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Styles (light theme)
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 10,
    backgroundColor: BG,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  headerAvatar: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: TEXT },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  onlineText:   { fontSize: 10, color: PRIMARY, fontWeight: '600' },

  msgList: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 10 },

  aiBubbleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  aiAvatar:     { width: 28, height: 28, borderRadius: 8, marginTop: 2, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  aiBubble:     { backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 11, maxWidth: W * 0.78, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  aiBubbleText: { fontSize: 14, color: TEXT, lineHeight: 21 },

  userBubbleWrap: { alignItems: 'flex-end', marginBottom: 2 },
  userBubble:     { borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 11, maxWidth: W * 0.78 },
  voiceTag:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceTagText:   { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  userBubbleText: { fontSize: 14, color: '#FFF', lineHeight: 20 },

  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 20 },
  dot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY },

  chipsList: { paddingHorizontal: 14, paddingVertical: 6, gap: 7, backgroundColor: CHAT_BG },
  chip:      { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  chipText:  { fontSize: 12, color: TEXT2, fontWeight: '500' },

  inputBar: { backgroundColor: BG, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    backgroundColor: SURFACE, borderRadius: 26,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  micInBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(22,163,74,0.08)' },
  textInput: { flex: 1, fontSize: 14, color: TEXT, maxHeight: 100, minHeight: 34, paddingVertical: 4 },
  sendBtn:    { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  sendBtnOff: { opacity: 0.45 },
  sendBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  diagCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: BORDER, maxWidth: W * 0.78, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagSevDot: { width: 8, height: 8, borderRadius: 4 },
  diagName: { fontSize: 15, fontWeight: '800', color: TEXT, flex: 1 },
  diagConf: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diagConfText: { fontSize: 11, fontWeight: '700' },
  diagMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  diagMetaText: { fontSize: 11, color: MUTED },
  diagDivider: { height: 1, backgroundColor: BORDER },
  diagSectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  diagStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  diagStepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  diagStepNumText: { fontSize: 10, color: PRIMARY, fontWeight: '800' },
  diagStepText: { fontSize: 12, color: TEXT2, lineHeight: 18, flex: 1 },
  diagTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: SURFACE, borderRadius: 8, padding: 10 },
  diagTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },
  buyBtn: { borderRadius: 10, overflow: 'hidden', marginTop: 2 },
  buyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  mktCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: BORDER, maxWidth: W * 0.78 },
  mktCrop: { fontSize: 13, fontWeight: '800', color: '#D97706' },
  mktRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mktMandi: { fontSize: 12, color: MUTED, flex: 1 },
  mktPrice: { fontSize: 13, fontWeight: '700', color: TEXT },
  mktTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 2 },
  mktTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },
});

// ── Voice modal styles (dark) ──────────────────────────────────────────────
const VM = StyleSheet.create({
  root: { position: 'absolute', inset: 0, backgroundColor: V_BG, zIndex: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: V_GLASS },
  headerTitle: { fontSize: 15, fontWeight: '700', color: V_TEXT },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: V_GLASS, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: V_BORD },
  statusPillActive: { borderColor: P_LIGHT },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: V_TEXT },

  resultCard: { backgroundColor: V_GLASS, borderRadius: 20, padding: 16, gap: 4, borderWidth: 1, borderColor: V_BORD, maxWidth: W - 48, marginHorizontal: 24 },
  errorText: { fontSize: 13, color: DANGER, textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultTrans: { fontSize: 13, color: V_MUTED, flex: 1, lineHeight: 18 },
  resultReply: { fontSize: 13, color: V_TEXT, flex: 1, lineHeight: 18 },
  viewChatBtn: { alignItems: 'flex-end', marginTop: 8 },
  viewChatText: { fontSize: 12, color: P_LIGHT, fontWeight: '700' },

  controls: { alignItems: 'center', gap: 12, width: '100%', paddingHorizontal: 32 },
  activeRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  micBtn: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: P_LIGHT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  micGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: DANGER, justifyContent: 'center', alignItems: 'center' },
  sendRecBtn: { borderRadius: 28, overflow: 'hidden' },
  sendRecGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  sendRecText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  hint: { fontSize: 12, color: V_MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});

// ── Sidebar styles (light) ─────────────────────────────────────────────────
const SB = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: W * 0.82, backgroundColor: BG, borderRightWidth: 1, borderRightColor: BORDER, paddingHorizontal: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelAvatar: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  panelTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },

  newChatBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  newChatGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16 },
  newChatText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  loaderText: { fontSize: 13, color: TEXT2 },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 24 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SURFACE },
  sessionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sessionTitle: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 2 },
  sessionMeta: { fontSize: 11, color: MUTED },
});
