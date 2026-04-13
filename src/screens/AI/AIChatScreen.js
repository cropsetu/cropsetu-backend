import { useRef, useEffect, useState, useCallback } from 'react';
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
const GREEN = '#2ECC71';

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
        Animated.delay(i * 160),
        Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(500),
      ]))
    );
    Animated.parallel(anims).start();
  }, []);
  return (
    <View style={C.typingWrap}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[C.dot, {
          transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
          opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        }]} />
      ))}
    </View>
  );
}

function DiagnosisCard({ data, onBuyMedicine, t }) {
  const sevColor = { low: '#2ECC71', moderate: '#F39C12', high: '#E74C3C', critical: '#C0392B' }[data.severity] || '#888';
  return (
    <View style={C.diagCard}>
      <View style={C.diagHeader}>
        <View style={[C.diagSevDot, { backgroundColor: sevColor }]} />
        <Text style={C.diagName}>{data.disease || data.name}</Text>
        <View style={[C.diagConf, { backgroundColor: `${sevColor}18` }]}>
          <Text style={[C.diagConfText, { color: sevColor }]}>{data.confidence}% match</Text>
        </View>
      </View>
      <View style={C.diagMeta}>
        <Ionicons name="leaf-outline" size={12} color="#888" />
        <Text style={C.diagMetaText}>{data.crop} · {data.severity}</Text>
      </View>
      <View style={C.diagDivider} />
      <Text style={C.diagSectionLabel}>Treatment Plan</Text>
      {(data.treatment || []).map((step, i) => (
        <View key={i} style={C.diagStep}>
          <View style={C.diagStepNum}><Text style={C.diagStepNumText}>{i + 1}</Text></View>
          <Text style={C.diagStepText}>{typeof step === 'string' ? step : step.action}</Text>
        </View>
      ))}
      {data.prevention && (
        <View style={C.diagTip}>
          <Ionicons name="shield-checkmark-outline" size={12} color="#2ECC71" />
          <Text style={C.diagTipText}>{data.prevention}</Text>
        </View>
      )}
      <TouchableOpacity style={C.buyBtn} onPress={onBuyMedicine} activeOpacity={0.8}>
        <Ionicons name="cart-outline" size={14} color="#FFF" />
        <Text style={C.buyBtnText}>Buy Products</Text>
      </TouchableOpacity>
    </View>
  );
}

function MarketCard({ data }) {
  return (
    <View style={C.mktCard}>
      <Text style={C.mktCrop}>{data.crop} Prices Today</Text>
      {(data.prices || []).map((p, i) => (
        <View key={i} style={C.mktRow}>
          <Text style={C.mktMandi}>{p.mandi}</Text>
          <Text style={C.mktPrice}>₹{(p.price || 0).toLocaleString()}</Text>
        </View>
      ))}
      {data.insight && (
        <View style={C.mktTip}>
          <Ionicons name="bulb-outline" size={12} color="#F39C12" />
          <Text style={C.mktTipText}>{data.insight}</Text>
        </View>
      )}
    </View>
  );
}

