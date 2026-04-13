/**
 * SoilHealthScreen — Manual soil parameter entry + ICAR-based recommendations
 *
 * Backend field names:
 *   ph, nitrogen, phosphorus, potassium, organicCarbon, ec, zinc, boron, sulphur
 * Backend ratings shape:
 *   { rating, ratingHi, color, advice }
 * Recommendation endpoint:
 *   GET /soil/recommendation?soilId=xxx&crop=Wheat&area=1&unit=acre
 * Recommendation returns:
 *   { fertilizers: [{ name, qty, unit, adjustment }] }
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { submitSoilReport, getSoilReports, getCrops } from '../../services/aiApi';
import api from '../../services/api';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

// Backend field name → UI label mapping
const PARAM_FIELDS = [
  { key: 'ph',            label: 'pH',                hi: 'पीएच',            unit: '',        hint: '6.5–7.5', required: true },
  { key: 'nitrogen',      label: 'Nitrogen (N)',       hi: 'नाइट्रोजन',       unit: 'kg/ha',   hint: '>280',    required: true },
  { key: 'phosphorus',    label: 'Phosphorus (P)',     hi: 'फास्फोरस',        unit: 'kg/ha',   hint: '>20',     required: true },
  { key: 'potassium',     label: 'Potassium (K)',      hi: 'पोटाश',           unit: 'kg/ha',   hint: '>280',    required: true },
  { key: 'organicCarbon', label: 'Organic Carbon',    hi: 'जैव कार्बन',      unit: '%',       hint: '>0.75',   required: false },
  { key: 'ec',            label: 'EC',                hi: 'लवणता (EC)',       unit: 'dS/m',    hint: '<0.8',    required: false },
  { key: 'zinc',          label: 'Zinc (Zn)',          hi: 'जिंक',            unit: 'ppm',     hint: '>0.6',    required: false },
  { key: 'boron',         label: 'Boron (B)',          hi: 'बोरॉन',           unit: 'ppm',     hint: '>0.5',    required: false },
  { key: 'sulphur',       label: 'Sulphur (S)',        hi: 'सल्फर',           unit: 'ppm',     hint: '>10',     required: false },
];

// rating values from backend: optimal, low, medium, high, acidic, alkaline, slightly_acidic, slightly_alkaline, highly_alkaline, sufficient, low_ec
const RATING_COLORS = {
  optimal:           GREEN,
  high:              GREEN,
  sufficient:        GREEN,
  low_ec:            GREEN,
  medium:            '#F39C12',
  slightly_acidic:   '#F39C12',
  slightly_alkaline: '#F39C12',
  low:               '#E74C3C',
  acidic:            '#E74C3C',
  alkaline:          '#E74C3C',
  highly_alkaline:   '#E74C3C',
};

function HealthBar({ ratingObj, param, language }) {
  if (!ratingObj) return null;
  const color = ratingObj.color || RATING_COLORS[ratingObj.rating] || '#4A6A4A';
  const label = language === 'hi' ? (ratingObj.ratingHi || ratingObj.rating) : ratingObj.rating;

  return (
    <View style={S.healthBarCard}>
      <View style={S.healthBarTop}>
        <Text style={S.healthBarLabel}>{language === 'hi' ? param.hi : param.label}</Text>
        <View style={[S.ratingBadge, { backgroundColor: color + '25' }]}>
          <Text style={[S.ratingTxt, { color }]}>{label?.toUpperCase()}</Text>
        </View>
      </View>
      {/* Visual bar — fill based on rating group */}
      <View style={S.barTrack}>
        <View style={[S.barFill, {
          width: ['optimal','high','sufficient','low_ec'].includes(ratingObj.rating) ? '80%'
               : ['medium','slightly_acidic','slightly_alkaline'].includes(ratingObj.rating) ? '50%' : '25%',
          backgroundColor: color,
        }]} />
      </View>
      {ratingObj.advice ? <Text style={S.adviceTxt} numberOfLines={2}>{ratingObj.advice}</Text> : null}
    </View>
  );
}

