import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MACHINERY_LISTINGS, LABOUR_LISTINGS } from '../../constants/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { TiltCard, FloatingParticle, EntrySlide, D } from '../../components/ui/ImmersiveKit';

const ACCENT = D.cyan;

// ── Machinery Card ─────────────────────────────────────────────────────────────
function MachineryCard({ item, onPress, index }) {
  const avail = item.availability.includes('Now');
  return (
    <EntrySlide delay={index * 65} fromX={-45} style={S.cardWrap}>
      <TiltCard style={{ borderRadius: 20, overflow: 'hidden' }}>
        <TouchableOpacity style={[S.card, { shadowColor: ACCENT }]} onPress={() => onPress(item)} activeOpacity={0.9}>
          {/* Image gradient area */}
          <LinearGradient colors={[`${ACCENT}20`, `${ACCENT}05`, '#F0F7FF']} style={S.cardImage}>
            <View style={[S.iconRing, { borderColor: `${ACCENT}50`, backgroundColor: `${ACCENT}12` }]}>
              <Ionicons name="construct" size={42} color={ACCENT} />
            </View>
          </LinearGradient>

          <View style={S.cardBody}>
            <View style={S.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.cardTitle}>{item.equipment}</Text>
                <Text style={S.cardBrand}>{item.brand}</Text>
              </View>
              <View style={[S.availBadge, { backgroundColor: avail ? `${D.green}15` : `${D.amber}15`, borderColor: avail ? `${D.green}50` : `${D.amber}50` }]}>
                <View style={[S.availDot, { backgroundColor: avail ? D.green : D.amber }]} />
                <Text style={[S.availText, { color: avail ? D.green : D.amber }]}>{avail ? 'Available' : 'Booking'}</Text>
              </View>
            </View>

            <View style={S.ratingRow}>
              <Ionicons name="star" size={13} color={D.gold} />
              <Text style={S.ratingText}>{item.rating} ({item.reviews} ratings)</Text>
            </View>

            <View style={S.tagsRow}>
              {item.features.slice(0, 3).map((f, i) => (
                <View key={i} style={[S.tag, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '30' }]}>
                  <Text style={[S.tagText, { color: ACCENT }]}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={S.priceRow}>
              <View style={S.priceItem}>
                <Text style={S.priceLabel}>Per Acre</Text>
                <Text style={[S.priceValue, { color: ACCENT }]}>₹{item.pricePerAcre}</Text>
              </View>
              <View style={S.priceDivider} />
              <View style={S.priceItem}>
                <Text style={S.priceLabel}>Per Hour</Text>
                <Text style={[S.priceValue, { color: ACCENT }]}>₹{item.pricePerHour}</Text>
              </View>
              <TouchableOpacity style={[S.bookBtn, { backgroundColor: ACCENT }]} onPress={() => onPress(item)}>
                <Text style={S.bookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>

            <View style={S.locationRow}>
              <Ionicons name="location-outline" size={13} color={D.textDim} />
              <Text style={S.locationText}>{item.location}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </TiltCard>
    </EntrySlide>
  );
}

// ── Labour Card ────────────────────────────────────────────────────────────────
function LabourCard({ item, onPress, index }) {
  const accentColor = item.type === 'group' ? D.purple : D.indigo;
  return (
    <EntrySlide delay={index * 65} fromX={-45} style={S.cardWrap}>
      <TiltCard style={{ borderRadius: 20, overflow: 'hidden' }}>
        <TouchableOpacity style={[S.card, { shadowColor: accentColor }]} onPress={() => onPress(item)} activeOpacity={0.9}>
          <View style={S.labourInner}>
            {/* Avatar */}
            <LinearGradient colors={[accentColor + '30', accentColor + '10']} style={S.labourAvatar}>
              <Text style={S.labourAvatarText}>{item.image}</Text>
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <View style={S.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={S.cardTitle}>{item.type === 'group' ? item.groupName : item.leader}</Text>
                  <Text style={S.cardBrand}>{item.type === 'group' ? `👥 Group of ${item.workers}` : '👤 Individual Labour'}</Text>
                </View>
                <View style={[S.availBadge, { backgroundColor: item.available ? `${D.green}15` : `${D.red}15`, borderColor: item.available ? `${D.green}50` : `${D.red}50` }]}>
                  <View style={[S.availDot, { backgroundColor: item.available ? D.green : D.red }]} />
                  <Text style={[S.availText, { color: item.available ? D.green : D.red }]}>{item.available ? 'Available' : 'Busy'}</Text>
                </View>
              </View>

              <View style={S.ratingRow}>
                <Ionicons name="star" size={13} color={D.gold} />
                <Text style={S.ratingText}>{item.rating} ({item.reviews} reviews)</Text>
              </View>

              <View style={S.tagsRow}>
                {item.skills.slice(0, 2).map((s, i) => (
                  <View key={i} style={[S.tag, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                    <Text style={[S.tagText, { color: accentColor }]}>{s}</Text>
                  </View>
                ))}
                {item.skills.length > 2 && (
                  <View style={[S.tag, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                    <Text style={[S.tagText, { color: accentColor }]}>+{item.skills.length - 2} more</Text>
                  </View>
                )}
              </View>

              <View style={S.priceRow}>
                <View style={S.priceItem}>
                  <Text style={S.priceLabel}>Per Day</Text>
                  <Text style={[S.priceValue, { color: accentColor }]}>₹{item.pricePerDay}/person</Text>
                </View>
                <View style={S.priceDivider} />
                <View style={S.priceItem}>
                  <Text style={S.priceLabel}>Per Hour</Text>
                  <Text style={[S.priceValue, { color: accentColor }]}>₹{item.pricePerHour}/hr</Text>
                </View>
              </View>

              <View style={S.locationRow}>
                <Ionicons name="location-outline" size={13} color={D.textDim} />
                <Text style={S.locationText}>{item.location}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TiltCard>
    </EntrySlide>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RentHome({ navigation }) {
  const { t } = useLanguage();
  const [activeTab,   setActiveTab]   = useState('machinery');
  const [searchQuery, setSearchQuery] = useState('');
  const tabAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const switchTab = (tab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'machinery' ? 0 : 1,
      useNativeDriver: true, tension: 80, friction: 10,
    }).start();
  };

  const filteredMachinery = MACHINERY_LISTINGS.filter(m =>
    !searchQuery || m.equipment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLabour = LABOUR_LISTINGS.filter(l =>
    !searchQuery || (l.groupName || l.leader).toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const heroScale   = scrollY.interpolate({ inputRange: [0, 160], outputRange: [1, 0.9], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 130], outputRange: [1, 0.6], extrapolate: 'clamp' });
  const tabIndicatorX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const PARTICLES = [
    { icon: 'construct', size: 20, delay: 0,   duration: 3100, particleStyle: { top: '12%', left: '5%'  } },
    { icon: 'settings',  size: 15, delay: 500, duration: 2700, particleStyle: { top: '8%',  right: '8%' } },
    { icon: 'star',      size: 10, delay: 200, duration: 2500, particleStyle: { top: '30%', left: '35%' } },
    { icon: 'people',    size: 16, delay: 800, duration: 3000, particleStyle: { top: '40%', right: '6%' } },
  ];

  const data = activeTab === 'machinery' ? filteredMachinery : filteredLabour;

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
          <LinearGradient colors={['#0369A1', '#0284C7', '#0EA5E9']} style={S.heroGrad}>
            {PARTICLES.map((p, i) => (
              <FloatingParticle key={i} {...p}>
                <Ionicons name={p.icon} size={p.size} color="rgba(255,255,255,0.5)" />
              </FloatingParticle>
            ))}

            <View style={S.headerTop}>
              <View>
                <Text style={S.headerSub}>{t('rentSub')}</Text>
                <Text style={S.headerTitle}>{t('rentTitle')}</Text>
              </View>
              <View style={[S.iconRingSmall, { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="call" size={22} color="#fff" />
              </View>
            </View>

            {/* Tab switcher */}
            <View style={S.tabSwitcher}>
              <Animated.View
                style={[
                  S.tabIndicator,
                  {
                    left: tabIndicatorX.interpolate({ inputRange: [0, 1], outputRange: ['2%', '50%'] }),
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                ]}
              />
              {['machinery', 'labour'].map((tab) => {
                const active = activeTab === tab;
                return (
                  <TouchableOpacity key={tab} style={S.tabBtn} onPress={() => switchTab(tab)}>
                    <Ionicons
                      name={tab === 'machinery' ? 'construct' : 'people'}
                      size={17}
                      color={active ? '#fff' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[S.tabBtnText, { color: active ? '#fff' : 'rgba(255,255,255,0.7)' }]}>
                      {tab === 'machinery' ? t('machineryTab') : t('labourTab')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search */}
            <View style={[S.searchBar, { marginTop: 12 }]}>
              <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={S.searchInput}
                placeholder={activeTab === 'machinery' ? t('machinerySearch') : t('labourSearch')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Labour info banner */}
        {activeTab === 'labour' && (
          <View style={S.infoBanner}>
            <Ionicons name="information-circle" size={18} color={D.cyan} />
            <Text style={S.infoBannerText}>Hire individuals or groups by day or hour. Perfect for small farmers!</Text>
          </View>
        )}

        {/* List */}
        {data.length === 0 ? (
          <View style={S.emptyWrap}>
            <Ionicons name={activeTab === 'machinery' ? 'construct-outline' : 'people-outline'} size={64} color={`${ACCENT}60`} />
            <Text style={S.emptyTitle}>No {activeTab} found nearby</Text>
          </View>
        ) : (
          data.map((item, index) =>
            activeTab === 'machinery' ? (
              <MachineryCard key={item.id} item={item} index={index} onPress={i => navigation.navigate('MachineryDetail', { machinery: i })} />
            ) : (
              <LabourCard key={item.id} item={item} index={index} onPress={i => navigation.navigate('LabourDetail', { labour: i })} />
            )
          )
        )}
        <View style={{ height: 24 }} />
      </Animated.ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root:     { flex: 1, backgroundColor: D.bg },
  heroGrad: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 18 },

  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  headerTitle:   { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  iconRingSmall: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative', overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute', top: 4, width: '48%', height: '85%',
    borderRadius: 11, borderWidth: 1,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, borderRadius: 11 },
  tabBtnText: { fontSize: 14, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', padding: 0 },

  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: `${D.cyan}12`, borderRadius: 14, padding: 12,
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
    borderWidth: 1, borderColor: `${D.cyan}30`,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: D.textDim, lineHeight: 18 },

  cardWrap: { paddingHorizontal: 16, marginBottom: 14 },
  card: {
    backgroundColor: D.surface,
    borderRadius: 20, overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardImage: { height: 130, justifyContent: 'center', alignItems: 'center' },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  cardBody:    { padding: 16 },
  cardTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle:   { fontSize: 17, fontWeight: '800', color: D.text },
  cardBrand:   { fontSize: 13, color: D.textDim, marginTop: 3 },
  availBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  availDot:    { width: 8, height: 8, borderRadius: 4 },
  availText:   { fontSize: 12, fontWeight: '700' },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  ratingText:  { fontSize: 13, color: D.textDim },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: {
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  tagText:     { fontSize: 12, fontWeight: '600' },
  priceRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priceItem:   { flex: 1 },
  priceLabel:  { fontSize: 11, color: D.textFaint, fontWeight: '500' },
  priceValue:  { fontSize: 15, fontWeight: '800' },
  priceDivider:{ width: 1, height: 30, backgroundColor: D.border, marginHorizontal: 12 },
  bookBtn:     { borderRadius: 11, paddingHorizontal: 16, paddingVertical: 9 },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText:{ fontSize: 12, color: D.textDim },

  // Labour
  labourInner:      { flexDirection: 'row', gap: 14, padding: 16 },
  labourAvatar:     { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  labourAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },

  emptyWrap:  { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, color: D.textDim, fontWeight: '700' },
});
