/**
 * PestAlertsScreen — Weather-triggered pest risk alerts
 *
 * Shows severity-sorted alerts using Open-Meteo weather + ICAR rules.
 * Detail expand: symptoms + organic/chemical solutions.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getPestAlerts } from '../../services/aiApi';
import { useLocation } from '../../context/LocationContext';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const SEVERITY = {
  critical: { color: '#E74C3C', bg: 'rgba(231,76,60,0.12)', icon: 'warning',        rank: 0 },
  high:     { color: '#F39C12', bg: 'rgba(243,156,18,0.12)', icon: 'alert-circle',   rank: 1 },
  moderate: { color: '#F1C40F', bg: 'rgba(241,196,15,0.12)', icon: 'information-circle', rank: 2 },
  low:      { color: '#2ECC71', bg: 'rgba(46,204,113,0.10)', icon: 'checkmark-circle', rank: 3 },
};

function AlertCard({ alert, onPress }) {
  const cfg = SEVERITY[alert.severity] || SEVERITY.moderate;
  return (
    <TouchableOpacity style={[S.alertCard, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]} onPress={onPress}>
      <View style={[S.sevIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon + '-outline'} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={S.alertTop}>
          <Text style={S.pestName}>{alert.pest}</Text>
          <View style={[S.sevBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[S.sevTxt, { color: cfg.color }]}>{alert.severity?.toUpperCase()}</Text>
          </View>
        </View>
        {alert.crops?.length > 0 && (
          <Text style={S.affectedCrops}>
            Affects: {alert.crops.join(', ')}
          </Text>
        )}
        {alert.reason && <Text style={S.alertReason} numberOfLines={2}>{alert.reason}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4A6A4A" />
    </TouchableOpacity>
  );
}

function AlertDetail({ alert, language, onBack }) {
  const cfg = SEVERITY[alert.severity] || SEVERITY.moderate;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={S.detailContent}>
      <TouchableOpacity onPress={onBack} style={S.backLink}>
        <Ionicons name="chevron-back" size={16} color={GREEN} />
        <Text style={S.backLinkTxt}>{language === 'hi' ? 'वापस' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={[S.detailHeader, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]}>
        <Text style={S.detailPest}>{alert.pest}</Text>
        <View style={[S.sevBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[S.sevTxt, { color: cfg.color }]}>{alert.severity?.toUpperCase()}</Text>
        </View>
        {alert.crops?.length > 0 && (
          <Text style={S.detailCrops}>{alert.crops.join(' · ')}</Text>
        )}
      </View>

      {alert.reason && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            {language === 'hi' ? 'क्यों आया यह अलर्ट?' : 'Why this alert?'}
          </Text>
          <Text style={S.sectionBody}>{alert.reason}</Text>
        </View>
      )}

      {alert.symptoms?.length > 0 && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>{language === 'hi' ? 'लक्षण' : 'Symptoms'}</Text>
          {alert.symptoms.map((s, i) => (
            <View key={i} style={S.bulletRow}>
              <View style={[S.bullet, { backgroundColor: cfg.color }]} />
              <Text style={S.bulletTxt}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {alert.organicControl?.length > 0 && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            🌿 {language === 'hi' ? 'जैविक नियंत्रण' : 'Organic Control'}
          </Text>
          {alert.organicControl.map((s, i) => (
            <View key={i} style={S.bulletRow}>
              <View style={[S.bullet, { backgroundColor: GREEN }]} />
              <Text style={S.bulletTxt}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {alert.chemicalControl?.length > 0 && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            💊 {language === 'hi' ? 'रासायनिक नियंत्रण' : 'Chemical Control'}
          </Text>
          {alert.chemicalControl.map((s, i) => (
            <View key={i} style={S.bulletRow}>
              <View style={[S.bullet, { backgroundColor: '#E74C3C' }]} />
              <Text style={S.bulletTxt}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {alert.preventiveMeasures?.length > 0 && (
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            🛡️ {language === 'hi' ? 'निवारक उपाय' : 'Preventive Measures'}
          </Text>
          {alert.preventiveMeasures.map((s, i) => (
            <View key={i} style={S.bulletRow}>
              <View style={[S.bullet, { backgroundColor: '#3498DB' }]} />
              <Text style={S.bulletTxt}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default function PestAlertsScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { coords: gpsCoords } = useLocation();
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError]       = useState(null);
  const [locName, setLocName]   = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lat = gpsCoords?.latitude  ?? user?.lat ?? 19.9975;
      const lon = gpsCoords?.longitude ?? user?.lon ?? 73.7898;
      if (gpsCoords) setLocName(`${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`);

      const crops = user?.crops?.length ? user.crops : [];
      const result = await getPestAlerts(lat, lon, crops, user?.state || 'Maharashtra', user?.district);
      const sorted = (result || []).sort((a, b) => {
        const ra = SEVERITY[a.severity]?.rank ?? 3;
        const rb = SEVERITY[b.severity]?.rank ?? 3;
        return ra - rb;
      });
      setAlerts(sorted);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to load pest alerts');
    } finally {
      setLoading(false);
    }
  }, [user, gpsCoords]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => selected ? setSelected(null) : navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'कीट अलर्ट' : 'Pest Alerts'}</Text>
          {locName ? <Text style={S.headerSub}>{locName}</Text>
            : <Text style={S.headerSub}>{language === 'hi' ? 'मौसम-आधारित जोखिम' : 'Weather-based risk engine'}</Text>}
        </View>
        <TouchableOpacity onPress={fetchAlerts} style={S.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={GREEN} />
        </TouchableOpacity>
      </View>

      {selected ? (
        <AlertDetail alert={selected} language={language} onBack={() => setSelected(null)} />
      ) : loading ? (
        <View style={S.centered}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={S.loadingTxt}>{language === 'hi' ? 'कीट जोखिम विश्लेषण...' : 'Analyzing pest risk...'}</Text>
        </View>
      ) : error ? (
        <View style={S.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#555" />
          <Text style={S.errorTxt}>{error}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={fetchAlerts}>
            <Text style={S.retryTxt}>{language === 'hi' ? 'पुनः प्रयास' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <AlertCard alert={item} onPress={() => setSelected(item)} />}
          contentContainerStyle={S.listContent}
          ListHeaderComponent={
            <View style={S.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
              <Text style={S.infoTxt}>
                {language === 'hi'
                  ? 'ये अलर्ट आपके क्षेत्र के मौसम और ICAR कीट नियमों पर आधारित हैं।'
                  : 'Alerts based on live weather and ICAR pest risk rules for your location.'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={S.centered}>
              <Ionicons name="checkmark-circle-outline" size={56} color={GREEN} />
              <Text style={S.emptyTxt}>{language === 'hi' ? 'कोई कीट जोखिम नहीं' : 'No pest risks detected'}</Text>
              <Text style={S.emptySub}>{language === 'hi' ? 'आपका खेत सुरक्षित है!' : 'Your field is safe right now!'}</Text>
            </View>
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
  refreshBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  listContent: { padding: 18, paddingBottom: 40, gap: 10 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(46,204,113,0.06)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 4,
  },
  infoTxt: { flex: 1, fontSize: 12, color: '#4A6A4A', lineHeight: 18 },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sevIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pestName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#F1F1EE' },
  sevBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  sevTxt: { fontSize: 9, fontWeight: '900' },
  affectedCrops: { fontSize: 11, color: GREEN, fontWeight: '600', marginBottom: 2 },
  alertReason: { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },

  // Detail view
  detailContent: { padding: 18, gap: 16, paddingBottom: 40 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkTxt: { fontSize: 14, color: GREEN, fontWeight: '600' },
  detailHeader: {
    backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER,
    gap: 6,
  },
  detailPest:  { fontSize: 20, fontWeight: '900', color: '#F1F1EE' },
  detailCrops: { fontSize: 12, color: '#4A6A4A', marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sectionBody: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletTxt: { flex: 1, fontSize: 13, color: '#D1D5DB', lineHeight: 20 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  loadingTxt: { fontSize: 14, color: '#4A6A4A', marginTop: 8 },
  errorTxt: { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 32 },
  emptyTxt: { fontSize: 16, color: '#D1D5DB', fontWeight: '700', textAlign: 'center' },
  emptySub:  { fontSize: 13, color: '#4A6A4A', textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },
});
