import { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Dimensions, Animated, StatusBar, ActivityIndicator, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { getMarketPrices, getMarketCrops, getMarketPrediction, getExtendedForecast } from '../../services/aiApi';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#F5F6FA';
const CARD   = '#FFFFFF';
const GREEN  = '#16A34A';
const GREEN_L= '#22C55E';
const PURPLE = '#7C3AED';
const AMBER  = '#D97706';
const RED    = '#DC2626';
const BLUE   = '#2563EB';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

const CARD_MARGIN  = 16;
const CARD_PADDING = 16;
const CHART_W      = W - CARD_MARGIN * 2 - CARD_PADDING * 2;

const DEFAULT_CROP = 'Tomato';
const PERIODS = [
  { key: '7d',  label: '7D'  },
  { key: '3m',  label: '3M'  },
  { key: '6m',  label: '6M'  },
  { key: '12m', label: '1Y'  },
];

// ── All Indian crops by category ──────────────────────────────────────────────
const CROP_CATEGORIES = [
  {
    key: 'all', label: 'All', icon: 'apps', color: SLATE,
    crops: [],   // filled dynamically
  },
  {
    key: 'veg', label: 'Vegetables', icon: 'leaf', color: '#16A34A',
    crops: [
      'Tomato','Onion','Potato','Brinjal','Cauliflower','Cabbage',
      'Okra','Bitter Gourd','Capsicum','Cucumber','Bottle Gourd',
      'Pumpkin','Carrot','Radish','Spinach','Green Chilli',
      'Garlic','Ginger','Coriander','Fenugreek','Sweet Potato','Peas',
    ],
  },
  {
    key: 'fruit', label: 'Fruits', icon: 'nutrition', color: '#EA580C',
    crops: [
      'Mango','Banana','Grapes','Pomegranate','Guava','Papaya',
      'Watermelon','Muskmelon','Orange','Lemon','Apple','Sapota',
      'Pineapple','Litchi','Coconut',
    ],
  },
  {
    key: 'cereal', label: 'Cereals', icon: 'grid', color: '#B45309',
    crops: ['Wheat','Rice','Maize','Bajra','Jowar','Barley','Ragi'],
  },
  {
    key: 'pulse', label: 'Pulses', icon: 'ellipse', color: '#92400E',
    crops: ['Tur Dal','Gram','Moong','Urad','Masoor'],
  },
  {
    key: 'oil', label: 'Oilseeds', icon: 'water', color: '#CA8A04',
    crops: ['Soybean','Groundnut','Sunflower','Mustard','Sesame','Castor'],
  },
  {
    key: 'cash', label: 'Cash Crops', icon: 'cash', color: '#7C3AED',
    crops: ['Cotton','Sugarcane','Jute'],
  },
  {
    key: 'spice', label: 'Spices', icon: 'flame', color: '#DC2626',
    crops: ['Turmeric','Red Chilli','Cumin','Coriander Seeds','Cardamom','Black Pepper','Ajwain','Fennel'],
  },
];

// Flat list of all crops for search
const ALL_CROPS = CROP_CATEGORIES.filter(c => c.key !== 'all').flatMap(c => c.crops);
CROP_CATEGORIES[0].crops = ALL_CROPS;

// ── Mandi coordinates ─────────────────────────────────────────────────────────
const MANDI_COORDS = {
  'Nashik':                   { lat: 19.9975, lon: 73.7898 },
  'Pune':                     { lat: 18.5204, lon: 73.8567 },
  'Mumbai (Vashi)':           { lat: 19.0760, lon: 72.8777 },
  'Aurangabad':               { lat: 19.8762, lon: 75.3433 },
  'Kolhapur':                 { lat: 16.7050, lon: 74.2433 },
  'Ludhiana':                 { lat: 30.9010, lon: 75.8573 },
  'Amritsar':                 { lat: 31.6340, lon: 74.8723 },
  'Jalandhar':                { lat: 31.3260, lon: 75.5762 },
  'Patiala':                  { lat: 30.3398, lon: 76.3869 },
  'Bathinda':                 { lat: 30.2110, lon: 74.9455 },
  'Lucknow':                  { lat: 26.8467, lon: 80.9462 },
  'Agra':                     { lat: 27.1767, lon: 78.0081 },
  'Kanpur':                   { lat: 26.4499, lon: 80.3319 },
  'Varanasi':                 { lat: 25.3176, lon: 82.9739 },
  'Mathura':                  { lat: 27.4924, lon: 77.6737 },
  'Bangalore (Yeshwanthpur)': { lat: 13.0000, lon: 77.5500 },
  'Hubli':                    { lat: 15.3647, lon: 75.1240 },
  'Mysore':                   { lat: 12.2958, lon: 76.6394 },
  'Davangere':                { lat: 14.4644, lon: 75.9218 },
  'Kurnool':                  { lat: 15.8281, lon: 78.0373 },
  'Guntur':                   { lat: 16.3067, lon: 80.4365 },
  'Ahmedabad':                { lat: 23.0225, lon: 72.5714 },
  'Surat':                    { lat: 21.1702, lon: 72.8311 },
  'Jaipur':                   { lat: 26.9124, lon: 75.7873 },
  'Indore':                   { lat: 22.7196, lon: 75.8577 },
};

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function addDistances(prices, userLat, userLon) {
  return prices.map(p => {
    const name  = p.mandi?.split(' (')[0];
    const coord = MANDI_COORDS[name] || MANDI_COORDS[p.mandi];
    const dist  = coord && userLat ? `${distanceKm(userLat, userLon, coord.lat, coord.lon)} km` : null;
    return { ...p, dist };
  });
}

// ── AnimCard ──────────────────────────────────────────────────────────────────
function AnimCard({ delay = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

// ── LiveDot — pulsing dot for LIVE badge ─────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[M.liveDot, { opacity: pulse }]} />;
}

// ── CropPickerModal ───────────────────────────────────────────────────────────
function CropPickerModal({ visible, selected, onSelect, onClose }) {
  const insets        = useSafeAreaInsets();
  const slideAnim     = useRef(new Animated.Value(H)).current;
  const backdropAnim  = useRef(new Animated.Value(0)).current;
  const [query, setQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (visible) {
      setQuery('');
      setActiveCategory('all');
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: H, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const category = CROP_CATEGORIES.find(c => c.key === activeCategory) || CROP_CATEGORIES[0];
  const filtered = useMemo(() => {
    const base = category.crops;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(c => c.toLowerCase().includes(q));
  }, [query, activeCategory]);

  const renderCrop = ({ item }) => {
    const isSelected = item === selected;
    return (
      <Pressable
        style={[M.cropTile, isSelected && M.cropTileActive]}
        onPress={() => { onSelect(item); onClose(); }}
      >
        {isSelected && (
          <View style={M.cropTileCheck}>
            <Ionicons name="checkmark" size={9} color="#FFF" />
          </View>
        )}
        <Text style={[M.cropTileText, isSelected && M.cropTileTextActive]} numberOfLines={2}>
          {item}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[M.modalBackdrop, { opacity: backdropAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[M.modalSheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 }]}
      >
        {/* Handle */}
        <View style={M.modalHandle} />

        {/* Title row */}
        <View style={M.modalTitleRow}>
          <Text style={M.modalTitle}>Select Crop</Text>
          <Pressable style={M.modalClose} onPress={onClose}>
            <Ionicons name="close" size={18} color={SLATE} />
          </Pressable>
        </View>

        {/* Search input */}
        <View style={M.searchBox}>
          <Ionicons name="search" size={16} color={MUTED} />
          <TextInput
            style={M.searchInput}
            placeholder="Search crops…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color="#CBD5E1" />
            </Pressable>
          )}
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={M.catScroll}
          style={{ flexGrow: 0 }}
        >
          {CROP_CATEGORIES.map(cat => {
            const active = cat.key === activeCategory;
            return (
              <Pressable
                key={cat.key}
                style={[M.catChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Ionicons name={cat.icon + '-outline'} size={11} color={active ? '#FFF' : MUTED} />
                <Text style={[M.catChipText, active && { color: '#FFF' }]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results count */}
        <Text style={M.resultsCount}>{filtered.length} crops</Text>

        {/* Crop grid */}
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          renderItem={renderCrop}
          numColumns={3}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={M.cropGrid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
              <Ionicons name="leaf-outline" size={36} color="#CBD5E1" />
              <Text style={{ color: MUTED, fontSize: 13 }}>No crops found</Text>
            </View>
          }
        />
      </Animated.View>
    </Modal>
  );
}

// ── SparkLine ─────────────────────────────────────────────────────────────────
function SparkLine({ data, color, days, width: cw = CHART_W, height: ch = 80 }) {
  const revealAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    revealAnim.setValue(0);
    Animated.timing(revealAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [data]);

  if (!data?.length) return null;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const pad   = 10;
  const plotH = ch - pad * 2 - 20; // 20 for day labels
  const pts   = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (cw - pad * 2),
    y: pad + (1 - (v - min) / range) * plotH,
  }));

  const maxIdx = data.indexOf(max);

  return (
    <Animated.View style={{ width: cw, height: ch, opacity: revealAnim }}>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <View key={i} style={{
          position: 'absolute', left: pad, right: pad,
          top: pad + p * plotH, height: 1,
          backgroundColor: 'rgba(0,0,0,0.05)',
        }} />
      ))}
      {/* Line segments */}
      {pts.slice(0, -1).map((p, i) => {
        const next  = pts[i + 1];
        const len   = Math.hypot(next.x - p.x, next.y - p.y);
        const angle = Math.atan2(next.y - p.y, next.x - p.x) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute',
            left: p.x, top: p.y - 1.5,
            width: len, height: 3,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: '0 50%',
            borderRadius: 2,
          }} />
        );
      })}
      {/* Dots */}
      {pts.map((p, i) => {
        const isBest = i === maxIdx;
        const size   = isBest ? 10 : 6;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: p.x - size / 2, top: p.y - size / 2,
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: isBest ? color : CARD,
            borderWidth: isBest ? 0 : 2,
            borderColor: color,
            shadowColor: isBest ? color : 'transparent',
            shadowOpacity: 0.4, shadowRadius: 4,
          }} />
        );
      })}
      {/* Peak label */}
      {pts[maxIdx] && (
        <View style={{
          position: 'absolute',
          left: pts[maxIdx].x - 22, top: pts[maxIdx].y - 24,
          backgroundColor: color,
          borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 8, color: '#FFF', fontWeight: '800' }}>
            ₹{(max / 1000).toFixed(1)}k
          </Text>
        </View>
      )}
      {/* Day labels */}
      {(days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).slice(0, data.length).map((d, i) => (
        <Text key={i} style={{
          position: 'absolute',
          left: pts[i].x - 12, top: ch - 16,
          fontSize: 9, color: MUTED, width: 26, textAlign: 'center', fontWeight: '600',
        }}>{d}</Text>
      ))}
    </Animated.View>
  );
}

