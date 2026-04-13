/**
 * MandiBhavScreen — Real mandi prices from data.gov.in
 *
 * Features:
 *  - Commodity chip selector
 *  - State / District filter
 *  - Price cards sorted by highest modal price
 *  - Refresh + loading states
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getMandiPrices, getNearbyMandis } from '../../services/aiApi';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const COMMODITIES = [
  'Tomato','Onion','Potato','Wheat','Rice','Soybean','Cotton',
  'Maize','Gram','Tur','Sugarcane','Grapes','Pomegranate',
];

const STATES = ['Maharashtra','Punjab','Madhya Pradesh','Uttar Pradesh','Karnataka','Andhra Pradesh','Rajasthan'];

function PriceCard({ item }) {
  const pct = item.modalPrice && item.minPrice
    ? Math.round(((item.modalPrice - item.minPrice) / (item.maxPrice - item.minPrice || 1)) * 100)
    : 50;

  return (
    <View style={S.priceCard}>
      <View style={S.priceCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={S.mandiName} numberOfLines={1}>{item.market || item.mandi}</Text>
          <Text style={S.districtName}>{item.district}, {item.state}</Text>
        </View>
        <View style={S.modalBadge}>
          <Text style={S.modalPrice}>₹{item.modalPrice}</Text>
          <Text style={S.modalUnit}>/q</Text>
        </View>
      </View>
      <View style={S.priceRow}>
        <View style={S.priceItem}>
          <Text style={S.priceLabel}>Min</Text>
          <Text style={S.priceVal}>₹{item.minPrice}</Text>
        </View>
        <View style={S.priceDivider} />
        <View style={S.priceItem}>
          <Text style={S.priceLabel}>Modal</Text>
          <Text style={[S.priceVal, { color: GREEN }]}>₹{item.modalPrice}</Text>
        </View>
        <View style={S.priceDivider} />
        <View style={S.priceItem}>
          <Text style={S.priceLabel}>Max</Text>
          <Text style={S.priceVal}>₹{item.maxPrice}</Text>
        </View>
      </View>
      <View style={S.priceBar}>
        <View style={[S.priceBarFill, { width: `${pct}%` }]} />
      </View>
      {item.arrivalDate && (
        <Text style={S.arrivalDate}>Arrival: {item.arrivalDate}</Text>
      )}
    </View>
  );
}

export default function MandiBhavScreen({ navigation }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [commodity, setCommodity]   = useState('Tomato');
  const [state, setState]           = useState(user?.state || 'Maharashtra');
  const [district, setDistrict]     = useState(user?.district || '');
  const [prices, setPrices]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [showStateMenu, setShowStateMenu] = useState(false);

  const fetchPrices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getMandiPrices(commodity, state, district || null);
      const sorted = (result?.prices || result || []).sort((a, b) => b.modalPrice - a.modalPrice);
      setPrices(sorted);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to load prices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [commodity, state, district]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'मंडी भाव' : 'Mandi Bhav'}</Text>
          <Text style={S.headerSub}>{language === 'hi' ? 'लाइव • data.gov.in' : 'Live • data.gov.in'}</Text>
        </View>
        <View style={S.livePill}>
          <View style={S.liveDot} />
          <Text style={S.liveTxt}>LIVE</Text>
        </View>
      </View>

      {/* Commodity chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.chipScroll}
        contentContainerStyle={S.chipContent}
      >
        {COMMODITIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[S.chip, commodity === c && S.chipActive]}
            onPress={() => setCommodity(c)}
          >
            <Text style={[S.chipTxt, commodity === c && S.chipTxtActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* State filter row */}
      <View style={S.filterRow}>
        <TouchableOpacity style={S.stateBtn} onPress={() => setShowStateMenu(!showStateMenu)}>
          <Ionicons name="location-outline" size={14} color={GREEN} />
          <Text style={S.stateBtnTxt} numberOfLines={1}>{state}</Text>
          <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
        </TouchableOpacity>
        <TextInput
          style={S.districtInput}
          placeholder={language === 'hi' ? 'जिला (वैकल्पिक)' : 'District (optional)'}
          placeholderTextColor="#4A5A4A"
          value={district}
          onChangeText={setDistrict}
          onSubmitEditing={() => fetchPrices()}
        />
        <TouchableOpacity style={S.searchBtn} onPress={() => fetchPrices()}>
          <Ionicons name="search" size={18} color="#0A140A" />
        </TouchableOpacity>
      </View>

      {/* State dropdown */}
      {showStateMenu && (
        <View style={S.stateDropdown}>
          {STATES.map(s => (
            <TouchableOpacity
              key={s}
              style={S.stateItem}
              onPress={() => { setState(s); setShowStateMenu(false); }}
            >
              <Text style={[S.stateItemTxt, s === state && { color: GREEN }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={S.centered}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={S.loadingTxt}>{language === 'hi' ? 'भाव लोड हो रहे हैं...' : 'Loading prices...'}</Text>
        </View>
      ) : error ? (
        <View style={S.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#555" />
          <Text style={S.errorTxt}>{error}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={() => fetchPrices()}>
            <Text style={S.retryTxt}>{language === 'hi' ? 'पुनः प्रयास' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <PriceCard item={item} />}
          contentContainerStyle={S.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPrices(true)} tintColor={GREEN} />}
          ListEmptyComponent={
            <View style={S.centered}>
              <Ionicons name="storefront-outline" size={48} color="#555" />
              <Text style={S.emptyTxt}>{language === 'hi' ? 'कोई भाव नहीं मिला' : 'No prices found'}</Text>
              <Text style={S.emptySub}>{language === 'hi' ? 'अन्य जिला या राज्य आज़माएं' : 'Try a different district or state'}</Text>
            </View>
          }
          ListHeaderComponent={prices.length > 0 ? (
            <Text style={S.resultCount}>
              {prices.length} {language === 'hi' ? 'मंडी' : 'mandis'} • {commodity}
            </Text>
          ) : null}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 52, paddingHorizontal: 18, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F1F1EE' },
  headerSub:   { fontSize: 10, color: '#4A6A4A', marginTop: 1 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(46,204,113,0.12)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveTxt: { fontSize: 10, fontWeight: '800', color: GREEN },

  chipScroll:   { flexGrow: 0, maxHeight: 52 },
  chipContent:  { paddingHorizontal: 18, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: BORDER, backgroundColor: CARD,
  },
  chipActive:    { backgroundColor: GREEN, borderColor: GREEN },
  chipTxt:       { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  chipTxtActive: { color: '#0A140A' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  stateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CARD, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderColor: BORDER, maxWidth: 140,
  },
  stateBtnTxt: { fontSize: 13, color: '#D1D5DB', fontWeight: '600', flex: 1 },
  districtInput: {
    flex: 1, backgroundColor: CARD, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 13,
  },
  searchBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },

  stateDropdown: {
    marginHorizontal: 18, backgroundColor: '#1A2A1A',
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', zIndex: 99,
  },
  stateItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  stateItemTxt: { fontSize: 14, color: '#D1D5DB' },

  listContent: { paddingHorizontal: 18, paddingBottom: 40, gap: 10 },
  resultCount:  { fontSize: 11, color: '#4A6A4A', fontWeight: '700', marginBottom: 4, marginTop: 8 },

  priceCard: {
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  priceCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  mandiName:    { fontSize: 15, fontWeight: '700', color: '#F1F1EE' },
  districtName: { fontSize: 11, color: '#4A6A4A', marginTop: 2 },
  modalBadge:   { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  modalPrice:   { fontSize: 22, fontWeight: '900', color: GREEN },
  modalUnit:    { fontSize: 11, color: '#4A6A4A' },

  priceRow: { flexDirection: 'row', marginBottom: 10 },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: '#4A6A4A', fontWeight: '600', marginBottom: 2 },
  priceVal:   { fontSize: 14, fontWeight: '700', color: '#D1D5DB' },
  priceDivider: { width: 1, backgroundColor: BORDER, marginVertical: 2 },

  priceBar:     { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  priceBarFill: { height: 4, backgroundColor: GREEN, borderRadius: 2 },
  arrivalDate:  { fontSize: 10, color: '#4A6A4A', marginTop: 8 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#4A6A4A', marginTop: 8 },
  errorTxt: { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 32 },
  emptyTxt: { fontSize: 15, color: '#9CA3AF', fontWeight: '700' },
  emptySub:  { fontSize: 12, color: '#4A6A4A', textAlign: 'center' },
  retryBtn: {
    marginTop: 8, backgroundColor: GREEN, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },
});
