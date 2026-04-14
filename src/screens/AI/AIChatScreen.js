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

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const BG       = '#071009';
const PRIMARY  = '#22C55E';
const P_LIGHT  = '#4ADE80';
const ACCENT   = '#14B8A6';
const A_LIGHT  = '#2DD4BF';
const GLASS    = 'rgba(34,197,94,0.07)';
const GBORDER  = 'rgba(34,197,94,0.16)';
const SURFACE  = 'rgba(255,255,255,0.04)';
const TEXT     = '#F0FDF4';
const TEXT2    = '#86EFAC';
const MUTED    = 'rgba(134,239,172,0.5)';
const USER_A   = '#16A34A';
const USER_B   = '#0D9488';
const DANGER   = '#EF4444';

// ─── Orbital Particle Sphere (pure Animated — no native modules needed) ───────
// 78 particles across 6 rings, all running on native thread via useNativeDriver.
// Pre-computed circular interpolations so zero JS work per frame.
const SPHERE_H   = H * 0.46;
const SPHERE_CX  = W / 2;
const SPHERE_CY  = SPHERE_H / 2;
const SPHERE_R   = Math.min(W, SPHERE_H) * 0.40;
const N_STEPS    = 17; // keyframe resolution per orbit
const INPUT_RANGE = Array.from({ length: N_STEPS }, (_, i) => i / (N_STEPS - 1));

// Ring definitions: frac = fraction of SPHERE_R
const RING_DEFS = [
  { frac: 0.22, count: 6,  dur: 2600, color: PRIMARY,   size: 6 },
  { frac: 0.38, count: 8,  dur: 3800, color: P_LIGHT,   size: 5 },
  { frac: 0.54, count: 10, dur: 5200, color: ACCENT,    size: 4 },
  { frac: 0.68, count: 12, dur: 6800, color: A_LIGHT,   size: 3.5 },
  { frac: 0.82, count: 14, dur: 8400, color: '#06B6D4', size: 3 },
  { frac: 1.00, count: 18, dur: 10200, color: '#38BDF8', size: 2 },
];

// Build rings + pre-compute all interpolations once (never recomputed)
function buildRings() {
  return RING_DEFS.map(def => {
    const radius = SPHERE_R * def.frac;
    const anim   = new Animated.Value(0);
    const particles = Array.from({ length: def.count }, (_, pi) => {
      const phaseFrac = pi / def.count;
      const xOut = INPUT_RANGE.map(t => Math.cos((t + phaseFrac) * 2 * Math.PI) * radius);
      const yOut = INPUT_RANGE.map(t => Math.sin((t + phaseFrac) * 2 * Math.PI) * radius);
      return {
        translateX: anim.interpolate({ inputRange: INPUT_RANGE, outputRange: xOut }),
        translateY: anim.interpolate({ inputRange: INPUT_RANGE, outputRange: yOut }),
      };
    });
    return { ...def, radius, anim, particles };
  });
}

