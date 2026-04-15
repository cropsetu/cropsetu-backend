/**
 * IrrigationScreen — Smart irrigation scheduling (FAO ET₀)
 *
 * Flow:
 *  1. User selects crop → fetch today's recommendation
 *  2. Hero card shows shouldIrrigate + reason + water amount
 *  3. User marks logId as 'irrigated' or 'skipped'
 *  4. 7-day strip forecast
 *
 * Backend:
 *  GET /irrigation/today?crop=Soybean&lat=18.52&lon=73.85  → { shouldIrrigate, reason, et0, kc, rainfall, waterAmount, weeklyForecast, id }
 *  POST /irrigation/log { logId, farmerAction }             → update existing log
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getIrrigationToday, logIrrigation, getCrops } from '../../services/aiApi';
import { useLocation } from '../../context/LocationContext';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function IrrigationScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { coords: gpsCoords } = useLocation();

  const [today, setToday]       = useState(null);
  const [logId, setLogId]       = useState(null);
  const [loggedAction, setLoggedAction] = useState(null); // 'irrigated' | 'skipped'
  const [weekly, setWeekly]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [crops, setCrops]       = useState([]);
  const [cropModal, setCropModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(user?.crops?.[0] || '');
  const [logging, setLogging]   = useState(false);

  const fetchRecommendation = useCallback(async (crop) => {
    if (!crop) {
      setCropModal(true);
      return;
    }
    setLoading(true);
    setError(null);
    setToday(null);
    setLogId(null);
    setLoggedAction(null);
    try {
      const lat = gpsCoords?.latitude  ?? 18.52;
      const lon = gpsCoords?.longitude ?? 73.85;

      const result = await getIrrigationToday({ crop, lat, lon });
      setToday(result);
      setLogId(result?.id || null);
      setWeekly(result?.weeklyForecast || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || (language === 'hi' ? 'डेटा लोड नहीं हुआ' : 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Load crops list lazily when modal opened
  const openCropModal = async () => {
    if (!crops.length) {
      getCrops().then(setCrops).catch(() => {});
    }
    setCropModal(true);
  };

  const selectCrop = (name) => {
    setSelectedCrop(name);
    setCropModal(false);
    fetchRecommendation(name);
  };

  const markAction = async (action) => {
    if (!logId) return;
    setLogging(true);
    try {
      await logIrrigation({ logId, farmerAction: action });
      setLoggedAction(action);
    } catch {}
    setLogging(false);
  };

  const shouldIrrigate = today?.shouldIrrigate;

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'सिंचाई शेड्यूल' : 'Irrigation Scheduler'}</Text>
          <Text style={S.headerSub}>FAO ET₀ · Open-Meteo</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* Crop selector */}
        <TouchableOpacity style={S.cropSelect} onPress={openCropModal}>
          <Ionicons name="leaf-outline" size={16} color={GREEN} />
          <Text style={[S.cropSelectTxt, selectedCrop && { color: '#F1F1EE' }]}>
            {selectedCrop || (language === 'hi' ? 'फसल चुनें →' : 'Select crop →')}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#4A6A4A" />
        </TouchableOpacity>

        {!selectedCrop && !loading && (
          <View style={S.promptCard}>
            <Ionicons name="water-outline" size={36} color="#4A6A4A" />
            <Text style={S.promptTxt}>
              {language === 'hi'
                ? 'फसल चुनें — हम FAO ET₀ और मौसम से बताएंगे कि आज सिंचाई जरूरी है या नहीं।'
                : 'Select a crop to get an FAO ET₀-based irrigation recommendation for today.'}
            </Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={S.centered}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={S.loadingTxt}>{language === 'hi' ? 'ET₀ गणना हो रही है...' : 'Computing ET₀...'}</Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={S.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color="#555" />
            <Text style={S.errorTxt}>{error}</Text>
            <TouchableOpacity style={S.retryBtn} onPress={() => fetchRecommendation(selectedCrop)}>
              <Text style={S.retryTxt}>{language === 'hi' ? 'पुनः प्रयास' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero card */}
        {today && !loading && (
          <>
            <LinearGradient
              colors={shouldIrrigate ? ['#0D2B1A', '#0A1F12'] : ['#0A1520', '#08101A']}
              style={S.heroCard}
            >
              <View style={S.heroIcon}>
                <Ionicons
                  name={shouldIrrigate ? 'water' : 'checkmark-circle'}
                  size={40}
                  color={shouldIrrigate ? '#3498DB' : GREEN}
                />
              </View>

              <Text style={[S.heroTitle, { color: shouldIrrigate ? '#3498DB' : GREEN }]}>
                {shouldIrrigate
                  ? (language === 'hi' ? 'आज सिंचाई करें' : 'Irrigate Today')
                  : (language === 'hi' ? 'आज सिंचाई जरूरी नहीं' : 'No Irrigation Needed Today')}
              </Text>

              {today.reason && <Text style={S.heroReason}>{today.reason}</Text>}

              {today.waterAmount != null && (
                <View style={S.heroStat}>
                  <Ionicons name="water-outline" size={14} color="#3498DB" />
                  <Text style={S.heroStatTxt}>
                    {today.waterAmount} mm {language === 'hi' ? 'पानी चाहिए' : 'water required'}
                  </Text>
                </View>
              )}

              {/* ET0 / Kc / Rainfall stats */}
              <View style={S.heroGrid}>
                {today.et0    != null && <View style={S.heroGridItem}><Text style={S.heroGridVal}>{Number(today.et0).toFixed(1)}</Text><Text style={S.heroGridLabel}>ET₀ mm</Text></View>}
                {today.kc     != null && <View style={S.heroGridItem}><Text style={S.heroGridVal}>{today.kc}</Text><Text style={S.heroGridLabel}>Kc</Text></View>}
                {today.rainfall != null && <View style={S.heroGridItem}><Text style={S.heroGridVal}>{today.rainfall}</Text><Text style={S.heroGridLabel}>{language === 'hi' ? 'बारिश mm' : 'Rain mm'}</Text></View>}
              </View>

              {/* Mark action */}
              {logId && !loggedAction && (
                <View style={S.actionRow}>
                  <TouchableOpacity
                    style={[S.actionBtn, { backgroundColor: 'rgba(52,152,219,0.20)', borderColor: '#3498DB40' }]}
                    onPress={() => markAction('irrigated')}
                    disabled={logging}
                  >
                    <Ionicons name="water" size={16} color="#3498DB" />
                    <Text style={[S.actionTxt, { color: '#3498DB' }]}>
                      {language === 'hi' ? 'सिंचाई किया' : 'I Irrigated'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.actionBtn, { backgroundColor: 'rgba(107,114,128,0.15)', borderColor: '#6B728040' }]}
                    onPress={() => markAction('skipped')}
                    disabled={logging}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#6B7280" />
                    <Text style={[S.actionTxt, { color: '#6B7280' }]}>
                      {language === 'hi' ? 'नहीं किया' : 'Skipped'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {loggedAction && (
                <View style={S.loggedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <Text style={S.loggedTxt}>
                    {loggedAction === 'irrigated'
                      ? (language === 'hi' ? 'दर्ज: सिंचाई की ✓' : 'Logged: Irrigated ✓')
                      : (language === 'hi' ? 'दर्ज: नहीं किया ✓' : 'Logged: Skipped ✓')}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* 7-day forecast strip */}
            {weekly.length > 0 && (
              <>
                <Text style={S.sectionLabel}>
                  {language === 'hi' ? '7 दिन का पूर्वानुमान' : '7-Day Forecast'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.forecastContent}>
                  {weekly.map((day, i) => {
                    const d = new Date(day.date);
                    return (
                      <View key={i} style={[S.dayCard, day.shouldIrrigate && S.dayCardNeedsWater]}>
                        <Text style={S.dayLabel}>{WEEKDAYS[d.getDay()]}</Text>
                        <Text style={S.dayDate}>{d.getDate()}</Text>
                        <Ionicons
                          name={day.shouldIrrigate ? 'water' : 'checkmark-circle-outline'}
                          size={20}
                          color={day.shouldIrrigate ? '#3498DB' : GREEN}
                        />
                        {day.rainfall > 0 && (
                          <View style={S.rainRow}>
                            <Ionicons name="rainy-outline" size={10} color="#3498DB" />
                            <Text style={S.rainTxt}>{day.rainfall}mm</Text>
                          </View>
                        )}
                        {day.et0 != null && <Text style={S.dayEt0}>ET₀ {Number(day.et0).toFixed(1)}</Text>}
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* Info card */}
        <View style={S.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={GREEN} />
          <Text style={S.infoTxt}>
            {language === 'hi'
              ? 'FAO Hargreaves समीकरण और Open-Meteo के लाइव मौसम डेटा से ET₀ गणना। फसल Kc गुणांक के साथ।'
              : 'ET₀ uses FAO Hargreaves equation with live Open-Meteo weather. Multiplied by FAO crop Kc coefficient.'}
          </Text>
        </View>
      </ScrollView>

      {/* Crop picker modal */}
      <Modal visible={cropModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>{language === 'hi' ? 'फसल चुनें' : 'Select Crop'}</Text>
            {!crops.length ? (
              <ActivityIndicator color={GREEN} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={crops}
                keyExtractor={(item) => item.id || item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity style={S.modalItem} onPress={() => selectCrop(item.name)}>
                    <Text style={[S.modalItemTxt, item.name === selectedCrop && { color: GREEN }]}>{item.name}</Text>
                    {item.nameHi && <Text style={S.modalItemHi}>{item.nameHi}</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={S.modalClose} onPress={() => setCropModal(false)}>
              <Text style={S.modalCloseTxt}>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  scroll: { paddingBottom: 40 },

  cropSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 18, marginBottom: 12,
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: BORDER,
  },
  cropSelectTxt: { flex: 1, fontSize: 14, color: '#4A5A4A', fontWeight: '600' },

  promptCard: {
    marginHorizontal: 18, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
    alignItems: 'center', gap: 12,
  },
  promptTxt: { fontSize: 13, color: '#4A6A4A', textAlign: 'center', lineHeight: 20 },

  heroCard: {
    margin: 18, marginTop: 4, borderRadius: 20, padding: 22,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: BORDER,
  },
  heroIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle:  { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroReason: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  heroStat: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(52,152,219,0.10)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  heroStatTxt: { fontSize: 13, color: '#3498DB', fontWeight: '700' },
  heroGrid: { flexDirection: 'row', gap: 24, marginTop: 4 },
  heroGridItem: { alignItems: 'center' },
  heroGridVal:   { fontSize: 16, fontWeight: '900', color: '#F1F1EE' },
  heroGridLabel: { fontSize: 10, color: '#4A6A4A', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 11, borderWidth: 1,
  },
  actionTxt: { fontSize: 13, fontWeight: '700' },
  loggedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(46,204,113,0.10)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  loggedTxt: { fontSize: 13, color: GREEN, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '900', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginHorizontal: 18, marginTop: 6, marginBottom: 10,
  },
  forecastContent: { paddingHorizontal: 18, gap: 8 },
  dayCard: {
    width: 66, backgroundColor: CARD, borderRadius: 14, padding: 10,
    alignItems: 'center', gap: 5, borderWidth: 1, borderColor: BORDER,
  },
  dayCardNeedsWater: { borderColor: 'rgba(52,152,219,0.40)' },
  dayLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700' },
  dayDate:  { fontSize: 14, color: '#F1F1EE', fontWeight: '800' },
  rainRow:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rainTxt:  { fontSize: 9, color: '#3498DB', fontWeight: '700' },
  dayEt0:   { fontSize: 9, color: '#4A6A4A' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 18, marginTop: 16,
    backgroundColor: 'rgba(46,204,113,0.04)',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#4A6A4A', lineHeight: 18 },

  centered: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#4A6A4A' },
  errorTxt:   { fontSize: 13, color: '#EF4444', textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1A2A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', padding: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#F1F1EE', marginBottom: 14 },
  modalItem: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  modalItemTxt: { fontSize: 14, color: '#D1D5DB', fontWeight: '600', flex: 1 },
  modalItemHi:  { fontSize: 13, color: '#4A6A4A' },
  modalClose: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalCloseTxt: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
});
