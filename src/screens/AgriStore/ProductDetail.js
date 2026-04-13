import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator, Dimensions, Animated,
  FlatList, Modal, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { width: W } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:         '#F1F3F6',
  card:       '#FFFFFF',
  textDark:   '#212121',
  textMid:    '#555555',
  textLight:  '#888888',
  border:     '#E8E8E8',
  green:      '#2D9162',
  greenDark:  '#1A5C2A',
  greenBg:    '#E8F8EF',
  greenText:  '#1B5E20',
  orange:     '#FF6B35',
  orangeBg:   '#FFF3EE',
  yellow:     '#FFB800',
  yellowDark: '#996B00',
  red:        '#E53935',
  redBg:      '#FFEBEE',
  blue:       '#1565C0',
  blueBg:     '#E3F2FD',
};

// ── Spring press wrapper ──────────────────────────────────────────────────────
function PressScale({ children, style, onPress, scaleTo = 0.96 }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[style, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(sc, { toValue: scaleTo, useNativeDriver: true, tension: 300, friction: 10 }).start()
        }
        onPressOut={() =>
          Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()
        }
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Collapsible card ──────────────────────────────────────────────────────────
function Collapsible({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const rot = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    Animated.spring(rot, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 200, friction: 20 }).start();
    setOpen(v => !v);
  };

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={S.collapseCard}>
      <TouchableOpacity style={S.collapseHead} onPress={toggle} activeOpacity={0.85}>
        <View style={S.collapseLeft}>
          <View style={S.collapseIconCircle}>
            <Ionicons name={icon} size={16} color={C.green} />
          </View>
          <Text style={S.collapseTitle}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color={C.textLight} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={S.collapseBody}>{children}</View>}
    </View>
  );
}

// ── Spec table row ────────────────────────────────────────────────────────────
function SpecRow({ label, value, last }) {
  return (
    <View style={[S.specRow, last && { borderBottomWidth: 0 }]}>
      <Text style={S.specLabel}>{label}</Text>
      <Text style={S.specValue}>{value}</Text>
    </View>
  );
}