// ── Sphere component ──────────────────────────────────────────────────────────
function VoiceSphere({ isListening, audioLevel }) {
  const ringsRef = useRef(null);
  if (!ringsRef.current) ringsRef.current = buildRings();
  const rings = ringsRef.current;

  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.18)).current;
  const dotOpacity  = useRef(new Animated.Value(0.55)).current;

  // Start all ring loops once
  useEffect(() => {
    const loops = rings.map(ring =>
      Animated.loop(
        Animated.timing(ring.anim, {
          toValue: 1, duration: ring.dur,
          easing: Easing.linear, useNativeDriver: true,
        })
      )
    );
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowScale, { toValue: 1.45, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowScale, { toValue: 0.80, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loops.forEach(l => l.start());
    glowLoop.start();
    return () => { loops.forEach(l => l.stop()); glowLoop.stop(); };
  }, []);

  // React to listening + audioLevel
  useEffect(() => {
    Animated.spring(dotOpacity, {
      toValue: isListening ? 0.75 + audioLevel * 0.25 : 0.55,
      speed: 20, bounciness: 3, useNativeDriver: true,
    }).start();
    Animated.spring(glowOpacity, {
      toValue: isListening ? 0.30 + audioLevel * 0.25 : 0.18,
      speed: 20, bounciness: 3, useNativeDriver: true,
    }).start();
  }, [isListening, audioLevel]);

  return (
    <View style={{ width: W, height: SPHERE_H }}>
      {/* Central glow orb */}
      <Animated.View style={{
        position: 'absolute',
        width: 72, height: 72, borderRadius: 36,
        left: SPHERE_CX - 36, top: SPHERE_CY - 36,
        backgroundColor: PRIMARY,
        opacity: glowOpacity,
        transform: [{ scale: glowScale }],
        shadowColor: PRIMARY, shadowRadius: 32, shadowOpacity: 1, elevation: 10,
      }} />
      {/* Inner bright dot */}
      <View style={{
        position: 'absolute',
        width: 16, height: 16, borderRadius: 8,
        left: SPHERE_CX - 8, top: SPHERE_CY - 8,
        backgroundColor: '#fff', opacity: 0.7,
      }} />

      {/* Orbiting particles — all native-thread animated */}
      {rings.map((ring, ri) =>
        ring.particles.map((p, pi) => (
          <Animated.View
            key={`${ri}-${pi}`}
            style={{
              position: 'absolute',
              width: ring.size, height: ring.size,
              borderRadius: ring.size / 2,
              backgroundColor: ring.color,
              left: SPHERE_CX - ring.size / 2,
              top:  SPHERE_CY - ring.size / 2,
              opacity: dotOpacity,
              transform: [{ translateX: p.translateX }, { translateY: p.translateY }],
            }}
          />
        ))
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]))
    );
    Animated.parallel(anims).start();
  }, []);
  return (
    <View style={S.dotsRow}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[S.dot, {
          opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
        }]} />
      ))}
    </View>
  );
}

