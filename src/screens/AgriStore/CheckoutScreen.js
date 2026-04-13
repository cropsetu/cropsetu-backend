/**
 * CheckoutScreen — Redesigned to match KisanMart reference UI
 * 3-step flow: Address → Order Summary → Payment
 * Staggered entrance, spring selection, animated radio, icon circles
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Animated, Image, StatusBar, Dimensions, Easing, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { width: W } = Dimensions.get('window');
const GREEN    = '#2D9162';
const GREEN_BG = 'rgba(45,145,98,0.08)';
const GREEN_B  = 'rgba(45,145,98,0.15)';
const BG       = '#F4F6F9';
const CARD     = '#FFFFFF';
const BORDER   = '#E8EAED';
const MUTED    = '#6B7280';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normPhone = (s = '') => s.replace(/\D/g, '').replace(/^(91|0)/, '');
const addrLine  = a => a ? [a.flat, a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

const TYPE_ICON  = { HOME: 'home-outline', OFFICE: 'business-outline', OTHER: 'location-outline' };
const TYPE_COLOR = { HOME: GREEN, OFFICE: '#5B4CF5', OTHER: '#E76F51' };

// ─── Press scale helper ───────────────────────────────────────────────────────
function PressScale({ onPress, style, down = 0.94, children }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[style, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(sc, { toValue: down, useNativeDriver: true, friction: 8, tension: 200 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start()}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Step Dot (isolated so useRef/useEffect are at component level) ───────────
function StepDot({ stepNum, currentStep, label }) {
  const done   = stepNum < currentStep;
  const active = stepNum === currentStep;
  const sc     = useRef(new Animated.Value(active ? 1.08 : done ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.spring(sc, { toValue: active ? 1.08 : done ? 1 : 0.85, useNativeDriver: true, friction: 7, tension: 160 }).start();
  }, [currentStep]);

  return (
    <View style={SH.stepCol}>
      <Animated.View style={[
        SH.dot,
        active && { backgroundColor: GREEN, borderColor: GREEN },
        done   && { backgroundColor: GREEN, borderColor: GREEN },
        { transform: [{ scale: sc }] },
      ]}>
        {done
          ? <Ionicons name="checkmark" size={11} color="#fff" />
          : <Text style={[SH.dotNum, (active || done) && { color: '#fff' }]}>{stepNum}</Text>
        }
      </Animated.View>
      <Text style={[SH.dotLbl, (active || done) && { color: GREEN, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Step Stepper Header ──────────────────────────────────────────────────────
function StepHeader({ step, onBack }) {
  const STEPS = ['Address', 'Summary', 'Payment'];

  return (
    <View style={SH.root}>
      {/* Back button */}
      <TouchableOpacity onPress={onBack} style={SH.back} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
      </TouchableOpacity>

      {/* Steps */}
      <View style={SH.stepsRow}>
        {STEPS.map((label, i) => (
          <View key={i} style={SH.stepItem}>
            {i > 0 && <View style={[SH.connector, i < step && { backgroundColor: GREEN }]} />}
            <StepDot stepNum={i + 1} currentStep={step} label={label} />
          </View>
        ))}
      </View>
    </View>
  );
}

const SH = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, paddingHorizontal: 14,
    paddingTop: 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 3,
  },
  back: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center',
    marginRight: 14, flexShrink: 0,
  },
  stepsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  connector: { width: 28, height: 2, backgroundColor: BORDER, marginBottom: 14 },
  stepCol:  { alignItems: 'center', gap: 5 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 2, borderColor: '#D0D0D0',
    justifyContent: 'center', alignItems: 'center',
  },
  dotNum: { fontSize: 11, fontWeight: '700', color: '#AAA' },
  dotLbl: { fontSize: 10, fontWeight: '600', color: '#BBB' },
});