export default function SoilHealthScreen({ navigation }) {
  const { language } = useLanguage();
  const [tab, setTab]             = useState('form');
  const [formData, setFormData]   = useState({});
  const [fieldName, setFieldName] = useState('');
  const [targetCrop, setTargetCrop] = useState('');
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState(null);
  const [fertilizers, setFertilizers] = useState([]);
  const [history, setHistory]     = useState([]);
  const [crops, setCrops]         = useState([]);
  const [cropModal, setCropModal] = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    getCrops().then(setCrops).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      getSoilReports().then(setHistory).catch(() => {});
    }
  }, [tab]);

  const setField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const required = ['ph', 'nitrogen', 'phosphorus', 'potassium'];
    for (const key of required) {
      if (!formData[key]) {
        setError(language === 'hi' ? `${key} दर्ज करें` : `${key} is required`);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      // Send with exact backend field names
      const payload = {
        fieldName: fieldName || 'My Field',
        ...formData,
      };
      const result = await submitSoilReport(payload);
      setReport(result);

      // Fetch recommendation if target crop is set
      if (targetCrop && result?.id) {
        try {
          const { data } = await api.get('/soil/recommendation', {
            params: { soilId: result.id, crop: targetCrop, area: 1, unit: 'acre' },
          });
          setFertilizers(data?.data?.fertilizers || []);
        } catch {}
      }

      setTab('report');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendation = async (rep, crop) => {
    if (!rep?.id || !crop) return;
    try {
      const { data } = await api.get('/soil/recommendation', {
        params: { soilId: rep.id, crop, area: 1, unit: 'acre' },
      });
      setFertilizers(data?.data?.fertilizers || []);
    } catch {}
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'मृदा स्वास्थ्य' : 'Soil Health'}</Text>
          <Text style={S.headerSub}>ICAR Soil Health Card Norms</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabRow}>
        {['form','report','history'].map(t => (
          <TouchableOpacity key={t} style={[S.tabBtn, tab === t && S.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtActive]}>
              {t === 'form'    ? (language === 'hi' ? 'नई जांच' : 'New Test')
               : t === 'report' ? (language === 'hi' ? 'रिपोर्ट'  : 'Report')
               :                  (language === 'hi' ? 'इतिहास'   : 'History')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'form' && (
        <ScrollView contentContainerStyle={S.formContent} keyboardShouldPersistTaps="handled">
          <TextInput
            style={S.fieldInput}
            placeholder={language === 'hi' ? 'खेत का नाम (वैकल्पिक)' : 'Field name (optional)'}
            placeholderTextColor="#4A5A4A"
            value={fieldName}
            onChangeText={setFieldName}
          />

          <Text style={S.sectionLabel}>{language === 'hi' ? 'मृदा मापदंड दर्ज करें' : 'Enter Soil Parameters'}</Text>
          <Text style={S.requiredNote}>* {language === 'hi' ? 'आवश्यक' : 'Required'}</Text>

          {PARAM_FIELDS.map(f => (
            <View key={f.key} style={S.paramRow}>
              <Text style={S.paramLabel}>
                {language === 'hi' ? f.hi : f.label}
                {f.required ? ' *' : ''}
              </Text>
              <TextInput
                style={S.paramInput}
                placeholder={f.hint}
                placeholderTextColor="#3A4A3A"
                keyboardType="decimal-pad"
                value={formData[f.key] || ''}
                onChangeText={v => setField(f.key, v)}
              />
              {f.unit ? <Text style={S.paramUnit}>{f.unit}</Text> : <View style={{ width: 44 }} />}
            </View>
          ))}

          <Text style={S.sectionLabel}>{language === 'hi' ? 'लक्ष्य फसल (सिफारिश के लिए)' : 'Target Crop (for recommendations)'}</Text>
          <TouchableOpacity style={S.cropSelect} onPress={() => setCropModal(true)}>
            <Ionicons name="leaf-outline" size={16} color={GREEN} />
            <Text style={[S.cropSelectTxt, targetCrop && { color: '#F1F1EE' }]}>
              {targetCrop || (language === 'hi' ? 'फसल चुनें...' : 'Select crop...')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#4A6A4A" />
          </TouchableOpacity>

          {error ? <Text style={S.errorTxt}>{error}</Text> : null}

          <TouchableOpacity style={[S.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#0A140A" />
              : <Text style={S.submitTxt}>{language === 'hi' ? 'विश्लेषण करें →' : 'Analyze Soil →'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === 'report' && (
        <ScrollView contentContainerStyle={S.reportContent}>
          {!report ? (
            <View style={S.centered}>
              <Ionicons name="flask-outline" size={48} color="#4A6A4A" />
              <Text style={S.emptyTxt}>{language === 'hi' ? 'पहले जांच करें' : 'Submit a soil test first'}</Text>
              <TouchableOpacity style={S.createBtnSmall} onPress={() => setTab('form')}>
                <Text style={S.createBtnSmallTxt}>{language === 'hi' ? 'जांच करें' : 'Start Test'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={S.reportTitle}>{report.fieldName || 'My Field'}</Text>
              {report.healthScore != null && (
                <View style={S.healthScoreCard}>
                  <Text style={S.healthScoreLabel}>{language === 'hi' ? 'मिट्टी स्वास्थ्य स्कोर' : 'Soil Health Score'}</Text>
                  <Text style={[S.healthScoreVal, { color: report.healthScore >= 60 ? GREEN : '#F39C12' }]}>
                    {report.healthScore}%
                  </Text>
                </View>
              )}

              <Text style={S.sectionLabel}>{language === 'hi' ? 'पैरामीटर रेटिंग' : 'Parameter Ratings'}</Text>
              {PARAM_FIELDS.map(f => {
                const ratingObj = report.ratings?.[f.key];
                if (!ratingObj) return null;
                return <HealthBar key={f.key} ratingObj={ratingObj} param={f} language={language} />;
              })}

              {/* Crop selector for getting recommendations */}
              {!fertilizers.length && (
                <View style={S.recPromptCard}>
                  <Text style={S.recPromptTxt}>
                    {language === 'hi' ? 'उर्वरक सिफारिश के लिए फसल चुनें:' : 'Select a crop to get fertilizer recommendations:'}
                  </Text>
                  <TouchableOpacity style={S.cropSelect} onPress={() => setCropModal(true)}>
                    <Ionicons name="leaf-outline" size={16} color={GREEN} />
                    <Text style={[S.cropSelectTxt, targetCrop && { color: '#F1F1EE' }]}>
                      {targetCrop || (language === 'hi' ? 'फसल चुनें' : 'Select crop')}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#4A6A4A" />
                  </TouchableOpacity>
                  {targetCrop ? (
                    <TouchableOpacity style={S.getRecBtn} onPress={() => loadRecommendation(report, targetCrop)}>
                      <Text style={S.getRecBtnTxt}>{language === 'hi' ? 'सिफारिश देखें →' : 'Get Recommendations →'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {fertilizers.length > 0 && (
                <>
                  <Text style={S.sectionLabel}>
                    {language === 'hi' ? 'उर्वरक सिफारिश' : 'Fertilizer Recommendations'}
                    {targetCrop ? ` — ${targetCrop}` : ''}
                  </Text>
                  {fertilizers.map((f, i) => (
                    <View key={i} style={S.recCard}>
                      <View style={S.recIcon}>
                        <Ionicons name="flask" size={18} color={GREEN} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.recFertilizer}>{f.name}</Text>
                        <Text style={S.recDose}>{f.qty} {f.unit}</Text>
                        {f.adjustment && <Text style={S.recTiming}>{f.adjustment}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'history' && (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id || String(Math.random())}
          contentContainerStyle={S.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={S.histCard}
              onPress={() => { setReport(item); setFertilizers([]); setTab('report'); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={S.histField}>{item.fieldName || 'Field'}</Text>
                <Text style={S.histDate}>
                  {item.testDate ? new Date(item.testDate).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.ph != null && <Text style={S.histMeta}>pH {item.ph}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#4A6A4A" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={S.centered}>
              <Ionicons name="document-outline" size={48} color="#4A6A4A" />
              <Text style={S.emptyTxt}>{language === 'hi' ? 'कोई रिकॉर्ड नहीं' : 'No records yet'}</Text>
            </View>
          }
        />
      )}

      {/* Crop picker modal */}
      <Modal visible={cropModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>{language === 'hi' ? 'फसल चुनें' : 'Select Crop'}</Text>
            <FlatList
              data={crops}
              keyExtractor={(item) => item.id || item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={S.modalItem}
                  onPress={() => { setTargetCrop(item.name); setCropModal(false); }}
                >
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

  tabRow: { flexDirection: 'row', padding: 12, gap: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  tabBtnActive:   { backgroundColor: GREEN, borderColor: GREEN },
  tabTxt:         { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  tabTxtActive:   { color: '#0A140A' },

  formContent: { padding: 18, gap: 12, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '900', color: '#9CA3AF',
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4,
  },
  requiredNote: { fontSize: 11, color: '#4A6A4A', marginTop: -6 },
  fieldInput: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 14,
  },
  paramRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paramLabel: { flex: 1, fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  paramInput: {
    width: 88, backgroundColor: CARD, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 14, textAlign: 'right',
  },
  paramUnit: { width: 44, fontSize: 10, color: '#4A6A4A', fontWeight: '600' },

  cropSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  cropSelectTxt: { flex: 1, fontSize: 14, color: '#4A5A4A' },

  errorTxt: { fontSize: 13, color: '#EF4444' },
  submitBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  submitTxt: { fontSize: 16, fontWeight: '800', color: '#0A140A' },

  // Report
  reportContent: { padding: 18, gap: 12, paddingBottom: 40 },
  reportTitle: { fontSize: 18, fontWeight: '800', color: '#F1F1EE' },
  healthScoreCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  healthScoreLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  healthScoreVal:   { fontSize: 28, fontWeight: '900' },
  healthBarCard: {
    backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER, gap: 6,
  },
  healthBarTop: { flexDirection: 'row', alignItems: 'center' },
  healthBarLabel: { flex: 1, fontSize: 13, color: '#D1D5DB', fontWeight: '600' },
  ratingBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingTxt: { fontSize: 9, fontWeight: '900' },
  barTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  adviceTxt: { fontSize: 11, color: '#4A6A4A', lineHeight: 16 },

  recPromptCard: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 10,
  },
  recPromptTxt: { fontSize: 13, color: '#9CA3AF' },
  getRecBtn: {
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  getRecBtnTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },

  recCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  recIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(46,204,113,0.10)', justifyContent: 'center', alignItems: 'center',
  },
  recFertilizer: { fontSize: 14, fontWeight: '700', color: '#F1F1EE' },
  recDose:       { fontSize: 12, color: GREEN, marginTop: 2 },
  recTiming:     { fontSize: 11, color: '#4A6A4A', marginTop: 2 },

  // History
  listContent: { padding: 18, gap: 10 },
  histCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  histField: { fontSize: 14, fontWeight: '700', color: '#F1F1EE' },
  histDate:  { fontSize: 11, color: '#4A6A4A', marginTop: 2 },
  histMeta:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 15, color: '#9CA3AF', fontWeight: '700', textAlign: 'center' },
  createBtnSmall: {
    marginTop: 8, backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
  },
  createBtnSmallTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },

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
