import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, TYPE } from '../../constants/colors';

const PAYMENT_LABELS = { cod: 'Cash on Delivery', upi: 'UPI Payment', card: 'Card Payment' };
const PAYMENT_ICONS  = { cod: 'cash-outline',      upi: 'phone-portrait-outline', card: 'card-outline' };

export default function OrderConfirmedScreen({ route, navigation }) {
  const { order, paymentMethod, grandTotal } = route.params || {};

  // ── Animations ──────────────────────────────────────────────────────────────
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const shortId = order?.id ? order.id.slice(0, 8).toUpperCase() : '--------';
  const itemCount = order?.items?.length ?? 0;

  // Estimated delivery: 2-4 days from today
  const today = new Date();
  const from  = new Date(today); from.setDate(today.getDate() + 2);
  const to    = new Date(today); to.setDate(today.getDate() + 4);
  const fmt   = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const delivEst = `${fmt(from)} – ${fmt(to)}`;

  return (
    <SafeAreaView style={S.container}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Success icon ─────────────────────────────────────────────── */}
        <View style={S.heroArea}>
          <Animated.View style={[S.circleOuter, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={S.circleInner}>
              <Ionicons name="checkmark" size={52} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={S.heroTitle}>Order Placed!</Text>
            <Text style={S.heroSub}>Your order has been confirmed successfully</Text>
          </Animated.View>
        </View>

        {/* ── Order details card ───────────────────────────────────────── */}
        <Animated.View style={[S.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={S.cardTitle}>Order Details</Text>

          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Order ID</Text>
            <Text style={S.detailValue}># {shortId}</Text>
          </View>
          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Items</Text>
            <Text style={S.detailValue}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Total Paid</Text>
            <Text style={[S.detailValue, { color: COLORS.primary, fontWeight: TYPE.weight.black }]}>
              ₹{(grandTotal || order?.totalAmount || 0).toLocaleString()}
            </Text>
          </View>
          <View style={S.detailRow}>
            <Text style={S.detailLabel}>Payment</Text>
            <View style={S.payBadge}>
              <Ionicons name={PAYMENT_ICONS[paymentMethod] || 'cash-outline'} size={13} color={COLORS.primary} />
              <Text style={S.payBadgeTxt}>{PAYMENT_LABELS[paymentMethod] || 'Cash on Delivery'}</Text>
            </View>
          </View>
          <View style={[S.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={S.detailLabel}>Est. Delivery</Text>
            <Text style={S.detailValue}>{delivEst}</Text>
          </View>
        </Animated.View>

        {/* ── Items ordered ─────────────────────────────────────────────── */}
        {order?.items?.length > 0 && (
          <Animated.View style={[S.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={S.cardTitle}>Items Ordered</Text>
            {order.items.map((item, idx) => (
              <View key={item.id || idx} style={[S.itemRow, idx === order.items.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={S.itemDot} />
                <View style={{ flex: 1 }}>
                  <Text style={S.itemName} numberOfLines={2}>{item.product?.name || 'Product'}</Text>
                  <Text style={S.itemMeta}>Qty: {item.quantity} × ₹{item.unitPrice?.toLocaleString()}</Text>
                </View>
                <Text style={S.itemTotal}>₹{item.totalPrice?.toLocaleString()}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── What's next ───────────────────────────────────────────────── */}
        <Animated.View style={[S.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={S.cardTitle}>What's Next?</Text>

          {[
            { icon: 'mail-outline',    color: '#5B4CF5', text: 'Order confirmation sent to your phone' },
            { icon: 'cube-outline',    color: COLORS.primary, text: 'Packed & dispatched within 24 hours' },
            { icon: 'car-outline',     color: '#E76F51', text: `Delivered by ${delivEst}` },
            { icon: 'star-outline',    color: COLORS.gold, text: 'Rate your experience after delivery' },
          ].map((step, i) => (
            <View key={i} style={S.stepRow}>
              <View style={[S.stepIcon, { backgroundColor: step.color + '18' }]}>
                <Ionicons name={step.icon} size={18} color={step.color} />
              </View>
              <Text style={S.stepTxt}>{step.text}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Bottom buttons ────────────────────────────────────────────────── */}
      <Animated.View style={[S.footer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={S.trackBtn}
          onPress={() => navigation.navigate('AgriStoreHome')}
        >
          <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
          <Text style={S.trackBtnTxt}>Continue Shopping</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={S.homeBtn}
          onPress={() => navigation.navigate('AgriStoreHome')}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={S.homeBtnGrad}>
            <Ionicons name="home-outline" size={18} color="#fff" />
            <Text style={S.homeBtnTxt}>Go to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, gap: 14 },

  // Hero
  heroArea: { alignItems: 'center', paddingVertical: 28, gap: 18 },
  circleOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.greenGlow,
  },
  circleInner: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: TYPE.size.xxl, fontWeight: TYPE.weight.black, color: COLORS.textDark, textAlign: 'center' },
  heroSub: { fontSize: TYPE.size.sm, color: COLORS.textMedium, textAlign: 'center', marginTop: 4 },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, ...SHADOWS.small },
  cardTitle: { fontSize: TYPE.size.base, fontWeight: TYPE.weight.black, color: COLORS.textDark, marginBottom: 14 },

  // Detail rows
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  detailLabel: { fontSize: TYPE.size.sm, color: COLORS.textMedium },
  detailValue: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold, color: COLORS.textDark },
  payBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primaryPale, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  payBadgeTxt: { fontSize: 12, fontWeight: TYPE.weight.bold, color: COLORS.primary },

  // Items
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryLight },
  itemName: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold, color: COLORS.textDark },
  itemMeta: { fontSize: 11, color: COLORS.textMedium, marginTop: 2 },
  itemTotal: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.black, color: COLORS.primary },

  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepIcon: { width: 38, height: 38, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  stepTxt: { flex: 1, fontSize: TYPE.size.sm, color: COLORS.textMedium },

  // Footer
  footer: {
    flexDirection: 'row', gap: 10, padding: 14, paddingHorizontal: 16,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 13,
  },
  trackBtnTxt: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: COLORS.primary },
  homeBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  homeBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  homeBtnTxt: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: '#fff' },
});