// ─── Icon Circle ──────────────────────────────────────────────────────────────
function IconCircle({ name, size = 20, color = GREEN, bg = GREEN_BG }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

// ─── Slide-in Card ────────────────────────────────────────────────────────────
function SlideCard({ children, style, delay = 0 }) {
  const op = useRef(new Animated.Value(0)).current;
  const y  = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 8, tension: 70, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[CW.card, style, { opacity: op, transform: [{ translateY: y }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Card header row ──────────────────────────────────────────────────────────
function CardHead({ icon, title, iconBg, iconColor, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <IconCircle name={icon} color={iconColor || GREEN} bg={iconBg || GREEN_BG} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A', flex: 1 }}>{title}</Text>
      {right}
    </View>
  );
}

const CW = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
});

// ─── Labelled Input ───────────────────────────────────────────────────────────
function FInput({ label, req, style, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 5, letterSpacing: 0.2 }}>
        {label}{req && <Text style={{ color: '#E74C3C' }}> *</Text>}
      </Text>
      <TextInput
        style={{
          borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
          paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
          fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA',
        }}
        placeholderTextColor="#C0C0C0"
        returnKeyType="next"
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

// ─── Price Row ────────────────────────────────────────────────────────────────
function PRow({ label, value, bold, green }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ fontSize: bold ? 15 : 14, color: bold ? '#1A1A1A' : MUTED, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ fontSize: bold ? 18 : 14, color: green || bold ? GREEN : '#1A1A1A', fontWeight: bold ? '900' : '600' }}>{value}</Text>
    </View>
  );
}