// ── MonthlyBarChart ───────────────────────────────────────────────────────────
function MonthlyBarChart({ data, bestMonth, color = PURPLE, width: cw = CHART_W }) {
  if (!data?.length) return null;
  const ch       = 140;
  const barW     = Math.max(20, Math.floor((cw - 16) / data.length) - 4);
  const maxPrice = Math.max(...data.map(d => d.maxPrice || d.avgPrice));
  const minPrice = Math.min(...data.map(d => d.minPrice || d.avgPrice));
  const range    = maxPrice - minPrice || 1;
  const barMaxH  = ch - 44;

  return (
    <View style={{ width: cw }}>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <View key={i} style={{
          position: 'absolute', left: 40, right: 0,
          top: p * barMaxH, height: 1,
          backgroundColor: 'rgba(0,0,0,0.05)',
        }} />
      ))}
      {[0, 0.5, 1].map((p, i) => (
        <Text key={i} style={{
          position: 'absolute', left: 0, top: p * barMaxH - 8,
          fontSize: 8, color: MUTED, width: 36, textAlign: 'right',
        }}>₹{((maxPrice - p * range) / 1000).toFixed(1)}k</Text>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: ch, paddingLeft: 40, gap: 3 }}>
        {data.map((d, i) => {
          const avgPct  = (d.avgPrice - minPrice) / range;
          const highPct = ((d.maxPrice || d.avgPrice) - minPrice) / range;
          const lowPct  = ((d.minPrice || d.avgPrice) - minPrice) / range;
          const isBest  = d.month === bestMonth;
          const barH    = Math.max(12, Math.round(avgPct * barMaxH));
          const rangeH  = Math.max(4, Math.round((highPct - lowPct) * barMaxH));
          const rangeY  = barMaxH - Math.round(highPct * barMaxH);
          return (
            <View key={i} style={{ alignItems: 'center', width: barW }}>
              <View style={{ position: 'absolute', top: rangeY, width: 2, height: rangeH, backgroundColor: isBest ? color : 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
              <View style={{ width: barW - 2, height: barH, backgroundColor: isBest ? color : `${color}35`, borderRadius: 4, alignSelf: 'center', marginBottom: 4 }} />
              <Text style={{ fontSize: 8, color: isBest ? color : MUTED, fontWeight: isBest ? '800' : '500', textAlign: 'center' }}>
                {d.month?.split(' ')[0]}
              </Text>
              <Text style={{ fontSize: 7, color: isBest ? color : '#CBD5E1', textAlign: 'center' }}>
                {(d.avgPrice / 1000).toFixed(1)}k
              </Text>
              {isBest && (
                <View style={{ backgroundColor: color, borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 }}>
                  <Text style={{ fontSize: 6, color: '#FFF', fontWeight: '800' }}>BEST</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <View style={[M.statPill, { borderColor: `${color}30` }]}>
      <Text style={[M.statPillLabel, { color }]}>{label}</Text>
      <Text style={[M.statPillValue, { color }]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MarketScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t }  = useLanguage();

  const [selectedCrop, setSelectedCrop]     = useState(DEFAULT_CROP);
  const [selectedState, setSelectedState]   = useState('Maharashtra');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [data, setData]                     = useState(null);
  const [prediction, setPrediction]         = useState(null);
  const [extForecast, setExtForecast]       = useState(null);
  const [loading, setLoading]               = useState(false);
  const [loadingForecast, setLoadingFc]     = useState(false);
  const [error, setError]                   = useState(null);
  const [userLocation, setUserLocation]     = useState(null);
  const [pickerVisible, setPickerVisible]   = useState(false);
  const contentAnim = useRef(new Animated.Value(0)).current;

  const isUp       = data ? (data.change ?? 0) > 0 : false;
  const trendColor = isUp ? GREEN : RED;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lon } = loc.coords;
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const city  = place?.city || place?.subregion || 'Your location';
        const state = place?.region || 'Maharashtra';
        setUserLocation({ lat, lon, city, state });
        setSelectedState(state);
        loadPrices(DEFAULT_CROP, state, { lat, lon });
      } catch { /* use default */ }
    })();
    loadPrices(DEFAULT_CROP, 'Maharashtra', null);
  }, []);

  const loadPrices = async (crop, state = selectedState, loc = userLocation) => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setExtForecast(null);
    try {
      const result = await getMarketPrices(crop, state, loc?.city || null);
      if (result.change === undefined || result.change === null) {
        const mid = result.weekLow + (result.weekHigh - result.weekLow) / 2;
        result.change = mid > 0 ? parseFloat(((result.current - mid) / mid * 100).toFixed(1)) : 0;
      }
      result.forecastDir = result.trend || (result.change > 0 ? 'up' : result.change < -2 ? 'down' : 'flat');
      if (loc?.lat && result.prices?.length) {
        result.prices = addDistances(result.prices, loc.lat, loc.lon);
      }
      setData(result);
      contentAnim.setValue(0);
      Animated.timing(contentAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      loadForecast(crop, state, selectedPeriod);
    } catch {
      setError('Failed to load prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async (crop, state = selectedState, period = selectedPeriod) => {
    if (period === '7d') {
      setLoadingFc(true);
      getMarketPrediction(crop, state)
        .then(p => setPrediction(p))
        .catch(() => {})
        .finally(() => setLoadingFc(false));
    } else {
      setLoadingFc(true);
      getExtendedForecast(crop, state, period)
        .then(f => setExtForecast(f))
        .catch(() => {})
        .finally(() => setLoadingFc(false));
    }
  };

  const handleSelectCrop = (crop) => {
    setSelectedCrop(crop);
    loadPrices(crop, selectedState, userLocation);
  };

  const handleSelectPeriod = (period) => {
    setSelectedPeriod(period);
    setPrediction(null);
    setExtForecast(null);
    if (data) loadForecast(selectedCrop, selectedState, period);
  };

  return (
    <View style={M.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />

      {/* ── Header ── */}
      <View style={[M.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={M.backBtn}>
          <Ionicons name="chevron-back" size={22} color={SLATE} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={M.headerTitle}>{t('market.title') || 'Market Prices'}</Text>
          {userLocation && (
            <View style={M.locationRow}>
              <Ionicons name="location" size={10} color={GREEN} />
              <Text style={M.locationText}>{userLocation.city}, {userLocation.state}</Text>
            </View>
          )}
        </View>
        <View style={M.livePill}>
          <LiveDot />
          <Text style={M.liveTxt}>LIVE</Text>
        </View>
      </View>

      {/* ── Crop selector button ── */}
      <Pressable style={M.cropSelector} onPress={() => setPickerVisible(true)}>
        <View style={M.cropSelectorLeft}>
          <View style={M.cropSelectorIcon}>
            <Ionicons name="leaf" size={16} color={GREEN} />
          </View>
          <View>
            <Text style={M.cropSelectorLabel}>Selected Crop</Text>
            <Text style={M.cropSelectorName}>{selectedCrop}</Text>
          </View>
        </View>
        <View style={M.cropSelectorRight}>
          <Text style={M.cropSelectorHint}>Tap to change</Text>
          <View style={M.cropSelectorChevron}>
            <Ionicons name="chevron-down" size={14} color={GREEN} />
          </View>
        </View>
      </Pressable>

      {/* ── Main scroll ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={M.scrollContent}
      >
        {loading && (
          <View style={M.centered}>
            <View style={M.loadingSpinner}>
              <ActivityIndicator color={GREEN} size="large" />
            </View>
            <Text style={M.loadingTxt}>Fetching live prices for {selectedCrop}…</Text>
          </View>
        )}

        {error && !loading && (
          <View style={M.centered}>
            <View style={M.errorIcon}>
              <Ionicons name="cloud-offline-outline" size={36} color="#CBD5E1" />
            </View>
            <Text style={M.errorTxt}>{error}</Text>
            <Pressable onPress={() => loadPrices(selectedCrop)} style={M.retryBtn}>
              <Ionicons name="refresh" size={14} color={GREEN} />
              <Text style={M.retryTxt}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && data && (
          <Animated.View style={{
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}>

            {/* ── Price Hero ── */}
            <AnimCard delay={0}>
              <LinearGradient
                colors={isUp ? ['#F0FDF4', '#DCFCE7', '#FFFFFF'] : ['#FFF5F5', '#FEE2E2', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={M.priceHero}
              >
                {/* Top row: crop name + date */}
                <View style={M.priceHeroTop}>
                  <View style={M.priceHeroCropBadge}>
                    <Ionicons name="leaf" size={11} color={GREEN} />
                    <Text style={M.priceHeroCropName}>{selectedCrop}</Text>
                  </View>
                  <Text style={M.priceHeroDate}>{t('market.today') || 'Today'}</Text>
                </View>

                {/* Main price + change */}
                <View style={M.priceHeroMid}>
                  <View>
                    <Text style={M.priceHeroRupee}>₹</Text>
                    <Text style={M.priceHeroValue}>{data.current?.toLocaleString()}</Text>
                    <Text style={M.priceHeroUnit}>per {data.unit}</Text>
                  </View>
                  <View style={[M.changeBadge, {
                    backgroundColor: isUp ? '#DCFCE7' : '#FEE2E2',
                    borderColor: isUp ? '#86EFAC' : '#FCA5A5',
                  }]}>
                    <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={18} color={trendColor} />
                    <Text style={[M.changePct, { color: trendColor }]}>
                      {isUp ? '+' : ''}{data.change}%
                    </Text>
                    <Text style={[M.changeCaption, { color: trendColor }]}>vs last week</Text>
                  </View>
                </View>

                {/* Week high / low */}
                <View style={M.weekStatRow}>
                  <StatPill label="WEEK HIGH" value={`₹${data.weekHigh?.toLocaleString()}`} color={GREEN} />
                  <View style={M.weekStatDiv} />
                  <StatPill label="WEEK LOW" value={`₹${data.weekLow?.toLocaleString()}`} color={RED} />
                  {data.forecastDir && (
                    <>
                      <View style={M.weekStatDiv} />
                      <StatPill
                        label="TREND"
                        value={data.forecastDir === 'up' ? '↑ Rising' : data.forecastDir === 'down' ? '↓ Falling' : '→ Stable'}
                        color={data.forecastDir === 'up' ? GREEN : data.forecastDir === 'down' ? RED : AMBER}
                      />
                    </>
                  )}
                </View>
              </LinearGradient>
            </AnimCard>

            {/* ── 7-Day Spark Chart ── */}
            {data.forecast7d?.length > 0 && (
              <AnimCard delay={60} style={M.card}>
                <View style={M.cardHeader}>
                  <View style={M.cardHeaderLeft}>
                    <View style={[M.cardDot, { backgroundColor: trendColor }]} />
                    <Text style={M.cardTitle}>7-Day Price Trend</Text>
                  </View>
                  <View style={[M.trendBadge, {
                    backgroundColor: isUp ? '#F0FDF4' : '#FFF7ED',
                    borderColor: isUp ? '#86EFAC' : '#FED7AA',
                  }]}>
                    <Ionicons name={isUp ? 'trending-up' : 'remove'} size={10} color={isUp ? GREEN : AMBER} />
                    <Text style={[M.trendBadgeText, { color: isUp ? GREEN : AMBER }]}>
                      {data.forecastDir === 'up' ? 'Uptrend' : 'Stable'}
                    </Text>
                  </View>
                </View>
                <SparkLine
                  data={data.forecast7d}
                  color={trendColor}
                  days={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => t(`market.days.${d}`) || d)}
                  width={CHART_W}
                />
              </AnimCard>
            )}

            {/* ── AI Insight ── */}
            {data.insight && (
              <AnimCard delay={110} style={M.insightCard}>
                <LinearGradient
                  colors={['#FFFBEB', '#FEF3C7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={M.insightGradient}
                >
                  <View style={M.insightIconWrap}>
                    <Ionicons name="sparkles" size={18} color={AMBER} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={M.insightLabel}>AI MARKET INSIGHT</Text>
                    <Text style={M.insightText}>{data.insight}</Text>
                  </View>
                </LinearGradient>
              </AnimCard>
            )}

            {/* ── Mandi Prices ── */}
            {data.prices?.length > 0 && (
              <AnimCard delay={160} style={M.section}>
                <View style={M.sectionHeader}>
                  <View style={[M.cardDot, { backgroundColor: BLUE }]} />
                  <Text style={M.cardTitle}>Mandi Prices</Text>
                  <View style={M.sourceBadge}>
                    <Text style={M.sourceBadgeText}>via {data.source}</Text>
                  </View>
                </View>
                <View style={M.mandiCard}>
                  {[...data.prices]
                    .sort((a, b) => (parseInt(a.dist) || 9999) - (parseInt(b.dist) || 9999))
                    .map((mandi, i, arr) => {
                      const isTop = i === 0;
                      return (
                        <View key={i}>
                          <View style={[M.mandiRow, isTop && M.mandiRowTop]}>
                            <View style={M.mandiLeft}>
                              <View style={M.mandiNameRow}>
                                <Text style={M.mandiName} numberOfLines={1}>{mandi.mandi}</Text>
                                {isTop && (
                                  <View style={M.mandiNearestBadge}>
                                    <Text style={M.mandiNearestText}>Nearest</Text>
                                  </View>
                                )}
                              </View>
                              <View style={M.mandiMeta}>
                                <Ionicons name="location-outline" size={10} color={MUTED} />
                                <Text style={M.mandiDist}>{mandi.dist || '—'}</Text>
                              </View>
                            </View>
                            <View style={M.mandiRight}>
                              <Text style={M.mandiPrice}>₹{mandi.price?.toLocaleString()}</Text>
                              {mandi.minPrice && mandi.maxPrice && (
                                <Text style={M.mandiRange}>
                                  ₹{mandi.minPrice?.toLocaleString()}–{mandi.maxPrice?.toLocaleString()}
                                </Text>
                              )}
                            </View>
                          </View>
                          {i < arr.length - 1 && <View style={M.mandiDiv} />}
                        </View>
                      );
                    })}
                </View>
                <Text style={M.updatedAt}>Updated: {data.lastUpdated}</Text>
              </AnimCard>
            )}

            {/* ── Price Forecast ── */}
            <AnimCard delay={210} style={M.section}>
              <View style={M.sectionHeader}>
                <View style={[M.cardDot, { backgroundColor: PURPLE }]} />
                <Text style={M.cardTitle}>{t('market.priceForecast') || 'Price Forecast'}</Text>
                <View style={M.aiBadge}>
                  <Ionicons name="hardware-chip-outline" size={9} color={PURPLE} />
                  <Text style={M.aiBadgeText}>Groq AI</Text>
                </View>
              </View>

              {/* Period tabs */}
              <View style={M.periodTabs}>
                {PERIODS.map(p => {
                  const active = p.key === selectedPeriod;
                  return (
                    <Pressable
                      key={p.key}
                      style={[M.periodTab, active && M.periodTabActive]}
                      onPress={() => handleSelectPeriod(p.key)}
                    >
                      <Text style={[M.periodTabText, active && M.periodTabTextActive]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {loadingForecast ? (
                <View style={M.forecastLoading}>
                  <ActivityIndicator color={PURPLE} size="small" />
                  <Text style={M.forecastLoadingTxt}>Loading forecast…</Text>
                </View>
              ) : selectedPeriod === '7d' && prediction ? (
                <View style={M.predCard}>
                  {/* Best day + risk */}
                  <View style={M.predTopRow}>
                    <View style={M.predBestDay}>
                      <Ionicons name="calendar" size={13} color={PURPLE} />
                      <Text style={M.predBestDayLabel}>Best day to sell</Text>
                      <Text style={M.predBestDayVal}>{prediction.bestDayToSell}</Text>
                    </View>
                    <View style={[M.riskBadge, {
                      backgroundColor: prediction.riskLevel === 'high' ? '#FEE2E2'
                        : prediction.riskLevel === 'medium' ? '#FEF3C7' : '#F0FDF4',
                      borderColor: prediction.riskLevel === 'high' ? '#FCA5A5'
                        : prediction.riskLevel === 'medium' ? '#FDE68A' : '#86EFAC',
                    }]}>
                      <Text style={[M.riskBadgeText, {
                        color: prediction.riskLevel === 'high' ? RED
                          : prediction.riskLevel === 'medium' ? AMBER : GREEN,
                      }]}>
                        {(prediction.riskLevel || 'medium').toUpperCase()} RISK
                      </Text>
                    </View>
                  </View>

                  {/* Bars */}
                  {Array.isArray(prediction.forecast) && (
                    <View style={M.predBars}>
                      {(() => {
                        const all  = prediction.forecast.map(x => x.price);
                        const maxP = Math.max(...all);
                        const minP = Math.min(...all);
                        const BAR_MAX = 64;
                        return prediction.forecast.map((d, i) => {
                          const pct    = maxP > minP ? (d.price - minP) / (maxP - minP) : 0.5;
                          const barH   = Math.max(10, Math.round(pct * BAR_MAX));
                          const isBest = d.day === prediction.bestDayToSell;
                          return (
                            <View key={i} style={M.predBarCol}>
                              <Text style={[M.predBarPrice, { color: isBest ? PURPLE : MUTED }]}>
                                {(d.price / 1000).toFixed(1)}k
                              </Text>
                              <View style={M.predBarTrack}>
                                <View style={[M.predBarFill, {
                                  height: barH,
                                  backgroundColor: isBest ? PURPLE : `${PURPLE}30`,
                                }]} />
                              </View>
                              <Text style={[M.predBarDay, { color: isBest ? PURPLE : MUTED, fontWeight: isBest ? '800' : '600' }]}>
                                {d.day}
                              </Text>
                              {isBest && <View style={M.predBestDot} />}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  )}

                  {prediction.reasoning && (
                    <View style={M.reasonBox}>
                      <Ionicons name="bulb-outline" size={13} color={PURPLE} />
                      <Text style={M.reasonText}>{prediction.reasoning}</Text>
                    </View>
                  )}

                  {Array.isArray(prediction.factors) && prediction.factors.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {prediction.factors.map((f, i) => (
                        <View key={i} style={M.factorChip}>
                          <Text style={M.factorChipText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

              ) : extForecast && extForecast.forecast?.length ? (
                <View style={M.predCard}>
                  <View style={M.extSummaryRow}>
                    <View style={M.extSummaryItem}>
                      <Text style={M.extSummaryLabel}>Best Month</Text>
                      <Text style={[M.extSummaryVal, { color: GREEN }]}>{extForecast.bestMonthToSell}</Text>
                    </View>
                    <View style={M.extSummaryDiv} />
                    <View style={M.extSummaryItem}>
                      <Text style={M.extSummaryLabel}>Avoid Selling</Text>
                      <Text style={[M.extSummaryVal, { color: RED }]}>{extForecast.worstMonthToSell}</Text>
                    </View>
                    <View style={M.extSummaryDiv} />
                    <View style={[M.riskBadge, {
                      alignSelf: 'center',
                      backgroundColor: extForecast.riskLevel === 'high' ? '#FEE2E2' : '#FEF3C7',
                      borderColor: extForecast.riskLevel === 'high' ? '#FCA5A5' : '#FDE68A',
                    }]}>
                      <Text style={[M.riskBadgeText, { color: extForecast.riskLevel === 'high' ? RED : AMBER }]}>
                        {(extForecast.riskLevel || 'medium').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <MonthlyBarChart
                    data={extForecast.forecast}
                    bestMonth={extForecast.bestMonthToSell}
                    color={PURPLE}
                    width={W - CARD_MARGIN * 2 - 32}
                  />
                  {extForecast.reasoning && (
                    <View style={M.reasonBox}>
                      <Ionicons name="bulb-outline" size={13} color={PURPLE} />
                      <Text style={M.reasonText}>{extForecast.reasoning}</Text>
                    </View>
                  )}
                  {extForecast.sellingStrategy && (
                    <View style={[M.reasonBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                      <Ionicons name="trending-up" size={13} color={GREEN} />
                      <Text style={[M.reasonText, { color: '#166534' }]}>{extForecast.sellingStrategy}</Text>
                    </View>
                  )}
                  {Array.isArray(extForecast.factors) && extForecast.factors.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {extForecast.factors.map((f, i) => (
                        <View key={i} style={M.factorChip}>
                          <Text style={M.factorChipText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </AnimCard>

            {/* ── Ask AI ── */}
            <AnimCard delay={270} style={M.section}>
              <Pressable
                style={({ pressed }) => [M.askBtn, pressed && { opacity: 0.88 }]}
                onPress={() => navigation.navigate('AIChat', {
                  initialMessage: `What's the best time to sell my ${selectedCrop}?`,
                })}
              >
                <LinearGradient
                  colors={[GREEN, '#15803D']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={M.askBtnGradient}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFF" />
                  <Text style={M.askBtnText}>Ask FarmMind about {selectedCrop}</Text>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </Pressable>
            </AnimCard>

          </Animated.View>
        )}
      </ScrollView>

      {/* ── Crop Picker Modal ── */}
      <CropPickerModal
        visible={pickerVisible}
        selected={selectedCrop}
        onSelect={handleSelectCrop}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 60 },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: SLATE },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText:{ fontSize: 10, color: GREEN, fontWeight: '600' },
  livePill:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveTxt: { fontSize: 10, fontWeight: '800', color: GREEN },

  // ── Crop selector button
  cropSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cropSelectorLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropSelectorIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  cropSelectorLabel:   { fontSize: 10, color: MUTED, fontWeight: '600', marginBottom: 2 },
  cropSelectorName:    { fontSize: 16, fontWeight: '800', color: SLATE },
  cropSelectorRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cropSelectorHint:    { fontSize: 11, color: MUTED },
  cropSelectorChevron: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },

  // ── Crop picker modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:    {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: H * 0.85,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 20,
  },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: SLATE },
  modalClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  searchBox:     {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F8FAFC', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: BORDER,
  },
  searchInput:   { flex: 1, fontSize: 14, color: SLATE, padding: 0 },
  catScroll:     { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#F8FAFC',
  },
  catChipText:   { fontSize: 12, color: MUTED, fontWeight: '600' },
  resultsCount:  { fontSize: 11, color: MUTED, paddingHorizontal: 20, marginTop: 8, marginBottom: 4, fontWeight: '600' },
  cropGrid:      { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20, gap: 8 },
  cropTile: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, paddingHorizontal: 6,
    minHeight: 56,
  },
  cropTileActive: { backgroundColor: '#F0FDF4', borderColor: GREEN },
  cropTileText:   { fontSize: 12, color: SLATE, fontWeight: '600', textAlign: 'center' },
  cropTileTextActive: { color: GREEN, fontWeight: '800' },
  cropTileCheck:  { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },

  // ── Cards
  card: {
    backgroundColor: CARD,
    marginHorizontal: CARD_MARGIN, marginBottom: 12,
    borderRadius: 20, padding: CARD_PADDING,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDot:        { width: 7, height: 7, borderRadius: 4 },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: SLATE },
  trendBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  trendBadgeText: { fontSize: 10, fontWeight: '700' },

  // ── Price hero
  priceHero: {
    marginHorizontal: CARD_MARGIN, marginBottom: 12,
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    gap: 16,
  },
  priceHeroTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceHeroCropBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#86EFAC' },
  priceHeroCropName: { fontSize: 13, fontWeight: '700', color: SLATE },
  priceHeroDate:     { fontSize: 11, color: MUTED, fontWeight: '600' },
  priceHeroMid:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  priceHeroRupee:    { fontSize: 16, fontWeight: '700', color: MUTED, marginTop: 4 },
  priceHeroValue:    { fontSize: 44, fontWeight: '900', color: SLATE, letterSpacing: -1, lineHeight: 50 },
  priceHeroUnit:     { fontSize: 12, color: MUTED, marginTop: 4 },
  changeBadge:       { borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  changePct:         { fontSize: 22, fontWeight: '900' },
  changeCaption:     { fontSize: 9, fontWeight: '600', opacity: 0.8 },

  // Week stats
  weekStatRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 12, gap: 0 },
  weekStatDiv: { width: 1, backgroundColor: BORDER, marginVertical: 2 },
  statPill:    { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6, borderWidth: 0 },
  statPillLabel:{ fontSize: 8, fontWeight: '700', letterSpacing: 0.5, opacity: 0.8 },
  statPillValue:{ fontSize: 13, fontWeight: '800' },

  // ── Insight card
  insightCard:     { marginHorizontal: CARD_MARGIN, marginBottom: 12, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#FDE68A', shadowColor: AMBER, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  insightGradient: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  insightIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(217,119,6,0.12)', justifyContent: 'center', alignItems: 'center' },
  insightLabel:    { fontSize: 9, fontWeight: '900', color: AMBER, letterSpacing: 1.5, marginBottom: 5 },
  insightText:     { fontSize: 13, color: '#78350F', lineHeight: 19 },

  // ── Sections
  section:        { marginHorizontal: CARD_MARGIN, marginBottom: 12 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sourceBadge:    { marginLeft: 4, backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  sourceBadgeText:{ fontSize: 9, color: MUTED, fontWeight: '600' },
  aiBadge:        { marginLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD6FE' },
  aiBadgeText:    { fontSize: 9, color: PURPLE, fontWeight: '700' },

  // ── Mandi
  mandiCard:       { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  mandiRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  mandiRowTop:     { backgroundColor: '#FAFFFE' },
  mandiLeft:       { flex: 1 },
  mandiNameRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  mandiName:       { fontSize: 13, fontWeight: '700', color: SLATE, flexShrink: 1 },
  mandiNearestBadge:{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mandiNearestText: { fontSize: 8, fontWeight: '800', color: GREEN },
  mandiMeta:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  mandiDist:       { fontSize: 10, color: MUTED },
  mandiRight:      { alignItems: 'flex-end', gap: 3 },
  mandiPrice:      { fontSize: 16, fontWeight: '900', color: SLATE },
  mandiRange:      { fontSize: 9, color: MUTED },
  mandiDiv:        { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 14 },
  updatedAt:       { fontSize: 9, color: MUTED, marginTop: 5, marginLeft: 2 },

  // ── Period tabs
  periodTabs: {
    flexDirection: 'row', gap: 6, marginBottom: 12,
    backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4,
  },
  periodTab:         { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  periodTabActive:   { backgroundColor: CARD, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodTabText:     { fontSize: 12, color: MUTED, fontWeight: '600' },
  periodTabTextActive:{ color: PURPLE, fontWeight: '800' },

  // ── Forecast loading
  forecastLoading:    { alignItems: 'center', paddingVertical: 28, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, gap: 8 },
  forecastLoadingTxt: { color: MUTED, fontSize: 12 },

  // ── Prediction card
  predCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  predTopRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  predBestDay:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  predBestDayLabel:{ fontSize: 11, color: MUTED, fontWeight: '600' },
  predBestDayVal:  { fontSize: 13, color: PURPLE, fontWeight: '800' },
  riskBadge:       { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  riskBadgeText:   { fontSize: 10, fontWeight: '800' },
  predBars:        { flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 100 },
  predBarCol:      { flex: 1, alignItems: 'center', gap: 3 },
  predBarPrice:    { fontSize: 9, fontWeight: '700' },
  predBarTrack:    { width: '100%', height: 68, backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  predBarFill:     { width: '100%', borderRadius: 5 },
  predBarDay:      { fontSize: 9 },
  predBestDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: PURPLE },
  reasonBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#FAF5FF', borderRadius: 10, borderWidth: 1, borderColor: '#DDD6FE', padding: 10 },
  reasonText:      { flex: 1, fontSize: 11, color: '#4B5563', lineHeight: 16 },
  factorChip:      { backgroundColor: '#FAF5FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#DDD6FE' },
  factorChipText:  { fontSize: 10, color: PURPLE, fontWeight: '600' },

  // ── Extended
  extSummaryRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 12 },
  extSummaryItem:  { alignItems: 'center', gap: 3 },
  extSummaryLabel: { fontSize: 9, color: MUTED, fontWeight: '600' },
  extSummaryVal:   { fontSize: 13, fontWeight: '800' },
  extSummaryDiv:   { width: 1, height: 30, backgroundColor: BORDER },

  // ── Ask button
  askBtn:           { borderRadius: 18, overflow: 'hidden', shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  askBtnGradient:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 20 },
  askBtnText:       { fontSize: 14, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center' },

  // ── States
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  loadingSpinner:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  loadingTxt:    { fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },
  errorIcon:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  errorTxt:      { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: '#86EFAC' },
  retryTxt:      { fontSize: 13, fontWeight: '700', color: GREEN },
});
