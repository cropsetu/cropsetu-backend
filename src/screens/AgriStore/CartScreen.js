import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, TYPE } from '../../constants/colors';
import api from '../../services/api';

// ── Swipeable cart item ───────────────────────────────────────────────────────
function CartItem({ item, onQtyChange, onRemove }) {
  const slideX   = useRef(new Animated.Value(0)).current;
  const removing = useRef(false);

  const product  = item.product;
  const subtotal = product.price * item.quantity;
  const imageUrl = product.images?.[0];

  function slideOut(cb) {
    if (removing.current) return;
    removing.current = true;
    Animated.timing(slideX, { toValue: -400, duration: 250, useNativeDriver: true }).start(cb);
  }

  function confirmRemove() {
    Alert.alert('Remove item?', `Remove ${product.name} from cart?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => { removing.current = false; } },
      { text: 'Remove', style: 'destructive', onPress: () => slideOut(() => onRemove(product.id)) },
    ]);
  }

  return (
    <Animated.View style={[S.itemWrap, { transform: [{ translateX: slideX }] }]}>
      <View style={S.cartItem}>
        {/* Image */}
        <View style={S.itemImgBox}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={S.itemImg} resizeMode="cover" />
            : <Ionicons name="leaf" size={28} color={COLORS.primaryLight} />
          }
        </View>

        {/* Info */}
        <View style={S.itemInfo}>
          <Text style={S.itemCat}>{product.category?.name}</Text>
          <Text style={S.itemName} numberOfLines={2}>{product.name}</Text>
          <Text style={S.itemPrice}>₹{product.price.toLocaleString()} <Text style={S.itemUnit}>/ {product.unit}</Text></Text>
        </View>

        {/* Right column */}
        <View style={S.itemRight}>
          <TouchableOpacity onPress={confirmRemove} style={S.removeBtn}>
            <Ionicons name="trash-outline" size={17} color={COLORS.error} />
          </TouchableOpacity>

          <View style={S.qtyRow}>
            <TouchableOpacity style={S.qBtn} onPress={() => onQtyChange(product.id, item.quantity - 1)}>
              <Ionicons name="remove" size={15} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={S.qNum}>{item.quantity}</Text>
            <TouchableOpacity style={S.qBtn} onPress={() => onQtyChange(product.id, item.quantity + 1)}>
              <Ionicons name="add" size={15} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Text style={S.itemSubtotal}>₹{subtotal.toLocaleString()}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CartScreen({ navigation }) {
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  const delivery = total >= 999 ? 0 : 49;
  const grandTotal = total + delivery;

  // ── Fetch cart ──────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    try {
      const { data } = await api.get('/agristore/cart');
      setItems(data.data.items || []);
      setTotal(data.data.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, []);

  // ── Update quantity ─────────────────────────────────────────────────────────
  async function handleQtyChange(productId, newQty) {
    if (newQty < 1) { handleRemove(productId); return; }
    // Optimistic update
    setItems(prev => prev.map(i =>
      i.product.id === productId ? { ...i, quantity: newQty } : i
    ));
    setTotal(prev => {
      const item = items.find(i => i.product.id === productId);
      if (!item) return prev;
      return prev - item.product.price * item.quantity + item.product.price * newQty;
    });
    try {
      await api.put(`/agristore/cart/${productId}`, { quantity: newQty });
    } catch {
      fetchCart(); // revert on error
    }
  }

  // ── Remove item ─────────────────────────────────────────────────────────────
  async function handleRemove(productId) {
    const removed = items.find(i => i.product.id === productId);
    setItems(prev => prev.filter(i => i.product.id !== productId));
    if (removed) setTotal(prev => prev - removed.product.price * removed.quantity);
    try {
      await api.delete(`/agristore/cart/${productId}`);
    } catch {
      fetchCart();
    }
  }

  // ── Proceed to checkout ─────────────────────────────────────────────────────
  function handleCheckout() {
    navigation.navigate('Checkout', { total, delivery, grandTotal, itemCount: items.length });
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[S.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <SafeAreaView style={S.container}>
        <View style={S.empty}>
          <View style={S.emptyIconWrap}>
            <Ionicons name="cart-outline" size={64} color={COLORS.border} />
          </View>
          <Text style={S.emptyTitle}>Your cart is empty</Text>
          <Text style={S.emptySub}>Add products from the store to get started</Text>
          <TouchableOpacity style={S.shopBtn} onPress={() => navigation.goBack()}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={S.shopBtnGrad}>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={S.shopBtnTxt}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.container}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={S.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <CartItem item={item} onQtyChange={handleQtyChange} onRemove={handleRemove} />
        )}
        ListFooterComponent={
          <View style={S.summary}>
            <Text style={S.summaryTitle}>Order Summary</Text>

            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</Text>
              <Text style={S.summaryValue}>₹{total.toLocaleString()}</Text>
            </View>

            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Delivery charges</Text>
              <Text style={[S.summaryValue, delivery === 0 && { color: COLORS.success, fontWeight: TYPE.weight.bold }]}>
                {delivery === 0 ? 'FREE' : `₹${delivery}`}
              </Text>
            </View>

            {delivery > 0 && (
              <View style={S.freeHint}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.accent} />
                <Text style={S.freeHintTxt}>Add ₹{(999 - total).toLocaleString()} more for FREE delivery</Text>
              </View>
            )}

            <View style={S.divider} />

            <View style={S.summaryRow}>
              <Text style={S.totalLabel}>Total Payable</Text>
              <Text style={S.totalValue}>₹{grandTotal.toLocaleString()}</Text>
            </View>

            {delivery === 0 && (
              <View style={S.savingsBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={S.savingsTxt}>You're saving ₹49 on delivery!</Text>
              </View>
            )}
          </View>
        }
      />

      {/* Checkout bar */}
      <View style={S.bar}>
        <View>
          <Text style={S.barTotal}>₹{grandTotal.toLocaleString()}</Text>
          <Text style={S.barSub}>{items.length} item{items.length > 1 ? 's' : ''} · {delivery === 0 ? 'Free delivery' : `+₹${delivery} delivery`}</Text>
        </View>
        <TouchableOpacity style={S.checkoutBtn} onPress={handleCheckout}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={S.checkoutGrad}>
            <Text style={S.checkoutTxt}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 14, paddingBottom: 8 },

  // Item
  itemWrap: {},
  cartItem: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 12, alignItems: 'flex-start', ...SHADOWS.small,
  },
  itemImgBox: {
    width: 70, height: 70, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceRaised, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  itemImg: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, paddingHorizontal: 10 },
  itemCat: { fontSize: 10, color: COLORS.textMedium, fontWeight: TYPE.weight.bold, textTransform: 'uppercase', letterSpacing: 0.7 },
  itemName: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: COLORS.textDark, marginTop: 2, lineHeight: 18 },
  itemPrice: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.black, color: COLORS.primary, marginTop: 4 },
  itemUnit: { fontSize: 11, fontWeight: TYPE.weight.regular, color: COLORS.textMedium },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  removeBtn: { padding: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qBtn: {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.borderGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  qNum: { fontSize: 14, fontWeight: TYPE.weight.black, color: COLORS.textDark, minWidth: 22, textAlign: 'center' },
  itemSubtotal: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.black, color: COLORS.textDark },

  // Summary
  summary: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 18, marginTop: 14, marginBottom: 8, ...SHADOWS.small,
  },
  summaryTitle: { fontSize: TYPE.size.base, fontWeight: TYPE.weight.black, color: COLORS.textDark, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: TYPE.size.sm, color: COLORS.textMedium },
  summaryValue: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold, color: COLORS.textDark },
  freeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  freeHintTxt: { fontSize: 12, color: COLORS.accent, flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 10 },
  totalLabel: { fontSize: TYPE.size.base, fontWeight: TYPE.weight.black, color: COLORS.textDark },
  totalValue: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.primary },
  savingsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  savingsTxt: { fontSize: 12, color: COLORS.success, fontWeight: TYPE.weight.semibold },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.divider, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.textDark },
  emptySub: { fontSize: TYPE.size.sm, color: COLORS.textMedium, textAlign: 'center' },
  shopBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 8 },
  shopBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  shopBtnTxt: { color: '#fff', fontSize: TYPE.size.base, fontWeight: TYPE.weight.bold },

  // Bottom bar
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  barTotal: { fontSize: TYPE.size.lg, fontWeight: TYPE.weight.black, color: COLORS.primary },
  barSub: { fontSize: 11, color: COLORS.textMedium, marginTop: 2 },
  checkoutBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  checkoutGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 13 },
  checkoutTxt: { color: '#fff', fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold },
});