// ─── Address Card (step 1) ────────────────────────────────────────────────────
function AddrCard({ addr, selected, onSelect, onDelete, delay = 0 }) {
  const op     = useRef(new Animated.Value(0)).current;
  const y      = useRef(new Animated.Value(20)).current;
  const checkSc = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 280, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, friction: 8, tension: 65, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(checkSc, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true, type: 'spring',
      stiffness: 500, damping: 30,
    }).start();
  }, [selected]);

  const col = TYPE_COLOR[addr.type] || GREEN;

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: y }], marginBottom: 10 }}>
      <TouchableOpacity
        onPress={() => onSelect(addr.id)}
        activeOpacity={0.92}
        style={[
          AC.card,
          selected && { borderColor: col, shadowColor: col, shadowOpacity: 0.15 },
        ]}
      >
        {/* Left color stripe */}
        {selected && <View style={[AC.stripe, { backgroundColor: col }]} />}

        <View style={AC.body}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconCircle name={TYPE_ICON[addr.type] || 'location-outline'} size={18} color={col} bg={col + '18'} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[AC.typeBadge, { backgroundColor: col + '15' }]}>
                  <Text style={[AC.typeTxt, { color: col }]}>{addr.type}</Text>
                </View>
                {addr.isDefault && (
                  <View style={AC.defaultBadge}><Text style={AC.defaultTxt}>Default</Text></View>
                )}
              </View>
              <Text style={AC.name}>{addr.name}</Text>
            </View>

            {/* Spring checkmark */}
            <Animated.View style={[AC.checkCircle, { backgroundColor: col, transform: [{ scale: checkSc }] }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </Animated.View>

            {/* Delete */}
            <TouchableOpacity
              onPress={() => onDelete(addr.id)}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              style={AC.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Address line */}
          <Text style={AC.addrTxt} numberOfLines={2}>{addrLine(addr)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <Ionicons name="call-outline" size={12} color={MUTED} />
            <Text style={AC.phoneTxt}>{addr.phone}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const AC = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 2,
    borderColor: BORDER, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  stripe:       { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body:         { padding: 14, paddingLeft: 18 },
  typeBadge:    { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  typeTxt:      { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  defaultBadge: { backgroundColor: '#FFF8E1', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  defaultTxt:   { fontSize: 9, fontWeight: '700', color: '#F9A825' },
  name:         { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginTop: 2 },
  checkCircle:  { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  deleteBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  addrTxt:      { fontSize: 13, color: MUTED, lineHeight: 18 },
  phoneTxt:     { fontSize: 12, color: MUTED },
});

// ─── Payment Option ───────────────────────────────────────────────────────────
function PayOption({ id, name, nameHi, desc, icon, iconBg, iconColor, selected, onSelect, delay = 0 }) {
  const op     = useRef(new Animated.Value(0)).current;
  const x      = useRef(new Animated.Value(-20)).current;
  const dotSc  = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(x, { toValue: 0, friction: 8, tension: 70, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(dotSc, { toValue: selected ? 1 : 0, useNativeDriver: true, stiffness: 500, damping: 30 }).start();
  }, [selected]);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: x }] }}>
      <TouchableOpacity
        onPress={() => onSelect(id)}
        activeOpacity={0.9}
        style={[PO.row, selected && { borderColor: GREEN, backgroundColor: GREEN_BG }]}
      >
        {/* Colored icon box */}
        <View style={[PO.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={PO.name}>{nameHi || name}</Text>
          <Text style={PO.desc}>{desc}</Text>
        </View>

        {/* Animated radio dot */}
        <View style={[PO.radioOuter, selected && { borderColor: GREEN }]}>
          <Animated.View style={[PO.radioDot, { transform: [{ scale: dotSc }] }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const PO = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: BORDER, marginBottom: 10 },
  iconBox:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  name:     { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  desc:     { fontSize: 12, color: MUTED, marginTop: 1 },
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  radioDot:   { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CheckoutScreen({ route, navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { total = 0, delivery = 0, grandTotal = 0 } = route.params || {};

  const [step,          setStep]          = useState(1);
  const [addresses,     setAddresses]     = useState([]);
  const [selectedAddr,  setSelectedAddr]  = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [savingAddr,    setSavingAddr]    = useState(false);
  const [payMethod,     setPayMethod]     = useState('cod');
  const [placing,       setPlacing]       = useState(false);
  const [cartItems,     setCartItems]     = useState([]);
  const [note,          setNote]          = useState('');
  const [addrSheet,     setAddrSheet]     = useState(false);

  // Form state
  const [form, setForm] = useState({ type: 'HOME', name: '', phone: '', flat: '', street: '', city: '', state: '', pincode: '', landmark: '' });

  // Refs for keyboard
  const phoneRef    = useRef(); const flatRef     = useRef();
  const streetRef   = useRef(); const cityRef     = useRef();
  const stateRef    = useRef(); const pincodeRef  = useRef();
  const landmarkRef = useRef();

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load addresses + cart items
  useEffect(() => {
    api.get('/addresses').then(({ data }) => {
      const list = data.data || [];
      setAddresses(list);
      const def = list.find(a => a.isDefault) || list[0];
      if (def) setSelectedAddr(def.id);
    }).catch(() => {});

    api.get('/agristore/cart').then(({ data }) => {
      setCartItems(data.data?.items || []);
    }).catch(() => {});
  }, []);

  const selectedAddrObj = addresses.find(a => a.id === selectedAddr);

  async function saveAddress() {
    const phone = normPhone(form.phone);
    if (!form.name.trim() || !form.phone.trim() || !form.flat.trim() || !form.street.trim() ||
        !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      Alert.alert('Invalid Pincode', 'Pincode must be 6 digits.');
      return;
    }
    setSavingAddr(true);
    try {
      const { data } = await api.post('/addresses', { ...form, phone });
      const newAddr = data.data;
      setAddresses(prev => [newAddr, ...prev]);
      setSelectedAddr(newAddr.id);
      setShowForm(false);
      setForm({ type: 'HOME', name: '', phone: '', flat: '', street: '', city: '', state: '', pincode: '', landmark: '' });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error?.message || 'Could not save address.');
    } finally {
      setSavingAddr(false);
    }
  }

  async function deleteAddress(id) {
    Alert.alert('Delete Address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/addresses/${id}`);
            setAddresses(prev => prev.filter(a => a.id !== id));
            if (selectedAddr === id) setSelectedAddr(addresses.find(a => a.id !== id)?.id || null);
          } catch { Alert.alert('Error', 'Could not delete address.'); }
        }
      },
    ]);
  }

  async function placeOrder() {
    if (!selectedAddr) { Alert.alert('Select Address', 'Please select a delivery address.'); return; }
    setPlacing(true);
    try {
      const { data } = await api.post('/agristore/orders', {
        deliveryAddressId: selectedAddr,
        paymentMethod: payMethod,
        note: note.trim() || undefined,
      });
      navigation.replace('OrderConfirmed', {
        order: data.data, paymentMethod: payMethod, grandTotal,
      });
    } catch (err) {
      Alert.alert('Order Failed', err?.response?.data?.error?.message || 'Something went wrong.');
    } finally {
      setPlacing(false);
    }
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
    else navigation.goBack();
  }

  function handleContinue() {
    if (step === 1) {
      if (!selectedAddr && !showForm) { Alert.alert('Select Address', 'Please select or add a delivery address.'); return; }
      if (showForm) { saveAddress(); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      placeOrder();
    }
  }

  const TYPE_OPTS = ['HOME', 'OFFICE', 'OTHER'];
  const PAY_OPTS = [
    { id: 'cod',  name: 'Cash on Delivery',    nameHi: 'कॅश ऑन डिलिव्हरी',  desc: 'Pay when you receive',     icon: 'cash-outline',          iconBg: '#DCFCE7', iconColor: '#16A34A' },
    { id: 'upi',  name: 'UPI Payment',          nameHi: 'UPI पेमेंट',           desc: 'GPay, PhonePe, Paytm',    icon: 'phone-portrait-outline', iconBg: '#DBEAFE', iconColor: '#2563EB' },
    { id: 'card', name: 'Credit / Debit Card',  nameHi: 'क्रेडिट / डेबिट कार्ड', desc: 'Visa, Mastercard, RuPay', icon: 'card-outline',           iconBg: '#FFEDD5', iconColor: '#EA580C' },
  ];

  const ctaLabel = step === 1 ? (showForm ? (savingAddr ? 'Saving...' : 'Save & Continue') : 'Continue') :
                   step === 2 ? 'Proceed to Payment' :
                   (placing ? 'Placing Order...' : 'Place Order');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />
      <View style={{ height: insets.top, backgroundColor: CARD }} />

      {/* Stepper header */}
      <StepHeader step={step} onBack={handleBack} />

      {/* ── Content ── */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >

          {/* ════ STEP 1: ADDRESS ════ */}
          {step === 1 && (
            <>
              <Text style={ST.sectionTitle}>Select Delivery Address</Text>
              <Text style={ST.sectionSub}>डिलिव्हरी पत्ता निवडा</Text>

              {/* Saved address cards */}
              {addresses.map((addr, i) => (
                <AddrCard
                  key={addr.id}
                  addr={addr}
                  selected={selectedAddr === addr.id && !showForm}
                  onSelect={(id) => { setSelectedAddr(id); setShowForm(false); }}
                  onDelete={deleteAddress}
                  delay={i * 80}
                />
              ))}

              {/* Add new address card (dashed) */}
              {!showForm && (
                <SlideCard delay={addresses.length * 80} style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: GREEN + '50', backgroundColor: GREEN_BG }}>
                  <TouchableOpacity onPress={() => setShowForm(true)} activeOpacity={0.85}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <IconCircle name="add" size={20} color={GREEN} bg={GREEN_B} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: GREEN }}>Add New Address</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>नवीन पत्ता जोडा</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={GREEN} />
                    </View>
                  </TouchableOpacity>
                </SlideCard>
              )}

              {/* Inline form */}
              {showForm && (
                <SlideCard>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>New Address</Text>
                    <TouchableOpacity onPress={() => setShowForm(false)}>
                      <Ionicons name="close-circle" size={22} color={MUTED} />
                    </TouchableOpacity>
                  </View>

                  {/* Type chips */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    {TYPE_OPTS.map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => upd('type', t)}
                        style={[ST.typeChip, form.type === t && { backgroundColor: GREEN, borderColor: GREEN }]}
                      >
                        <Ionicons name={TYPE_ICON[t]} size={13} color={form.type === t ? '#fff' : MUTED} />
                        <Text style={[ST.typeChipTxt, form.type === t && { color: '#fff' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <FInput label="Full Name" req style={{ flex: 1 }} value={form.name} onChangeText={v => upd('name', v)}
                      returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
                    <FInput label="Phone" req style={{ flex: 1 }} value={form.phone} onChangeText={v => upd('phone', v)}
                      keyboardType="phone-pad" ref={phoneRef} onSubmitEditing={() => flatRef.current?.focus()} />
                  </View>
                  <FInput label="Flat / House No." req value={form.flat} onChangeText={v => upd('flat', v)}
                    ref={flatRef} onSubmitEditing={() => streetRef.current?.focus()} />
                  <FInput label="Street / Area" req value={form.street} onChangeText={v => upd('street', v)}
                    ref={streetRef} onSubmitEditing={() => cityRef.current?.focus()} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <FInput label="City" req style={{ flex: 1 }} value={form.city} onChangeText={v => upd('city', v)}
                      ref={cityRef} onSubmitEditing={() => stateRef.current?.focus()} />
                    <FInput label="State" req style={{ flex: 1 }} value={form.state} onChangeText={v => upd('state', v)}
                      ref={stateRef} onSubmitEditing={() => pincodeRef.current?.focus()} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <FInput label="Pincode" req style={{ flex: 1 }} value={form.pincode} onChangeText={v => upd('pincode', v)}
                      keyboardType="number-pad" ref={pincodeRef} onSubmitEditing={() => landmarkRef.current?.focus()} />
                    <FInput label="Landmark" style={{ flex: 1 }} value={form.landmark} onChangeText={v => upd('landmark', v)}
                      ref={landmarkRef} returnKeyType="done" />
                  </View>
                </SlideCard>
              )}
            </>
          )}

          {/* ════ STEP 2: ORDER SUMMARY ════ */}
          {step === 2 && (
            <>
              {/* Deliver to card */}
              <SlideCard delay={0}>
                <CardHead icon="location-outline" title="Deliver To"
                  right={
                    <TouchableOpacity onPress={() => setAddrSheet(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: GREEN, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                      <Ionicons name="create-outline" size={13} color={GREEN} />
                      <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700' }}>Change</Text>
                    </TouchableOpacity>
                  }
                />
                <View style={{ marginLeft: 52 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1A1A1A' }}>{selectedAddrObj?.name}</Text>
                    <View style={{ backgroundColor: GREEN_BG, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: GREEN }}>{selectedAddrObj?.type}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: MUTED, lineHeight: 18 }}>{addrLine(selectedAddrObj)} — {selectedAddrObj?.pincode}</Text>
                  <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{selectedAddrObj?.phone}</Text>
                </View>
              </SlideCard>

              {/* Order items */}
              <SlideCard delay={100}>
                <CardHead icon="cube-outline" title={`Order Items (${cartItems.length})`} />
                {cartItems.map((item, i) => {
                  const p = item.product;
                  return (
                    <View key={item.id}
                      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
                        i < cartItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                      <View style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: '#F0F4F0', overflow: 'hidden' }}>
                        {p.images?.[0]
                          ? <Image source={{ uri: p.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="leaf" size={24} color={GREEN} /></View>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>{p.name}</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{item.quantity} × ₹{p.price.toLocaleString()}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A1A' }}>₹{(p.price * item.quantity).toLocaleString()}</Text>
                    </View>
                  );
                })}
              </SlideCard>

              {/* Price details */}
              <SlideCard delay={200}>
                <CardHead icon="receipt-outline" title="Price Details" />
                <PRow label={`Items (${cartItems.reduce((s, i) => s + i.quantity, 0)})`} value={`₹${total.toLocaleString()}`} />
                <PRow label="Delivery" value={delivery === 0 ? 'FREE' : `₹${delivery}`} green={delivery === 0} />
                <View style={{ borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 12 }}>
                  <PRow label="Total Payable" value={`₹${grandTotal.toLocaleString()}`} bold />
                </View>
              </SlideCard>
            </>
          )}

          {/* ════ STEP 3: PAYMENT ════ */}
          {step === 3 && (
            <>
              {/* Address mini card */}
              <SlideCard delay={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconCircle name="home-outline" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{selectedAddrObj?.name}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }} numberOfLines={1}>{addrLine(selectedAddrObj)?.substring(0, 32)}...</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAddrSheet(true)}
                    style={{ borderWidth: 1.5, borderColor: GREEN, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700' }}>Change</Text>
                  </TouchableOpacity>
                </View>
              </SlideCard>

              {/* Payment methods */}
              <SlideCard delay={100}>
                <CardHead icon="card-outline" title="Payment Method (पेमेंट पद्धत)" />
                {PAY_OPTS.map((opt, i) => (
                  <PayOption key={opt.id} {...opt} selected={payMethod === opt.id} onSelect={setPayMethod} delay={i * 60} />
                ))}
              </SlideCard>

              {/* Order notes */}
              <SlideCard delay={200}>
                <CardHead icon="chatbubble-outline" title="Order Notes (Optional)" />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add delivery instructions... (डिलिव्हरीसाठी सूचना...)"
                  placeholderTextColor="#C0C0C0"
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: '#F5F5F5', borderRadius: 14, padding: 13,
                    fontSize: 14, color: '#1A1A1A', minHeight: 80, textAlignVertical: 'top',
                  }}
                  keyboardShouldPersistTaps="always"
                />
              </SlideCard>

              {/* Total payable card */}
              <SlideCard delay={300} style={{ backgroundColor: GREEN_BG, borderColor: GREEN + '40' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>Total Payable</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: GREEN }}>₹{grandTotal.toLocaleString()}</Text>
                </View>
              </SlideCard>
            </>
          )}

        </ScrollView>
      </View>

      {/* ── Bottom action bar ── */}
      <View style={[BOT.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Delivering to / total */}
        {step === 1 && !showForm && selectedAddrObj && (
          <TouchableOpacity onPress={() => setAddrSheet(true)} activeOpacity={0.7}>
            <Text style={{ fontSize: 11, color: MUTED }}>Delivering to  ›</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>{selectedAddrObj.name}</Text>
          </TouchableOpacity>
        )}
        {(step === 2 || step === 3) && (
          <View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: GREEN }}>₹{grandTotal.toLocaleString()}</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
              {step === 3 ? (payMethod === 'cod' ? 'Cash on Delivery' : payMethod === 'upi' ? 'UPI' : 'Card') : `${cartItems.reduce((s, i) => s + i.quantity, 0)} items`}
            </Text>
          </View>
        )}
        {step === 1 && showForm && <View />}

        <PressScale onPress={handleContinue} down={0.96} style={BOT.ctaWrap}>
          <View style={BOT.ctaGrad}>
            {placing || savingAddr
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Text style={BOT.ctaTxt}>{ctaLabel}</Text>
                  {step < 3 && <Ionicons name="arrow-forward" size={17} color="#fff" />}
                  {step === 3 && <Ionicons name="checkmark" size={17} color="#fff" />}
                </>
            }
          </View>
        </PressScale>
      </View>
      {/* ── Address Picker Bottom Sheet ── */}
      <Modal
        visible={addrSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setAddrSheet(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={SH2.backdrop}
            activeOpacity={1}
            onPress={() => setAddrSheet(false)}
          />
          <View style={SH2.sheet}>
            <View style={SH2.handle} />
            <Text style={SH2.title}>Select Delivery Address</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {addresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[SH2.addrCard, selectedAddr === addr.id && SH2.addrCardActive]}
                  onPress={() => { setSelectedAddr(addr.id); setAddrSheet(false); }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={[SH2.typeBadge, { backgroundColor: TYPE_COLOR[addr.type] + '20' }]}>
                        <Ionicons name={TYPE_ICON[addr.type]} size={11} color={TYPE_COLOR[addr.type]} />
                        <Text style={[SH2.typeTxt, { color: TYPE_COLOR[addr.type] }]}>{addr.type}</Text>
                      </View>
                      {addr.isDefault && (
                        <View style={SH2.defaultBadge}>
                          <Text style={SH2.defaultTxt}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={SH2.addrName}>{addr.name}</Text>
                    <Text style={SH2.addrLine} numberOfLines={2}>{addrLine(addr)}</Text>
                    <Text style={SH2.addrPhone}>{addr.phone}</Text>
                  </View>
                  <View style={[SH2.radioOuter, selectedAddr === addr.id && { borderColor: GREEN }]}>
                    {selectedAddr === addr.id && <View style={SH2.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={SH2.addNew}
                onPress={() => {
                  setAddrSheet(false);
                  setShowForm(true);
                  if (step !== 1) setStep(1);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={GREEN} />
                <Text style={SH2.addNewTxt}>Add New Address</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ST = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: MUTED, marginBottom: 16 },
  typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F5F5F5' },
  typeChipTxt:  { fontSize: 12, fontWeight: '700', color: MUTED },
});

const BOT = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  ctaWrap: { borderRadius: 14, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: GREEN },
  ctaTxt:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const SH2 = StyleSheet.create({
  backdrop:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 10 },
  handle:        { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  title:         { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 14 },
  addrCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, marginBottom: 10, backgroundColor: '#FAFAFA' },
  addrCardActive:{ borderColor: GREEN, backgroundColor: GREEN_BG },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  typeTxt:       { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  defaultBadge:  { backgroundColor: '#FFF8E1', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  defaultTxt:    { fontSize: 9, fontWeight: '700', color: '#F9A825' },
  addrName:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  addrLine:      { fontSize: 12, color: MUTED, lineHeight: 17 },
  addrPhone:     { fontSize: 11, color: MUTED, marginTop: 2 },
  radioOuter:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  radioDot:      { width: 11, height: 11, borderRadius: 6, backgroundColor: GREEN },
  addNew:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: GREEN + '60', backgroundColor: GREEN_BG, marginBottom: 4 },
  addNewTxt:     { fontSize: 14, fontWeight: '700', color: GREEN },
});
