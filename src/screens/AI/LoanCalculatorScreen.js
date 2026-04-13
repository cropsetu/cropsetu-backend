/**
 * LoanCalculatorScreen — KCC eligibility + EMI calculator + bank comparison
 *
 * Three tabs:
 *  1. KCC Eligibility — crop, area, state → NABARD scale of finance
 *  2. EMI Calculator — principal, rate, tenure → reducing balance EMI
 *  3. Bank Comparison — list of banks with KCC rates
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateLoanKCC, calculateLoanEMI, getLoanBankComparison } from '../../services/aiApi';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const STATES = ['Maharashtra','Punjab','Madhya Pradesh','Uttar Pradesh','Karnataka','Andhra Pradesh','Rajasthan','Gujarat','Tamil Nadu'];

export default function LoanCalculatorScreen({ navigation }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [tab, setTab] = useState('kcc');

  // KCC form
  const [kccCrop, setKccCrop]     = useState('');
  const [kccArea, setKccArea]     = useState('');
  const [kccState, setKccState]   = useState(user?.state || 'Maharashtra');
  const [kccResult, setKccResult] = useState(null);
  const [kccLoading, setKccLoading] = useState(false);
  const [kccError, setKccError]   = useState(null);

  // EMI form
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]           = useState('4');
  const [tenure, setTenure]       = useState('12');
  const [emiResult, setEmiResult] = useState(null);
  const [emiLoading, setEmiLoading] = useState(false);

  // Banks
  const [banks, setBanks]         = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);

  useEffect(() => {
    if (tab === 'banks' && banks.length === 0) {
      setBanksLoading(true);
      getLoanBankComparison()
        .then(d => setBanks(d?.banks || d || []))
        .catch(() => setBanks([]))
        .finally(() => setBanksLoading(false));
    }
  }, [tab]);

  const calcKCC = async () => {
    if (!kccCrop || !kccArea) {
      setKccError(language === 'hi' ? 'फसल और क्षेत्र आवश्यक है' : 'Crop and area are required');
      return;
    }
    setKccError(null);
    setKccLoading(true);
    try {
      const result = await calculateLoanKCC({ crop: kccCrop, area: parseFloat(kccArea), unit: 'acre', state: kccState });
      setKccResult(result);
    } catch (err) {
      setKccError(err?.response?.data?.error?.message || 'Calculation failed');
    } finally {
      setKccLoading(false);
    }
  };

  const calcEMI = async () => {
    if (!principal) return;
    setEmiLoading(true);
    try {
      const result = await calculateLoanEMI({
        principal: parseFloat(principal),
        annualRate: parseFloat(rate),
        tenureMonths: parseInt(tenure),
      });
      setEmiResult(result);
    } catch {
      setEmiResult(null);
    } finally {
      setEmiLoading(false);
    }
  };

  const TABS = [
    { key: 'kcc',   label: language === 'hi' ? 'KCC पात्रता' : 'KCC Eligibility' },
    { key: 'emi',   label: language === 'hi' ? 'EMI कैलकुलेटर' : 'EMI Calc' },
    { key: 'banks', label: language === 'hi' ? 'बैंक तुलना' : 'Banks' },
  ];

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'लोन कैलकुलेटर' : 'Loan Calculator'}</Text>
          <Text style={S.headerSub}>KCC · EMI · {language === 'hi' ? 'बैंक तुलना' : 'Bank Compare'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={S.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tabBtn, tab === t.key && S.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KCC Tab */}
      {tab === 'kcc' && (
        <ScrollView contentContainerStyle={S.formContent}>
          <Text style={S.sectionLabel}>{language === 'hi' ? 'फसल जानकारी' : 'Crop Details'}</Text>

          <TextInput
            style={S.input}
            placeholder={language === 'hi' ? 'फसल का नाम (जैसे Wheat, Cotton)' : 'Crop name (e.g. Wheat, Cotton)'}
            placeholderTextColor="#4A5A4A"
            value={kccCrop}
            onChangeText={setKccCrop}
          />
          <View style={S.rowInputs}>
            <TextInput
              style={[S.input, { flex: 1 }]}
              placeholder={language === 'hi' ? 'क्षेत्र (एकड़)' : 'Area (acres)'}
              placeholderTextColor="#4A5A4A"
              keyboardType="decimal-pad"
              value={kccArea}
              onChangeText={setKccArea}
            />
            <View style={[S.input, { width: 130, justifyContent: 'center' }]}>
              <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{kccState}</Text>
            </View>
          </View>

          {kccError ? <Text style={S.errorTxt}>{kccError}</Text> : null}

          <TouchableOpacity style={[S.calcBtn, kccLoading && { opacity: 0.6 }]} onPress={calcKCC} disabled={kccLoading}>
            {kccLoading ? <ActivityIndicator color="#0A140A" /> : (
              <Text style={S.calcTxt}>{language === 'hi' ? 'पात्रता जानें →' : 'Check Eligibility →'}</Text>
            )}
          </TouchableOpacity>

          {kccResult && (
            <>
              <View style={S.resultCard}>
                <Text style={S.resultLabel}>{language === 'hi' ? 'KCC सीमा' : 'KCC Limit'}</Text>
                <Text style={S.resultBig}>₹{kccResult.kccLimit?.toLocaleString()}</Text>
                <Text style={S.resultSub}>{language === 'hi' ? 'अनुमानित ऋण सीमा' : 'Estimated credit limit'}</Text>
              </View>

              {kccResult.breakdown && (
                <View style={S.breakdownCard}>
                  {Object.entries(kccResult.breakdown).map(([k, v]) => (
                    <View key={k} style={S.breakdownRow}>
                      <Text style={S.breakdownLabel}>{k}</Text>
                      <Text style={S.breakdownVal}>₹{typeof v === 'number' ? v.toLocaleString() : v}</Text>
                    </View>
                  ))}
                </View>
              )}

              {kccResult.eligibility === false && (
                <View style={S.ineligibleCard}>
                  <Ionicons name="close-circle-outline" size={20} color="#E74C3C" />
                  <Text style={S.ineligibleTxt}>{kccResult.reason || 'Not eligible for KCC'}</Text>
                </View>
              )}

              {kccResult.note && <Text style={S.noteTxt}>* {kccResult.note}</Text>}
            </>
          )}
        </ScrollView>
      )}

      {/* EMI Tab */}
      {tab === 'emi' && (
        <ScrollView contentContainerStyle={S.formContent}>
          <Text style={S.sectionLabel}>{language === 'hi' ? 'ऋण विवरण' : 'Loan Details'}</Text>

          <View style={S.fieldWrap}>
            <Text style={S.fieldLabel}>{language === 'hi' ? 'ऋण राशि (₹)' : 'Loan Amount (₹)'}</Text>
            <TextInput
              style={S.input}
              placeholder="e.g. 100000"
              placeholderTextColor="#4A5A4A"
              keyboardType="numeric"
              value={principal}
              onChangeText={setPrincipal}
            />
          </View>
          <View style={S.fieldWrap}>
            <Text style={S.fieldLabel}>{language === 'hi' ? 'ब्याज दर (% प्रति वर्ष)' : 'Interest Rate (% p.a.)'}</Text>
            <TextInput
              style={S.input}
              placeholder="e.g. 4 (KCC rate)"
              placeholderTextColor="#4A5A4A"
              keyboardType="decimal-pad"
              value={rate}
              onChangeText={setRate}
            />
          </View>
          <View style={S.fieldWrap}>
            <Text style={S.fieldLabel}>{language === 'hi' ? 'अवधि (महीने)' : 'Tenure (months)'}</Text>
            <TextInput
              style={S.input}
              placeholder="e.g. 12"
              placeholderTextColor="#4A5A4A"
              keyboardType="numeric"
              value={tenure}
              onChangeText={setTenure}
            />
          </View>

          <TouchableOpacity style={[S.calcBtn, emiLoading && { opacity: 0.6 }]} onPress={calcEMI} disabled={emiLoading}>
            {emiLoading ? <ActivityIndicator color="#0A140A" /> : (
              <Text style={S.calcTxt}>{language === 'hi' ? 'EMI जानें →' : 'Calculate EMI →'}</Text>
            )}
          </TouchableOpacity>

          {emiResult && (
            <View style={S.emiResultGrid}>
              {[
                { label: language === 'hi' ? 'मासिक EMI' : 'Monthly EMI', val: `₹${emiResult.emi?.toLocaleString()}`, highlight: true },
                { label: language === 'hi' ? 'कुल राशि' : 'Total Amount', val: `₹${emiResult.totalAmount?.toLocaleString()}` },
                { label: language === 'hi' ? 'कुल ब्याज' : 'Total Interest', val: `₹${emiResult.totalInterest?.toLocaleString()}` },
                { label: language === 'hi' ? 'ब्याज %' : 'Interest %', val: `${emiResult.interestPercentage}%` },
              ].map((item, i) => (
                <View key={i} style={[S.emiBox, item.highlight && { borderColor: GREEN + '60' }]}>
                  <Text style={S.emiBoxLabel}>{item.label}</Text>
                  <Text style={[S.emiBoxVal, item.highlight && { color: GREEN }]}>{item.val}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={S.kccInfoCard}>
            <Ionicons name="information-circle-outline" size={16} color={GREEN} />
            <Text style={S.kccInfoTxt}>
              {language === 'hi'
                ? 'KCC पर ब्याज दर 4% प्रति वर्ष है (सरकार सब्सिडी के बाद)। समय पर चुकाने पर 3% अतिरिक्त छूट।'
                : 'KCC interest rate is 4% p.a. (after govt subvention). Extra 3% rebate for timely repayment.'}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Banks Tab */}
      {tab === 'banks' && (
        banksLoading ? (
          <View style={S.centered}>
            <ActivityIndicator color={GREEN} size="large" />
          </View>
        ) : (
          <FlatList
            data={banks}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={S.listContent}
            renderItem={({ item }) => (
              <View style={S.bankCard}>
                <View style={{ flex: 1 }}>
                  <Text style={S.bankName}>{item.bank}</Text>
                  <Text style={S.bankType}>{item.type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={S.bankRate}>{item.kccRate}%</Text>
                  <Text style={S.bankRateLabel}>{language === 'hi' ? 'KCC दर' : 'KCC Rate'}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={S.emptyTxt}>{language === 'hi' ? 'बैंक जानकारी उपलब्ध नहीं' : 'Bank data not available'}</Text>
            }
          />
        )
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

  tabScroll:  { flexGrow: 0 },
  tabContent: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  tabBtnActive:   { backgroundColor: GREEN, borderColor: GREEN },
  tabTxt:         { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  tabTxtActive:   { color: '#0A140A' },

  formContent: { padding: 18, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 14,
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  errorTxt: { fontSize: 13, color: '#EF4444' },
  calcBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  calcTxt: { fontSize: 16, fontWeight: '800', color: '#0A140A' },

  resultCard: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 16,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: GREEN + '40',
  },
  resultLabel: { fontSize: 12, color: '#4A6A4A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  resultBig:   { fontSize: 32, fontWeight: '900', color: GREEN, marginTop: 4 },
  resultSub:   { fontSize: 12, color: '#4A6A4A', marginTop: 2 },

  breakdownCard: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 8,
  },
  breakdownRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel:{ fontSize: 13, color: '#9CA3AF' },
  breakdownVal:  { fontSize: 13, color: '#F1F1EE', fontWeight: '700' },

  ineligibleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(231,76,60,0.10)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E74C3C40',
  },
  ineligibleTxt: { flex: 1, fontSize: 13, color: '#EF4444' },
  noteTxt: { fontSize: 11, color: '#4A6A4A', lineHeight: 16 },

  emiResultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emiBox: {
    width: '47%', backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  emiBoxLabel: { fontSize: 11, color: '#4A6A4A', fontWeight: '700', marginBottom: 4 },
  emiBoxVal:   { fontSize: 18, fontWeight: '900', color: '#F1F1EE' },

  kccInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(46,204,113,0.06)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER,
  },
  kccInfoTxt: { flex: 1, fontSize: 12, color: '#4A6A4A', lineHeight: 18 },

  listContent: { padding: 18, paddingBottom: 40, gap: 10 },
  bankCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  bankName: { fontSize: 14, fontWeight: '700', color: '#F1F1EE' },
  bankType: { fontSize: 11, color: '#4A6A4A', marginTop: 2 },
  bankRate: { fontSize: 20, fontWeight: '900', color: GREEN },
  bankRateLabel: { fontSize: 10, color: '#4A6A4A' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', paddingTop: 40 },
});
