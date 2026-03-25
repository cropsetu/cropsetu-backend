import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ANIMAL_LISTINGS } from '../../constants/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/ui/UIKit';
import { TiltCard, FloatingParticle, EntrySlide, D } from '../../components/ui/ImmersiveKit';

const ACCENT = D.amber;

const ANIMAL_FILTERS = ['All', 'Cow', 'Buffalo', 'Goat', 'Bullock', 'Sheep', 'Horse'];

const ANIMAL_COLORS = {
  Cow:     '#059669', Buffalo: '#0284C7', Goat:  '#F97316',
  Bullock: '#DC2626', Sheep:   '#D97706', Horse: '#7C3AED', default: ACCENT,
};

const ANIMAL_EMOJI = {
  Cow: '🐄', Buffalo: '🐃', Goat: '🐐', Horse: '🐴', Sheep: '🐑',
};

// ── 3D Animal Card ─────────────────────────────────────────────────────────────
function AnimalCard({ item, onPress, index }) {
  const accent = ANIMAL_COLORS[item.animal] || ANIMAL_COLORS.default;
  return (
    <EntrySlide delay={index * 70} fromX={-50} style={S.cardWrapper}>
      <TiltCard style={{ borderRadius: 20, overflow: 'hidden' }}>
        <TouchableOpacity style={[S.card, { shadowColor: accent }]} onPress={() => onPress(item)} activeOpacity={0.9}>
          {/* Image area */}
          <View style={S.imgArea}>
            <LinearGradient colors={[accent + '25', accent + '08', '#F8FAFF']} style={S.imgGrad}>
              <Text style={S.animalEmoji}>{ANIMAL_EMOJI[item.animal] || '🐂'}</Text>
            </LinearGradient>
            {/* Left accent bar */}
            <View style={[S.accentBar, { backgroundColor: accent, shadowColor: accent }]} />
            {/* Badges */}
            <View style={S.badgeRow}>
              {item.verified && <StatusBadge type="verified" small />}
              <View style={S.postedPill}>
                <Text style={S.postedTxt}>{item.postedDate}</Text>
              </View>
            </View>
            {/* Price bubble */}
            <LinearGradient colors={[accent, accent + 'CC']} style={S.priceBubble}>
              <Text style={S.priceBubbleTxt}>₹{item.price.toLocaleString()}</Text>
            </LinearGradient>
          </View>

          {/* Body */}
          <View style={S.body}>
            <View style={S.nameRow}>
              <View style={[S.typeDot, { backgroundColor: accent, shadowColor: accent }]} />
              <Text style={S.animalName}>{item.animal}</Text>
              <Text style={S.breed}> · {item.breed}</Text>
            </View>
            <Text style={S.details}>{item.age} · {item.gender} · {item.weight}</Text>

            {item.milkYield !== 'N/A' && (
              <View style={[S.milkPill, { backgroundColor: D.cyan + '15', borderColor: D.cyan + '40' }]}>
                <Ionicons name="water" size={12} color={D.cyan} />
                <Text style={[S.milkTxt, { color: D.cyan }]}>{item.milkYield}</Text>
              </View>
            )}

            <View style={S.tagsRow}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={[S.tag, { borderColor: accent + '40', backgroundColor: accent + '08' }]}>
                  <Text style={[S.tagTxt, { color: accent }]}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={S.footer}>
              <View style={S.locationRow}>
                <Ionicons name="location-outline" size={13} color={D.textDim} />
                <Text style={S.locationTxt}>{item.sellerLocation}</Text>
              </View>
              <View style={S.sellerRow}>
                <View style={[S.avatar, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
                  <Text style={[S.avatarTxt, { color: accent }]}>{item.sellerAvatar}</Text>
                </View>
                <Text style={S.sellerName}>{item.sellerName}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TiltCard>
    </EntrySlide>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnimalTradeHome({ navigation }) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  const filteredListings = ANIMAL_LISTINGS.filter(item => {
    const matchFilter = activeFilter === 'All' || item.animal === activeFilter;
    const matchSearch = !searchQuery ||
      item.animal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const heroScale   = scrollY.interpolate({ inputRange: [0, 160], outputRange: [1, 0.9], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 130], outputRange: [1, 0.6], extrapolate: 'clamp' });

  const PARTICLES = [
    { icon: 'paw',  size: 20, delay: 0,   duration: 3000, particleStyle: { top: '10%', left: '5%'  } },
    { icon: 'star', size: 10, delay: 300, duration: 2600, particleStyle: { top: '6%',  left: '45%' } },
    { icon: 'star', size: 8,  delay: 600, duration: 3100, particleStyle: { top: '30%', right: '8%' } },
    { icon: 'leaf', size: 14, delay: 900, duration: 2800, particleStyle: { top: '45%', left: '8%'  } },
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
      >
        {/* ── Hero ── */}
        <Animated.View style={{ transform: [{ perspective: 1200 }, { scale: heroScale }], opacity: heroOpacity }}>
          <LinearGradient colors={['#C2410C', '#EA580C', '#FB923C']} style={S.heroGrad}>
            {PARTICLES.map((p, i) => (
              <FloatingParticle key={i} {...p}>
                <Ionicons name={p.icon} size={p.size} color="rgba(255,255,255,0.5)" />
              </FloatingParticle>
            ))}

            <View style={S.headerTop}>
              <View>
                <Text style={S.headerSub}>{t('animalTradeSub')}</Text>
                <Text style={S.headerTitle}>{t('animalTradeTitle')}</Text>
              </View>
              <TouchableOpacity style={S.sellBtn} onPress={() => navigation.navigate('AddAnimalListing')}>
                <Ionicons name="add-circle-outline" size={17} color="#fff" />
                <Text style={S.sellBtnTxt}>{t('sellAnimalBtn')}</Text>
              </TouchableOpacity>
            </View>

            <View style={S.searchBar}>
              <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={S.searchInput}
                placeholder={t('animalSearch')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter chips */}
            <FlatList
              horizontal data={ANIMAL_FILTERS} keyExtractor={i => i}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.filterScroll}
              style={{ marginTop: 12 }}
              renderItem={({ item }) => {
                const active = activeFilter === item;
                return (
                  <TouchableOpacity
                    style={[S.filterChip, active && { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: '#fff' }]}
                    onPress={() => setActiveFilter(item)}
                  >
                    <Text style={[S.filterTxt, { color: active ? '#fff' : 'rgba(255,255,255,0.8)' }]}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </LinearGradient>
        </Animated.View>

        {/* Count */}
        <View style={S.countRow}>
          <Ionicons name="list" size={14} color={D.textDim} />
          <Text style={S.countTxt}>{filteredListings.length} {t('animalsFound')}</Text>
        </View>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          <View style={S.emptyWrap}>
            <Ionicons name="paw-outline" size={64} color={`${ACCENT}60`} />
            <Text style={S.emptyTitle}>No animals found</Text>
            <Text style={S.emptySub}>Try a different filter or search</Text>
          </View>
        ) : (
          filteredListings.map((item, index) => (
            <AnimalCard
              key={item.id}
              item={item}
              index={index}
              onPress={i => navigation.navigate('AnimalDetail', { listing: i })}
            />
          ))
        )}
        <View style={{ height: 24 }} />
      </Animated.ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root:     { flex: 1, backgroundColor: D.bg },
  heroGrad: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 18 },

  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  sellBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInput:  { flex: 1, fontSize: 14, color: '#fff', padding: 0 },
  filterScroll: { gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterTxt: { fontSize: 13, fontWeight: '600' },

  countRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  countTxt: { fontSize: 13, color: D.textDim, fontWeight: '500' },

  // Cards
  cardWrapper: { paddingHorizontal: 14, marginBottom: 14 },
  card: {
    backgroundColor: D.surface,
    borderRadius: 20, overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  imgArea: { height: 170, position: 'relative' },
  imgGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  animalEmoji: { fontSize: 64 },
  accentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8,
    elevation: 4,
  },
  badgeRow:   { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  postedPill: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  postedTxt:  { color: '#fff', fontSize: 10, fontWeight: '500' },
  priceBubble:{ position: 'absolute', bottom: 10, right: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  priceBubbleTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },

  body:       { padding: 14, gap: 5 },
  nameRow:    { flexDirection: 'row', alignItems: 'center' },
  typeDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 4 },
  animalName: { fontSize: 17, fontWeight: '900', color: D.text },
  breed:      { fontSize: 13, color: D.textDim },
  details:    { fontSize: 13, color: D.textDim },
  milkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  milkTxt: { fontSize: 13, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tag:     { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  tagTxt:  { fontSize: 11, fontWeight: '600' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: D.border,
    paddingTop: 10, marginTop: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 13, color: D.textDim },
  sellerRow:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar:      { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarTxt:   { fontSize: 10, fontWeight: '900' },
  sellerName:  { fontSize: 13, fontWeight: '600', color: D.textDim },

  emptyWrap:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, color: D.textDim, fontWeight: '700' },
  emptySub:   { fontSize: 13, color: D.textFaint },
});
