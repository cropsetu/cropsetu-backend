/**
 * AIAssistantHome — FarmMind AI hub
 *
 * Layout:
 *  Header (sparkles + title)
 *  Greeting card (name, location, quick pills)
 *  Ask input → AIChat
 *  Quick Services 4-col (Scan, Chat, Markets, Schemes)
 *  AI TOOLS 2-col grid  ← expanded: 6 tools total
 *  Quick Weather card
 */
import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchWeatherForCurrentLocation } from '../../services/weatherApi';
import FarmProfileBanner from '../../components/FarmProfileBanner';

const { width: W } = Dimensions.get('window');
const GREEN   = '#1A5C2A';
const GREEN_L = 'rgba(26,92,42,0.10)';

// ── Quick services (4-col icon grid) — labels resolved via t() in render ─────
const QUICK_SERVICES = [
  { id: 'scan',    labelKey: 'aiHome.quickServices.scan',    icon: 'scan-circle',         color: '#2ECC71', bg: 'rgba(46,204,113,0.10)',  screen: 'CropScan' },
  { id: 'chat',    labelKey: 'aiHome.quickServices.chat',    icon: 'chatbubble-ellipses', color: '#3498DB', bg: 'rgba(52,152,219,0.10)',  screen: 'AIChat'   },
  { id: 'markets', labelKey: 'aiHome.quickServices.markets', icon: 'trending-up',         color: '#F39C12', bg: 'rgba(243,156,18,0.10)', screen: 'Market'   },
  { id: 'schemes', labelKey: 'aiHome.quickServices.schemes', icon: 'ribbon',              color: '#9B59B6', bg: 'rgba(155,89,182,0.10)', screen: 'Scheme'   },
];

// ── AI Tools (2-col, 4 tools) — labels/descs resolved via t() in render ──────
const AI_TOOLS = [
  { id: 'weather',  icon: 'cloud', color: '#0288D1', bg: 'rgba(2,136,209,0.09)', screen: 'Weather',      badge: null, params: {} },
  { id: 'advisory', icon: 'leaf',  color: GREEN,     bg: GREEN_L,                screen: 'DailyPlanner', badge: null, params: {} },
  { id: 'voice',    icon: 'mic',   color: '#E65100', bg: 'rgba(230,81,0,0.09)', screen: 'AIChat',       badge: 'NEW', params: { voiceMode: true } },
  { id: 'history',  icon: 'time',  color: '#00695C', bg: 'rgba(0,105,92,0.09)', screen: 'AIChat',       badge: null, params: { showScanHistory: true } },
];

