/**
 * InputCalculatorScreen — Seed, fertilizer, labour & pesticide cost estimator
 *
 * Flow:
 *  - Select crop + enter area + unit
 *  - Tap Calculate → itemized cost list by category
 *  - Summary card: total cost, cost per acre, yield range
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { calculateInputs, getCrops } from '../../services/aiApi';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const CATEGORY_ICONS = {
  'Seed':        { icon: 'ellipse',           color: '#27AE60' },
  'Fertilizer':  { icon: 'flask',             color: '#F39C12' },
  'Labour':      { icon: 'people',            color: '#3498DB' },
  'Pesticides':  { icon: 'bug',               color: '#E74C3C' },
  'Irrigation':  { icon: 'water',             color: '#2980B9' },
};

const UNITS = ['acre', 'hectare', 'bigha', 'guntha'];

function getCategoryConfig(category) {
  const key = Object.keys(CATEGORY_ICONS).find(k => category?.includes(k));
  return CATEGORY_ICONS[key] || { icon: 'cube', color: '#9CA3AF' };
}

function CostItem({ item }) {
  const cfg = getCategoryConfig(item.category);
  return (
    <View style={S.costItem}>
      <View style={[S.costIcon, { backgroundColor: cfg.color + '18' }]}>
        <Ionicons name={cfg.icon + '-outline'} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.itemCategory}>{item.category}</Text>
        <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
        {item.quantity != null && (
          <Text style={S.itemQty}>
            {item.quantity} {item.unit}
            {item.unitPrice ? ` · ${item.unitPrice}` : ''}
          </Text>
        )}
        {item.note && <Text style={S.itemNote} numberOfLines={1}>{item.note}</Text>}
      </View>
      <Text style={[S.itemCost, { color: item.cost ? '#F1F1EE' : '#4A6A4A' }]}>
        {item.cost != null ? `₹${item.cost.toLocaleString()}` : 'Market'}
      </Text>
    </View>
  );
}

export default function InputCalculatorScreen({ navigation }) {
  const { language } = useLanguage();
  const [crop, setCrop]         = useState('');
  const [area, setArea]         = useState('');
  const [unit, setUnit]         = useState('acre');
  const [organic, setOrganic]   = useState(false);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [crops, setCrops]       = useState([]);
  const [cropModal, setCropModal] = useState(false);
  const [unitModal, setUnitModal] = useState(false);

  useEffect(() => {
    getCrops().then(setCrops).catch(() => {});
  }, []);

  const handleCalculate = async () => {
    if (!crop) {
      setError(language === 'hi' ? 'फसल चुनें' : 'Select a crop');
      return;
    }
    if (!area || isNaN(parseFloat(area)) || parseFloat(area) <= 0) {
      setError(language === 'hi' ? 'क्षेत्र दर्ज करें' : 'Enter a valid area');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await calculateInputs(crop, parseFloat(area), unit, organic);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const BREAKDOWN_KEYS = [
    { key: 'seed',        label: language === 'hi' ? 'बीज' : 'Seed',       color: '#27AE60' },
    { key: 'fertilizer',  label: language === 'hi' ? 'उर्वरक' : 'Fertilizer', color: '#F39C12' },
    { key: 'labour',      label: language === 'hi' ? 'मजदूरी' : 'Labour',   color: '#3498DB' },
    { key: 'pesticide',   label: language === 'hi' ? 'कीटनाशक' : 'Pesticides', color: '#E74C3C' },
    { key: 'irrigation',  label: language === 'hi' ? 'सिंचाई' : 'Irrigation', color: '#2980B9' },
  ];

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'इनपुट कैलकुलेटर' : 'Input Calculator'}</Text>
          <Text style={S.headerSub}>{language === 'hi' ? 'बीज · उर्वरक · मजदूरी' : 'Seed · Fertilizer · Labour'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        {/* Crop selector */}
        <TouchableOpacity style={S.cropSelect} onPress={() => setCropModal(true)}>
          <Ionicons name="leaf-outline" size={16} color={GREEN} />
          <Text style={[S.cropSelectTxt, crop && { color: '#F1F1EE' }]}>
            {crop || (language === 'hi' ? 'फसल चुनें *' : 'Select crop *')}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#4A6A4A" />
        </TouchableOpacity>

        {/* Area + unit */}
        <View style={S.areaRow}>
          <TextInput
            style={[S.input, { flex: 1 }]}
            placeholder={language === 'hi' ? 'क्षेत्र (संख्या)' : 'Area (number)'}
            placeholderTextColor="#4A5A4A"
            keyboardType="decimal-pad"
            value={area}
            onChangeText={setArea}
          />
          <TouchableOpacity style={S.unitBtn} onPress={() => setUnitModal(true)}>
            <Text style={S.unitBtnTxt}>{unit}</Text>
            <Ionicons name="chevron-down" size={13} color="#4A6A4A" />
          </TouchableOpacity>
        </View>

        {/* Organic toggle */}
        <TouchableOpacity style={S.organicRow} onPress={() => setOrganic(o => !o)}>
          <View style={[S.toggle, organic && S.toggleActive]}>
            {organic && <Ionicons name="checkmark" size={12} color="#0A140A" />}
          </View>
          <Text style={S.organicTxt}>{language === 'hi' ? 'जैविक खेती (Organic)' : 'Organic farming mode'}</Text>
        </TouchableOpacity>

        {error ? <Text style={S.errorTxt}>{error}</Text> : null}

        <TouchableOpacity style={[S.calcBtn, loading && { opacity: 0.6 }]} onPress={handleCalculate} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A140A" /> : (
            <Text style={S.calcTxt}>{language === 'hi' ? 'लागत जानें →' : 'Calculate Cost →'}</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <View style={S.summaryCard}>
              <Text style={S.summaryTitle}>
                {result.crop} · {result.areaAcres} {language === 'hi' ? 'एकड़' : 'acres'}
              </Text>
              <Text style={S.totalCost}>₹{result.summary?.totalCost?.toLocaleString()}</Text>
              <Text style={S.perAcre}>
                ₹{result.summary?.costPerAcre?.toLocaleString()} {language === 'hi' ? '/एकड़' : '/acre'}
              </Text>
              {result.summary?.yieldRange && typeof result.summary.yieldRange === 'object' && (
                <Text style={S.yieldRange}>
                  {language === 'hi' ? 'उपज:' : 'Yield:'} {result.summary.yieldRange.min}–{result.summary.yieldRange.max} {result.summary.yieldRange.unit || 'q/acre'}
                </Text>
              )}
            </View>

            {/* Breakdown bars */}
            {result.costBreakdown && (
              <View style={S.breakdownCard}>
                <Text style={S.breakdownTitle}>{language === 'hi' ? 'लागत विवरण' : 'Cost Breakdown'}</Text>
                {BREAKDOWN_KEYS.map(({ key, label, color }) => {
                  const val = result.costBreakdown[key];
                  if (!val) return null;
                  const pct = Math.round((val / result.summary.totalCost) * 100);
                  return (
                    <View key={key} style={S.breakdownRow}>
                      <Text style={S.bdLabel}>{label}</Text>
                      <View style={S.bdBarTrack}>
                        <View style={[S.bdBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={S.bdVal}>₹{val.toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Item list */}
            <Text style={S.sectionLabel}>{language === 'hi' ? 'मद वार विवरण' : 'Itemized Details'}</Text>
            {result.items?.map((item, i) => <CostItem key={i} item={item} />)}

            <Text style={S.disclaimer}>{result.disclaimer}</Text>
          </>
        )}
      </ScrollView>

      {/* Crop picker modal */}
      <Modal visible={cropModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>{language === 'hi' ? 'फसल चुनें' : 'Select Crop'}</Text>
            <FlatList
              data={crops}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <TouchableOpacity style={S.modalItem} onPress={() => { setCrop(item.name); setCropModal(false); }}>
                  <Text style={S.modalItemTxt}>{item.name}</Text>
                  {item.nameHi && <Text style={S.modalItemHi}>{item.nameHi}</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={S.modalClose} onPress={() => setCropModal(false)}>
              <Text style={S.modalCloseTxt}>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unit picker modal */}
      <Modal visible={unitModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>{language === 'hi' ? 'इकाई चुनें' : 'Select Unit'}</Text>
            {UNITS.map(u => (
              <TouchableOpacity key={u} style={S.modalItem} onPress={() => { setUnit(u); setUnitModal(false); }}>
                <Text style={[S.modalItemTxt, u === unit && { color: GREEN }]}>{u}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={S.modalClose} onPress={() => setUnitModal(false)}>
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

  scroll: { padding: 18, paddingBottom: 40, gap: 12 },

  cropSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  cropSelectTxt: { flex: 1, fontSize: 14, color: '#4A5A4A' },

  areaRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 14,
  },
  unitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  unitBtnTxt: { fontSize: 13, color: '#D1D5DB', fontWeight: '700' },

  organicRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#4A6A4A',
    justifyContent: 'center', alignItems: 'center',
  },
  toggleActive: { backgroundColor: GREEN, borderColor: GREEN },
  organicTxt: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },

  errorTxt: { fontSize: 13, color: '#EF4444' },
  calcBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  calcTxt: { fontSize: 16, fontWeight: '800', color: '#0A140A' },

  summaryCard: {
    backgroundColor: 'rgba(46,204,113,0.07)', borderRadius: 18,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: GREEN + '35',
    gap: 4,
  },
  summaryTitle: { fontSize: 13, color: '#4A6A4A', fontWeight: '700' },
  totalCost:  { fontSize: 32, fontWeight: '900', color: GREEN },
  perAcre:    { fontSize: 13, color: '#9CA3AF' },
  yieldRange: { fontSize: 12, color: '#4A6A4A', marginTop: 4 },

  breakdownCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, gap: 10,
  },
  breakdownTitle: { fontSize: 13, fontWeight: '800', color: '#F1F1EE', marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bdLabel: { width: 76, fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  bdBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  bdBarFill: { height: 6, borderRadius: 3 },
  bdVal: { width: 70, fontSize: 11, color: '#F1F1EE', fontWeight: '700', textAlign: 'right' },

  sectionLabel: {
    fontSize: 11, fontWeight: '900', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  costItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: BORDER,
  },
  costIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  itemCategory: { fontSize: 10, color: '#4A6A4A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  itemName: { fontSize: 13, color: '#F1F1EE', fontWeight: '700', marginTop: 2 },
  itemQty:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  itemNote: { fontSize: 10, color: '#4A6A4A', marginTop: 2 },
  itemCost: { fontSize: 15, fontWeight: '800', marginTop: 2 },

  disclaimer: { fontSize: 11, color: '#4A6A4A', lineHeight: 17, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1A2A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#F1F1EE', marginBottom: 14 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalItemTxt: { fontSize: 14, color: '#D1D5DB', fontWeight: '600', flex: 1 },
  modalItemHi:  { fontSize: 13, color: '#4A6A4A' },
  modalClose: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalCloseTxt: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
});