// ── Trust badge ───────────────────────────────────────────────────────────────
function TrustBadge({ icon, label, color, bgColor, onPress }) {
  return (
    <TouchableOpacity style={S.trustItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[S.trustIconCircle, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={S.trustLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Similar product card ──────────────────────────────────────────────────────
function SimilarCard({ item, onPress }) {
  const sc   = useRef(new Animated.Value(1)).current;
  const disc = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  return (
    <Animated.View style={[S.simCard, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(sc, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPress={() => onPress(item)}
      >
        <View style={S.simImgBox}>
          {item.images?.[0]
            ? <Image source={{ uri: item.images[0] }} style={S.simImg} resizeMode="cover" />
            : <View style={[S.simImg, S.simImgPlaceholder]}><Ionicons name="leaf" size={26} color={C.green} /></View>
          }
          {disc > 0 && (
            <View style={S.simDiscBadge}>
              <Text style={S.simDiscTxt}>{disc}%{'\n'}OFF</Text>
            </View>
          )}
        </View>
        <View style={S.simInfo}>
          <Text style={S.simName} numberOfLines={2}>{item.name}</Text>
          <Text style={S.simPrice}>₹{item.price.toLocaleString()}</Text>
          {item.mrp > item.price && (
            <Text style={S.simMrp}>₹{item.mrp.toLocaleString()}</Text>
          )}
          {item.rating > 0 && (
            <View style={S.simRating}>
              <Text style={S.simRatingTxt}>{item.rating} </Text>
              <Ionicons name="star" size={9} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProductDetail({ route, navigation }) {
  const { product } = route.params;
  const { t }       = useLanguage();
  const insets      = useSafeAreaInsets();

  const [quantity,    setQuantity]    = useState(1);
  const [wishlist,    setWishlist]    = useState(false);
  const [imgIdx,      setImgIdx]      = useState(0);
  const [adding,      setAdding]      = useState(false);
  const [trustKey,    setTrustKey]    = useState(null);
  const [similar,     setSimilar]     = useState([]);
  const [addresses,   setAddresses]   = useState([]);
  const [selAddr,     setSelAddr]     = useState(null);   // selected address object
  const [addrSheet,   setAddrSheet]   = useState(false);  // bottom sheet open

  // Default tab: 'spec' if specs exist, else 'mfr'
  const hasSpecs = !!(product.specifications && Object.keys(product.specifications).length > 0);
  const [activeTab, setActiveTab] = useState(hasSpecs ? 'spec' : 'mfr');

  const fadeIn   = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(24)).current;
  const heartSc  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 100, friction: 14, useNativeDriver: true }),
    ]).start();

    const catId = product.category?.id || product.categoryId;
    if (catId) {
      api.get(`/agristore/products?categoryId=${catId}&limit=10`)
        .then(res => {
          const list = (res.data?.data || res.data || []).filter(p => p.id !== product.id);
          setSimilar(list.slice(0, 8));
        })
        .catch(() => {});
    }

    // Fetch saved addresses — pick default or first
    api.get('/addresses')
      .then(res => {
        const list = res.data?.data || res.data || [];
        if (list.length) {
          setAddresses(list);
          setSelAddr(list.find(a => a.isDefault) || list[0]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const discount   = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;
  const saving     = product.mrp > product.price ? product.mrp - product.price : 0;
  const inStock    = (product.stock ?? (product.inStock ? 1 : 0)) > 0;
  const reviews    = product.ratingCount ?? product.reviews ?? 0;
  const brandLabel = product.brand || product.category?.name || 'FarmEasy';
  const mfrLabel   = product.manufacturer || brandLabel;

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const deliveryStr = deliveryDate.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  // ── Cart helpers ────────────────────────────────────────────────────────────
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
    if (ok) Alert.alert('Added to Cart ✓', `${quantity}× ${product.name}`, [{ text: 'OK' }]);
  }

  async function handleBuyNow() {
    const ok = await addToCart();
    if (ok) navigation.navigate('Cart');
  }

  function toggleWishlist() {
    Animated.sequence([
      Animated.spring(heartSc, { toValue: 1.4, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(heartSc, { toValue: 1,   useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
    setWishlist(v => !v);
  }

  // ── Spec data — prefer real DB fields, fallback to derived ─────────────────

  // Product Highlights: use seller-entered highlights[] or fall back to key fields
  const highlightBullets = product.highlights?.length
    ? product.highlights
    : null;

  // Spec table: use seller-entered specifications{} + always include base fields
  const baseSpecRows = [
    { label: 'Brand',        value: brandLabel },
    { label: 'Category',     value: product.category?.name || '—' },
    { label: 'Unit',         value: product.unit || '—' },
    { label: 'Availability', value: inStock ? 'In Stock' : 'Out of Stock' },
    { label: 'Min. Order',   value: product.minOrderQty ? `${product.minOrderQty} ${product.unit}` : '1' },
    { label: 'Rating',       value: product.rating ? `${product.rating} ★` : '—' },
  ];

  // Merge seller-entered specs on top of base rows
  const specRows = (() => {
    const specs = product.specifications;
    if (specs && typeof specs === 'object' && Object.keys(specs).length > 0) {
      const fromDB = Object.entries(specs).map(([label, value]) => ({ label, value: String(value) }));
      // Add base rows that aren't already covered by seller specs
      const coveredKeys = new Set(fromDB.map(r => r.label.toLowerCase()));
      const extra = baseSpecRows.filter(r => !coveredKeys.has(r.label.toLowerCase()));
      return [...fromDB, ...extra];
    }
    return baseSpecRows;
  })();

  // Highlights grid: if no bullet highlights, show spec grid instead
  const highlights = highlightBullets
    ? null   // rendered as bullet list
    : [
        { label: 'Brand',    value: brandLabel },
        { label: 'Category', value: product.category?.name || '—' },
        { label: 'Unit',     value: product.unit || '—' },
        { label: 'Rating',   value: product.rating ? `${product.rating} / 5` : '—' },
        { label: 'Reviews',  value: reviews > 0 ? `${reviews.toLocaleString()} ratings` : '—' },
        { label: 'Stock',    value: inStock ? `${typeof product.stock === 'number' ? product.stock + ' units' : 'Available'}` : 'Out of Stock' },
      ];

  const mfrRows = [
    { label: 'Manufacturer',     value: mfrLabel },
    { label: 'Brand',            value: brandLabel },
    { label: 'Country of Origin', value: product.countryOfOrigin || 'India' },
    { label: 'Product Code',     value: `FE-${(product.id || '').slice(0, 8).toUpperCase()}` },
    { label: 'Quality Check',    value: 'FarmEasy Verified' },
    { label: 'Customer Support', value: 'Mon–Sat, 9 AM–6 PM' },
  ];

  const trustPolicies = {
    return:  { title: '7 Days Return Policy', body: 'Received a damaged or wrong product? Request a return within 7 days of delivery. Share photos with our support team and we will arrange a pickup at no cost.' },
    cod:     { title: 'Cash on Delivery', body: 'Pay cash when your order arrives at your doorstep. Available across most pincodes. No digital payment required.' },
    assured: { title: 'FarmEasy Assured', body: 'Assured products are quality-checked by our in-house team for authenticity, accurate description, and safe packaging before shipping.' },
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Top Safe Area + Header ─────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.card, ...SHADOWS.medium }}>
        <View style={S.header}>
          <TouchableOpacity style={S.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.textDark} />
          </TouchableOpacity>
          <Text style={S.headerTitle} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity style={S.headerIconBtn} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="cart-outline" size={23} color={C.textDark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Scroll content ────────────────────────────────────────────────── */}
      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* ── Image Gallery ─────────────────────────────────────────────── */}
        <View style={S.imgSection}>
          {/* Main image — fixed height, overlays inside */}
          <View style={S.imgBox}>
            {product.images?.[imgIdx]
              ? <Image source={{ uri: product.images[imgIdx] }} style={S.mainImg} resizeMode="contain" />
              : (
                <View style={S.imgPlaceholder}>
                  <Ionicons name="leaf" size={80} color={C.green} />
                </View>
              )
            }

            {/* Top-right: wishlist + share */}
            <View style={S.imgTopRight}>
              <Animated.View style={{ transform: [{ scale: heartSc }] }}>
                <TouchableOpacity style={S.imgActionBtn} onPress={toggleWishlist}>
                  <Ionicons
                    name={wishlist ? 'heart' : 'heart-outline'}
                    size={22}
                    color={wishlist ? C.red : C.textMid}
                  />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={S.imgActionBtn}>
                <Ionicons name="share-social-outline" size={22} color={C.textMid} />
              </TouchableOpacity>
            </View>

            {/* Discount badge top-left */}
            {discount > 0 && (
              <View style={S.discBadge}>
                <Text style={S.discBadgeTxt}>{discount}%{'\n'}OFF</Text>
              </View>
            )}

            {/* Bottom bar: rating pill left + thumbnails right — same level */}
            <View style={S.imgBottomBar}>
              {/* Rating pill — left side */}
              {product.rating > 0 && (
                <View style={S.ratingPill}>
                  <Text style={S.ratingPillTxt}>{product.rating}</Text>
                  <Ionicons name="star" size={11} color="#fff" />
                  {reviews > 0 && (
                    <>
                      <View style={S.ratingPillDivider} />
                      <Text style={S.ratingPillTxt}>{reviews.toLocaleString()}</Text>
                    </>
                  )}
                </View>
              )}

              {/* Thumbnail strip — right side, same row */}
              {product.images?.length > 1 && (
                <View style={S.thumbRow}>
                  {product.images.map((url, i) => (
                    <TouchableOpacity key={i} onPress={() => setImgIdx(i)} activeOpacity={0.8}>
                      <Image
                        source={{ uri: url }}
                        style={[S.thumb, i === imgIdx && S.thumbActive]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

        </View>

        {/* ── Product Info ───────────────────────────────────────────────── */}
        <Animated.View style={[S.infoCard, { transform: [{ translateY: slideUp }] }]}>
          {/* Brand */}
          <Text style={S.brandLabel}>{brandLabel.toUpperCase()}</Text>

          {/* Name */}
          <Text style={S.productName}>{product.name}</Text>
          {product.nameHi ? <Text style={S.productNameHi}>{product.nameHi}</Text> : null}

          {/* Tags row */}
          <View style={S.tagRow}>
            {discount >= 20 && (
              <View style={S.hotBadge}>
                <Ionicons name="flame" size={11} color="#fff" />
                <Text style={S.hotBadgeTxt}>Hot Deal</Text>
              </View>
            )}
            {inStock
              ? <View style={S.inStockTag}><Text style={S.inStockTxt}>● In Stock</Text></View>
              : <View style={S.outStockTag}><Text style={S.outStockTxt}>Out of Stock</Text></View>
            }
          </View>

          {/* Inline rating */}
          {product.rating > 0 && (
            <View style={S.ratingRow}>
              <View style={S.ratingChip}>
                <Text style={S.ratingChipTxt}>{product.rating}</Text>
                <Ionicons name="star" size={11} color="#fff" />
              </View>
              <Text style={S.ratingCountTxt}>{reviews.toLocaleString()} Ratings</Text>
              <Text style={S.ratingDot}>·</Text>
              <Text style={S.ratingCountTxt}>{Math.ceil(reviews / 12)} Reviews</Text>
            </View>
          )}

          {/* Price */}
          <View style={S.priceRow}>
            <Text style={S.price}>₹{product.price.toLocaleString()}</Text>
            {product.mrp > product.price && (
              <View style={S.priceMeta}>
                <View style={S.discRow}>
                  <Text style={S.discPct}>↓{discount}%</Text>
                  <Text style={S.mrpTxt}>₹{product.mrp.toLocaleString()}</Text>
                </View>
                <View style={S.savePill}>
                  <Text style={S.savePillTxt}>You save ₹{saving.toLocaleString()}</Text>
                </View>
              </View>
            )}
          </View>
          <Text style={S.inclTax}>Inclusive of all taxes · per {product.unit || 'unit'}</Text>

          {/* ── Quantity Selector (inside info card) ───────────────────── */}
          <View style={S.qtyBlock}>
            <View style={S.qtyHeaderRow}>
              <Text style={S.sectionTitle}>Quantity</Text>
              <Text style={S.qtyTotal}>
                Total:{' '}
                <Text style={{ color: C.greenDark, fontWeight: '800' }}>
                  ₹{(product.price * quantity).toLocaleString()}
                </Text>
              </Text>
            </View>
            <View style={S.qtyRow}>
              <View style={S.qtyPill}>
                <TouchableOpacity
                  style={S.qPillBtn}
                  onPress={() => setQuantity(q => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={18} color={C.textDark} />
                </TouchableOpacity>
                <Text style={S.qtyNum}>{quantity}</Text>
                <TouchableOpacity
                  style={S.qPillBtn}
                  onPress={() => setQuantity(q => q + 1)}
                >
                  <Ionicons name="add" size={18} color={C.textDark} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Delivery Card ──────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          {/* Express delivery row */}
          <View style={S.delivRow}>
            <View style={[S.delivIconCircle, { backgroundColor: '#E8F8EF' }]}>
              <Ionicons name="flash" size={17} color={C.green} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={S.delivHead}>Express Delivery</Text>
              <Text style={S.delivSub}>
                Delivery by{' '}
                <Text style={S.delivDate}>{deliveryStr}</Text>
                {' '}if ordered now
              </Text>
            </View>
            <View style={S.freeTag}>
              <Text style={S.freeTagTxt}>FREE</Text>
            </View>
          </View>

          <View style={S.hdivider} />

          {/* Deliver to address row */}
          <TouchableOpacity style={S.addrRow} onPress={() => setAddrSheet(true)} activeOpacity={0.75}>
            <View style={[S.delivIconCircle, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="location" size={17} color={C.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              {selAddr ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[S.addrTypeBadge, { backgroundColor: selAddr.type === 'HOME' ? C.greenBg : selAddr.type === 'OFFICE' ? C.blueBg : '#F3F4F6' }]}>
                      <Text style={[S.addrTypeTxt, { color: selAddr.type === 'HOME' ? C.greenText : selAddr.type === 'OFFICE' ? C.blue : C.textMid }]}>
                        {selAddr.type}
                      </Text>
                    </View>
                    <Text style={S.addrName}>{selAddr.name}</Text>
                  </View>
                  <Text style={S.addrLine} numberOfLines={1}>
                    {selAddr.flat}, {selAddr.street}, {selAddr.city} – {selAddr.pincode}
                  </Text>
                </>
              ) : (
                <Text style={[S.delivSub, { color: C.blue, fontWeight: '600' }]}>
                  + Add delivery address
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Address Picker Bottom Sheet ─────────────────────────────────── */}
        <Modal
          visible={addrSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setAddrSheet(false)}
        >
          <TouchableOpacity
            style={S.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddrSheet(false)}
          />
          <View style={S.addrSheet}>
            {/* Handle */}
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Choose Delivery Address</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {addresses.length === 0 ? (
                <View style={S.noAddrBox}>
                  <Ionicons name="location-outline" size={40} color={C.textLight} />
                  <Text style={S.noAddrTxt}>No saved addresses yet</Text>
                  <Text style={S.noAddrSub}>Add an address at checkout</Text>
                </View>
              ) : (
                addresses.map((addr) => {
                  const selected = selAddr?.id === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[S.addrCard, selected && S.addrCardSelected]}
                      onPress={() => { setSelAddr(addr); setAddrSheet(false); }}
                      activeOpacity={0.85}
                    >
                      <View style={S.addrCardLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                          <View style={[S.addrTypeBadge, { backgroundColor: addr.type === 'HOME' ? C.greenBg : addr.type === 'OFFICE' ? C.blueBg : '#F3F4F6' }]}>
                            <Text style={[S.addrTypeTxt, { color: addr.type === 'HOME' ? C.greenText : addr.type === 'OFFICE' ? C.blue : C.textMid }]}>
                              {addr.type}
                            </Text>
                          </View>
                          <Text style={S.addrCardName}>{addr.name}</Text>
                          {addr.isDefault && (
                            <View style={S.defaultBadge}>
                              <Text style={S.defaultBadgeTxt}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={S.addrCardLine}>{addr.flat}, {addr.street}</Text>
                        <Text style={S.addrCardLine}>{addr.city}, {addr.state} – {addr.pincode}</Text>
                        <Text style={S.addrCardPhone}>📞 {addr.phone}</Text>
                      </View>
                      <View style={[S.addrRadio, selected && S.addrRadioSelected]}>
                        {selected && <View style={S.addrRadioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Add new address */}
            <TouchableOpacity
              style={S.addAddrBtn}
              onPress={() => { setAddrSheet(false); navigation.navigate('Checkout'); }}
            >
              <Ionicons name="add-circle-outline" size={20} color={C.green} />
              <Text style={S.addAddrTxt}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* ── Seller Card ────────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sellerRow}>
            <View style={S.sellerIconCircle}>
              <Ionicons name="storefront-outline" size={18} color={C.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={S.sellerBy}>Sold by</Text>
              <Text style={S.sellerName}>FarmEasy Direct</Text>
            </View>
            <TouchableOpacity style={S.otherSellersBtn}>
              <Text style={S.otherSellersTxt}>Other sellers</Text>
              <Ionicons name="chevron-forward" size={14} color={C.blue} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Trust Badges ───────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.trustRow}>
            <TrustBadge
              icon="refresh-circle-outline" label={'7 Days\nReturn'}
              color={C.blue}  bgColor={C.blueBg}
              onPress={() => setTrustKey(k => k === 'return' ? null : 'return')}
            />
            <View style={S.trustDivider} />
            <TrustBadge
              icon="cash-outline" label={'Cash on\nDelivery'}
              color={C.green} bgColor={C.greenBg}
              onPress={() => setTrustKey(k => k === 'cod' ? null : 'cod')}
            />
            <View style={S.trustDivider} />
            <TrustBadge
              icon="shield-checkmark-outline" label={'FE\nAssured'}
              color={C.blue}  bgColor={C.blueBg}
              onPress={() => setTrustKey(k => k === 'assured' ? null : 'assured')}
            />
          </View>

          {/* Inline policy detail */}
          {trustKey && (
            <View style={S.policyBox}>
              <View style={S.policyHead}>
                <Text style={S.policyTitle}>{trustPolicies[trustKey].title}</Text>
                <TouchableOpacity onPress={() => setTrustKey(null)}>
                  <Ionicons name="close-circle" size={20} color={C.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={S.policyBody}>{trustPolicies[trustKey].body}</Text>
            </View>
          )}
        </View>

        {/* ── Similar Products ───────────────────────────────────────────── */}
        {similar.length > 0 && (
          <View style={S.similarSection}>
            <View style={S.simHeader}>
              <Text style={S.sectionTitle}>Similar Products</Text>
              <TouchableOpacity>
                <Text style={S.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={similar}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 4, gap: 10 }}
              renderItem={({ item }) => (
                <SimilarCard
                  item={item}
                  onPress={(p) => navigation.push('ProductDetail', { product: p })}
                />
              )}
            />
          </View>
        )}

        {/* ── Collapsible sections — only shown if seller provided data ─── */}
        <View style={{ paddingHorizontal: 10, marginTop: 8, gap: 8 }}>

          {/* Product Highlights — only if seller uploaded highlights */}
          {product.highlights?.length > 0 && (
            <Collapsible title="Product Highlights" icon="list-outline" defaultOpen>
              <View style={S.bulletList}>
                {product.highlights.map((h, i) => (
                  <View key={i} style={S.bulletRow}>
                    <View style={S.bulletDot} />
                    <Text style={S.bulletTxt}>{h}</Text>
                  </View>
                ))}
              </View>
            </Collapsible>
          )}

          {/* All Details — only if seller uploaded specifications or manufacturer info */}
          {(product.specifications && Object.keys(product.specifications).length > 0) || product.manufacturer ? (
            <Collapsible title="All Details" icon="information-circle-outline">
              <View style={S.tabRow}>
                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <TouchableOpacity
                    style={[S.tabBtn, activeTab === 'spec' && S.tabBtnActive]}
                    onPress={() => setActiveTab('spec')}
                  >
                    <Text style={[S.tabBtnTxt, activeTab === 'spec' && S.tabBtnTxtActive]}>
                      Specifications
                    </Text>
                  </TouchableOpacity>
                )}
                {product.manufacturer && (
                  <TouchableOpacity
                    style={[S.tabBtn, activeTab === 'mfr' && S.tabBtnActive]}
                    onPress={() => setActiveTab('mfr')}
                  >
                    <Text style={[S.tabBtnTxt, activeTab === 'mfr' && S.tabBtnTxtActive]}>
                      Manufacturer Info
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {activeTab === 'spec' && product.specifications && (
                <View style={S.specTable}>
                  <View style={S.specGroupHeader}>
                    <Text style={S.specGroupHeadTxt}>Specifications</Text>
                  </View>
                  {Object.entries(product.specifications).map(([label, value], i, arr) => (
                    <SpecRow key={i} label={label} value={String(value)} last={i === arr.length - 1} />
                  ))}
                </View>
              )}

              {activeTab === 'mfr' && product.manufacturer && (
                <View style={S.specTable}>
                  <View style={S.specGroupHeader}>
                    <Text style={S.specGroupHeadTxt}>Manufacturer Details</Text>
                  </View>
                  {mfrRows.map((r, i) => (
                    <SpecRow key={i} label={r.label} value={r.value} last={i === mfrRows.length - 1} />
                  ))}
                </View>
              )}
            </Collapsible>
          ) : null}

          {/* Product Description — only if seller provided description */}
          {product.description ? (
            <Collapsible title="Product Description" icon="document-text-outline">
              <Text style={[S.descText, { paddingBottom: 4 }]}>{product.description}</Text>
            </Collapsible>
          ) : null}

        </View>
      </Animated.ScrollView>

      {/* ── Bottom Action Bar ──────────────────────────────────────────────── */}
      <View style={[S.bottomBar, { paddingBottom: Math.max(insets.bottom + 4, 14) }]}>
        <TouchableOpacity
          style={[S.addCartBtn, (!inStock || adding) && { opacity: 0.45 }]}
          onPress={handleAddToCart}
          disabled={adding || !inStock}
        >
          {adding
            ? <ActivityIndicator size="small" color={C.green} />
            : (
              <>
                <Ionicons name="cart-outline" size={20} color={C.green} />
                <Text style={S.addCartTxt}>ADD TO CART</Text>
              </>
            )
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[S.buyNowBtn, (!inStock || adding) && { opacity: 0.45 }]}
          onPress={handleBuyNow}
          disabled={adding || !inStock}
          activeOpacity={0.82}
        >
          {adding
            ? <ActivityIndicator size="small" color={C.yellowDark} />
            : (
              <>
                <Ionicons name="flash" size={18} color={C.yellowDark} />
                <Text style={S.buyNowTxt}>BUY AT ₹{product.price.toLocaleString()}</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Header
  header:         { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 8, gap: 4 },
  headerIconBtn:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle:    { flex: 1, fontSize: 15, fontWeight: '700', color: C.textDark },

  // Image gallery
  imgSection:     { backgroundColor: C.card },
  imgBox:         { aspectRatio: 1.2, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  mainImg:        { width: '100%', height: '100%' },
  imgPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: C.greenBg },
  imgTopRight:    { position: 'absolute', top: 12, right: 12, gap: 8 },
  imgActionBtn:   {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.card, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.medium,
  },
  discBadge:      {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#E53935', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    alignItems: 'center',
  },
  discBadgeTxt:   { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center', lineHeight: 14 },
  // Bottom bar inside imgBox — rating left, thumbs right
  imgBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  ratingPill:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.green, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  ratingPillTxt:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  ratingPillDivider:{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
  // Thumbnail strip — right side of bottom bar
  thumbRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thumb:       { width: 38, height: 38, borderRadius: 7, borderWidth: 2, borderColor: 'transparent', opacity: 0.55 },
  thumbActive: { borderColor: C.green, opacity: 1 },

  // Info card
  infoCard:       { backgroundColor: C.card, marginTop: 8, padding: 16 },
  brandLabel:     { fontSize: 11, fontWeight: '700', color: C.textLight, letterSpacing: 1.2 },
  productName:    { fontSize: 20, fontWeight: '800', color: C.textDark, marginTop: 4, lineHeight: 26 },
  productNameHi:  { fontSize: 14, color: C.textMid, fontWeight: '500', marginTop: 3 },
  tagRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  hotBadge:       {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FF6B35', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  hotBadgeTxt:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  inStockTag:     { backgroundColor: C.greenBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  inStockTxt:     { color: C.greenText, fontSize: 11, fontWeight: '700' },
  outStockTag:    { backgroundColor: C.redBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  outStockTxt:    { color: C.red, fontSize: 11, fontWeight: '700' },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ratingChip:     {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.green, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  ratingChipTxt:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  ratingCountTxt: { fontSize: 12, color: C.textMid },
  ratingDot:      { fontSize: 12, color: C.textLight },
  priceRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 },
  price:          { fontSize: 30, fontWeight: '900', color: C.textDark },
  priceMeta:      { paddingTop: 5, gap: 5 },
  discRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discPct:        { fontSize: 15, fontWeight: '800', color: C.greenText },
  mrpTxt:         { fontSize: 14, color: C.textLight, textDecorationLine: 'line-through' },
  savePill:       {
    backgroundColor: '#FFF8E1', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  savePillTxt:    { fontSize: 11, fontWeight: '700', color: '#996B00' },
  inclTax:        { fontSize: 11, color: C.textLight, marginTop: 5 },

  // Section card
  sectionCard:    { backgroundColor: C.card, marginTop: 8, padding: 16 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: C.textDark },

  // Delivery
  delivRow:       { flexDirection: 'row', alignItems: 'center' },
  delivIconCircle:{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  delivHead:      { fontSize: 14, fontWeight: '700', color: C.textDark },
  delivSub:       { fontSize: 12, color: C.textMid, marginTop: 2 },
  delivDate:      { fontWeight: '700', color: C.greenText },
  freeTag:        {
    backgroundColor: '#E8F8EF', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#B8E8CC',
  },
  freeTagTxt:     { fontSize: 11, fontWeight: '800', color: C.greenText },
  changeLink:     { fontSize: 13, fontWeight: '700', color: C.blue },
  hdivider:       { height: 1, backgroundColor: C.border, marginVertical: 12 },

  // Seller
  sellerRow:        { flexDirection: 'row', alignItems: 'center' },
  sellerIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueBg, justifyContent: 'center', alignItems: 'center' },
  sellerBy:         { fontSize: 11, color: C.textLight, fontWeight: '600' },
  sellerName:       { fontSize: 14, fontWeight: '700', color: C.textDark, marginTop: 2 },
  otherSellersBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  otherSellersTxt:  { fontSize: 13, fontWeight: '700', color: C.blue },

  // Trust
  trustRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 4 },
  trustItem:      { flex: 1, alignItems: 'center', gap: 7 },
  trustIconCircle:{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  trustLabel:     { fontSize: 11, fontWeight: '600', color: C.textDark, textAlign: 'center', lineHeight: 15 },
  trustDivider:   { width: 1, height: 52, backgroundColor: C.border, marginTop: 6 },
  policyBox:      {
    marginTop: 12, backgroundColor: '#F8FAFC',
    borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  policyHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  policyTitle:    { fontSize: 13, fontWeight: '700', color: C.textDark },
  policyBody:     { fontSize: 13, color: C.textMid, lineHeight: 20 },

  // Quantity (inside info card)
  qtyBlock:     { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },

  // Quantity
  qtyHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qtyTotal:       { fontSize: 14, color: C.textMid },
  qtyRow:         { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyPill:        {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F3F4', borderRadius: 50, padding: 4,
  },
  qPillBtn:       {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card, justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.small,
  },
  qtyNum:         { fontSize: 18, fontWeight: '800', color: C.textDark, minWidth: 44, textAlign: 'center' },

  // Similar products
  similarSection: { backgroundColor: C.card, marginTop: 8, paddingTop: 14, paddingBottom: 14 },
  simHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12 },
  seeAll:         { fontSize: 13, fontWeight: '700', color: C.green },
  simCard:        {
    width: 140, backgroundColor: C.card, borderRadius: 12,
    overflow: 'hidden', ...SHADOWS.medium,
  },
  simImgBox:      { width: 140, height: 140, backgroundColor: '#F7F9FA' },
  simImg:         { width: '100%', height: '100%' },
  simImgPlaceholder:{ justifyContent: 'center', alignItems: 'center' },
  simDiscBadge:   {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: C.green, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  simDiscTxt:     { color: '#fff', fontSize: 9, fontWeight: '900', textAlign: 'center', lineHeight: 12 },
  simInfo:        { padding: 9 },
  simName:        { fontSize: 12, fontWeight: '600', color: C.textDark, lineHeight: 16, marginBottom: 4 },
  simPrice:       { fontSize: 14, fontWeight: '800', color: C.textDark },
  simMrp:         { fontSize: 11, color: C.textLight, textDecorationLine: 'line-through', marginTop: 1 },
  simRating:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.green, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    alignSelf: 'flex-start', marginTop: 4,
  },
  simRatingTxt:   { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Collapsible
  collapseCard:       {
    backgroundColor: C.card, borderRadius: 14,
    overflow: 'hidden', ...SHADOWS.small,
  },
  collapseHead:       {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14,
  },
  collapseLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  collapseIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.greenBg, justifyContent: 'center', alignItems: 'center',
  },
  collapseTitle:      { fontSize: 15, fontWeight: '700', color: C.textDark },
  collapseBody:       { paddingHorizontal: 14, paddingBottom: 14 },

  // Bullet highlights (from DB)
  bulletList:  { gap: 8 },
  bulletRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginTop: 6 },
  bulletTxt:   { flex: 1, fontSize: 14, color: C.textDark, lineHeight: 22 },

  // Highlights grid (2-col)
  highlightGrid:  { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 0.5, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  highlightCell:  { width: '50%', padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  highlightLabel: { fontSize: 11, color: C.textLight, fontWeight: '600', marginBottom: 3 },
  highlightValue: { fontSize: 13, fontWeight: '700', color: C.textDark },

  // Tabs
  tabRow:       { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: C.border, marginBottom: 12 },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -1.5 },
  tabBtnActive: { borderBottomColor: C.green },
  tabBtnTxt:    { fontSize: 13, color: C.textLight, fontWeight: '600' },
  tabBtnTxtActive:{ color: C.green, fontWeight: '800' },

  // Spec table
  specTable:        { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  specGroupHeader:  { backgroundColor: '#F5F7FA', paddingHorizontal: 12, paddingVertical: 9 },
  specGroupHeadTxt: { fontSize: 12, fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: 0.5 },
  specRow:          { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  specLabel:        { width: '42%', fontSize: 13, color: C.textLight, fontWeight: '500' },
  specValue:        { flex: 1, fontSize: 13, color: C.textDark, fontWeight: '700' },
  descText:         { fontSize: 14, color: C.textMid, lineHeight: 22 },

  // Bottom bar
  bottomBar:    {
    flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 12,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
    ...SHADOWS.medium,
  },
  addCartBtn:   {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderWidth: 2, borderColor: C.green, borderRadius: 14,
  },
  addCartTxt:   { fontSize: 13, fontWeight: '800', color: C.green, letterSpacing: 0.5 },
  buyNowBtn:    {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, backgroundColor: '#FFB800', borderRadius: 14,
    borderWidth: 2, borderColor: '#FFB800',
  },
  buyNowTxt:    { fontSize: 13, fontWeight: '800', color: '#5C3D00', letterSpacing: 0.3 },

  // Address row in delivery card
  addrRow:       { flexDirection: 'row', alignItems: 'center' },
  addrTypeBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  addrTypeTxt:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  addrName:      { fontSize: 13, fontWeight: '700', color: C.textDark },
  addrLine:      { fontSize: 12, color: C.textMid, marginTop: 2 },

  // Bottom sheet
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  addrSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    ...SHADOWS.large,
  },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 10 },
  sheetTitle:   { fontSize: 17, fontWeight: '800', color: C.textDark, textAlign: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },

  // Address cards inside sheet
  addrCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, padding: 14,
    backgroundColor: C.card,
  },
  addrCardSelected: { borderColor: C.green, backgroundColor: C.greenBg },
  addrCardLeft:     { flex: 1 },
  addrCardName:     { fontSize: 14, fontWeight: '700', color: C.textDark },
  addrCardLine:     { fontSize: 12, color: C.textMid, marginTop: 1 },
  addrCardPhone:    { fontSize: 12, color: C.textMid, marginTop: 4 },
  defaultBadge:     { backgroundColor: C.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeTxt:  { fontSize: 9, fontWeight: '800', color: '#fff' },
  addrRadio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  addrRadioSelected:{ borderColor: C.green },
  addrRadioDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },

  noAddrBox: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  noAddrTxt: { fontSize: 15, fontWeight: '700', color: C.textMid },
  noAddrSub: { fontSize: 13, color: C.textLight },

  addAddrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 1.5, borderColor: C.green, borderRadius: 12,
    paddingVertical: 13,
  },
  addAddrTxt: { fontSize: 14, fontWeight: '700', color: C.green },
});