function MessageBubble({ msg, onBuyMedicine, t }) {
  const isUser = msg.role === 'user';
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
      <View style={C.userBubbleWrap}>
        <View style={C.userBubble}>
          {msg.isVoice && (
            <View style={C.voiceTag}>
              <Ionicons name="mic" size={10} color="rgba(255,255,255,0.7)" />
              <Text style={C.voiceTagText}>voice</Text>
            </View>
          )}
          <Text style={C.userBubbleText}>{msg.transcribing ? '...' : msg.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={C.aiBubbleWrap}>
      <View style={C.aiAvatar}>
        <Ionicons name="hardware-chip" size={14} color={GREEN} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {msg.text && (
          <View style={C.aiBubble}>
            <Text style={C.aiBubbleText}>{formatText(msg.text)}</Text>
          </View>
        )}
        {msg.diagnosisData && <DiagnosisCard data={msg.diagnosisData} onBuyMedicine={onBuyMedicine} t={t} />}
        {msg.marketData && <MarketCard data={msg.marketData} />}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Voice Orb (Siri-style plasma sphere)
// ─────────────────────────────────────────────────────────────────────────────
const SPHERE_D = 160;
const BLOBS = [
  { w: 98,  h: 158, c: '#1DB954', dur: 3200, ccw: false, tx: -10, ty:   8, op: 0.62 },
  { w: 76,  h: 142, c: '#00E5AA', dur: 2500, ccw: true,  tx:  15, ty: -11, op: 0.55 },
  { w: 124, h:  82, c: '#0D9E6E', dur: 4400, ccw: false, tx:   0, ty:  14, op: 0.70 },
  { w: 52,  h: 126, c: '#7CFFA0', dur: 1900, ccw: true,  tx: -19, ty: -17, op: 0.36 },
  { w: 90,  h: 102, c: '#003D20', dur: 5800, ccw: false, tx:  13, ty:  -7, op: 0.84 },
];

function VoiceOrb({ active, processing, audioLevel }) {
  const rotAnims = useRef(BLOBS.map(() => new Animated.Value(0))).current;
  const ampAnim  = useRef(new Animated.Value(0.82)).current;
  const coreAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const rotLoops = rotAnims.map((anim, i) =>
      Animated.loop(Animated.timing(anim, { toValue: 1, duration: BLOBS[i].dur, useNativeDriver: true, easing: Easing.linear }))
    );
    const coreLoop = Animated.loop(Animated.sequence([
      Animated.timing(coreAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
      Animated.timing(coreAnim, { toValue: 0.70, duration: 900, useNativeDriver: true }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1.08, duration: 1300, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 1.00, duration: 1300, useNativeDriver: true }),
    ]));
    rotLoops.forEach(l => l.start());
    coreLoop.start();
    glowLoop.start();
    return () => { rotLoops.forEach(l => l.stop()); coreLoop.stop(); glowLoop.stop(); };
  }, [active]);

  useEffect(() => {
    Animated.spring(ampAnim, {
      toValue: processing ? 0.95 : Math.max(0.80, Math.min(1.35, 0.80 + audioLevel * 0.58)),
      useNativeDriver: true, speed: 22, bounciness: 4,
    }).start();
  }, [audioLevel, processing]);

  return (
    <Animated.View style={[O.outerHalo, { transform: [{ scale: glowAnim }] }]}>
      <View style={O.sphere}>
        <View style={O.sphereBase} />
        {BLOBS.map((b, i) => {
          const rot = rotAnims[i].interpolate({ inputRange: [0, 1], outputRange: b.ccw ? ['0deg', '-360deg'] : ['0deg', '360deg'] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute', width: b.w, height: b.h, borderRadius: 200,
              backgroundColor: b.c, opacity: active ? b.op : b.op * 0.3,
              transform: [{ translateX: b.tx }, { translateY: b.ty }, { rotate: rot }, { scale: ampAnim }],
            }} />
          );
        })}
        <Animated.View style={[O.coreGlow, { transform: [{ scale: Animated.multiply(coreAnim, ampAnim) }] }]} />
        <View style={O.shine} />
        {processing && (
          <View style={O.processingOverlay}>
            <ActivityIndicator color="#FFF" size="small" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── History session card
// ─────────────────────────────────────────────────────────────────────────────
function SessionCard({ session, onPress }) {
  const isScan    = session.isScanSession;
  const report    = session.scanReports?.[0];
  const riskColor = { LOW: '#2ECC71', MODERATE: '#F39C12', HIGH: '#E74C3C', CRITICAL: '#C0392B' }[report?.riskLevel] || '#888';
  const date      = new Date(session.updatedAt || session.createdAt);
  const dateStr   = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr   = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={H2.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[H2.iconBox, { backgroundColor: isScan ? 'rgba(46,204,113,0.12)' : 'rgba(52,152,219,0.12)' }]}>
        <Ionicons name={isScan ? 'scan-outline' : 'chatbubble-ellipses-outline'} size={20} color={isScan ? GREEN : '#3498DB'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={H2.title} numberOfLines={1}>{session.title || 'AI Chat'}</Text>
        {report && (
          <View style={H2.pill}>
            <View style={[H2.dot, { backgroundColor: riskColor }]} />
            <Text style={[H2.pillText, { color: riskColor }]}>{report.riskLevel} · {Math.round((report.confidenceScore || 0) * 100)}% conf</Text>
          </View>
        )}
        <Text style={H2.meta}>{dateStr} · {timeStr} · {session._count?.messages || session.messages?.length || 0} msgs</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Tab bar
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'chat',    label: 'AI Chat',    icon: 'chatbubble-ellipses' },
  { id: 'voice',   label: 'Voice',      icon: 'mic' },
  { id: 'history', label: 'History',    icon: 'time' },
];

function TabBar({ active, onChange }) {
  return (
    <View style={TB.bar}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={TB.tab} onPress={() => onChange(tab.id)} activeOpacity={0.75}>
            <Ionicons name={isActive ? tab.icon : `${tab.icon}-outline`} size={18} color={isActive ? GREEN : '#9CA3AF'} />
            <Text style={[TB.label, isActive && TB.labelActive]}>{tab.label}</Text>
            {isActive && <View style={TB.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChatScreen({ navigation, route }) {
  const insets  = useSafeAreaInsets();
  const { getAIContext } = useFarm();
  const { t }   = useLanguage();

  const initialMsg             = route?.params?.initialMessage;
  const existingConversationId = route?.params?.conversationId;
  const startTab               = route?.params?.voiceMode ? 'voice' : (route?.params?.showHistory || route?.params?.showScanHistory) ? 'history' : 'chat';

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(startTab);

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages]       = useState([{ id: '0', role: 'ai', text: 'Hello! I am FarmMind AI. Ask me anything about your crops, diseases, mandi prices, or farming schemes.' }]);
  const [input, setInput]             = useState('');
  const [typing, setTyping]           = useState(false);
  const [conversationId, setConvId]   = useState(existingConversationId || null);
  const flatRef    = useRef(null);
  const lastSentAt = useRef(0);

  // ── Voice state ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordDuration, setRecDur]     = useState(0);
  const [audioLevel, setAudioLevel]     = useState(0);
  const [voiceResult, setVoiceResult]   = useState(null); // { transcription, reply, type, card }
  const recordRef   = useRef(null);
  const recTimerRef = useRef(null);

  // ── History state ───────────────────────────────────────────────────────────
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
      addMessage({ role: 'ai', text: `⚠️ ${errMsg}` });
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

      // Also add to chat tab so the conversation is preserved
      addMessage({ role: 'user', text: result.transcription || '(voice)', isVoice: true });
      const aiMsg = { role: 'ai', text: result.reply };
      if (result.type === 'diagnosis' && result.card) aiMsg.diagnosisData = result.card;
      if (result.type === 'market'    && result.card) aiMsg.marketData    = result.card;
      addMessage(aiMsg);
    } catch (err) {
      recordRef.current = null;
      setVoiceResult({ error: err.response?.status === 429 ? 'Rate limit — wait 30s and try again.' : 'Processing failed. Try again.' });
    } finally {
      setIsProcessing(false);
      setRecDur(0);
    }
  }, [conversationId, addMessage, getAIContext]);

  // ── Voice: cancel ───────────────────────────────────────────────────────────
  const cancelRecording = useCallback(async () => {
    clearInterval(recTimerRef.current);
    if (recordRef.current) {
      try { await recordRef.current.stopAndUnloadAsync(); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch { /* ignore */ }
      recordRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    setRecDur(0);
    setAudioLevel(0);
  }, []);

  // ── History: load sessions ──────────────────────────────────────────────────
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

  // ── Load existing conversation ──────────────────────────────────────────────
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

  // ── Format voice timer ──────────────────────────────────────────────────────
  const mins = Math.floor(recordDuration / 60).toString().padStart(2, '0');
  const secs = (recordDuration % 60).toString().padStart(2, '0');

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={[C.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={C.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={C.headerCenter}>
          <View style={C.headerAvatar}>
            <Ionicons name="hardware-chip" size={16} color={GREEN} />
          </View>
          <View>
            <Text style={C.headerTitle}>FarmMind AI</Text>
            <View style={C.onlineRow}>
              <View style={C.onlineDot} />
              <Text style={C.onlineText}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Tab bar ── */}
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
            contentContainerStyle={C.msgList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MessageBubble msg={item} onBuyMedicine={() => navigation.navigate('AgriStore')} t={t} />
            )}
            ListFooterComponent={typing ? (
              <View style={C.aiBubbleWrap}>
                <View style={C.aiAvatar}><Ionicons name="hardware-chip" size={14} color={GREEN} /></View>
                <View style={C.aiBubble}><TypingDots /></View>
              </View>
            ) : null}
          />

          {/* Quick suggestion chips */}
          {messages.length <= 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={C.chipsList}>
              {['My tomato leaves have brown spots', 'Best fertilizer for wheat', 'PM-KISAN scheme details', 'Mandi price today', 'Pest scouting tips'].map((s, i) => (
                <TouchableOpacity key={i} style={C.chip} onPress={() => sendMessage(s)} activeOpacity={0.7}>
                  <Text style={C.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input bar — text + voice only, NO camera */}
          <View style={[C.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TextInput
              style={C.textInput}
              placeholder="Ask about crops, diseases, prices…"
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit
            />
            {input.trim() ? (
              <TouchableOpacity style={C.sendBtn} onPress={() => sendMessage()} activeOpacity={0.8}>
                <Ionicons name="arrow-up" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={C.voiceBtn} onPress={() => { setActiveTab('voice'); setTimeout(startRecording, 300); }} activeOpacity={0.8}>
                <Ionicons name="mic" size={20} color={GREEN} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — VOICE ASSISTANT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'voice' && (
        <View style={VT.root}>
          <LinearGradient colors={['#F0FAF4', '#E8F5EC', '#F0FAF4']} style={StyleSheet.absoluteFill} />

          {/* Status */}
          <View style={VT.statusArea}>
            <View style={[VT.statusPill, { borderColor: isRecording ? '#2ECC71' : '#E5E7EB' }]}>
              <View style={[VT.statusDot, { backgroundColor: isProcessing ? '#F39C12' : isRecording ? '#2ECC71' : '#CBD5E1' }]} />
              <Text style={VT.statusLabel}>
                {isProcessing ? 'Analyzing…' : isRecording ? 'Listening…' : 'Tap mic to speak'}
              </Text>
            </View>
            {isRecording && <Text style={VT.timer}>{mins}:{secs}</Text>}
          </View>

          {/* Orb */}
          <View style={VT.orbArea}>
            <VoiceOrb active={isRecording || isProcessing} processing={isProcessing} audioLevel={audioLevel} />

            {/* Audio level bars */}
            {isRecording && (
              <View style={VT.levelRow}>
                {Array.from({ length: 18 }, (_, i) => (
                  <View key={i} style={[VT.levelBar, {
                    height:  3 + Math.sin((i / 17) * Math.PI) * 13,
                    opacity: audioLevel > i / 18 ? 0.85 : 0.15,
                  }]} />
                ))}
              </View>
            )}
          </View>

          {/* Controls */}
          <View style={VT.controls}>
            {!isRecording && !isProcessing ? (
              <TouchableOpacity style={VT.recordBtn} onPress={startRecording} activeOpacity={0.8}>
                <Ionicons name="mic" size={32} color="#FFF" />
              </TouchableOpacity>
            ) : isRecording ? (
              <View style={VT.activeControls}>
                <TouchableOpacity style={VT.cancelBtn} onPress={cancelRecording} activeOpacity={0.8}>
                  <Ionicons name="close" size={22} color="#E74C3C" />
                </TouchableOpacity>
                <TouchableOpacity style={VT.sendBtn} onPress={stopAndSend} activeOpacity={0.8}>
                  <Ionicons name="arrow-up" size={22} color="#FFF" />
                  <Text style={VT.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator color={GREEN} size="large" />
            )}
            <Text style={VT.hint}>
              {!isRecording && !isProcessing ? 'Speak in Hindi, Marathi, English or any Indian language' : isRecording ? 'Tap send when done, or cancel' : 'Processing your voice…'}
            </Text>
          </View>

          {/* Last voice result */}
          {voiceResult && !isRecording && !isProcessing && (
            <View style={VT.resultCard}>
              {voiceResult.error ? (
                <Text style={VT.errorText}>⚠️ {voiceResult.error}</Text>
              ) : (
                <>
                  <View style={VT.resultRow}>
                    <Ionicons name="mic-outline" size={13} color="#6B7280" />
                    <Text style={VT.resultTranscription} numberOfLines={2}>{voiceResult.transcription}</Text>
                  </View>
                  <View style={[VT.resultRow, { marginTop: 8 }]}>
                    <Ionicons name="hardware-chip-outline" size={13} color={GREEN} />
                    <Text style={VT.resultReply} numberOfLines={4}>{voiceResult.reply}</Text>
                  </View>
                  <TouchableOpacity style={VT.viewChatBtn} onPress={() => setActiveTab('chat')} activeOpacity={0.8}>
                    <Text style={VT.viewChatText}>View full reply in Chat →</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — SCAN / CHAT HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <View style={H2.loader}>
              <ActivityIndicator color={GREEN} size="large" />
              <Text style={H2.loaderText}>Loading history…</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={H2.empty}>
              <Ionicons name="time-outline" size={48} color="#CBD5E1" />
              <Text style={H2.emptyTitle}>No history yet</Text>
              <Text style={H2.emptyMsg}>Your AI chats and crop scans will appear here.</Text>
              <TouchableOpacity style={H2.startBtn} onPress={() => setActiveTab('chat')} activeOpacity={0.8}>
                <Text style={H2.startBtnText}>Start a Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={s => s.id}
              contentContainerStyle={H2.list}
              showsVerticalScrollIndicator={false}
              refreshing={historyLoading}
              onRefresh={loadHistory}
              ListHeaderComponent={
                <Text style={H2.sectionLabel}>
                  {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
                </Text>
              }
              renderItem={({ item }) => (
                <SessionCard
                  session={item}
                  onPress={() => {
                    if (item.isScanSession) {
                      // Open scan session — for now open as regular chat with conversationId
                      navigation.push('AIChat', { conversationId: item.id });
                    } else {
                      navigation.push('AIChat', { conversationId: item.id });
                    }
                  }}
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

const C = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn:      { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(46,204,113,0.12)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  onlineRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  onlineText:  { fontSize: 10, color: GREEN, fontWeight: '500' },

  msgList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },

  userBubbleWrap: { alignItems: 'flex-end', marginBottom: 4 },
  userBubble: {
    backgroundColor: '#2D9162', borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: W * 0.78,
  },
  voiceTag:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceTagText: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.5 },
  userBubbleText: { fontSize: 14, color: '#FFF', lineHeight: 20 },

  aiBubbleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 9, marginTop: 2,
    backgroundColor: 'rgba(46,204,113,0.12)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: '#FFF', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 12, maxWidth: W * 0.78,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  aiBubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 21 },

  typingWrap: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 20, paddingVertical: 4 },
  dot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },

  diagCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', maxWidth: W * 0.78,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  diagHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagSevDot:       { width: 8, height: 8, borderRadius: 4 },
  diagName:         { fontSize: 15, fontWeight: '800', color: '#1E293B', flex: 1 },
  diagConf:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diagConfText:     { fontSize: 11, fontWeight: '700' },
  diagMeta:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  diagMetaText:     { fontSize: 11, color: '#9CA3AF' },
  diagDivider:      { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  diagSectionLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' },
  diagStep:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  diagStepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(46,204,113,0.15)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1,
  },
  diagStepNumText: { fontSize: 10, color: GREEN, fontWeight: '800' },
  diagStepText:    { fontSize: 12, color: '#6B7280', lineHeight: 18, flex: 1 },
  diagTip:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 8, padding: 10 },
  diagTipText:     { fontSize: 11, color: '#6B7280', lineHeight: 16, flex: 1 },
  buyBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 10, marginTop: 2 },
  buyBtnText:      { fontSize: 13, fontWeight: '800', color: '#FFF' },

  mktCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', maxWidth: W * 0.78,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  mktCrop:    { fontSize: 13, fontWeight: '800', color: '#F39C12' },
  mktRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mktMandi:   { fontSize: 12, color: '#6B7280', flex: 1 },
  mktPrice:   { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  mktTip:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(243,156,18,0.08)', borderRadius: 8, padding: 10, marginTop: 2 },
  mktTipText: { fontSize: 11, color: '#6B7280', lineHeight: 16, flex: 1 },

  chipsList:  { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip:       { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  chipText:   { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#1E293B', maxHeight: 100, minHeight: 40,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  voiceBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46,204,113,0.12)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
});

// Tab bar
const TB = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative',
  },
  label:       { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  labelActive: { color: GREEN },
  indicator:   { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, backgroundColor: GREEN, borderRadius: 2 },
});

// Voice tab
const VT = StyleSheet.create({
  root:        { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 32 },
  statusArea:  { alignItems: 'center', paddingTop: 28, gap: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  timer:       { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: 2 },

  orbArea:  { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 30 },
  levelBar: { width: 3, borderRadius: 3, backgroundColor: GREEN },

  controls:       { alignItems: 'center', gap: 12, width: '100%', paddingHorizontal: 32 },
  recordBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: GREEN, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  activeControls: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  cancelBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(231,76,60,0.12)',
    borderWidth: 1.5, borderColor: '#E74C3C', justifyContent: 'center', alignItems: 'center',
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 14,
    shadowColor: GREEN, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  sendBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  hint:        { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },

  resultCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginHorizontal: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  resultRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultTranscription:{ fontSize: 12, color: '#6B7280', flex: 1, fontStyle: 'italic', lineHeight: 18 },
  resultReply:        { fontSize: 13, color: '#1E293B', flex: 1, lineHeight: 19 },
  errorText:          { fontSize: 13, color: '#E74C3C' },
  viewChatBtn:        { marginTop: 10, alignSelf: 'flex-end' },
  viewChatText:       { fontSize: 12, color: GREEN, fontWeight: '700' },
});

// History tab
const H2 = StyleSheet.create({
  list:        { padding: 16, gap: 10 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  iconBox:   { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title:     { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  pillText:  { fontSize: 11, fontWeight: '600' },
  meta:      { fontSize: 11, color: '#9CA3AF' },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText:{ fontSize: 13, color: '#9CA3AF' },
  empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle:{ fontSize: 18, fontWeight: '800', color: '#1E293B' },
  emptyMsg:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  startBtn:  { marginTop: 8, backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});

// Voice orb
const O = StyleSheet.create({
  outerHalo: {
    width: SPHERE_D + 40, height: SPHERE_D + 40, borderRadius: (SPHERE_D + 40) / 2,
    backgroundColor: 'rgba(29,185,84,0.06)', borderWidth: 1, borderColor: 'rgba(29,185,84,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  sphere: {
    width: SPHERE_D, height: SPHERE_D, borderRadius: SPHERE_D / 2,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  sphereBase: { ...StyleSheet.absoluteFillObject, backgroundColor: '#021208' },
  coreGlow: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#FFF', shadowOpacity: 0.9, shadowRadius: 16,
  },
  shine: {
    position: 'absolute', top: 14, left: 18, width: 38, height: 22,
    borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '-28deg' }],
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
});
