import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, ScrollView,
  Platform, StatusBar, RefreshControl, Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDoctors } from '../../services/doctorApi';
import { trackCallClick, trackWhatsAppClick } from '../../services/doctorApi';
import { useLanguage } from '../../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ANIMAL_FILTERS = [
  { key: 'cow',     emoji: '🐄' },
  { key: 'buffalo', emoji: '🐃' },
  { key: 'goat',    emoji: '🐐' },
  { key: 'sheep',   emoji: '🐑' },
  { key: 'poultry', emoji: '🐓' },
  { key: 'horse',   emoji: '🐴' },
  { key: 'dog',     emoji: '🐕' },
  { key: 'cat',     emoji: '🐈' },
];

const SERVICE_FILTERS = [
  { key: 'vaccination' },
  { key: 'artificial_insemination' },
  { key: 'emergency' },
  { key: 'surgery' },
  { key: 'farm_visit' },
  { key: 'pregnancy_diagnosis' },
  { key: 'general_checkup' },
  { key: 'telemedicine' },
];

const SORT_OPTIONS = [
  { key: 'rating',   tKey: 'doctor.sortRating' },
  { key: 'fee_asc',  tKey: 'doctor.sortFeeLow' },
  { key: 'fee_desc', tKey: 'doctor.sortFeeHigh' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Card
// ─────────────────────────────────────────────────────────────────────────────

function DoctorCard({ doc, onPress, navigation, t, index = 0 }) {
  const today = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
  const available = doc.availability?.days?.includes(today);
  const name = doc.fullName?.mr || doc.fullName?.en || '';
  const quals = Array.isArray(doc.qualifications)
    ? doc.qualifications.map(q => q.degree).join(', ')
    : '';
  const location = [doc.address?.village, doc.address?.district].filter(Boolean).join(', ');
  const dist = doc.distanceKm != null ? `${doc.distanceKm} ${t('doctor.kmAway')}` : location;

  const sc    = useRef(new Animated.Value(1)).current;
  const entry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entry, {
      toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true,
    }).start();
  }, []);

  const entryOpacity = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const entryY       = entry.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  function handleCall() {
    trackCallClick(doc.id);
    Linking.openURL(`tel:${doc.phone}`);
  }

  function handleWhatsApp() {
    trackWhatsAppClick(doc.id);
    const msg = encodeURIComponent(t('doctor.whatsappMsg'));
    Linking.openURL(`whatsapp://send?phone=${doc.phone}&text=${msg}`);
  }

  return (
    <Animated.View style={[{ opacity: entryOpacity, transform: [{ scale: sc }, { translateY: entryY }] }]}>
    <TouchableOpacity
      style={S.card}
      activeOpacity={1}
      onPress={onPress}
      onPressIn={() => Animated.spring(sc, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 9 }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 150, friction: 7 }).start()}
    >
      {/* Header row */}
      <View style={S.cardHeader}>
        {/* Avatar */}
        <View style={S.avatar}>
          <Ionicons name="person" size={28} color="#1A5C2A" />
        </View>

        {/* Info */}
        <View style={S.cardInfo}>
          <Text style={S.docName}>{name}</Text>
          <View style={S.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={S.ratingText}>
              {doc.rating?.average?.toFixed(1) || '—'}
            </Text>
            <Text style={S.ratingCount}>
              {t('doctor.farmerRatings', { count: doc.rating?.count || 0 })}
            </Text>
            {doc.experienceYears > 0 && (
              <Text style={S.exp}> · {t('doctor.years', { n: doc.experienceYears })}</Text>
            )}
          </View>
          {quals ? <Text style={S.qual}>{quals}</Text> : null}
        </View>

        {/* Available badge */}
        {available ? (
          <View style={S.availBadge}>
            <View style={S.greenDot} />
            <Text style={S.availText}>{t('doctor.available')}</Text>
          </View>
        ) : (
          <View style={[S.availBadge, { backgroundColor: '#FEF3C7' }]}>
            <View style={[S.greenDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[S.availText, { color: '#92400E' }]}>{t('doctor.closed')}</Text>
          </View>
        )}
      </View>

      {/* Animal types */}
      {doc.animalLabels?.length > 0 && (
        <Text style={S.animals} numberOfLines={1}>
          {doc.animalLabels.map(a => t(`doctor.animals.${a.key}`) || a.mr || a.en).join(' · ')}
        </Text>
      )}

      {/* Fees + location row */}
      <View style={S.infoRow}>
        {doc.consultationFee != null && (
          <View style={S.infoChip}>
            <Ionicons name="cash-outline" size={13} color="#1A5C2A" />
            <Text style={S.infoChipText}>₹{t('doctor.consultFee', { fee: doc.consultationFee })}</Text>
          </View>
        )}
        {doc.visitFee != null && (
          <View style={S.infoChip}>
            <Ionicons name="car-outline" size={13} color="#1A5C2A" />
            <Text style={S.infoChipText}>₹{t('doctor.visitFee', { fee: doc.visitFee })}</Text>
          </View>
        )}
        <View style={S.infoChip}>
          <Ionicons name="location-outline" size={13} color="#1A5C2A" />
          <Text style={S.infoChipText} numberOfLines={1}>{dist}</Text>
        </View>
        {doc.availability?.emergencyAvailable && (
          <View style={[S.infoChip, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="flash" size={12} color="#DC2626" />
            <Text style={[S.infoChipText, { color: '#DC2626' }]}>{t('doctor.emergency')}</Text>
          </View>
        )}
      </View>

      {/* Timing */}
      {doc.availability?.startTime && (
        <Text style={S.timing}>
          🕐 {doc.availability.startTime} — {doc.availability.endTime}
          {'  '}
          {doc.availability.dayLabels?.join(' · ')}
        </Text>
      )}

      {/* CTA row */}
      <View style={S.ctaRow}>
        <TouchableOpacity style={S.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={S.callBtnText}>{t('doctor.callBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={S.waBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
          <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          <Text style={S.waBtnText}>{t('doctor.whatsappBtn')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function DoctorHome({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [total, setTotal]               = useState(0);

  const [search, setSearch]             = useState('');
  const [selectedAnimal, setAnimal]     = useState(null);
  const [selectedService, setService]   = useState(null);
  const [sortBy, setSort]               = useState('rating');
  const [emergencyOnly, setEmergency]   = useState(false);

  const searchTimer = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchDoctors(opts = {}) {
    const params = {
      page:  opts.page || 1,
      limit: 15,
      sort:  opts.sort ?? sortBy,
    };
    if (opts.search ?? search)         params.search     = opts.search ?? search;
    if (opts.animal ?? selectedAnimal) params.animalType = opts.animal ?? selectedAnimal;
    if (opts.service ?? selectedService) params.service  = opts.service ?? selectedService;
    if (opts.emergency ?? emergencyOnly) params.emergency = 'true';

    const res = await getDoctors(params);
    return res;
  }

  async function loadInitial(overrides = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDoctors({ page: 1, ...overrides });
      setDoctors(res.data || []);
      setTotal(res.meta?.total || 0);
      setHasMore((res.meta?.page || 1) < (res.meta?.totalPages || 1));
      setPage(1);
    } catch (e) {
      console.warn('[DoctorHome]', e.message);
      setError(e.message || t('doctor.serverError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchDoctors({ page: nextPage });
      setDoctors(prev => [...prev, ...(res.data || [])]);
      setHasMore(nextPage < (res.meta?.totalPages || 1));
      setPage(nextPage);
    } catch (e) {
      console.warn('[DoctorHome loadMore]', e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { loadInitial(); }, []);

  // ── Filter handlers ────────────────────────────────────────────────────────

  function handleSearchChange(text) {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadInitial({ search: text });
    }, 500);
  }

  function toggleAnimal(key) {
    const next = selectedAnimal === key ? null : key;
    setAnimal(next);
    loadInitial({ animal: next });
  }

  function toggleService(key) {
    const next = selectedService === key ? null : key;
    setService(next);
    loadInitial({ service: next });
  }

  function handleSort(key) {
    setSort(key);
    loadInitial({ sort: key });
  }

  function toggleEmergency() {
    const next = !emergencyOnly;
    setEmergency(next);
    loadInitial({ emergency: next });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeFiltersCount = [selectedAnimal, selectedService, emergencyOnly ? 'em' : null].filter(Boolean).length;

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>{t('doctor.title')}</Text>
          <Text style={S.headerSub}>
            {loading ? t('doctor.searchingDoctors') : t('doctor.doctorsAvailable', { count: total })}
          </Text>
        </View>
        <Ionicons name="medkit" size={28} color="#1A5C2A" />
      </View>

      {/* ── Search bar ── */}
      <View style={S.searchWrap}>
        <Ionicons name="search" size={18} color="#888" style={S.searchIcon} />
        <TextInput
          style={S.searchInput}
          placeholder={t('doctor.searchPlaceholder')}
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={18} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={S.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
          {/* Emergency toggle */}
          <TouchableOpacity
            style={[S.chip, emergencyOnly && S.chipActive, { backgroundColor: emergencyOnly ? '#DC2626' : '#FEE2E2' }]}
            onPress={toggleEmergency}
          >
            <Text style={[S.chipText, { color: emergencyOnly ? '#FFF' : '#DC2626' }]}>{t('doctor.emergencyFilter')}</Text>
          </TouchableOpacity>

          {ANIMAL_FILTERS.map(a => (
            <TouchableOpacity
              key={a.key}
              style={[S.chip, selectedAnimal === a.key && S.chipActive]}
              onPress={() => toggleAnimal(a.key)}
            >
              <Text style={[S.chipText, selectedAnimal === a.key && S.chipTextActive]}>
                {a.emoji} {t(`doctor.animals.${a.key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Service chips ── */}
      <View style={S.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
          {SERVICE_FILTERS.map(sv => (
            <TouchableOpacity
              key={sv.key}
              style={[S.chip, selectedService === sv.key && S.chipActive]}
              onPress={() => toggleService(sv.key)}
            >
              <Text style={[S.chipText, selectedService === sv.key && S.chipTextActive]}>{t(`doctor.services.${sv.key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Sort row ── */}
      <View style={S.sortRow}>
        <Text style={S.sortLabel}>{t('doctor.sortLabel')}</Text>
        {SORT_OPTIONS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[S.sortChip, sortBy === s.key && S.sortChipActive]}
            onPress={() => handleSort(s.key)}
          >
            <Text style={[S.sortChipText, sortBy === s.key && S.sortChipTextActive]}>{t(s.tKey)}</Text>
          </TouchableOpacity>
        ))}
        {activeFiltersCount > 0 && (
          <TouchableOpacity
            style={S.clearBtn}
            onPress={() => {
              setAnimal(null); setService(null); setEmergency(false); setSearch('');
              loadInitial({ animal: null, service: null, emergency: false, search: '' });
            }}
          >
            <Text style={S.clearBtnText}>{t('doctor.clearFilters')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Doctor list ── */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color="#1A5C2A" />
          <Text style={S.loadingText}>{t('doctor.searchingDoctors')}</Text>
        </View>
      ) : error ? (
        <View style={S.center}>
          <Text style={{ fontSize: 36 }}>⚠️</Text>
          <Text style={{ color: '#C62828', fontWeight: '700', marginTop: 8, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, backgroundColor: '#1A5C2A', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
            onPress={() => loadInitial()}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('doctor.retryBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={d => d.id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadInitial(); }}
              colors={['#1A5C2A']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <View style={S.emptyIconBg}>
                <Ionicons name="medkit-outline" size={36} color="#1A5C2A" />
              </View>
              <Text style={S.emptyTitle}>Coming Soon</Text>
              <Text style={S.emptySub}>Veterinary doctors will be listed here.</Text>
              <Text style={S.emptyHint}>We're onboarding vets in your area.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ margin: 16 }} color="#1A5C2A" />
            ) : null
          }
          renderItem={({ item, index }) => (
            <DoctorCard
              doc={item}
              index={index}
              navigation={navigation}
              onPress={() => navigation.navigate('DoctorDetail', { doctorId: item.id })}
              t={t}
            />
          )}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F4F6F4' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFF' },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#1A5C2A' },
  headerSub:    { fontSize: 12, color: '#666', marginTop: 2 },

  // Search
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
                  marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12,
                  borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', height: 44 },
  searchIcon:   { marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 14, color: '#1A1A1A' },

  // Filter chips
  filterSection: { marginBottom: 4 },
  filterScroll:  { paddingHorizontal: 16, gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22,
                   backgroundColor: '#F0F7F0', borderWidth: 1.5, borderColor: '#C8E6C9' },
  chipActive:    { backgroundColor: '#1A5C2A', borderColor: '#1A5C2A',
                   shadowColor: '#1A5C2A', shadowOpacity: 0.30, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  chipText:      { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  chipTextActive:{ color: '#FFFFFF' },

  // Sort row
  sortRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                   paddingVertical: 8, gap: 8, flexWrap: 'wrap' },
  sortLabel:     { fontSize: 12, color: '#666', fontWeight: '600' },
  sortChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                   backgroundColor: '#EEF7EE', borderWidth: 1, borderColor: '#C8E6C9' },
  sortChipActive:    { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  sortChipText:      { fontSize: 12, color: '#2D6A4F', fontWeight: '600' },
  sortChipTextActive:{ color: '#FFF' },
  clearBtn:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                   backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  clearBtnText:  { fontSize: 12, color: '#C62828', fontWeight: '600' },

  // List
  list:         { padding: 12, gap: 12 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { color: '#666', fontSize: 14 },
  emptyWrap:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5EE', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
  emptySub:    { fontSize: 14, color: '#64748B', fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  emptyHint:   { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  // Card
  card:         { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.10, shadowRadius: 14, elevation: 5 },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F5E9',
                  alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#C8E6C9' },
  cardInfo:     { flex: 1 },
  docName:      { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 3 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:   { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  ratingCount:  { fontSize: 11, color: '#888' },
  exp:          { fontSize: 11, color: '#666' },
  qual:         { fontSize: 11, color: '#888', marginTop: 2 },

  // Availability badge
  availBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4,
                  borderRadius: 8 },
  greenDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  availText:    { fontSize: 11, fontWeight: '700', color: '#15803D' },

  // Info row
  animals:      { fontSize: 12, color: '#2D6A4F', marginBottom: 8, fontWeight: '600' },
  infoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  infoChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F7F0',
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoChipText: { fontSize: 11, color: '#2D6A4F', fontWeight: '600' },
  timing:       { fontSize: 11, color: '#777', marginBottom: 10 },

  // CTA buttons
  ctaRow:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  callBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: '#1A5C2A', borderRadius: 10, paddingVertical: 11 },
  callBtnText:  { color: '#FFF', fontSize: 14, fontWeight: '700' },
  waBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 11 },
  waBtnText:    { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
