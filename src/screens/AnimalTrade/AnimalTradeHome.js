/**
 * AnimalTradeHome — Pashushala-inspired Livestock Marketplace
 * Photo category filter + GPS distance filter + 2-column grid
 * Uses real API (/animals) — falls back to mock data if offline
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Image, ScrollView, Dimensions, Alert,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocation } from '../../context/LocationContext';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VerificationModal, { useIsVerified } from './VerificationModal';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 14 * 2 - 10) / 2;

const GREEN = '#2D9162';
const BG    = '#EEF8F4';

const ANIMAL_CATEGORIES = [
  { key: 'All',     tKey: 'all',     photo: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=120&h=120&fit=crop' },
  { key: 'Cow',     tKey: 'cow',     photo: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=120&h=120&fit=crop' },
  { key: 'Buffalo', tKey: 'buffalo', photo: 'https://images.unsplash.com/photo-1583073437-5cc2c7f6f2dd?w=120&h=120&fit=crop' },
  { key: 'Goat',    tKey: 'goat',    photo: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?w=120&h=120&fit=crop' },
  { key: 'Bullock', tKey: 'bullock', photo: 'https://images.unsplash.com/photo-1548681170-2b8e4f2abd37?w=120&h=120&fit=crop' },
  { key: 'Sheep',   tKey: 'sheep',   photo: 'https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=120&h=120&fit=crop' },
];

const DISTANCE_KEYS = [null, 10, 25, 50, 100];

const SORT_KEYS = ['sortLatest', 'sortPriceLow', 'sortPriceHigh'];

// ── Haversine distance (km) ────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Category pill ─────────────────────────────────────────────────────────────
function CategoryPill({ item, active, onPress, t }) {
  const sc = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(sc, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  return (
    <Animated.View style={[S.catWrap, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        onPress={() => onPress(item.key)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={[S.catImgWrap, active && S.catImgWrapActive]}>
          <Image source={{ uri: item.photo }} style={S.catImg} resizeMode="cover" />
        </View>
        <Text style={[S.catLabel, active && S.catLabelActive]}>{t(item.tKey === 'all' ? 'all' : `doctor.animals.${item.tKey.toLowerCase()}`) || item.key.toUpperCase()}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Animal Card ───────────────────────────────────────────────────────────────
function AnimalCard({ item, onPress, t, index = 0 }) {
  const imageUrl = item.images && item.images[0] ? item.images[0] : null;
  const milkStr  = item.milkYield && item.milkYield !== 'N/A' ? item.milkYield : null;
  const price    = item.price ? Number(item.price).toLocaleString() : '—';
  const city     = item.sellerLocation ? item.sellerLocation.split(',')[0] : '—';
  const dist     = item.distanceKm != null ? `${item.distanceKm} km`
                 : item._dist      != null ? `${Math.round(item._dist)} km`
                 : null;
  const sc    = useRef(new Animated.Value(1)).current;
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1, duration: 420, delay: index * 60, useNativeDriver: true,
    }).start();
  }, []);

  const entryOpacity = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const entryY       = entry.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View style={[S.card, { transform: [{ scale: sc }, { translateY: entryY }], opacity: entryOpacity }]}>
    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onPress(item)}
      onPressIn={() => Animated.spring(sc, { toValue: 0.95, useNativeDriver: true, tension: 180, friction: 8 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }).start()}
      activeOpacity={1}
    >
      <View style={S.photoWrap}>
        {imageUrl
          ? <Image source={{ uri: imageUrl }} style={S.photo} resizeMode="cover" />
          : (
            <View style={[S.photo, S.photoFallback]}>
              <Ionicons name="paw" size={36} color={GREEN + '60'} />
            </View>
          )
        }
        {/* Gradient overlay on image */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.45)']}
          style={S.photoGradient}
          pointerEvents="none"
        />
        {item.isNew || item._isNew ? (
          <View style={S.badge}>
            <Text style={S.badgeTxt}>{t('animal.addedRecently')}</Text>
          </View>
        ) : null}
        {dist ? (
          <View style={S.distBadge}>
            <Ionicons name="location" size={9} color="#fff" />
            <Text style={S.distBadgeTxt}>{dist}</Text>
          </View>
        ) : null}
        {item.vaccinated ? (
          <View style={S.vaccBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={S.cardBody}>
        <Text style={S.animalName} numberOfLines={1}>{item.breed} {item.animal}</Text>
        <Text style={S.price}>₹{price}</Text>
        <View style={S.metaRow}>
          <Ionicons name="location-outline" size={11} color="#888" />
          <Text style={S.metaTxt} numberOfLines={1}>{city}</Text>
        </View>
        <View style={S.statsRow}>
          <View style={S.statItem}>
            <Ionicons name="time-outline" size={11} color="#888" />
            <Text style={S.statTxt}>{item.age}</Text>
          </View>
          {milkStr ? (
            <View style={S.statItem}>
              <Ionicons name="water-outline" size={11} color={GREEN} />
              <Text style={[S.statTxt, { color: GREEN }]}>{milkStr}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={S.bookBtn} onPress={() => onPress(item)}>
          <Ionicons name="car-outline" size={13} color="#fff" />
          <Text style={S.bookBtnTxt}>{t('animal.bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

// ── Distance chip ─────────────────────────────────────────────────────────────
function DistChip({ km, label, active, disabled, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;
  const pressIn  = () => { if (!disabled) Animated.spring(sc, { toValue: 0.88, useNativeDriver: true, speed: 50 }).start(); };
  const pressOut = () => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity
        style={[S.distChip, active && S.distChipActive, disabled && S.distChipDisabled]}
        onPress={() => onPress(km)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Text style={[S.distChipTxt, active && S.distChipTxtActive, disabled && { color: '#bbb' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Sort Chip (horizontal filter chip) ────────────────────────────────────────
function SortChip({ label, active, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(sc, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start();
  const pressOut = () => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity
        style={[S.sortChip, active && S.sortChipActive]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <Text style={[S.sortChipTxt, active && S.sortChipTxtActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── List header ────────────────────────────────────────────────────────────────
function ListHeader({ count, sortBy, onSortChange, t }) {
  return (
    <View style={S.listHeader}>
      <View style={S.sectionHeader}>
        <View style={S.sectionLeft}>
          <View style={S.starBadge}>
            <Ionicons name="star" size={11} color="#fff" />
          </View>
          <Text style={S.sectionTitle}>{t('animal.allAnimals')}</Text>
          <View style={S.countBadge}>
            <Text style={S.countBadgeTxt}>{count}</Text>
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.sortRow}>
        {SORT_KEYS.map(key => (
          <SortChip
            key={key}
            label={t(`animal.${key}`)}
            active={sortBy === key}
            onPress={() => onSortChange(key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Row (2 cards) ──────────────────────────────────────────────────────────────
function CardRow({ pair, onPress, t, rowIndex = 0 }) {
  return (
    <View style={S.row}>
      <AnimalCard item={pair[0]} onPress={onPress} t={t} index={rowIndex * 2} />
      {pair[1]
        ? <AnimalCard item={pair[1]} onPress={onPress} t={t} index={rowIndex * 2 + 1} />
        : <View style={{ width: CARD_W }} />
      }
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnimalTradeHome({ navigation }) {
  const { t } = useLanguage();
  // ── Use global GPS from LocationContext (fetched once at app start) ─────────
  const { coords, permissionGranted, loading: gpsLoading } = useLocation();
  const userLocation = coords;
  const locStatus    = gpsLoading ? 'loading' : permissionGranted ? 'granted' : 'denied';

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [sortBy,       setSortBy]       = useState('sortLatest');
  const [distanceKm,   setDistanceKm]   = useState(null);
  const [listings,     setListings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [isVerified,   setIsVerified]   = useIsVerified();
  const [verifyOpen,   setVerifyOpen]   = useState(false);

  // Fetch from API whenever filter/search/distance changes
  useEffect(() => {
    fetchListings();
  }, [activeFilter, searchQuery, distanceKm, userLocation, sortBy]);

  // Re-fetch when returning to this screen (e.g., after posting a new listing)
  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [])
  );

  async function fetchListings(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = { limit: 50 };
      if (activeFilter !== 'All') params.animal  = activeFilter;
      if (searchQuery.trim())     params.search  = searchQuery.trim();
      if (distanceKm && userLocation) {
        params.lat    = userLocation.latitude;
        params.lng    = userLocation.longitude;
        params.radius = distanceKm;
      }

      const { data } = await api.get('/animals', { params });
      let results = data.data || [];

      // Client-side sort (server returns verified+createdAt order)
      if (sortBy === 'sortPriceLow') results = [...results].sort((a, b) => a.price - b.price);
      if (sortBy === 'sortPriceHigh') results = [...results].sort((a, b) => b.price - a.price);
      if (sortBy === 'sortLatest' && distanceKm && userLocation) {
        results = [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      }

      setListings(results);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Build 2-col pairs
  const pairs = [];
  for (let i = 0; i < listings.length; i += 2) {
    pairs.push([listings[i], listings[i + 1] || null]);
  }

  const handleAnimalPress = useCallback(
    item => navigation.navigate('AnimalDetail', { listing: item }),
    [navigation]
  );

  const handleDistancePress = (km) => {
    if (km !== null && locStatus === 'denied') {
      Alert.alert(t('animal.locationRequired'), t('animal.locationRequiredMsg'));
      return;
    }
    setDistanceKm(prev => prev === km ? null : km);
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={S.header}>
        <View style={S.topBar}>
          <View style={S.searchBar}>
            <Ionicons name="search-outline" size={16} color="#999" />
            <TextInput
              style={S.searchInput}
              placeholder={t('animal.searchPlaceholder')}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#bbb" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={S.addBtn} onPress={() => navigation.navigate('AddAnimalListing')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Photo category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.catRow}>
          {ANIMAL_CATEGORIES.map(cat => (
            <CategoryPill
              key={cat.key}
              item={cat}
              active={activeFilter === cat.key}
              onPress={setActiveFilter}
              t={t}
            />
          ))}
        </ScrollView>

        {/* Distance filter */}
        <View style={S.distRow}>
          <View style={S.distLabel}>
            <Ionicons
              name={locStatus === 'granted' ? 'location' : 'location-outline'}
              size={13}
              color={locStatus === 'granted' ? GREEN : '#999'}
            />
            <Text style={[S.distLabelTxt, locStatus === 'granted' && { color: GREEN }]}>
              {locStatus === 'granted'  ? t('animal.nearMe')
               : locStatus === 'loading' ? t('animal.locating')
               : t('animal.distance')}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.distChips}>
            {DISTANCE_KEYS.map(km => (
              <DistChip
                key={String(km)}
                km={km}
                label={km === null ? t('all') : `${km} km`}
                active={distanceKm === km}
                disabled={km !== null && locStatus === 'denied'}
                onPress={handleDistancePress}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── Listings ── */}
      <FlatList
        data={pairs}
        keyExtractor={(_, idx) => String(idx)}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchListings(true)}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        ListHeaderComponent={
          <ListHeader count={listings.length} sortBy={sortBy} onSortChange={setSortBy} t={t} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={S.emptyWrap}>
              <ActivityIndicator size="large" color={GREEN} />
            </View>
          ) : (
            <View style={S.emptyWrap}>
              <View style={S.emptyIconBg}>
                <Ionicons name="paw-outline" size={36} color={GREEN} />
              </View>
              <Text style={S.emptyTitle}>Coming Soon</Text>
              <Text style={S.emptyTxt}>No animals listed in your area yet.</Text>
              <Text style={S.emptyHintTxt}>Be the first to list your livestock for sale!</Text>
              {distanceKm ? (
                <TouchableOpacity style={S.expandBtn} onPress={() => setDistanceKm(null)}>
                  <Text style={S.expandBtnTxt}>{t('animal.showAllAnimals')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        renderItem={({ item: pair, index }) => (
          <CardRow pair={pair} onPress={handleAnimalPress} t={t} rowIndex={index} />
        )}
      />

      {/* Verify Banner */}
      {!isVerified && (
        <TouchableOpacity style={S.verifyBanner} onPress={() => setVerifyOpen(true)} activeOpacity={0.85}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={S.verifyBannerText}>Verify with Aadhaar to get Verified Badge</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* FAB */}
      <TouchableOpacity style={S.fab} onPress={() => navigation.navigate('AddAnimalListing')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={S.fabTxt}>{t('animal.postAd')}</Text>
      </TouchableOpacity>

      <VerificationModal
        visible={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onVerified={() => setIsVerified(true)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header:   { backgroundColor: '#fff', paddingTop: 44, borderBottomWidth: 1, borderBottomColor: '#eee' },
  topBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  addBtn:   {
    width: 44, height: 44, borderRadius: 12, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0, fontFamily: 'Inter_400Regular' },

  catRow:           { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  catWrap:          { alignItems: 'center', gap: 5, width: 64 },
  catImgWrap:       { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 2.5, borderColor: '#E0E0E0',
                      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  catImgWrapActive: { borderColor: GREEN, shadowColor: GREEN, shadowOpacity: 0.35, elevation: 4 },
  catImg:           { width: '100%', height: '100%' },
  catLabel:         { fontSize: 10, fontWeight: '700', color: '#888', textAlign: 'center', fontFamily: 'Inter_700Bold' },
  catLabelActive:   { color: GREEN },

  distRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  distLabel:        { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  distLabelTxt:     { fontSize: 12, fontWeight: '700', color: '#999' },
  distChips:        { gap: 7, flexDirection: 'row' },
  distChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#fff' },
  distChipActive:   { backgroundColor: GREEN, borderColor: GREEN },
  distChipDisabled: { backgroundColor: '#F8F8F8', borderColor: '#EEE' },
  distChipTxt:      { fontSize: 12, fontWeight: '600', color: '#666' },
  distChipTxtActive:{ color: '#fff' },

  list: { padding: 14, paddingBottom: 100 },
  listHeader:    { marginBottom: 12, gap: 10 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionLeft:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  starBadge:     { backgroundColor: GREEN, borderRadius: 6, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.3, flex: 1, fontFamily: 'Inter_800ExtraBold' },
  countBadge:    { backgroundColor: GREEN, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  countBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },

  sortRow:       { flexDirection: 'row', gap: 8, paddingRight: 16 },
  sortChip:      {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#fff',
  },
  sortChipActive:{ backgroundColor: GREEN, borderColor: GREEN },
  sortChipTxt:   { fontSize: 13, fontWeight: '600', color: '#666', fontFamily: 'Inter_600SemiBold' },
  sortChipTxtActive: { color: '#fff' },

  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  card: {
    width: CARD_W, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  photoWrap:    { height: CARD_W * 0.85, position: 'relative' },
  photo:        { width: '100%', height: '100%' },
  photoFallback:{ backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  photoGradient:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },

  badge: {
    position: 'absolute', top: 8, left: 0,
    backgroundColor: '#FF6F00', borderTopRightRadius: 6, borderBottomRightRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.3 },

  distBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  distBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  vaccBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: GREEN, borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },

  cardBody:   { padding: 10 },
  animalName: { fontSize: 13, fontWeight: '800', color: '#1A1A1A', marginBottom: 3, fontFamily: 'Inter_800ExtraBold' },
  price:      { fontSize: 15, fontWeight: '900', color: GREEN, marginBottom: 5, fontFamily: 'Inter_800ExtraBold' },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  metaTxt:    { fontSize: 11, color: '#777', flex: 1 },
  statsRow:   { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  statItem:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statTxt:    { fontSize: 11, color: '#777', fontWeight: '500' },

  bookBtn: {
    backgroundColor: GREEN, borderRadius: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 5,
  },
  bookBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: 'Inter_700Bold' },

  emptyWrap:    { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIconBg:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5EE', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
  emptyTxt:     { fontSize: 14, color: '#64748B', fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  emptyHintTxt: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
  expandBtn:    { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: GREEN + '15', borderRadius: 20 },
  expandBtnTxt: { color: GREEN, fontWeight: '700', fontSize: 13 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 30,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: GREEN, shadowOpacity: 0.40, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  fabTxt: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },

  verifyBanner: {
    position: 'absolute', bottom: 84, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  verifyBannerText: {
    flex: 1, color: '#fff', fontSize: 13, fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
