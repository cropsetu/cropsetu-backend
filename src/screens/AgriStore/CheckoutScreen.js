import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, TYPE } from '../../constants/colors';
import api from '../../services/api';

// ── Address type options ──────────────────────────────────────────────────────
const ADDR_TYPES = [
  { key: 'HOME',   label: 'Home',   icon: 'home-outline' },
  { key: 'OFFICE', label: 'Office', icon: 'business-outline' },
  { key: 'OTHER',  label: 'Other',  icon: 'location-outline' },
];

// ── Payment method options ────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    key: 'cod',
    label: 'Cash on Delivery',
    subLabel: 'Pay when your order arrives',
    icon: 'cash-outline',
    color: COLORS.success,
  },
  {
    key: 'upi',
    label: 'UPI Payment',
    subLabel: 'GPay, PhonePe, Paytm, BHIM',
    icon: 'phone-portrait-outline',
    color: '#5B4CF5',
  },
  {
    key: 'card',
    label: 'Credit / Debit Card',
    subLabel: 'Visa, Mastercard, RuPay',
    icon: 'card-outline',
    color: '#E76F51',
  },
];

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ icon, title }) {
  return (
    <View style={S.sectionHead}>
      <View style={S.sectionIconBox}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Labelled input ────────────────────────────────────────────────────────────
function Field({ label, required, ...props }) {
  return (
    <View style={S.fieldWrap}>
      <Text style={S.fieldLabel}>{label}{required && <Text style={{ color: COLORS.error }}> *</Text>}</Text>
      <TextInput style={S.fieldInput} placeholderTextColor={COLORS.textMedium} {...props} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CheckoutScreen({ route, navigation }) {
  const { total = 0, delivery = 0, grandTotal = 0, itemCount = 0 } = route.params || {};

  const [addrType, setAddrType]   = useState('HOME');
  const [payment,  setPayment]    = useState('cod');
  const [placing,  setPlacing]    = useState(false);

  // Address fields
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [flat,    setFlat]    = useState('');
  const [street,  setStreet]  = useState('');
  const [city,    setCity]    = useState('');
  const [state,   setState]   = useState('');
  const [pincode, setPincode] = useState('');
  const [notes,   setNotes]   = useState('');

  function validate() {
    if (!name.trim())    { Alert.alert('Required', 'Please enter the recipient name'); return false; }
    if (!/^[6-9]\d{9}$/.test(phone)) { Alert.alert('Invalid phone', 'Enter a valid 10-digit mobile number'); return false; }
    if (!flat.trim())    { Alert.alert('Required', 'Please enter house/flat number'); return false; }
    if (!street.trim())  { Alert.alert('Required', 'Please enter street/area'); return false; }
    if (!city.trim())    { Alert.alert('Required', 'Please enter city'); return false; }
    if (!state.trim())   { Alert.alert('Required', 'Please enter state'); return false; }
    if (!/^\d{6}$/.test(pincode)) { Alert.alert('Invalid pincode', 'Enter a valid 6-digit pincode'); return false; }
    return true;
  }

  async function handlePlaceOrder() {
    if (!validate()) return;
    setPlacing(true);
    try {
      const { data } = await api.post('/agristore/orders', {
        deliveryAddress: {
          type: addrType,
          name: name.trim(),
          phone: phone.trim(),
          flat: flat.trim(),
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        paymentMethod: payment,
        notes: notes.trim() || undefined,
      });
      navigation.replace('OrderConfirmed', {
        order: data.data,
        paymentMethod: payment,
        grandTotal,
      });
    } catch (err) {
      Alert.alert('Order Failed', err.response?.data?.error?.message || 'Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <SafeAreaView style={S.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

          {/* ── Delivery Address ───────────────────────────────────────── */}
          <View style={S.card}>
            <SectionHead icon="location-outline" title="Delivery Address" />

            {/* Address type chips */}
            <View style={S.typeRow}>
              {ADDR_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[S.typeChip, addrType === t.key && S.typeChipActive]}
                  onPress={() => setAddrType(t.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={15} color={addrType === t.key ? COLORS.textWhite : COLORS.primary} />
                  <Text style={[S.typeChipTxt, addrType === t.key && { color: COLORS.textWhite }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Full name" required placeholder="e.g. Rajesh Patil"       value={name}    onChangeText={setName}    />
            <Field label="Mobile number" required placeholder="10-digit number"      value={phone}   onChangeText={setPhone}   keyboardType="phone-pad" maxLength={10} />
            <Field label="House / Flat / Building" required placeholder="e.g. B-204, Sunrise Apt."  value={flat}    onChangeText={setFlat}    />
            <Field label="Street / Area / Landmark" required placeholder="e.g. Near Police Station"  value={street}  onChangeText={setStreet}  />

            <View style={S.rowFields}>
              <View style={{ flex: 1 }}>
                <Field label="City" required placeholder="e.g. Pune"    value={city}   onChangeText={setCity}   />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="State" required placeholder="e.g. MH"     value={state}  onChangeText={setState}  />
              </View>
            </View>

            <Field label="Pincode" required placeholder="6-digit pincode"  value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} />
          </View>

          {/* ── Payment Method ─────────────────────────────────────────── */}
          <View style={S.card}>
            <SectionHead icon="wallet-outline" title="Payment Method" />

            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[S.payRow, payment === m.key && S.payRowActive]}
                onPress={() => setPayment(m.key)}
                activeOpacity={0.8}
              >
                <View style={[S.payIconBox, { backgroundColor: m.color + '18' }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <View style={S.payInfo}>
                  <Text style={S.payLabel}>{m.label}</Text>
                  <Text style={S.paySub}>{m.subLabel}</Text>
                </View>
                <View style={[S.payRadio, payment === m.key && S.payRadioActive]}>
                  {payment === m.key && <View style={S.payRadioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Order Notes ────────────────────────────────────────────── */}
          <View style={S.card}>
            <SectionHead icon="chatbubble-outline" title="Order Notes (Optional)" />
            <TextInput
              style={[S.fieldInput, S.notesInput]}
              placeholder="Any instructions for delivery..."
              placeholderTextColor={COLORS.textMedium}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Order Summary ──────────────────────────────────────────── */}
          <View style={S.card}>
            <SectionHead icon="receipt-outline" title="Order Summary" />

            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Items ({itemCount})</Text>
              <Text style={S.summaryValue}>₹{total.toLocaleString()}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Delivery</Text>
              <Text style={[S.summaryValue, delivery === 0 && { color: COLORS.success }]}>
                {delivery === 0 ? 'FREE' : `₹${delivery}`}
              </Text>
            </View>
            <View style={S.divider} />
            <View style={S.summaryRow}>
              <Text style={[S.summaryLabel, { fontWeight: TYPE.weight.black, fontSize: TYPE.size.base, color: COLORS.textDark }]}>Total Payable</Text>
              <Text style={S.grandTotal}>₹{grandTotal.toLocaleString()}</Text>
            </View>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Place Order button ─────────────────────────────────────────── */}
        <View style={S.footer}>
          <View style={S.footerLeft}>
            <Text style={S.footerAmt}>₹{grandTotal.toLocaleString()}</Text>
            <Text style={S.footerSub}>
              {PAYMENT_METHODS.find(m => m.key === payment)?.label}
            </Text>
          </View>
          <TouchableOpacity style={S.placeBtn} onPress={handlePlaceOrder} disabled={placing}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={S.placeBtnGrad}>
              {placing
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={S.placeBtnTxt}>Place Order</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 14, gap: 12 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 16, ...SHADOWS.small,
  },

  // Section header
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconBox: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: TYPE.size.base, fontWeight: TYPE.weight.black, color: COLORS.textDark },

  // Address type chips
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.borderGreen, backgroundColor: COLORS.surface,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipTxt: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: COLORS.primary },

  // Fields
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: TYPE.weight.semibold, color: COLORS.textMedium, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 13, paddingVertical: 11,
    fontSize: TYPE.size.sm, color: COLORS.textDark,
    backgroundColor: COLORS.inputBg,
  },
  rowFields: { flexDirection: 'row', gap: 10 },
  notesInput: { height: 72, paddingTop: 11 },

  // Payment
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 10,
  },
  payRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryPale },
  payIconBox: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  payInfo: { flex: 1 },
  payLabel: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: COLORS.textDark },
  paySub: { fontSize: 11, color: COLORS.textMedium, marginTop: 2 },
  payRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  payRadioActive: { borderColor: COLORS.primary },
  payRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: TYPE.size.sm, color: COLORS.textMedium },
  summaryValue: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold, color: COLORS.textDark },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 10 },
  grandTotal: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.primary },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  footerLeft: {},
  footerAmt: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.primary },
  footerSub: { fontSize: 11, color: COLORS.textMedium, marginTop: 2 },
  placeBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  placeBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13 },
  placeBtnTxt: { color: '#fff', fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold },
});
