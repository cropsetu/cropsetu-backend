import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import api from '../../services/api';

export default function ProductDetail({ route, navigation }) {
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [imgIdx, setImgIdx]     = useState(0);
  const [adding, setAdding]     = useState(false);

  const discount   = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const inStock    = (product.stock ?? (product.inStock ? 1 : 0)) > 0;
  const reviews    = product.ratingCount ?? product.reviews ?? 0;
  const brandLabel = product.brand || product.category?.name || '';

  async function addToCart() {
    setAdding(true);
    try {
      await api.post('/agristore/cart', { productId: product.id, quantity });
      return true;
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Could not add to cart');
      return false;
    } finally {
      setAdding(false);
    }
  }

  async function handleAddToCart() {
    const ok = await addToCart();
    if (ok) Alert.alert('Added to Cart ✓', `${quantity} × ${product.name} added!`, [{ text: 'OK' }]);
  }

  async function handleBuyNow() {
    const ok = await addToCart();
    if (ok) navigation.navigate('Cart');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.images?.[imgIdx] ? (
            <Image source={{ uri: product.images[imgIdx] }} style={styles.productImg} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="leaf" size={80} color={COLORS.primaryLight} />
            </View>
          )}
          {/* Image thumb strip */}
          {product.images?.length > 1 && (
            <View style={styles.thumbStrip}>
              {product.images.map((url, i) => (
                <TouchableOpacity key={i} onPress={() => setImgIdx(i)}>
                  <Image source={{ uri: url }} style={[styles.thumb, i === imgIdx && styles.thumbActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.wishlistBtn} onPress={() => setWishlist(!wishlist)}>
            <Ionicons name={wishlist ? 'heart' : 'heart-outline'} size={24} color={wishlist ? COLORS.error : COLORS.textDark} />
          </TouchableOpacity>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Brand & Name */}
          <Text style={styles.brand}>{brandLabel}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.nameHi}>{product.nameHi}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(product.rating) ? 'star' : 'star-outline'}
                size={18}
                color={COLORS.gold}
              />
            ))}
            <Text style={styles.ratingNum}>{product.rating}</Text>
            <Text style={styles.reviews}>({reviews} reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
              {product.mrp > product.price && (
                <View style={styles.mrpRow}>
                  <Text style={styles.mrp}>MRP ₹{product.mrp.toLocaleString()}</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>Save ₹{(product.mrp - product.price).toLocaleString()}</Text>
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.unitBig}>per {product.unit}</Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(q => q + 1)}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.totalPrice}>
                Total: ₹{(product.price * quantity).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Availability */}
          <View style={styles.availRow}>
            <Ionicons
              name={inStock ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={inStock ? COLORS.success : COLORS.error}
            />
            <Text style={[styles.availText, { color: inStock ? COLORS.success : COLORS.error }]}>
              {inStock ? 'In Stock - Ready to Ship' : 'Out of Stock'}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why choose this?</Text>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
              <Text style={styles.featureText}>Quality Certified & Lab Tested</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="car" size={18} color={COLORS.primary} />
              <Text style={styles.featureText}>Free Delivery on Orders above ₹999</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
              <Text style={styles.featureText}>Easy 7-Day Returns</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="call" size={18} color={COLORS.primary} />
              <Text style={styles.featureText}>Expert Advice Available: 1800-XXX-XXXX</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart} disabled={adding || !inStock}>
          {adding
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <><Ionicons name="cart-outline" size={22} color={COLORS.primary} /><Text style={styles.cartBtnText}>Add to Cart</Text></>
          }
        </TouchableOpacity>
        <TouchableOpacity style={[styles.buyBtn, (!inStock) && { opacity: 0.5 }]} onPress={handleBuyNow} disabled={adding || !inStock}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.buyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {adding
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buyBtnText}>{inStock ? 'Buy Now' : 'Out of Stock'}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  imageContainer: { backgroundColor: COLORS.surface, aspectRatio: 1.5, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  productImg: { width: '100%', height: '100%', position: 'absolute' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  thumbStrip: { position: 'absolute', bottom: 10, flexDirection: 'row', gap: 6 },
  thumb: { width: 36, height: 36, borderRadius: 6, borderWidth: 1.5, borderColor: 'transparent', opacity: 0.7 },
  thumbActive: { borderColor: COLORS.primary, opacity: 1 },
  wishlistBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
  discountBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: COLORS.error, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  discountText: { color: COLORS.textWhite, fontSize: 13, fontWeight: '700' },

  content: { padding: 20 },
  brand: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 22, color: COLORS.textDark, fontWeight: '800', marginTop: 4, lineHeight: 28 },
  nameHi: { fontSize: 16, color: COLORS.textMedium, fontWeight: '600', marginTop: 4 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  ratingNum: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginLeft: 4 },
  reviews: { fontSize: 13, color: COLORS.textLight },

  priceCard: { backgroundColor: COLORS.primaryPale, borderRadius: 14, padding: 16, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  mrpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  mrp: { fontSize: 14, color: COLORS.textLight, textDecorationLine: 'line-through' },
  saveBadge: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  saveText: { color: COLORS.textWhite, fontSize: 12, fontWeight: '700' },
  unitBig: { fontSize: 13, color: COLORS.textMedium, fontWeight: '600' },

  quantitySection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, minWidth: 40, textAlign: 'center' },
  totalPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primaryMedium, marginLeft: 8 },

  availRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  availText: { fontSize: 14, fontWeight: '600' },

  section: { marginTop: 24 },
  description: { fontSize: 15, color: COLORS.textMedium, lineHeight: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, color: COLORS.textMedium, flex: 1 },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  cartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  cartBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  buyBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  buyGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textWhite },
});
