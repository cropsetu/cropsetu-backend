import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, StatusBar, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { TiltCard, FloatingParticle, EntryScale, D } from '../../components/ui/ImmersiveKit';

const ACCENT = D.green; // #059669

// ── AI Advisor Banner ─────────────────────────────────────────────────────────
function AIAdvisorBanner({ onPress, label, title, sub, cta }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0.4)).current;
  const orbit  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse1, { toValue: 1.35, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse1, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse2, { toValue: 1.7, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse2, { toValue: 1,   duration: 1800, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.4, duration: 900, useNativeDriver: true }),
    ])).start();
    Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const orbitRotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <TouchableOpacity style={S.aiBanner} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient colors={['#064E3B', '#065F46', '#047857']} style={S.aiBannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={S.gridOverlay} pointerEvents="none">
          {[0,1,2,3,4,5,6,7,8].map(i => <View key={i} style={S.gridDot} />)}
        </View>
        <View style={S.farmGraphics} pointerEvents="none">
          {[0,1,2].map(i => (
            <View key={i} style={[S.wheatStalk, { left: 6 + i * 10, height: 30 + i * 8 }]}>
              <View style={[S.wheatHead, { backgroundColor: '#6EE7B760' }]} />
            </View>
          ))}
          <View style={S.leafShape}><Ionicons name="leaf" size={22} color="#6EE7B780" /></View>
        </View>
        <View style={S.orbContainer}>
          <Animated.View style={[S.pulseRing2, { transform:[{scale:pulse2}], opacity: glow.interpolate({inputRange:[0.4,1],outputRange:[0.08,0.2]}) }]} />
          <Animated.View style={[S.pulseRing1, { transform:[{scale:pulse1}], opacity: glow.interpolate({inputRange:[0.4,1],outputRange:[0.15,0.35]}) }]} />
          <Animated.View style={[S.orbitTrack, { transform:[{rotate:orbitRotate}] }]}>
            <View style={S.orbitDot} />
          </Animated.View>
          <Animated.View style={[S.orbCore, { opacity: glow }]}>
            <LinearGradient colors={['#34D399', '#059669']} style={S.orbCoreGrad}>
              <Ionicons name="bulb" size={18} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>
        <View style={S.aiBannerText}>
          <Text style={S.aiBannerLabel}>{label}</Text>
          <Text style={S.aiBannerTitle}>
            <Text style={{ color: '#34D399' }}>FARM</Text>
            <Text style={{ color: '#6EE7B7' }}>AI</Text>
            {' '}{title}
          </Text>
          <Text style={S.aiBannerSub}>{sub}</Text>
          <View style={S.analyzeBtn}>
            <Text style={S.analyzeBtnText}>{cta} →</Text>
          </View>
        </View>
        <View style={S.circuitNodes} pointerEvents="none">
          {[0,1,2].map(i => (
            <View key={i} style={[S.circuitNode, { backgroundColor: i===1 ? '#6EE7B790' : '#34D39960' }]} />
          ))}
          <View style={S.circuitLine} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Category chip ─────────────────────────────────────────────────────────────
function CategoryChip({ item, selected, onPress }) {
  const accent = item.color || ACCENT;
  return (
    <TouchableOpacity
      style={[S.chip, selected && { backgroundColor: accent + '20', borderColor: accent }]}
      onPress={() => onPress(item.id)} activeOpacity={0.8}
    >
      <Ionicons name={item.icon} size={14} color={selected ? accent : D.textDim} />
      <Text style={[S.chipText, { color: selected ? accent : D.textDim }]}>{item.name}</Text>
    </TouchableOpacity>
  );
}

// ── Product card — 3D tiltable ─────────────────────────────────────────────────
function ProductCard({ item, onPress, index }) {
  const discount = item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
  const accent   = item.category?.color || ACCENT;
  const imageUrl = item.images?.[0];

  return (
    <EntryScale style={S.cardOuter} delay={index * 55}>
      <TiltCard style={{ flex: 1 }}>
        <TouchableOpacity style={[S.card, { shadowColor: accent }]} onPress={() => onPress(item)} activeOpacity={0.92}>
          {/* Accent top bar */}
          <View style={[S.cardStrip, { backgroundColor: accent }]} />

          {/* Image / icon area */}
          <View style={[S.cardImgArea, { backgroundColor: accent + '12' }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={S.cardImg} resizeMode="cover" />
            ) : (
              <Ionicons name="leaf" size={40} color={accent} />
            )}
            {discount > 0 && (
              <View style={[S.discBadge, { backgroundColor: D.red }]}>
                <Text style={S.discText}>{discount}%{'\n'}OFF</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={S.cardBody}>
            <Text style={S.cardCat}>{item.category?.name}</Text>
            <Text style={S.cardName} numberOfLines={2}>{item.name}</Text>
            <View style={S.ratingRow}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= Math.round(item.rating) ? 'star' : 'star-outline'} size={9} color={D.gold} />
              ))}
              <Text style={S.ratingTxt}>({item.ratingCount})</Text>
            </View>
            <View style={S.cardFooter}>
              <View>
                <Text style={[S.price, { color: accent }]}>₹{item.price.toLocaleString()}</Text>
                {item.mrp > item.price && <Text style={S.mrp}>₹{item.mrp.toLocaleString()}</Text>}
              </View>
              <View style={[S.addBtn, { backgroundColor: accent }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
            </View>
            <Text style={S.unit}>per {item.unit}</Text>
          </View>
        </TouchableOpacity>
      </TiltCard>
    </EntryScale>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonProductCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  return (
    <Animated.View style={[S.cardOuter, S.card, { opacity, shadowColor: '#000', shadowOpacity: 0.06 }]}>
      <View style={[S.cardStrip, { backgroundColor: '#E2E8F0' }]} />
      <View style={[S.cardImgArea, { backgroundColor: '#F1F5F9' }]} />
      <View style={S.cardBody}>
        {[40, 85, 60, 50].map((w, i) => (
          <View key={i} style={{ height: 10, width: `${w}%`, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 6 }} />
        ))}
      </View>
    </Animated.View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const ALL_ID = '__all__';

export default function AgriStoreHome({ navigation }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(ALL_ID);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [categories,       setCategories]        = useState([]);
  const [products,         setProducts]          = useState([]);
  const [cartCount,        setCartCount]         = useState(0);
  const [loading,          setLoading]           = useState(true);
  const searchTimer = useRef(null);
  const scrollY     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.get('/agristore/categories')
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    const delay = searchQuery.length > 0 ? 400 : 0;
    searchTimer.current = setTimeout(fetchProducts, delay);
    return () => clearTimeout(searchTimer.current);
  }, [selectedCategory, searchQuery]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = { limit: 40 };
      if (selectedCategory !== ALL_ID) params.category = selectedCategory;
      if (searchQuery.trim())          params.search   = searchQuery.trim();
      const { data } = await api.get('/agristore/products', { params });
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/agristore/cart')
      .then(({ data }) => setCartCount(Array.isArray(data.data) ? data.data.length : 0))
      .catch(() => {});
  }, []);

  const handleProductPress = useCallback((item) => {
    navigation.navigate('ProductDetail', { product: item });
  }, [navigation]);

  const allChip  = { id: ALL_ID, name: 'All', icon: 'apps-outline', color: ACCENT };
  const chipList = [allChip, ...categories];

  // Hero parallax
  const heroScale   = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0.9],  extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0.6],  extrapolate: 'clamp' });

  const PARTICLES = [
    { icon: 'leaf',      size: 22, delay: 0,   duration: 3000, particleStyle: { top: '15%', left: '6%'  } },
    { icon: 'flower',    size: 16, delay: 400, duration: 2700, particleStyle: { top: '8%',  right: '10%'} },
    { icon: 'star',      size: 10, delay: 200, duration: 2500, particleStyle: { top: '30%', left: '30%' } },
    { icon: 'star',      size: 8,  delay: 700, duration: 3200, particleStyle: { top: '5%',  left: '55%' } },
    { icon: 'nutrition', size: 14, delay: 500, duration: 2900, particleStyle: { top: '40%', right: '6%' } },
  ];

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        stickyHeaderIndices={[1]}
      >
        {/* ── Hero header ── */}
        <Animated.View style={[S.hero, { transform: [{ perspective: 1200 }, { scale: heroScale }], opacity: heroOpacity }]}>
          <LinearGradient colors={['#047857', '#059669', '#10B981']} style={S.heroGrad}>
            {PARTICLES.map((p, i) => (
              <FloatingParticle key={i} {...p}>
                <Ionicons name={p.icon} size={p.size} color="rgba(255,255,255,0.5)" />
              </FloatingParticle>
            ))}

            <View style={S.headerTop}>
              <View>
                <Text style={S.greeting}>{t('greeting')}</Text>
                <Text style={S.headerTitle}>{t('agriStoreTitle')}</Text>
              </View>
              <View style={S.headerRight}>
                <TouchableOpacity style={S.iconBtn} onPress={() => navigation.navigate('AIRecommendation')}>
                  <Ionicons name="bulb" size={20} color="#FCD34D" />
                </TouchableOpacity>
                <TouchableOpacity style={S.iconBtn} onPress={() => navigation.navigate('Cart')}>
                  <Ionicons name="cart-outline" size={21} color="#fff" />
                  {cartCount > 0 && (
                    <View style={S.cartBadge}><Text style={S.cartBadgeText}>{cartCount}</Text></View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search bar */}
            <View style={S.searchBar}>
              <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={S.searchInput}
                placeholder={t('agriStoreSearch')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Sticky Category chips ── */}
        <View style={S.catSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.catScroll}>
            {chipList.map(cat => (
              <CategoryChip key={cat.id} item={cat} selected={selectedCategory === cat.id} onPress={setSelectedCategory} />
            ))}
          </ScrollView>
        </View>

        {/* ── AI Banner ── */}
        <AIAdvisorBanner
          onPress={() => navigation.navigate('AIRecommendation')}
          label={t('aiBannerBadge')}
          title={t('aiBannerTitle')}
          sub={t('aiBannerSub')}
          cta={t('analyzeMyFarm') || 'Analyze My Farm'}
        />

        {/* ── Product grid ── */}
        {loading ? (
          <View style={S.grid}>
            {[0,1,2,3].map(i => (
              <View key={i} style={{ flex: 1, maxWidth: '50%' }}>
                <SkeletonProductCard />
              </View>
            ))}
          </View>
        ) : products.length === 0 ? (
          <View style={S.emptyWrap}>
            <Ionicons name="leaf-outline" size={64} color={`${ACCENT}60`} />
            <Text style={S.emptyTitle}>No products found</Text>
            <Text style={S.emptySub}>Try a different category or search term</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={S.grid}
            columnWrapperStyle={{ gap: 12 }}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <ProductCard item={item} onPress={handleProductPress} index={index} />
            )}
          />
        )}
        <View style={{ height: 24 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // Hero
  hero:     { overflow: 'hidden' },
  heroGrad: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 20 },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting:    { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: D.amber, borderRadius: 10,
    minWidth: 17, height: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', padding: 0 },

  // Category chips
  catSection: {
    backgroundColor: D.bg,
    borderBottomWidth: 1, borderBottomColor: D.border,
    zIndex: 10,
  },
  catScroll: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 20, borderWidth: 1.5, borderColor: D.border,
    backgroundColor: D.surface,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // AI Banner
  aiBanner: {
    marginHorizontal: 14, marginVertical: 12, borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: '#34D39940',
    shadowColor: '#059669', shadowOpacity: 0.22, shadowRadius: 14, elevation: 7,
  },
  aiBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 100, overflow: 'hidden' },
  gridOverlay:  { position: 'absolute', top: 6, left: 0, flexDirection: 'row', flexWrap: 'wrap', width: 60, gap: 14 },
  gridDot:      { width: 2, height: 2, borderRadius: 1, backgroundColor: '#34D39930' },
  farmGraphics: { position: 'absolute', left: 8, bottom: 0, width: 40, height: 80, justifyContent: 'flex-end' },
  wheatStalk:   { position: 'absolute', bottom: 0, width: 2, backgroundColor: '#34D39940', borderRadius: 1 },
  wheatHead:    { width: 6, height: 8, borderRadius: 3, marginLeft: -2 },
  leafShape:    { position: 'absolute', bottom: 20, left: 2 },
  orbContainer: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pulseRing1:   { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#34D399' },
  pulseRing2:   { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: '#34D399' },
  orbitTrack:   { position: 'absolute', width: 54, height: 54, justifyContent: 'flex-start', alignItems: 'center' },
  orbitDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' },
  orbCore:      { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 1.5, borderColor: '#34D399' },
  orbCoreGrad:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiBannerText: { flex: 1 },
  aiBannerLabel:{ fontSize: 10, fontWeight: '900', color: '#6EE7B7', letterSpacing: 1.5 },
  aiBannerTitle:{ fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  aiBannerSub:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  analyzeBtn: {
    marginTop: 8, backgroundColor: 'rgba(52,211,153,0.2)', borderWidth: 1,
    borderColor: '#34D39960', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  analyzeBtnText: { fontSize: 11, fontWeight: '700', color: '#34D399', letterSpacing: 0.5 },
  circuitNodes: { position: 'absolute', right: 12, top: 12, width: 8, alignItems: 'center' },
  circuitNode:  { width: 7, height: 7, borderRadius: 3.5, marginBottom: 4 },
  circuitLine:  { width: 1, height: 30, backgroundColor: '#34D39930' },

  // Product grid & card
  grid: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardOuter: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: 18, overflow: 'hidden',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  cardStrip:   { height: 3 },
  cardImgArea: { height: 110, justifyContent: 'center', alignItems: 'center' },
  cardImg:     { width: '100%', height: '100%' },
  discBadge:   { position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  discText:    { color: '#fff', fontSize: 9, fontWeight: '900', textAlign: 'center', lineHeight: 12 },
  cardBody:    { padding: 10, gap: 3 },
  cardCat:     { fontSize: 10, color: D.textFaint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  cardName:    { fontSize: 13, color: D.text, fontWeight: '700', lineHeight: 17 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  ratingTxt:   { fontSize: 10, color: D.textDim, marginLeft: 2 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  price:       { fontSize: 17, fontWeight: '900' },
  mrp:         { fontSize: 10, color: D.textFaint, textDecorationLine: 'line-through' },
  addBtn:      { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  unit:        { fontSize: 10, color: D.textFaint },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, color: D.textDim, fontWeight: '700' },
  emptySub:   { fontSize: 13, color: D.textFaint },
});
