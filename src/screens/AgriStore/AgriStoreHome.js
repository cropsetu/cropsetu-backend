/**
 * AgriStoreHome — web-prototype structure (shop-tab.tsx) with full API backend
 * Header → Search → Banner → Best Sellers → All Products grid
 * Left slide drawer (flat category list) + animated language bottom sheet
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, StatusBar, Image, Animated, Easing,
  Modal, TouchableWithoutFeedback, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');
const GREEN    = '#2D9162';
const GREEN_L  = '#E8F5EE';
const ORANGE   = '#E67E22';
const GOLD     = '#F9A825';
const BG       = '#F8F9FA';
const CARD     = '#FFFFFF';
const BORDER   = '#E5E7EB';
const DRAWER_W = W * 0.85;

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(anim, { toValue: 0, duration: 750, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
    ])).start();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#E4EDE7', '#C8E6D4'] });
  return (
    <View style={S.gridCard}>
      <Animated.View style={[{ height: 130, backgroundColor: bg }]} />
      <View style={{ padding: 10, gap: 7 }}>
        <Animated.View style={{ height: 11, width: '85%', borderRadius: 5, backgroundColor: bg }} />
        <Animated.View style={{ height: 9,  width: '55%', borderRadius: 5, backgroundColor: bg }} />
        <Animated.View style={{ height: 9,  width: '40%', borderRadius: 5, backgroundColor: bg }} />
        <Animated.View style={{ height: 32, borderRadius: 10, marginTop: 4, backgroundColor: bg }} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Drawer — flat list, slides from left, web-prototype style
// ─────────────────────────────────────────────────────────────────────────────
function CategoryDrawer({ visible, categories, selectedCat, language, onSelect, onClose, insets, t }) {
  const slideX    = useRef(new Animated.Value(-DRAWER_W)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideX,    { toValue: 0,          useNativeDriver: true, friction: 22, tension: 200 }),
        Animated.timing(bgOpacity, { toValue: 1,          useNativeDriver: true, duration: 220 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX,    { toValue: -DRAWER_W,  useNativeDriver: true, duration: 200 }),
        Animated.timing(bgOpacity, { toValue: 0,          useNativeDriver: true, duration: 200 }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[DR.backdrop, { opacity: bgOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[DR.panel, { transform: [{ translateX: slideX }] }]}>
        {/* Header — green-tint like web prototype */}
        <View style={[DR.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={DR.headerSub}>{t('store.browse')}</Text>
            <Text style={DR.headerTitle}>{t('store.shopName')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={DR.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={GREEN} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {/* All Products */}
          <TouchableOpacity
            style={[DR.allRow, selectedCat === '__all__' && DR.allRowActive]}
            onPress={() => { onSelect('__all__', null); onClose(); }}
            activeOpacity={0.75}
          >
            <Text style={[DR.allRowTxt, selectedCat === '__all__' && DR.allRowTxtActive]}>{t('store.allProducts')}</Text>
            <Ionicons name="chevron-forward" size={18} color={selectedCat === '__all__' ? GREEN : '#999'} />
          </TouchableOpacity>

          <View style={DR.sectionHeader}>
            <Text style={DR.sectionHeaderTxt}>{t('store.shopBySection')}</Text>
          </View>

          {categories.map(cat => {
            const label = language === 'mr' && cat.nameMr ? cat.nameMr
                        : language === 'hi' && cat.nameHi ? cat.nameHi
                        : cat.name;
            const active = selectedCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[DR.catRow, active && DR.catRowActive]}
                onPress={() => { onSelect(cat.id, null); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={[DR.catRowTxt, active && DR.catRowTxtActive]} numberOfLines={1}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={active ? GREEN : '#999'} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Language item — isolated for useRef per row
// ─────────────────────────────────────────────────────────────────────────────
function LangItem({ lang, active, onSelect }) {
  const sc = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      <TouchableOpacity
        style={[S.lpRow, active && S.lpRowActive]}
        activeOpacity={1}
        onPressIn={() => Animated.spring(sc, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1,    useNativeDriver: true, friction: 5 }).start()}
        onPress={() => onSelect(lang.code)}
      >
        <View style={[S.lpFlagWrap, active && { backgroundColor: GREEN + '14' }]}>
          <Text style={S.lpFlag}>{lang.flag}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[S.lpName, active && S.lpNameActive]}>{lang.name}</Text>
          <Text style={S.lpNative}>{lang.nativeName}</Text>
        </View>
        {active
          ? <View style={S.lpCheck}><Ionicons name="checkmark" size={14} color="#fff" /></View>
          : <View style={S.lpRadio} />
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map seed icon names → valid Ionicons names
// (The seed uses some Material icon names that don't exist in Ionicons)
// ─────────────────────────────────────────────────────────────────────────────
const ICON_MAP = {
  'leaf':          'leaf',
  'nutrition':     'nutrition',
  'bug':           'bug',
  'water':         'water',
  'car':           'car',
  'construct':     'construct',
  'home':          'home',
  'shield':        'shield',
  'archive':       'archive',
  'paw':           'paw',
  'warning':       'warning',
  'sunny':         'sunny',
  'business':      'business',
  'hardware-chip': 'hardware-chip',
  'eco':           'flower',          // Ionicons has 'flower' not 'eco'
  'book':          'book',
  'apps':          'grid',            // Ionicons has 'grid' not 'apps'
};

function resolveIcon(icon) {
  return ICON_MAP[icon] || 'leaf';
}

// Make a soft tinted background from a hex color
function hexToRgba(hex = '#2D9162', alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal category pill tabs — uses icon + color from API response
// ─────────────────────────────────────────────────────────────────────────────
function CategoryPills({ categories, selected, onSelect, language }) {
  return (
    <View style={S.pillsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.pillsRow}
      >
        {/* "All" pill */}
        <TouchableOpacity
          style={[S.pill, selected === '__all__' && S.pillActive]}
          onPress={() => onSelect('__all__', null)}
          activeOpacity={0.82}
        >
          <View style={[S.pillIcon, { backgroundColor: selected === '__all__' ? 'rgba(255,255,255,0.25)' : GREEN_L }]}>
            <Ionicons name="storefront" size={14} color={selected === '__all__' ? '#fff' : GREEN} />
          </View>
          <Text style={[S.pillTxt, selected === '__all__' && S.pillTxtActive]} numberOfLines={1}>All</Text>
        </TouchableOpacity>

        {categories.map(cat => {
          const label = language === 'mr' && cat.nameMr ? cat.nameMr
                      : language === 'hi' && cat.nameHi ? cat.nameHi
                      : cat.name;
          const active  = selected === cat.id;
          const iconName = resolveIcon(cat.icon);
          const color    = cat.color || GREEN;
          // Short label — trim to keep pill width sane
          const shortLabel = label.length > 13 ? label.slice(0, 12) + '…' : label;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[S.pill, active && S.pillActive, active && { borderColor: color, backgroundColor: color }]}
              onPress={() => onSelect(cat.id, null)}
              activeOpacity={0.82}
            >
              <View style={[S.pillIcon, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : hexToRgba(color, 0.14) }]}>
                <Ionicons name={iconName} size={14} color={active ? '#fff' : color} />
              </View>
              <Text style={[S.pillTxt, active && S.pillTxtActive]} numberOfLines={1}>{shortLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Best Seller card — web prototype: image + discount top-left, price, circle add
// ─────────────────────────────────────────────────────────────────────────────
function BestSellerCard({ item, onPress }) {
  const discount = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  const imageUrl = item.images?.[0];
  const sc = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[S.bsCard, { transform: [{ scale: sc }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(sc, { toValue: 0.95, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(sc, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      >
        <View style={S.bsImgWrap}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={S.bsImg} resizeMode="cover" />
            : <View style={[S.bsImg, { backgroundColor: GREEN_L, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="leaf" size={32} color={GREEN} />
              </View>
          }
          {discount > 0 && (
            <View style={S.bsDiscLeft}><Text style={S.bsDiscTxt}>{discount}% OFF</Text></View>
          )}
        </View>
        <View style={S.bsBody}>
          <Text style={S.bsName} numberOfLines={2}>{item.name}</Text>
          <View style={S.bsRatingRow}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={S.bsRatingTxt}>{item.rating} ({item.ratingCount})</Text>
          </View>
          <View style={S.bsFooter}>
            <Text style={S.bsPrice}>₹{item.price?.toLocaleString()}</Text>
            <TouchableOpacity style={S.bsAddBtn} onPress={() => onPress(item)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product grid card — web prototype: heart top-left, discount top-right, full-width add btn
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ item, onPress, t, index }) {
  const discount    = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  const imageUrl    = item.images?.[0];
  const [liked, setLiked] = useState(false);
  const cardSc      = useRef(new Animated.Value(1)).current;
  const heartSc     = useRef(new Animated.Value(1)).current;
  const entryOp     = useRef(new Animated.Value(0)).current;
  const entryY      = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOp, { toValue: 1, duration: 320, delay: Math.min(index * 60, 320), useNativeDriver: true }),
      Animated.timing(entryY,  { toValue: 0, duration: 320, delay: Math.min(index * 60, 320), useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, []);

  const toggleLike = () => {
    setLiked(v => !v);
    Animated.sequence([
      Animated.spring(heartSc, { toValue: 1.45, speed: 30, useNativeDriver: true }),
      Animated.spring(heartSc, { toValue: 1,    friction: 5, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[S.gridCard, { opacity: entryOp, transform: [{ scale: cardSc }, { translateY: entryY }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(item)}
        onPressIn={() => Animated.spring(cardSc, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(cardSc, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
        style={{ flex: 1 }}
      >
        <View style={S.gridImgWrap}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={S.gridImg} resizeMode="cover" />
            : <View style={[S.gridImg, { backgroundColor: GREEN_L, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="leaf" size={30} color={GREEN} />
              </View>
          }
          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.22)']}
            style={S.gridImgGrad}
            pointerEvents="none"
          />
          {/* Heart top-LEFT */}
          <TouchableOpacity style={S.wishBtn} onPress={toggleLike} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ scale: heartSc }] }}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#E53935' : '#AAA'} />
            </Animated.View>
          </TouchableOpacity>
          {/* Discount top-RIGHT */}
          {discount > 0 && (
            <View style={S.gridDiscRight}><Text style={S.gridDiscTxt}>{discount}% OFF</Text></View>
          )}
          {/* Star rating bottom-right overlay */}
          {item.rating > 0 && (
            <View style={S.gridRatingBadge}>
              <Ionicons name="star" size={9} color={GOLD} />
              <Text style={S.gridRatingBadgeTxt}>{item.rating}</Text>
            </View>
          )}
        </View>
        <View style={S.gridBody}>
          <Text style={S.gridName} numberOfLines={2}>{item.name}</Text>
          <View style={S.gridPriceRow}>
            <Text style={S.gridPrice}>₹{item.price?.toLocaleString()}</Text>
            {item.mrp > item.price && (
              <Text style={S.gridMrp}>₹{item.mrp?.toLocaleString()}</Text>
            )}
          </View>
          {/* Full-width "View Details" button */}
          <TouchableOpacity style={S.addToCartBtn} onPress={() => onPress(item)} activeOpacity={0.85}>
            <Ionicons name="cart-outline" size={14} color="#fff" />
            <Text style={S.addToCartTxt}>{t('addToCart')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flash Sale Banner — animated glow + float
// ─────────────────────────────────────────────────────────────────────────────
function FlashSaleBanner({ onShopNow, t }) {
  const glow  = useRef(new Animated.Value(0.6)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow,  { toValue: 1,   duration: 1600, useNativeDriver: true }),
      Animated.timing(glow,  { toValue: 0.6, duration: 1600, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -7, duration: 1900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.timing(float, { toValue: 0,  duration: 1900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
    ])).start();
  }, []);

  return (
    <TouchableOpacity style={S.flashBanner} activeOpacity={0.9} onPress={onShopNow}>
      <Animated.View style={[S.flashGlow, { opacity: glow }]} />
      <View style={S.flashLeft}>
        <View style={S.flashPill}>
          <Ionicons name="flash" size={10} color="#fff" />
          <Text style={S.flashPillTxt}>Flash Sale</Text>
        </View>
        <Text style={S.flashTitle}>Premium Seeds</Text>
        <Text style={S.flashOff}>20% OFF</Text>
        <TouchableOpacity style={S.flashBtn} onPress={onShopNow} activeOpacity={0.85}>
          <Text style={S.flashBtnTxt}>Shop Now</Text>
          <Ionicons name="arrow-forward" size={12} color="#fff" />
        </TouchableOpacity>
      </View>
      <Animated.View style={[S.flashRight, { transform: [{ translateY: float }] }]}>
        <View style={S.flashCircleOuter} />
        <View style={S.flashCircleInner} />
        <Ionicons name="nutrition" size={48} color={GREEN + '50'} style={{ position: 'absolute' }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ID = '__all__';

export default function AgriStoreHome({ navigation }) {
  const { t, language, setLanguage, LANGUAGES } = useLanguage();
  const insets = useSafeAreaInsets();

  const [drawerOpen,         setDrawerOpen]         = useState(false);
  const [langPickerOpen,     setLangPickerOpen]     = useState(false);
  const [selectedCategory,   setSelectedCategory]   = useState(ALL_ID);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [categories,         setCategories]         = useState([]);
  const [products,           setProducts]           = useState([]);
  const [cartCount,          setCartCount]          = useState(0);
  const [loading,            setLoading]            = useState(true);
  const searchTimer = useRef(null);

  // Language bottom-sheet animation
  const sheetY  = useRef(new Animated.Value(H)).current;
  const sheetBg = useRef(new Animated.Value(0)).current;

  const openLangPicker = () => {
    setLangPickerOpen(true);
    Animated.parallel([
      Animated.spring(sheetY,  { toValue: 0, useNativeDriver: true, friction: 20, tension: 180 }),
      Animated.timing(sheetBg, { toValue: 1, useNativeDriver: true, duration: 220 }),
    ]).start();
  };

  const closeLangPicker = () => {
    Animated.parallel([
      Animated.timing(sheetY,  { toValue: H,   useNativeDriver: true, duration: 240, easing: Easing.in(Easing.quad) }),
      Animated.timing(sheetBg, { toValue: 0,   useNativeDriver: true, duration: 200 }),
    ]).start(() => setLangPickerOpen(false));
  };

  // Load categories from API
  useEffect(() => {
    api.get('/agristore/categories')
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  // Load products on filter/search change
  useEffect(() => {
    clearTimeout(searchTimer.current);
    const delay = searchQuery.length > 0 ? 400 : 0;
    searchTimer.current = setTimeout(fetchProducts, delay);
    return () => clearTimeout(searchTimer.current);
  }, [selectedCategory, selectedSubcategory, searchQuery]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = { limit: 40 };
      if (selectedCategory !== ALL_ID) params.category    = selectedCategory;
      if (selectedSubcategory)         params.subcategory = selectedSubcategory;
      if (searchQuery.trim())          params.search      = searchQuery.trim();
      const { data } = await api.get('/agristore/products', { params });
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCategorySelect = (catId, sub) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(sub || null);
  };

  // Cart count
  useEffect(() => {
    api.get('/agristore/cart')
      .then(({ data }) => setCartCount(Array.isArray(data.data) ? data.data.length : 0))
      .catch(() => {});
  }, []);

  const handleProductPress = useCallback((item) => {
    navigation.navigate('ProductDetail', { product: item });
  }, [navigation]);

  const bestSellers = products.slice(0, 8);

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Category Drawer ── */}
      <CategoryDrawer
        visible={drawerOpen}
        categories={categories}
        selectedCat={selectedCategory}
        language={language}
        onSelect={handleCategorySelect}
        onClose={() => setDrawerOpen(false)}
        insets={insets}
        t={t}
      />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 10 }]}>
        <View style={S.headerTop}>
          {/* Hamburger */}
          <TouchableOpacity style={S.hamburger} onPress={() => setDrawerOpen(true)} activeOpacity={0.7}>
            <View style={S.hamLine} />
            <View style={[S.hamLine, { width: 18 }]} />
            <View style={S.hamLine} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={S.logoRow}>
            <View style={S.logoIcon}>
              <Text style={{ fontSize: 16 }}>🌱</Text>
            </View>
            <Text style={S.logoText}>FarmEasy</Text>
          </View>

          {/* Right: language + cart */}
          <View style={S.headerRight}>
            <TouchableOpacity style={S.langBtn} onPress={openLangPicker} activeOpacity={0.8}>
              <Ionicons name="globe-outline" size={14} color={GREEN} />
              <Text style={S.langBtnTxt}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.cartBtn} onPress={() => navigation.navigate('Cart')} activeOpacity={0.8}>
              <Ionicons name="cart-outline" size={22} color="#1A1A1A" />
              {cartCount > 0 && (
                <View style={S.cartBadge}><Text style={S.cartBadgeTxt}>{cartCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={S.searchBar}>
          <Ionicons name="search-outline" size={16} color="#AAA" />
          <TextInput
            style={S.searchInput}
            placeholder={t('store.searchPlaceholder') || 'Search seeds, tools, pesticides...'}
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <CategoryPills
          categories={categories}
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          language={language}
        />
      )}

      {/* ── Scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false} style={S.scroll}>

        {/* Flash Sale Banner */}
        <View style={S.sectionPad}>
          <FlashSaleBanner onShopNow={() => setSelectedCategory(ALL_ID)} t={t} />
        </View>

        {/* Best Sellers */}
        {!loading && bestSellers.length > 0 && (
          <View style={S.section}>
            <View style={S.sectionRow}>
              <Text style={S.sectionTitle}>Best Sellers</Text>
              <TouchableOpacity style={S.seeAllBtn} onPress={() => setSelectedCategory(ALL_ID)}>
                <Text style={S.seeAllTxt}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color={GREEN} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.bsScroll}
            >
              {bestSellers.map(item => (
                <BestSellerCard key={item.id} item={item} onPress={handleProductPress} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Products */}
        <View style={S.section}>
          <View style={S.sectionRow}>
            <Text style={S.sectionTitle}>All Products</Text>
            <Text style={S.resultCount}>{products.length} items</Text>
          </View>

          {loading ? (
            <View style={S.productGrid}>
              {[0, 1, 2, 3].map(i => <Skeleton key={i} />)}
            </View>
          ) : products.length === 0 ? (
            <View style={S.emptyWrap}>
              <View style={S.emptyIconBg}>
                <Ionicons name="storefront-outline" size={36} color={GREEN} />
              </View>
              <Text style={S.emptyTitle}>Coming Soon</Text>
              <Text style={S.emptyTxt}>Products will be available here shortly.</Text>
              <Text style={S.emptyHint}>Check back soon for seeds, fertilizers & more!</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={S.productGrid}
              columnWrapperStyle={{ gap: 12, alignItems: 'stretch' }}
              renderItem={({ item, index }) => (
                <ProductCard item={item} onPress={handleProductPress} t={t} index={index} />
              )}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Language Picker Modal (animated bottom sheet) ── */}
      <Modal
        visible={langPickerOpen}
        transparent
        animationType="none"
        onRequestClose={closeLangPicker}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeLangPicker}>
          <Animated.View style={[S.lpBackdrop, { opacity: sheetBg }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[S.lpSheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetY }] }]}>
          {/* Drag handle */}
          <View style={S.lpHandleWrap}>
            <View style={S.lpHandle} />
          </View>
          {/* Title */}
          <Text style={S.lpTitle}>Select Language</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {LANGUAGES.map(lang => (
              <LangItem
                key={lang.code}
                lang={lang}
                active={lang.code === language}
                onSelect={code => { setLanguage(code); closeLangPicker(); }}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // ── Header ──
  header: {
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  hamburger:   { padding: 4, gap: 4, justifyContent: 'center', marginRight: 8 },
  hamLine:     { width: 22, height: 2.5, borderRadius: 2, backgroundColor: '#1A1A1A' },
  logoRow:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon:    { width: 32, height: 32, borderRadius: 16, backgroundColor: GREEN_L, justifyContent: 'center', alignItems: 'center' },
  logoText:    { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: GREEN_L, borderWidth: 1, borderColor: GREEN + '30' },
  langBtnTxt:  { color: GREEN, fontSize: 11, fontWeight: '700' },
  cartBtn:     { position: 'relative', padding: 4 },
  cartBadge:   { position: 'absolute', top: -2, right: -2, backgroundColor: '#E53935', borderRadius: 9, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeTxt:{ color: '#fff', fontSize: 9, fontWeight: '900' },

  // ── Search ──
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0 },

  // ── Category pills ──
  pillsWrap:     { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, height: 66 },
  pillsRow:      { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 6, paddingRight: 12, paddingVertical: 6,
    borderRadius: 50, backgroundColor: '#F2F4F6',
    borderWidth: 1.5, borderColor: 'transparent',
    height: 40,
  },
  pillActive:    { backgroundColor: GREEN, borderColor: GREEN },
  pillIcon:      { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pillTxt:       { fontSize: 12, fontWeight: '700', color: '#444', flexShrink: 1 },
  pillTxtActive: { color: '#fff' },

  // ── Flash Sale Banner ──
  sectionPad:       { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  flashBanner:      { borderRadius: 16, backgroundColor: '#FFF8E1', flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#FFE082', minHeight: 120 },
  flashGlow:        { position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFE082' },
  flashLeft:        { flex: 1, padding: 16, zIndex: 1, gap: 4 },
  flashPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: ORANGE, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  flashPillTxt:     { color: '#fff', fontSize: 10, fontWeight: '900' },
  flashTitle:       { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  flashOff:         { fontSize: 22, fontWeight: '900', color: GREEN },
  flashBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: GREEN, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  flashBtnTxt:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  flashRight:       { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginRight: 8, zIndex: 1 },
  flashCircleOuter: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: GREEN + '12' },
  flashCircleInner: { position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: GREEN + '20' },

  // ── Sections ──
  section:     { marginTop: 6 },
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  sectionTitle:{ fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  seeAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt:   { fontSize: 13, color: GREEN, fontWeight: '700' },
  resultCount: { fontSize: 12, color: '#AAA' },

  // ── Best sellers ──
  bsScroll:    { paddingHorizontal: 16, paddingBottom: 4, gap: 12 },
  bsCard:      { width: 156, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3, borderWidth: 1, borderColor: BORDER },
  bsImgWrap:   { height: 110, backgroundColor: GREEN_L, position: 'relative' },
  bsImg:       { width: '100%', height: '100%' },
  bsDiscLeft:  { position: 'absolute', top: 8, left: 8, backgroundColor: '#E53935', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  bsDiscTxt:   { color: '#fff', fontSize: 9, fontWeight: '900' },
  bsBody:      { padding: 10, gap: 4 },
  bsName:      { fontSize: 12, fontWeight: '700', color: '#1A1A1A', lineHeight: 16, minHeight: 32 },
  bsRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bsRatingTxt: { fontSize: 10, color: '#777' },
  bsFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  bsPrice:     { fontSize: 15, fontWeight: '900', color: GREEN },
  bsAddBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },

  // ── Product grid ──
  productGrid:   { paddingHorizontal: 12, paddingBottom: 8, gap: 12 },
  gridCard:      { flex: 1, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  gridImgWrap:   { height: 130, backgroundColor: GREEN_L, position: 'relative' },
  gridImg:           { width: '100%', height: '100%' },
  gridImgGrad:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  wishBtn:           { position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  gridDiscRight:     { position: 'absolute', top: 8, right: 8, backgroundColor: '#E53935', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  gridDiscTxt:       { color: '#fff', fontSize: 9, fontWeight: '900' },
  gridRatingBadge:   { position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  gridRatingBadgeTxt:{ color: '#fff', fontSize: 9, fontWeight: '800' },
  gridBody:          { padding: 10, gap: 4 },
  gridName:          { fontSize: 13, fontWeight: '700', color: '#1A1A1A', lineHeight: 17, minHeight: 34 },
  gridPriceRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  gridPrice:     { fontSize: 15, fontWeight: '900', color: GREEN },
  gridMrp:       { fontSize: 10, color: '#C0C0C0', textDecorationLine: 'line-through' },
  addToCartBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 9, paddingVertical: 9, marginTop: 4, shadowColor: GREEN, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  addToCartTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Empty ──
  emptyWrap:   { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 24, gap: 6 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: GREEN_L, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle:  { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  emptyTxt:    { fontSize: 14, color: '#64748B', fontWeight: '500', textAlign: 'center' },
  emptyHint:   { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  // ── Language Picker ──
  lpBackdrop:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.50)' },
  lpSheet:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '78%', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 20 },
  lpHandleWrap:{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  lpHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  lpTitle:     { fontSize: 17, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12 },
  lpRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lpRowActive: { backgroundColor: GREEN_L },
  lpFlagWrap:  { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  lpFlag:      { fontSize: 24 },
  lpName:      { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  lpNameActive:{ color: GREEN, fontWeight: '800' },
  lpNative:    { fontSize: 12, color: '#888', marginTop: 1 },
  lpCheck:     { width: 24, height: 24, borderRadius: 12, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  lpRadio:     { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Category Drawer styles
// ─────────────────────────────────────────────────────────────────────────────
const DR = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.50)' },
  panel: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_W,
    backgroundColor: CARD,
    shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 20, shadowOffset: { width: 6, height: 0 }, elevation: 15,
  },
  // White header with green tint bg (web prototype: bg-primary/5)
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: GREEN + '0D',
    borderBottomWidth: 1, borderBottomColor: GREEN + '18',
  },
  headerSub:   { fontSize: 11, color: GREEN + 'AA', fontWeight: '500' },
  headerTitle: { fontSize: 18, color: '#1A1A1A', fontWeight: '800', marginTop: 2 },
  closeBtn:    { padding: 6 },

  // All Products row
  allRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  allRowActive: { backgroundColor: GREEN_L },
  allRowTxt:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  allRowTxtActive: { color: GREEN },

  // Section label
  sectionHeader:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionHeaderTxt:{ fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 0.8 },

  // Flat category rows
  catRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 10, marginHorizontal: 8, marginBottom: 2,
  },
  catRowActive: { backgroundColor: GREEN + '10' },
  catRowTxt:    { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500', paddingRight: 8 },
  catRowTxtActive: { color: GREEN, fontWeight: '700' },
});
