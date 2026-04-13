/**
 * LabourDetail — Worker/group profile.
 * Shows: photo gallery, skills, experience, languages, pricing, location.
 * Primary action: Call the worker directly. No booking flow.
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, ActivityIndicator, Dimensions, StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const { width: W } = Dimensions.get('window');
const GREEN = '#2D9162';

export default function LabourDetail({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id, labour: passedData } = route.params;

  const [data,        setData]        = useState(passedData || null);
  const [galIdx,      setGalIdx]      = useState(0);
  const [loadingData, setLoadingData] = useState(!passedData);

  const listingId = id || passedData?.id;

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      try {
        const res = await api.get(`/rent/labour/${listingId}`);
        setData(res.data.data);
      } catch { /* keep passedData */ }
      finally { setLoadingData(false); }
    })();
  }, [listingId]);

  if (loadingData || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const l = data;
  const phone    = l.phone || l.provider?.phone || null;
  const allMedia = [
    ...(l.image  ? [l.image]    : []),
    ...(l.images || []),
    ...(l.videos || []),
  ];
  const initials = (l.leader || l.name || 'W').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleCall = () => {
    if (!phone) { return; }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={D.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Gallery ── */}
        {allMedia.length > 0 ? (
          <View style={{ height: 280, position: 'relative' }}>
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setGalIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
            >
              {allMedia.map((uri, i) => {
                const isVideo = l.videos?.includes(uri);
                return (
                  <View key={i} style={{ width: W, height: 280 }}>
                    {isVideo
                      ? <Video
                          source={{ uri }}
                          style={[D.galImg, { height: 280 }]}
                          resizeMode={ResizeMode.COVER}
                          useNativeControls
                          shouldPlay={false}
                          isLooping={false}
                        />
                      : <Image source={{ uri }} style={[D.galImg, { height: 280 }]} resizeMode="cover" />
                    }
                  </View>
                );
              })}
            </ScrollView>
            {/* Gradient overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.45)']}
              locations={[0, 0.45, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            {/* Back button overlay */}
            <View style={[D.galleryNav, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={D.navBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              {phone && (
                <TouchableOpacity onPress={handleCall} style={D.navBtn}>
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            {allMedia.length > 1 && (
              <View style={D.dots}>
                {allMedia.map((_, i) => <View key={i} style={[D.dot, i === galIdx && D.dotActive]} />)}
              </View>
            )}
          </View>
        ) : (
          <View style={D.avatarHero}>
            {/* Back button for no-media path */}
            <View style={[D.galleryNav, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={D.navBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              {phone && (
                <TouchableOpacity onPress={handleCall} style={D.navBtn}>
                  <Ionicons name="call-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <View style={D.bigAvatar}>
              <Text style={D.bigAvatarTxt}>{initials}</Text>
            </View>
          </View>
        )}

        <View style={D.content}>

          {/* ── Name + Availability ── */}
          <View style={D.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={D.name}>{l.leader || l.name}</Text>
              {l.name && l.leader && <Text style={D.groupName}>{l.name}</Text>}
              {l.groupSize > 1 && (
                <View style={D.groupBadge}>
                  <Ionicons name="people" size={13} color={GREEN} />
                  <Text style={D.groupBadgeTxt}>{t('rent.workersAvailable', { count: l.groupSize })}</Text>
                </View>
              )}
            </View>
            <View style={[D.availBadge, { backgroundColor: l.available ? '#E8F5E9' : '#FFF3E0' }]}>
              <View style={[D.availDot, { backgroundColor: l.available ? GREEN : '#E65100' }]} />
              <Text style={[D.availTxt, { color: l.available ? GREEN : '#E65100' }]}>
                {l.available ? t('rent.listAvailable') : t('rent.busy')}
              </Text>
            </View>
          </View>

          {/* ── Pricing ── */}
          <View style={D.priceRow}>
            <View style={D.priceCard}>
              <Text style={D.priceAmt}>₹{l.pricePerDay?.toLocaleString()}</Text>
              <Text style={D.priceLbl}>{t('rent.perDayShort')}</Text>
            </View>
            {l.pricePerHour && (
              <View style={[D.priceCard, { backgroundColor: '#EDE7F6' }]}>
                <Text style={[D.priceAmt, { color: '#6A1B9A' }]}>₹{l.pricePerHour?.toLocaleString()}</Text>
                <Text style={D.priceLbl}>{t('rent.perHourShort')}</Text>
              </View>
            )}
            {l.rating > 0 && (
              <View style={D.ratingCard}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1,2,3,4,5].map(s => (
                    <Ionicons key={s} name={s <= Math.round(l.rating) ? 'star' : 'star-outline'} size={12} color="#F9A825" />
                  ))}
                </View>
                <Text style={D.ratingTxt}>{l.rating?.toFixed(1)} ({l.ratingCount})</Text>
              </View>
            )}
          </View>

          {/* ── Call CTA Card ── */}
          <TouchableOpacity
            style={[D.callCard, !phone && { opacity: 0.4 }]}
            onPress={handleCall}
            disabled={!phone}
            activeOpacity={0.85}
          >
            <View style={D.callCardIcon}>
              <Ionicons name="call" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={D.callCardTitle}>{t('rent.callToHire')}</Text>
              <Text style={D.callCardSub}>{phone ? phone : t('rent.phoneNotListed')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={GREEN} />
          </TouchableOpacity>

          {/* ── Skills ── */}
          <Text style={D.sectionTitle}>{t('rent.skillsExpertise')}</Text>
          <View style={D.skillsWrap}>
            {(l.skills || []).map((s, i) => (
              <View key={i} style={D.skillChip}>
                <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                <Text style={D.skillTxt}>{s}</Text>
              </View>
            ))}
          </View>

          {/* ── Languages ── */}
          {l.languages?.length > 0 && (
            <View style={D.infoRow}>
              <Ionicons name="chatbubble-outline" size={15} color="#888" />
              <Text style={D.infoTxt}>{t('rent.speaks')} {l.languages.join(', ')}</Text>
            </View>
          )}

          {/* ── Experience ── */}
          {l.experience && (
            <View style={D.infoRow}>
              <Ionicons name="ribbon-outline" size={15} color="#888" />
              <Text style={D.infoTxt}>{l.experience}</Text>
            </View>
          )}

          {/* ── Description ── */}
          {l.description && (
            <>
              <Text style={D.sectionTitle}>{t('rent.aboutSection')}</Text>
              <Text style={D.descTxt}>{l.description}</Text>
            </>
          )}

          {/* ── Availability window ── */}
          {l.availableFrom && (
            <View style={D.availWindowCard}>
              <Ionicons name="calendar-outline" size={16} color={GREEN} />
              <Text style={D.availWindowTxt}>
                {t('rent.listAvailable')} {new Date(l.availableFrom).toLocaleDateString('en-IN')}
                {l.availableTo ? ` – ${new Date(l.availableTo).toLocaleDateString('en-IN')}` : ` ${t('rent.onwards')}`}
              </Text>
            </View>
          )}

          {/* ── Location ── */}
          <View style={D.locRow}>
            <Ionicons name="location-outline" size={15} color="#888" />
            <Text style={D.locTxt}>{l.location}{l.district ? `, ${l.district}` : ''}</Text>
          </View>

        </View>
      </ScrollView>

      {/* ── Bottom Call Button ── */}
      <View style={[D.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[D.bottomCallBtn, !phone && { opacity: 0.4 }]}
          onPress={handleCall}
          disabled={!phone}
        >
          <Ionicons name="call" size={22} color="#fff" />
          <Text style={D.bottomCallTxt}>
            {phone ? `${t('rent.callNow')}  •  ${phone}` : t('rent.phoneNotListed')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const D = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F9FA' },

  // Gallery nav overlay
  galleryNav:  { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  navBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },

  galImg:   { width: W },
  dots:     { position: 'absolute', bottom: 12, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:{ backgroundColor: '#fff', width: 20 },

  avatarHero:    { backgroundColor: '#E8F5EE', paddingVertical: 36, alignItems: 'center', position: 'relative' },
  bigAvatar:     { width: 96, height: 96, borderRadius: 48, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  bigAvatarTxt:  { fontSize: 34, fontWeight: '800', color: '#fff' },

  content: { padding: 16 },

  nameRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  name:       { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  groupName:  { fontSize: 13, color: '#888', marginTop: 2 },
  groupBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  groupBadgeTxt: { fontSize: 12, color: GREEN, fontWeight: '700' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  availDot:   { width: 7, height: 7, borderRadius: 4 },
  availTxt:   { fontSize: 11, fontWeight: '700' },

  priceRow:  { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  priceCard: { backgroundColor: '#E8F5EE', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 90 },
  priceAmt:  { fontSize: 20, fontWeight: '900', color: GREEN },
  priceLbl:  { fontSize: 11, color: '#888', marginTop: 2 },
  ratingCard:{ backgroundColor: '#FFFDE7', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  ratingTxt: { fontSize: 11, color: '#F57F17', fontWeight: '700', marginTop: 4 },

  // Call CTA card
  callCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#E8F5EE', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1.5, borderColor: GREEN + '40' },
  callCardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  callCardTitle:{ fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  callCardSub:  { fontSize: 13, color: GREEN, fontWeight: '600', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 10, marginTop: 4 },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  skillChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5EE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  skillTxt:   { fontSize: 12, color: GREEN, fontWeight: '700' },

  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTxt:  { fontSize: 13, color: '#555', flex: 1, lineHeight: 19 },

  descTxt: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 16 },

  availWindowCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5EE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  availWindowTxt:  { fontSize: 13, color: GREEN, fontWeight: '700', flex: 1 },

  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  locTxt:  { fontSize: 13, color: '#888' },

  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  bottomCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 15 },
  bottomCallTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