function DiagnosisCard({ data, onBuyMedicine }) {
  const sevColor = { low: PRIMARY, moderate: '#F59E0B', high: '#EF4444', critical: '#BE123C' }[data.severity] || '#888';
  const treatmentSteps = Array.isArray(data.treatment)
    ? data.treatment
    : data.treatment && typeof data.treatment === 'object'
      ? Object.entries(data.treatment).filter(([, v]) => v).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      : [];
  const preventionNote = data.prevention || data.expectedRecovery || data.additionalNotes || '';

  return (
    <View style={S.diagCard}>
      <View style={S.diagHeader}>
        <View style={[S.diagSevDot, { backgroundColor: sevColor }]} />
        <Text style={S.diagName}>{data.disease || data.name}</Text>
        <View style={[S.diagConf, { backgroundColor: `${sevColor}20` }]}>
          <Text style={[S.diagConfText, { color: sevColor }]}>{data.confidence}% match</Text>
        </View>
      </View>
      <View style={S.diagMeta}>
        <Ionicons name="leaf-outline" size={12} color={MUTED} />
        <Text style={S.diagMetaText}>{data.crop ? `${data.crop} · ` : ''}{data.severity}</Text>
      </View>
      <View style={S.diagDivider} />
      <Text style={S.diagSectionLabel}>Treatment Plan</Text>
      {treatmentSteps.map((step, i) => (
        <View key={i} style={S.diagStep}>
          <View style={S.diagStepNum}><Text style={S.diagStepNumText}>{i + 1}</Text></View>
          <Text style={S.diagStepText}>{typeof step === 'string' ? step : step.action}</Text>
        </View>
      ))}
      {!!preventionNote && (
        <View style={S.diagTip}>
          <Ionicons name="shield-checkmark-outline" size={12} color={PRIMARY} />
          <Text style={S.diagTipText}>{preventionNote}</Text>
        </View>
      )}
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
  const prices   = data.prices || [];
  const insight  = data.insight || data.sellingAdvice || '';
  const metaRows = [
    data.msp         && { label: 'MSP',         value: data.msp },
    data.marketRange && { label: 'Market range', value: data.marketRange },
    data.trend       && { label: 'Trend',        value: data.trend },
    data.bestMarket  && { label: 'Best market',  value: data.bestMarket },
  ].filter(Boolean);

  return (
    <View style={S.mktCard}>
      <Text style={S.mktCrop}>{data.crop} Prices Today</Text>
      {prices.map((p, i) => (
        <View key={i} style={S.mktRow}>
          <Text style={S.mktMandi}>{p.mandi}</Text>
          <Text style={S.mktPrice}>₹{(p.price || 0).toLocaleString()}</Text>
        </View>
      ))}
      {metaRows.map((row, i) => (
        <View key={i} style={S.mktRow}>
          <Text style={S.mktMandi}>{row.label}</Text>
          <Text style={S.mktPrice}>{row.value}</Text>
        </View>
      ))}
      {!!insight && (
        <View style={S.mktTip}>
          <Ionicons name="bulb-outline" size={12} color="#F59E0B" />
          <Text style={S.mktTipText}>{insight}</Text>
        </View>
      )}
    </View>
  );
}

function MessageBubble({ msg, onBuyMedicine }) {
  const isUser = msg.role === 'user';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatText = (text) => {
    const parts = (text || '').split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        : <Text key={i}>{p}</Text>
    );
  };

  if (isUser) {
    return (
      <Animated.View style={[S.userBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.userBubble}>
          {msg.isVoice && (
            <View style={S.voiceTag}>
              <Ionicons name="mic" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={S.voiceTagText}>voice</Text>
            </View>
          )}
          <Text style={S.userBubbleText}>{msg.transcribing ? '…' : msg.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[S.aiBubbleWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={S.aiAvatar}>
        <Ionicons name="leaf" size={14} color={PRIMARY} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {msg.text && (
          <View style={S.aiBubble}>
            <Text style={S.aiBubbleText}>{formatText(msg.text)}</Text>
          </View>
        )}
        {msg.diagnosisData && <DiagnosisCard data={msg.diagnosisData} onBuyMedicine={onBuyMedicine} />}
        {msg.marketData    && <MarketCard data={msg.marketData} />}
      </View>
    </Animated.View>
  );
}

// ── Voice tab full-screen view ─────────────────────────────────────────────
function VoiceParticleView({ isRecording, isProcessing, audioLevel, recordDuration,
  voiceResult, onStart, onSend, onCancel, onViewChat }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const transFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (voiceResult?.transcription) {
      Animated.timing(transFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      transFade.setValue(0);
    }
  }, [voiceResult]);

  const mins = Math.floor(recordDuration / 60).toString().padStart(2, '0');
  const secs = (recordDuration % 60).toString().padStart(2, '0');
  const statusText = isProcessing ? 'Analysing…' : isRecording ? `Listening  ${mins}:${secs}` : 'Tap mic to speak';

  return (
    <Animated.View style={[VP.root, { opacity: fadeAnim }]}>
      {/* Orbital particle sphere — pure Animated, no native modules */}
      <VoiceSphere isListening={isRecording} audioLevel={audioLevel} />

      {/* Status pill */}
      <View style={[VP.statusPill, isRecording && VP.statusPillActive]}>
        <View style={[VP.statusDot, { backgroundColor: isProcessing ? '#F59E0B' : isRecording ? PRIMARY : MUTED }]} />
        <Text style={VP.statusLabel}>{statusText}</Text>
      </View>

      {/* Transcript / last result */}
      {voiceResult && !isRecording && !isProcessing && (
        <Animated.View style={[VP.resultCard, { opacity: transFade }]}>
          {voiceResult.error ? (
            <Text style={VP.errorText}>⚠ {voiceResult.error}</Text>
          ) : (
            <>
              <View style={VP.resultRow}>
                <Ionicons name="mic-outline" size={13} color={MUTED} />
                <Text style={VP.resultTrans} numberOfLines={2}>{voiceResult.transcription}</Text>
              </View>
              <View style={[VP.resultRow, { marginTop: 8 }]}>
                <Ionicons name="leaf-outline" size={13} color={PRIMARY} />
                <Text style={VP.resultReply} numberOfLines={3}>{voiceResult.reply}</Text>
              </View>
              <TouchableOpacity style={VP.viewChatBtn} onPress={onViewChat} activeOpacity={0.8}>
                <Text style={VP.viewChatText}>View full reply in Chat →</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {/* Controls */}
      <View style={VP.controls}>
        {isProcessing ? (
          <ActivityIndicator color={PRIMARY} size="large" />
        ) : isRecording ? (
          <View style={VP.activeRow}>
            <TouchableOpacity style={VP.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={DANGER} />
            </TouchableOpacity>
            <TouchableOpacity style={VP.sendRecBtn} onPress={onSend} activeOpacity={0.8}>
              <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VP.sendRecGrad}>
                <Ionicons name="arrow-up" size={22} color="#FFF" />
                <Text style={VP.sendRecText}>Send</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={VP.micBtn} onPress={onStart} activeOpacity={0.8}>
            <LinearGradient colors={[PRIMARY, ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={VP.micGrad}>
              <Ionicons name="mic" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={VP.hint}>
          {isRecording ? 'Tap send when done, or cancel'
            : isProcessing ? 'Processing your voice…'
            : 'Speak in Hindi, Marathi, English or any Indian language'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Session history card ───────────────────────────────────────────────────
function SessionCard({ session, onPress }) {
  const isScan    = session.isScanSession;
  const report    = session.scanReports?.[0];
  const riskColor = { LOW: PRIMARY, MODERATE: '#F59E0B', HIGH: '#EF4444', CRITICAL: '#BE123C' }[report?.riskLevel] || MUTED;
  const date      = new Date(session.updatedAt || session.createdAt);
  const dateStr   = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr   = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={S.sessionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[S.sessionIcon, { backgroundColor: isScan ? 'rgba(34,197,94,0.12)' : 'rgba(20,184,166,0.12)' }]}>
        <Ionicons name={isScan ? 'scan-outline' : 'chatbubble-ellipses-outline'} size={20} color={isScan ? PRIMARY : ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.sessionTitle} numberOfLines={1}>{session.title || 'AI Chat'}</Text>
        {report && (
          <View style={S.sessionPill}>
            <View style={[S.sessionDot, { backgroundColor: riskColor }]} />
            <Text style={[S.sessionPillText, { color: riskColor }]}>
              {report.riskLevel} · {Math.round((report.confidenceScore || 0) * 100)}% conf
            </Text>
          </View>
        )}
        <Text style={S.sessionMeta}>
          {dateStr} · {timeStr} · {session._count?.messages || session.messages?.length || 0} msgs
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'chat',    label: 'AI Chat', icon: 'chatbubble-ellipses' },
  { id: 'voice',   label: 'Voice',   icon: 'mic' },
  { id: 'history', label: 'History', icon: 'time' },
];

function TabBar({ active, onChange }) {
  return (
    <View style={S.tabBar}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={S.tab} onPress={() => onChange(tab.id)} activeOpacity={0.75}>
            {isActive && <View style={S.tabIndicator} />}
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={18}
              color={isActive ? PRIMARY : MUTED}
            />
            <Text style={[S.tabLabel, isActive && S.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { getAIContext } = useFarm();
  const { t } = useLanguage();

  const initialMsg             = route?.params?.initialMessage;
  const existingConversationId = route?.params?.conversationId;
  const startTab               = route?.params?.voiceMode ? 'voice'
    : (route?.params?.showHistory || route?.params?.showScanHistory) ? 'history' : 'chat';

  // ── State ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(startTab);

  // Chat
  const [messages, setMessages]     = useState([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState(false);
  const [conversationId, setConvId] = useState(existingConversationId || null);
  const flatRef    = useRef(null);
  const lastSentAt = useRef(0);

  // Voice
  const [isRecording, setIsRecording]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordDuration, setRecDur]     = useState(0);
  const [audioLevel, setAudioLevel]     = useState(0);
  const [voiceResult, setVoiceResult]   = useState(null);
  const recordRef   = useRef(null);
  const recTimerRef = useRef(null);

  // History
  const [sessions, setSessions]       = useState([]);
  const [historyLoading, setHLoading] = useState(false);
  const [historyLoaded, setHLoaded]   = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: String(Date.now() + Math.random()), ...msg }]);
  }, []);

  // ── Chat: send text ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    const now = Date.now();
    if (now - lastSentAt.current < 6000) {
      const wait = Math.ceil((6000 - (now - lastSentAt.current)) / 1000);
      addMessage({ role: 'ai', text: `Please wait ${wait}s before sending another message.` });
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
      const errMsg = err.response?.status === 429
        ? 'Too many requests — please wait 30 seconds.'
        : 'Could not reach FarmMind AI. Check your connection.';
      addMessage({ role: 'ai', text: `⚠ ${errMsg}` });
    } finally {
      setTyping(false);
    }
  }, [input, typing, conversationId, addMessage, getAIContext]);

  // ── Voice: start recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isProcessing) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Permission', 'Please allow microphone access in settings.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      let lastUpdate = 0;
      recording.setOnRecordingStatusUpdate((s) => {
        const now = Date.now();
        if (s.isRecording && s.metering !== undefined && now - lastUpdate > 90) {
          lastUpdate = now;
          setAudioLevel(Math.max(0, Math.min(1, (s.metering + 60) / 48)));
        }
      });
      recordRef.current = recording;
      setIsRecording(true);
      setVoiceResult(null);
      setRecDur(0);
      setAudioLevel(0);
      recTimerRef.current = setInterval(() => setRecDur(d => d + 1), 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [isProcessing]);

  // ── Voice: stop and send ────────────────────────────────────────────────────
  const stopAndSend = useCallback(async () => {
    if (!recordRef.current) return;
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    setIsProcessing(true);
    setAudioLevel(0);
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
      setVoiceResult({
        error: err.response?.status === 429
          ? 'Rate limit — wait 30s and try again.'
          : 'Processing failed. Try again.',
      });
    } finally {
      setIsProcessing(false);
      setRecDur(0);
    }
  }, [conversationId, addMessage, getAIContext]);

  // ── Voice: cancel ───────────────────────────────────────────────────────────
  const cancelRecording = useCallback(async () => {
    clearInterval(recTimerRef.current);
    if (recordRef.current) {
      try {
        await recordRef.current.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch { /* ignore */ }
      recordRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    setRecDur(0);
    setAudioLevel(0);
  }, []);

  // ── History ─────────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (historyLoading) return;
    setHLoading(true);
    try {
      const [convos, scans] = await Promise.allSettled([getConversations(), getScanSessions()]);
      const convoList = convos.status === 'fulfilled' ? (convos.value || []).map(c => ({ ...c, isScanSession: false })) : [];
      const scanList  = scans.status  === 'fulfilled' ? (scans.value  || []).map(s => ({ ...s, isScanSession: true  })) : [];
      const merged = [...convoList, ...scanList].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setSessions(merged);
      setHLoaded(true);
    } finally {
      setHLoading(false);
    }
  }, [historyLoading]);

  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded) loadHistory();
  }, [activeTab]);

  useEffect(() => {
    if (existingConversationId) {
      getConversationMessages(existingConversationId).then(convo => {
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

  useEffect(() => {
    if (initialMsg) setTimeout(() => sendMessage(initialMsg), 600);
  }, []);

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, typing]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Background gradient orbs */}
      <LinearGradient
        colors={['rgba(34,197,94,0.09)', 'transparent']}
        style={S.orb1}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(20,184,166,0.07)', 'transparent']}
        style={S.orb2}
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.headerAvatar}>
            <Ionicons name="leaf" size={15} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={S.headerTitle}>FarmMind AI</Text>
            <View style={S.onlineRow}>
              <View style={S.onlineDot} />
              <Text style={S.onlineText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Tab Bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — AI CHAT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                <View style={S.aiAvatar}><Ionicons name="leaf" size={14} color={PRIMARY} /></View>
                <View style={S.aiBubble}><TypingDots /></View>
              </View>
            ) : null}
          />

          {/* Suggestion chips */}
          {messages.length <= 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipsList}>
              {['My tomato leaves have brown spots', 'Best fertilizer for wheat', 'PM-KISAN scheme details', 'Mandi price today', 'Pest scouting tips'].map((s, i) => (
                <TouchableOpacity key={i} style={S.chip} onPress={() => sendMessage(s)} activeOpacity={0.7}>
                  <Text style={S.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input bar */}
          <View style={[S.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Fade gradient above input */}
            <LinearGradient colors={['transparent', BG]} style={S.inputFade} pointerEvents="none" />
            <View style={S.inputRow}>
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
              {input.trim() ? (
                <TouchableOpacity style={S.sendBtn} onPress={() => sendMessage()} activeOpacity={0.8}>
                  <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.sendBtnGrad}>
                    <Ionicons name="arrow-up" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={S.voiceBtn}
                  onPress={() => { setActiveTab('voice'); setTimeout(startRecording, 300); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mic" size={20} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — VOICE (full-screen particle sphere)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'voice' && (
        <VoiceParticleView
          isRecording={isRecording}
          isProcessing={isProcessing}
          audioLevel={audioLevel}
          recordDuration={recordDuration}
          voiceResult={voiceResult}
          onStart={startRecording}
          onSend={stopAndSend}
          onCancel={cancelRecording}
          onViewChat={() => setActiveTab('chat')}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <View style={S.loaderWrap}>
              <ActivityIndicator color={PRIMARY} size="large" />
              <Text style={S.loaderText}>Loading history…</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={S.emptyWrap}>
              <LinearGradient colors={[USER_A, USER_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.emptyIcon}>
                <Ionicons name="time" size={32} color="#FFF" />
              </LinearGradient>
              <Text style={S.emptyTitle}>No history yet</Text>
              <Text style={S.emptyMsg}>Your AI chats and crop scans will appear here.</Text>
              <TouchableOpacity style={S.emptyBtn} onPress={() => setActiveTab('chat')} activeOpacity={0.8}>
                <Text style={S.emptyBtnText}>Start a Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={s => s.id}
              contentContainerStyle={S.historyList}
              showsVerticalScrollIndicator={false}
              refreshing={historyLoading}
              onRefresh={loadHistory}
              ListHeaderComponent={
                <Text style={S.historyHeader}>
                  {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
                </Text>
              }
              renderItem={({ item }) => (
                <SessionCard
                  session={item}
                  onPress={() => navigation.push('AIChat', { conversationId: item.id })}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Background orbs
  orb1: { position: 'absolute', top: -80, left: -60, width: 320, height: 320, borderRadius: 160 },
  orb2: { position: 'absolute', bottom: 80, right: -80, width: 280, height: 280, borderRadius: 140 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: GBORDER,
    backgroundColor: 'rgba(7,16,9,0.92)',
  },
  backBtn:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: TEXT },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  onlineText:   { fontSize: 10, color: TEXT2, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7,16,9,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: GBORDER,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative',
  },
  tabIndicator: {
    position: 'absolute', top: 0, left: '15%', right: '15%',
    height: 2, backgroundColor: PRIMARY, borderRadius: 1,
  },
  tabLabel:       { fontSize: 11, color: MUTED, fontWeight: '600' },
  tabLabelActive: { color: PRIMARY },

  // Messages
  msgList: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 8, gap: 10 },

  aiBubbleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 9, marginTop: 2,
    backgroundColor: GLASS, borderWidth: 1, borderColor: GBORDER,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: GLASS, borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12, maxWidth: W * 0.78,
    borderWidth: 1, borderColor: GBORDER,
  },
  aiBubbleText: { fontSize: 14, color: TEXT, lineHeight: 21 },

  userBubbleWrap: { alignItems: 'flex-end', marginBottom: 2 },
  userBubble: {
    borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: W * 0.78,
  },
  voiceTag:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceTagText: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  userBubbleText: { fontSize: 14, color: '#FFF', lineHeight: 20 },

  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY },

  // Diagnosis card
  diagCard: {
    backgroundColor: GLASS, borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: GBORDER, maxWidth: W * 0.78,
  },
  diagHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagSevDot:       { width: 8, height: 8, borderRadius: 4 },
  diagName:         { fontSize: 15, fontWeight: '800', color: TEXT, flex: 1 },
  diagConf:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diagConfText:     { fontSize: 11, fontWeight: '700' },
  diagMeta:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  diagMetaText:     { fontSize: 11, color: MUTED },
  diagDivider:      { height: 1, backgroundColor: GBORDER },
  diagSectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  diagStep:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  diagStepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.15)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  diagStepNumText: { fontSize: 10, color: PRIMARY, fontWeight: '800' },
  diagStepText:    { fontSize: 12, color: TEXT2, lineHeight: 18, flex: 1 },
  diagTip:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: 10 },
  diagTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },
  buyBtn: { borderRadius: 10, overflow: 'hidden', marginTop: 2 },
  buyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // Market card
  mktCard: {
    backgroundColor: GLASS, borderRadius: 16, padding: 14, gap: 8,
    borderWidth: 1, borderColor: GBORDER, maxWidth: W * 0.78,
  },
  mktCrop:    { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
  mktRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mktMandi:   { fontSize: 12, color: MUTED, flex: 1 },
  mktPrice:   { fontSize: 13, fontWeight: '700', color: TEXT },
  mktTip:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: 10, marginTop: 2 },
  mktTipText: { fontSize: 11, color: TEXT2, lineHeight: 16, flex: 1 },

  // Suggestions
  chipsList: { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: GLASS, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: GBORDER,
  },
  chipText: { fontSize: 12, color: TEXT2, fontWeight: '500' },

  // Input bar
  inputBar: { position: 'relative', backgroundColor: 'rgba(7,16,9,0.95)', paddingHorizontal: 14, paddingTop: 10 },
  inputFade: { position: 'absolute', top: -28, left: 0, right: 0, height: 28 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: GLASS, borderRadius: 24,
    borderWidth: 1, borderColor: GBORDER,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  textInput: {
    flex: 1, fontSize: 14, color: TEXT, maxHeight: 100, minHeight: 36,
    paddingVertical: 4,
  },
  sendBtn:  { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  sendBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  voiceBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: GBORDER,
    justifyContent: 'center', alignItems: 'center',
  },

  // Session / history
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: GLASS, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: GBORDER, marginBottom: 10,
  },
  sessionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  sessionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  sessionDot: { width: 6, height: 6, borderRadius: 3 },
  sessionPillText: { fontSize: 11, fontWeight: '600' },
  sessionMeta: { fontSize: 11, color: MUTED },
  historyList: { paddingHorizontal: 16, paddingTop: 12 },
  historyHeader: { fontSize: 12, color: MUTED, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },

  // Loader / empty
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderText: { fontSize: 14, color: TEXT2 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  emptyMsg: { fontSize: 14, color: TEXT2, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    backgroundColor: GLASS, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12,
    borderWidth: 1, borderColor: GBORDER, marginTop: 4,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
});

// ── Voice particle view styles ─────────────────────────────────────────────
const VP = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 32 },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GLASS, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: GBORDER,
  },
  statusPillActive: { borderColor: PRIMARY },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: TEXT },

  resultCard: {
    backgroundColor: GLASS, borderRadius: 20, padding: 16, gap: 4,
    borderWidth: 1, borderColor: GBORDER, maxWidth: W - 48,
  },
  errorText:    { fontSize: 13, color: DANGER, textAlign: 'center' },
  resultRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultTrans:  { fontSize: 13, color: MUTED, flex: 1, lineHeight: 18 },
  resultReply:  { fontSize: 13, color: TEXT, flex: 1, lineHeight: 18 },
  viewChatBtn:  { alignItems: 'flex-end', marginTop: 8 },
  viewChatText: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  controls:   { alignItems: 'center', gap: 12, width: '100%', paddingHorizontal: 32 },
  activeRow:  { flexDirection: 'row', gap: 20, alignItems: 'center' },
  micBtn:     { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  micGrad:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtn:  {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: DANGER,
    justifyContent: 'center', alignItems: 'center',
  },
  sendRecBtn: { borderRadius: 28, overflow: 'hidden', shadowColor: USER_A, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  sendRecGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  sendRecText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  hint: { fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});