// ── ServiceBtn ────────────────────────────────────────────────────────────────
function ServiceBtn({ item, onPress, t }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[S.svcWrap, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        style={S.svcBtn}
        activeOpacity={1}
        onPressIn={() => Animated.spring(sc, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
        onPress={() => onPress(item)}
      >
        <View style={[S.svcIcon, { backgroundColor: item.bg, borderColor: item.color + '33' }]}>
          <Ionicons name={item.icon} size={26} color={item.color} />
        </View>
        <Text style={S.svcLabel}>{t(item.labelKey)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── AIToolCard ────────────────────────────────────────────────────────────────
function AIToolCard({ tool, index, navigation, t }) {
  const sc   = useRef(new Animated.Value(1)).current;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 350, delay: 60 + index * 55, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[
      S.toolCardWrap,
      {
        opacity: anim,
        transform: [
          { scale: sc },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      },
    ]}>
      <TouchableOpacity
        style={S.toolCard}
        activeOpacity={1}
        onPressIn={() => Animated.spring(sc, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
        onPress={() => navigation.navigate(tool.screen, tool.params || {})}
      >
        {/* Badge */}
        {tool.badge && (
          <View style={[S.badge, { backgroundColor: tool.badge === 'NEW' ? '#E65100' : '#1A5C2A' }]}>
            <Text style={S.badgeTxt}>{tool.badge}</Text>
          </View>
        )}

        {/* Icon */}
        <View style={[S.toolIconWrap, { backgroundColor: tool.bg }]}>
          <Ionicons name={tool.icon + '-outline'} size={22} color={tool.color} />
        </View>

        {/* Text */}
        <Text style={S.toolTitle}>{t(`aiHome.tools.${tool.id}.label`)}</Text>
        <Text style={S.toolDesc}>{t(`aiHome.tools.${tool.id}.desc`)}</Text>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={14} color="#C4C4C4" style={S.toolArrow} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AIAssistantHome({ navigation, embeddedInHub }) {
  const { user } = useAuth();
  const { t, language }    = useLanguage();

  const headerAnim = useRef(new Animated.Value(0)).current;

  // ── Live weather state ────────────────────────────────────────────────────
  const [wxData, setWxData] = useState(null);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Load weather — use cache-first so it's instant
    fetchWeatherForCurrentLocation({
      lang: language === 'hi' ? 'hi' : 'en',
      onCacheHit: ({ data }) => { if (data?.current) setWxData(data); },
    }).then(result => {
      if (result?.data?.current) setWxData(result.data);
    }).catch(() => {});
  }, []);

  const handleService = (item) => {
    if (item.screen) navigation.navigate(item.screen, item.params || {});
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View style={[
          S.headerRow,
          embeddedInHub && { paddingTop: 12 },
          { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
        ]}>
          <View style={S.brandIconWrap}>
            <Ionicons name="sparkles" size={20} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.headerTitle}>{t('aiHome.title')}</Text>
            <Text style={S.headerSub}>{t('aiHome.subtitle')}</Text>
          </View>
        </Animated.View>

        {/* ── Ask input ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={S.askBtn} activeOpacity={0.85} onPress={() => navigation.navigate('AIChat')}>
          <Ionicons name="sparkles-outline" size={16} color="#9CA3AF" />
          <Text style={S.askPlaceholder}>{t('aiHome.askPlaceholder')}</Text>
          <View style={S.askMic}>
            <Ionicons name="mic" size={16} color={GREEN} />
          </View>
        </TouchableOpacity>

        {/* ── Farm Profile Banner ────────────────────────────────────────── */}
        <FarmProfileBanner
          style={S.farmBanner}
          onEdit={() => navigation.navigate('Account')}
        />

        {/* ── Quick Services ─────────────────────────────────────────────── */}
        <View style={S.svcGrid}>
          {QUICK_SERVICES.map(item => (
            <ServiceBtn key={item.id} item={item} onPress={handleService} t={t} />
          ))}
        </View>

        {/* ── AI Tools section ───────────────────────────────────────────── */}
        <View style={S.sectionHeader}>
          <View style={[S.sectionDot, { backgroundColor: GREEN }]} />
          <Text style={S.sectionTitle}>{t('aiHome.aiTools')}</Text>
          <View style={S.newBadge}>
            <Text style={S.newBadgeTxt}>{t('aiHome.newBadge', { count: '1' })}</Text>
          </View>
        </View>

        {/* 2-column grid — 3 rows */}
        <View style={S.toolsGrid}>
          {AI_TOOLS.map((tool, i) => (
            <AIToolCard key={tool.id} tool={tool} index={i} navigation={navigation} t={t} />
          ))}
        </View>

        {/* ── Quick Weather card ─────────────────────────────────────────── */}
        <TouchableOpacity style={S.weatherCard} activeOpacity={0.88} onPress={() => navigation.navigate('Weather')}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F4FF', '#BAE6FD', '#7DD3FC']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={S.wxGradient}
          >

          {/* Row 1 — location + open arrow */}
          <View style={S.wxTopRow}>
            <Ionicons name="location-outline" size={11} color="#01579B" />
            <Text style={S.wxLocation} numberOfLines={1}>
              {wxData?.meta?.location?.name || user?.district || user?.city || '—'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#0277BD" />
          </View>

          {/* Row 2 — big temp + icon */}
          <View style={S.wxMidRow}>
            <Text style={S.wxTemp}>
              {wxData?.current?.temperature != null ? `${wxData.current.temperature}°` : '—'}
            </Text>
            <View style={S.wxIconWrap}>
              <Ionicons
                name={wxData?.current?.conditionIcon ? `${wxData.current.conditionIcon}` : 'partly-sunny'}
                size={44}
                color="#F57F17"
              />
            </View>
          </View>

          {/* Row 3 — condition label */}
          <Text style={S.wxCondition}>
            {wxData?.current?.condition || t('aiHome.partlyCloudy')}
          </Text>

          {/* Row 4 — stat pills */}
          <View style={S.wxStatRow}>
            <View style={S.wxStatPill}>
              <Ionicons name="water-outline" size={11} color="#01579B" />
              <Text style={S.wxStatTxt}>{wxData?.current?.humidity ?? '—'}%</Text>
            </View>
            <View style={S.wxStatPill}>
              <Ionicons name="navigate-outline" size={11} color="#01579B" />
              <Text style={S.wxStatTxt}>{wxData?.current?.windSpeed ?? '—'} km/h</Text>
            </View>
            <View style={S.wxStatPill}>
              <Ionicons name="sunny-outline" size={11} color="#01579B" />
              <Text style={S.wxStatTxt}>UV {wxData?.current?.uvIndex ?? '—'}</Text>
            </View>
            <View style={[S.wxStatPill, {
              backgroundColor: wxData?.current?.isStorm ? 'rgba(183,28,28,0.20)'
                             : wxData?.current?.isRain  ? 'rgba(1,87,155,0.20)'
                             : 'rgba(27,94,32,0.20)',
            }]}>
              <Ionicons
                name={wxData?.current?.isStorm ? 'thunderstorm-outline' : wxData?.current?.isRain ? 'rainy-outline' : 'leaf-outline'}
                size={11} color="#01579B"
              />
              <Text style={S.wxStatTxt}>
                {wxData?.current?.isStorm
                  ? (language === 'hi' ? 'तूफान' : 'Storm')
                  : wxData?.current?.isRain
                  ? (language === 'hi' ? 'बारिश' : 'Rain')
                  : t('aiHome.goodForSowing')}
              </Text>
            </View>
          </View>

          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F3F0' },
  scroll: { paddingBottom: 48 },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: 18, paddingBottom: 16,
  },
  brandIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GREEN_L, borderWidth: 1, borderColor: GREEN + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  headerSub:   { fontSize: 10, color: '#9CA3AF', marginTop: 1 },

  // Greeting
  greetCard: {
    marginHorizontal: 18, marginBottom: 14,
    backgroundColor: 'rgba(26,92,42,0.04)',
    borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: GREEN + '28',
    gap: 14,
    shadowColor: GREEN, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  greetTop:    { flexDirection: 'row', alignItems: 'flex-start' },
  greetHi:     { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  greetMeta:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  greetMetaTxt:{ fontSize: 12, color: '#6B7280' },
  greetMetaDot:{ fontSize: 12, color: '#9CA3AF' },
  greetCropTxt:{ fontSize: 12, color: GREEN, fontWeight: '700' },
  pillRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10, borderWidth: 1, borderColor: GREEN + '30',
  },
  pillTxt: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  // Ask input
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 18, marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E5E8E5',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  askPlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  askMic: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: GREEN_L,
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick services
  farmBanner: {
    marginHorizontal: 18,
    marginBottom: 14,
  },

  svcGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 6,
  },
  svcWrap: { alignItems: 'center', width: (W - 36 - 24) / 4 },
  svcBtn:  { alignItems: 'center', gap: 7 },
  svcIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  svcLabel: { fontSize: 10, color: '#1A1A1A', fontWeight: '600', textAlign: 'center' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 18, marginTop: 22, marginBottom: 12,
  },
  sectionDot:   { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase', flex: 1,
  },
  newBadge: {
    backgroundColor: '#E65100', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  newBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#FFF' },

  // AI tools — 2-column grid
  toolsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: 18, gap: 10,
  },
  toolCardWrap: { width: (W - 36 - 10) / 2 },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E5E8E5',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    minHeight: 110,
  },
  badge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeTxt: { fontSize: 8, fontWeight: '900', color: '#FFF' },
  toolIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  toolTitle:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  toolDesc:   { fontSize: 11, color: '#8A8A8A', lineHeight: 15 },
  toolArrow:  { position: 'absolute', bottom: 12, right: 12 },

  // Weather card — sky gradient light theme
  weatherCard: {
    marginHorizontal: 18, marginTop: 20, borderRadius: 22, overflow: 'hidden',
    shadowColor: '#7DD3FC', shadowOpacity: 0.40, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  wxGradient: { borderRadius: 22, padding: 18 },
  wxTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14,
  },
  wxLocation: {
    flex: 1, fontSize: 11, fontWeight: '700',
    color: '#01579B', letterSpacing: 0.4,
  },
  wxMidRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  wxTemp: {
    fontSize: 56, fontWeight: '900', color: '#01579B', lineHeight: 58,
  },
  wxIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  wxCondition: {
    fontSize: 14, color: '#0277BD', fontWeight: '600', marginBottom: 16,
  },
  wxStatRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  wxStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.40)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  wxStatTxt: { fontSize: 11, color: '#01579B', fontWeight: '700' },
});
