/**
 * MSPTrackerScreen — Official MSP vs current mandi comparison
 *
 * Tabs:
 *  - MSP Rates list (all crops, kharif/rabi)
 *  - MSP vs Mandi comparison for a selected crop
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getMSPRates, getMSPComparison } from '../../services/aiApi';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const SIGNAL_CONFIG = {
  ABOVE_MSP: { color: '#2ECC71', bg: 'rgba(46,204,113,0.12)', icon: 'trending-up',   label: 'Above MSP' },
  AT_MSP:    { color: '#F39C12', bg: 'rgba(243,156,18,0.12)', icon: 'remove',         label: 'At MSP'    },
  BELOW_MSP: { color: '#E74C3C', bg: 'rgba(231,76,60,0.12)',  icon: 'trending-down',  label: 'Below MSP' },
};

function MSPRateCard({ item, onCompare, language }) {
  return (
    <View style={S.rateCard}>
      <View style={S.rateCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={S.cropName}>{item.commodity}</Text>
          {item.commodityHi && <Text style={S.cropHi}>{item.commodityHi}</Text>}
        </View>
        <View>
          <Text style={S.mspValue}>₹{item.mspPrice?.toLocaleString()}</Text>
          <Text style={S.mspUnit}>/quintal</Text>
        </View>
      </View>
      <View style={S.rateCardMeta}>
        <View style={S.seasonBadge}>
          <Text style={S.seasonTxt}>{item.season}</Text>
        </View>
        <Text style={S.yearTxt}>{item.year}</Text>
        {item.increasePercent != null && (
          <View style={S.hikeBadge}>
            <Ionicons name="arrow-up" size={10} color={GREEN} />
            <Text style={S.hikeTxt}>{item.increasePercent}%</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={S.compareBtn} onPress={() => onCompare(item)}>
        <Ionicons name="swap-horizontal-outline" size={13} color={GREEN} />
        <Text style={S.compareTxt}>{language === 'hi' ? 'मंडी से तुलना करें' : 'Compare with Mandi'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ComparisonView({ item, state, language, onBack }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMSPComparison(item.commodity, state)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [item.commodity, state]);

  if (loading) {
    return (
      <View style={S.centered}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={S.loadingTxt}>{language === 'hi' ? 'तुलना लोड हो रही है...' : 'Loading comparison...'}</Text>
      </View>
    );
  }

  const sig = data?.signal ? SIGNAL_CONFIG[data.signal] || SIGNAL_CONFIG.AT_MSP : null;
  const suggestion = data?.signalHi || data?.suggestion || null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 14 }}>
      <TouchableOpacity onPress={onBack} style={S.backLink}>
        <Ionicons name="chevron-back" size={16} color={GREEN} />
        <Text style={S.backLinkTxt}>{language === 'hi' ? 'वापस' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={S.compTitle}>{item.commodity} — MSP vs Mandi</Text>

      {sig && (
        <View style={[S.signalCard, { backgroundColor: sig.bg, borderColor: sig.color + '40' }]}>
          <Ionicons name={sig.icon} size={28} color={sig.color} />
          <View style={{ flex: 1 }}>
            <Text style={[S.signalLabel, { color: sig.color }]}>{sig.label}</Text>
            {suggestion ? <Text style={S.signalDesc}>{suggestion}</Text> : null}
          </View>
        </View>
      )}

      <View style={S.compGrid}>
        <View style={[S.compBox, { borderColor: '#2ECC7140' }]}>
          <Text style={S.compBoxLabel}>{language === 'hi' ? 'सरकारी MSP' : 'Govt MSP'}</Text>
          <Text style={[S.compBoxVal, { color: GREEN }]}>
            ₹{data?.msp?.price?.toLocaleString() || item.mspPrice?.toLocaleString()}
          </Text>
          <Text style={S.compBoxUnit}>/quintal</Text>
        </View>
        <View style={[S.compBox, { borderColor: '#F39C1240' }]}>
          <Text style={S.compBoxLabel}>{language === 'hi' ? 'मंडी भाव' : 'Mandi Price'}</Text>
          <Text style={[S.compBoxVal, { color: '#F39C12' }]}>
            ₹{data?.mandi?.modalPrice?.toLocaleString() || '—'}
          </Text>
          <Text style={S.compBoxUnit}>/quintal</Text>
        </View>
      </View>

      {data?.mandi && (
        <>
          <Text style={S.sectionLabel}>{language === 'hi' ? 'मंडी भाव' : 'Mandi Price'}</Text>
          <View style={S.mandiRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.mandiRowName}>{data.mandi.market}</Text>
              <Text style={S.mandiRowDist}>{data.mandi.district}</Text>
            </View>
            <Text style={S.mandiRowPrice}>₹{data.mandi.modalPrice}</Text>
            {data.signal && (
              <View style={[S.miniSignal, { backgroundColor: SIGNAL_CONFIG[data.signal]?.bg }]}>
                <Ionicons name={SIGNAL_CONFIG[data.signal]?.icon} size={12} color={SIGNAL_CONFIG[data.signal]?.color} />
              </View>
            )}
          </View>
          {data.priceDiffFromMSP != null && (
            <Text style={{ fontSize: 12, color: '#4A6A4A', marginTop: 4 }}>
              {data.priceDiffFromMSP >= 0 ? '+' : ''}₹{data.priceDiffFromMSP} {language === 'hi' ? 'MSP से' : 'from MSP'}
              {data.priceDiffPercent != null ? ` (${data.priceDiffPercent > 0 ? '+' : ''}${data.priceDiffPercent}%)` : ''}
            </Text>
          )}
        </>
      )}

      {!data && (
        <Text style={S.errorTxt}>{language === 'hi' ? 'तुलना उपलब्ध नहीं' : 'Comparison not available'}</Text>
      )}
    </ScrollView>
  );
}

export default function MSPTrackerScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [rates, setRates]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [season, setSeason]     = useState('kharif');
  const [comparing, setComparing] = useState(null);

  useEffect(() => {
    setLoading(true);
    getMSPRates(null, season)
      .then(d => setRates(Array.isArray(d) ? d : (d?.rates || [])))
      .catch(() => setRates([]))
      .finally(() => setLoading(false));
  }, [season]);

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => { comparing ? setComparing(null) : navigation.goBack(); }} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'MSP ट्रैकर' : 'MSP Tracker'}</Text>
          <Text style={S.headerSub}>{language === 'hi' ? 'CACP / सरकार • 2025-26' : 'CACP / GoI • 2025-26'}</Text>
        </View>
      </View>

      {!comparing && (
        <View style={S.seasonRow}>
          {['kharif', 'rabi'].map(s => (
            <TouchableOpacity
              key={s}
              style={[S.seasonTab, season === s && S.seasonTabActive]}
              onPress={() => setSeason(s)}
            >
              <Text style={[S.seasonTabTxt, season === s && S.seasonTabTxtActive]}>
                {s === 'kharif' ? (language === 'hi' ? 'खरीफ' : 'Kharif') : (language === 'hi' ? 'रबी' : 'Rabi')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {comparing ? (
        <ComparisonView
          item={comparing}
          state={user?.state || 'Maharashtra'}
          language={language}
          onBack={() => setComparing(null)}
        />
      ) : loading ? (
        <View style={S.centered}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={S.loadingTxt}>{language === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}</Text>
        </View>
      ) : (
        <FlatList
          data={rates}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <MSPRateCard item={item} language={language} onCompare={setComparing} />
          )}
          contentContainerStyle={S.listContent}
          ListEmptyComponent={
            <Text style={S.emptyTxt}>{language === 'hi' ? 'कोई MSP नहीं मिला' : 'No MSP rates found'}</Text>
          }
          ListHeaderComponent={
            <Text style={S.infoTxt}>
              {language === 'hi'
                ? 'ये सरकारी न्यूनतम समर्थन मूल्य हैं। किसान को कम से कम यही मिलना चाहिए।'
                : 'These are government-declared Minimum Support Prices. Farmers are entitled to at least these prices.'}
            </Text>
          }
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

  seasonRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  seasonTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, alignItems: 'center',
  },
  seasonTabActive:    { backgroundColor: GREEN, borderColor: GREEN },
  seasonTabTxt:       { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  seasonTabTxtActive: { color: '#0A140A' },

  listContent: { paddingHorizontal: 18, paddingBottom: 40, gap: 10 },
  infoTxt: {
    fontSize: 12, color: '#4A6A4A', marginBottom: 8, marginTop: 4,
    lineHeight: 18, paddingHorizontal: 4,
  },

  rateCard: {
    backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER, gap: 10,
  },
  rateCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cropName:    { fontSize: 15, fontWeight: '700', color: '#F1F1EE' },
  cropHi:      { fontSize: 12, color: '#4A6A4A', marginTop: 2 },
  mspValue:    { fontSize: 20, fontWeight: '900', color: GREEN, textAlign: 'right' },
  mspUnit:     { fontSize: 10, color: '#4A6A4A', textAlign: 'right' },
  rateCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonBadge: {
    backgroundColor: 'rgba(46,204,113,0.10)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  seasonTxt: { fontSize: 10, fontWeight: '700', color: GREEN, textTransform: 'capitalize' },
  yearTxt:   { fontSize: 11, color: '#4A6A4A', flex: 1 },
  hikeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  hikeTxt: { fontSize: 10, color: GREEN, fontWeight: '700' },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 2,
  },
  compareTxt: { fontSize: 12, color: GREEN, fontWeight: '700' },

  // Comparison view
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkTxt: { fontSize: 14, color: GREEN, fontWeight: '600' },
  compTitle: { fontSize: 16, fontWeight: '800', color: '#F1F1EE' },
  signalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  signalLabel: { fontSize: 16, fontWeight: '800' },
  signalDesc:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  compGrid: { flexDirection: 'row', gap: 12 },
  compBox: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, alignItems: 'center',
  },
  compBoxLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 },
  compBoxVal:   { fontSize: 22, fontWeight: '900' },
  compBoxUnit:  { fontSize: 10, color: '#4A6A4A', marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase' },
  mandiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  mandiRowName:  { fontSize: 13, fontWeight: '700', color: '#F1F1EE' },
  mandiRowDist:  { fontSize: 11, color: '#4A6A4A' },
  mandiRowPrice: { fontSize: 15, fontWeight: '800', color: '#F39C12' },
  miniSignal: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#4A6A4A', marginTop: 8 },
  errorTxt: { fontSize: 14, color: '#EF4444', textAlign: 'center' },
  emptyTxt: { fontSize: 15, color: '#9CA3AF', fontWeight: '700', textAlign: 'center', paddingTop: 40 },
});
