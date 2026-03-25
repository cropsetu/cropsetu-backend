/**
 * ProfileScreen — Bright Purple 3D
 */
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Modal, TextInput,
  Image, ActivityIndicator, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FloatingParticle, EntrySlide, D } from '../../components/ui/ImmersiveKit';

const ACCENT = D.purple; // #9333EA

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <View style={S.sectionHeader}>
      <View style={[S.sectionDot, { backgroundColor: ACCENT, shadowColor: ACCENT }]} />
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

function RowItem({ icon, iconColor, label, subtitle, onPress, showArrow = true, rightElement, noBorder }) {
  const color = iconColor || ACCENT;
  return (
    <TouchableOpacity
      style={[S.rowItem, noBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[S.rowIcon, { backgroundColor: color + '15', borderColor: color + '25' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.rowLabel}>{label}</Text>
        {subtitle ? <Text style={S.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement || (showArrow && <Ionicons name="chevron-forward" size={18} color={D.textFaint} />)}
    </TouchableOpacity>
  );
}

function QuickTile({ icon, label, color, onPress, index = 0 }) {
  return (
    <EntrySlide delay={index * 80} fromY={20} style={{ flex: 1 }}>
      <TouchableOpacity style={[S.quickTile, { shadowColor: color }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[S.quickIcon, { backgroundColor: color + '15', borderColor: color + '25' }]}>
          <Ionicons name={icon} size={26} color={color} />
        </View>
        <Text style={S.quickLabel}>{label}</Text>
      </TouchableOpacity>
    </EntrySlide>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSaved }) {
  const [name,        setName]        = useState(user?.name || '');
  const [statusQuote, setStatusQuote] = useState(user?.statusQuote || '');
  const [district,    setDistrict]    = useState(user?.district || '');
  const [city,        setCity]        = useState(user?.city || '');
  const [pincode,     setPincode]     = useState(user?.pincode || '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', { name, statusQuote, district, city, pincode });
      onSaved(data.data);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { icon: 'person-outline',             color: ACCENT,   value: name,        setter: setName,        placeholder: 'Full Name',                 maxLen: 80  },
    { icon: 'chatbubble-ellipses-outline', color: D.cyan,  value: statusQuote, setter: setStatusQuote, placeholder: 'Status (e.g. Proud Farmer)', maxLen: 200 },
    { icon: 'business-outline',           color: D.green,  value: district,    setter: setDistrict,    placeholder: 'District (e.g. Ahmednagar)', maxLen: 100 },
    { icon: 'location-outline',           color: D.amber,  value: city,        setter: setCity,        placeholder: 'City / Town / Village',      maxLen: 100 },
    { icon: 'pin-outline',                color: D.gold,   value: pincode,     setter: setPincode,     placeholder: 'Pincode (6 digits)',          maxLen: 6, keyboard: 'numeric' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={S.editSheet}>
          <View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>Edit Profile</Text>
          {FIELDS.map((f) => (
            <View key={f.placeholder} style={S.fieldRow}>
              <Ionicons name={f.icon} size={18} color={f.color} style={{ marginRight: 10 }} />
              <TextInput
                style={S.fieldInput}
                value={f.value}
                onChangeText={f.setter}
                placeholder={f.placeholder}
                placeholderTextColor={D.textFaint}
                maxLength={f.maxLen}
                keyboardType={f.keyboard || 'default'}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[S.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient colors={[ACCENT, ACCENT + 'CC']} style={S.saveBtnGrad}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.saveBtnTxt}>Save Changes</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const PARTICLES = [
  { icon: 'sparkles', size: 16, delay: 0,   duration: 3200, particleStyle: { top: '8%',  left: '4%'  } },
  { icon: 'star',     size: 10, delay: 500, duration: 2700, particleStyle: { top: '5%',  right: '10%'} },
  { icon: 'star',     size: 8,  delay: 200, duration: 3000, particleStyle: { top: '45%', left: '6%'  } },
  { icon: 'leaf',     size: 13, delay: 700, duration: 2900, particleStyle: { top: '30%', right: '5%' } },
];

const STAT_CONFIGS = [
  { key: 'posts',          label: 'Posts',   icon: 'create-outline',    color: ACCENT },
  { key: 'animalListings', label: 'Animals', icon: 'paw-outline',       color: D.amber },
  { key: 'orders',         label: 'Orders',  icon: 'cart-outline',      color: D.green },
  { key: 'bookings',       label: 'Rentals', icon: 'construct-outline', color: D.cyan },
];

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage, LANGUAGES } = useLanguage();

  const [notifications,  setNotifications]  = useState(true);
  const [showLangModal,  setShowLangModal]   = useState(false);
  const [showEditModal,  setShowEditModal]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto]  = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const heroScale   = scrollY.interpolate({ inputRange: [0, 180], outputRange: [1, 0.88], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0.6],  extrapolate: 'clamp' });

  // ── Photo Upload ──────────────────────────────────────────────────────────
  const handlePhotoPress = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to update your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: ext === 'png' ? 'image/png' : 'image/jpeg' });
      const { data } = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ avatar: data.data.avatar });
    } catch (e) {
      Alert.alert('Upload failed', e?.response?.data?.error?.message || 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [updateUser]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const counts      = user?._count || {};
  const currentLang = LANGUAGES.find((l) => l.code === language);

  return (
    <View style={S.root}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* ── Hero Header ─────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ perspective: 1200 }, { scale: heroScale }], opacity: heroOpacity }}>
          <LinearGradient colors={['#6D28D9', '#7C3AED', '#9333EA']} style={S.hero}>
            {PARTICLES.map((p, i) => (
              <FloatingParticle key={i} {...p}>
                <Ionicons name={p.icon} size={p.size} color="rgba(255,255,255,0.5)" />
              </FloatingParticle>
            ))}

            <View style={S.heroTop}>
              {/* Glow ring + avatar */}
              <TouchableOpacity style={S.avatarWrap} onPress={handlePhotoPress} activeOpacity={0.8}>
                <View style={S.avatarGlow} />
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={S.avatarImg} />
                ) : (
                  <View style={S.avatar}>
                    <Text style={S.avatarTxt}>{initials}</Text>
                  </View>
                )}
                <View style={S.cameraBtn}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>

              {/* Name + info */}
              <View style={{ flex: 1, marginLeft: 18 }}>
                <Text style={S.heroName}>{user?.name || 'Farmer'}</Text>
                {user?.phone && <Text style={S.heroPhone}>{user.phone}</Text>}
                {(user?.city || user?.district) && (
                  <View style={S.locRow}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={S.heroLoc}>{[user?.city, user?.district].filter(Boolean).join(', ')}</Text>
                  </View>
                )}
                {user?.statusQuote ? (
                  <Text style={S.heroQuote}>"{user.statusQuote}"</Text>
                ) : null}
              </View>
            </View>

            <View style={S.heroBottom}>
              <Text style={S.memberSince}>
                Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '—'}
              </Text>
              <TouchableOpacity style={S.editBtn} onPress={() => setShowEditModal(true)}>
                <View style={S.editBtnInner}>
                  <Ionicons name="pencil-outline" size={13} color="#fff" />
                  <Text style={S.editBtnTxt}>Edit Profile</Text>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <View style={S.statsRow}>
          {STAT_CONFIGS.map((stat, i) => (
            <EntrySlide key={stat.key} delay={i * 60} fromY={20} style={{ flex: 1 }}>
              <View style={[S.statCell, { shadowColor: stat.color }]}>
                <View style={[S.statIcon, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={S.statValue}>{counts[stat.key] ?? 0}</Text>
                <Text style={S.statLabel}>{stat.label}</Text>
              </View>
            </EntrySlide>
          ))}
        </View>

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader title="Quick Actions" />
          <View style={S.quickGrid}>
            <QuickTile index={0} icon="cart"     label="My Orders"   color={D.green}  onPress={() => {}} />
            <QuickTile index={1} icon="bookmark" label="Saved Posts" color={D.gold}   onPress={() => {}} />
            <QuickTile index={2} icon="paw"      label="My Listings" color={D.amber}  onPress={() => {}} />
            <QuickTile index={3} icon="headset"  label="Help Center" color={D.blue}   onPress={() => Alert.alert('Support', 'Helpline: 1800-XXX-XXXX (Toll Free)')} />
          </View>
        </View>

        {/* ── Account Settings ────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title="Account Settings" />
          <RowItem icon="person-circle-outline" iconColor={ACCENT}   label="Edit Profile"              subtitle="Name, quote, address details"                                  onPress={() => setShowEditModal(true)} />
          <RowItem icon="location-outline"      iconColor={D.green}  label="Saved Addresses"           subtitle={user?.city ? `${[user.city, user.district].filter(Boolean).join(', ')}` : 'Add your address'} onPress={() => setShowEditModal(true)} />
          <RowItem icon="language-outline"      iconColor={D.cyan}   label="Select Language / भाषा"   subtitle={currentLang?.nativeName || 'English'}                          onPress={() => setShowLangModal(true)} />
          <RowItem
            icon="notifications-outline" iconColor={D.blue}
            label="Notification Settings" subtitle="Price alerts, order updates, chats"
            showArrow={false}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E2E8F0', true: ACCENT + '70' }}
                thumbColor={notifications ? ACCENT : '#CBD5E1'}
              />
            }
          />
          <RowItem icon="shield-checkmark-outline" iconColor={D.purple} label="Privacy Center" subtitle="Manage your data & privacy" onPress={() => {}} noBorder />
        </View>

        {/* ── Personal Information ────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title="Personal Information" />
          <RowItem icon="call-outline"     iconColor={D.green}  label="Mobile Number" subtitle={user?.phone || '—'}                                  showArrow={false} />
          <RowItem icon="mail-outline"     iconColor={D.blue}   label="Email"         subtitle="Not added yet"                                       showArrow={false} />
          <RowItem icon="business-outline" iconColor={D.cyan}   label="District"      subtitle={user?.district || '—'}                               showArrow={false} />
          <RowItem icon="location-outline" iconColor={D.amber}  label="City / Town"   subtitle={user?.city || '—'}                                   showArrow={false} />
          <RowItem icon="map-outline"      iconColor={D.indigo} label="State"         subtitle={user?.farmDetail?.state || user?.state || '—'}       showArrow={false} />
          <RowItem icon="pin-outline"      iconColor={D.gold}   label="Pincode"       subtitle={user?.pincode || '—'}                                showArrow={false} noBorder />
        </View>

        {/* ── My Activity ────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title="My Activity" />
          <RowItem icon="create-outline"    iconColor={ACCENT}  label="My Posts"           subtitle={`${counts.posts || 0} community posts`}  onPress={() => {}} />
          <RowItem icon="paw-outline"       iconColor={D.amber} label="My Animal Listings" subtitle={`${counts.animalListings || 0} listings`} onPress={() => {}} />
          <RowItem icon="construct-outline" iconColor={D.cyan}  label="My Rent Listings"   subtitle={`${counts.bookings || 0} bookings`}      onPress={() => {}} noBorder />
        </View>

        {/* ── Farm Details ─────────────────────────────────────────── */}
        {user?.farmDetail && (
          <View style={[S.section, { marginTop: 8 }]}>
            <SectionHeader title="Farm Details" />
            <RowItem icon="resize-outline" iconColor={D.green}  label="Total Land"  subtitle={user.farmDetail.landAcres ? `${user.farmDetail.landAcres} acres` : '—'} showArrow={false} />
            <RowItem icon="layers-outline" iconColor={D.amber}  label="Soil Type"   subtitle={user.farmDetail.soilType || '—'}       showArrow={false} />
            <RowItem icon="water-outline"  iconColor={D.cyan}   label="Irrigation"  subtitle={user.farmDetail.irrigationType || '—'} showArrow={false} />
            <RowItem icon="flower-outline" iconColor={ACCENT}   label="Main Crops"  subtitle={(user.farmDetail.cropTypes || []).join(', ') || '—'} showArrow={false} noBorder />
          </View>
        )}

        {/* ── Govt Schemes Banner ────────────────────────────────── */}
        <TouchableOpacity style={{ marginTop: 8 }} activeOpacity={0.85}>
          <LinearGradient colors={['#1E40AF', '#1D4ED8', '#3B82F6']} style={S.schemesGrad}>
            <Ionicons name="ribbon-outline" size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={S.schemesTitle}>Government Schemes</Text>
              <Text style={S.schemesSub}>PM-KISAN, Kisan Credit Card & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Feedback ────────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title="Feedback & Information" />
          <RowItem icon="star-outline"              iconColor={D.gold}   label="Rate FarmEasy"              subtitle="Love the app? Rate us 5 stars!"              onPress={() => Alert.alert('Thank you!', 'Your feedback means a lot to us!')} />
          <RowItem icon="help-circle-outline"       iconColor={D.blue}   label="Help & Support"             subtitle="Helpline: 1800-XXX-XXXX (Toll Free)"         onPress={() => Alert.alert('Support', 'Call us: 1800-XXX-XXXX (Toll Free)')} />
          <RowItem icon="document-text-outline"     iconColor={D.purple} label="Terms, Policies and Licenses"                                                       onPress={() => {}} />
          <RowItem icon="chatbubble-ellipses-outline" iconColor={D.cyan} label="Browse FAQs"                subtitle="Find answers to common questions"            onPress={() => {}} noBorder />
        </View>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <TouchableOpacity style={[S.rowItem, { borderBottomWidth: 0 }]} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[S.rowIcon, { backgroundColor: D.red + '15', borderColor: D.red + '25' }]}>
              <Ionicons name="log-out-outline" size={20} color={D.red} />
            </View>
            <Text style={[S.rowLabel, { color: D.red }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={S.version}>FarmEasy v1.0.0 · Made with love for Indian Farmers</Text>
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      <EditProfileModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => { updateUser(updated); setShowEditModal(false); }}
      />

      {/* Language Picker Modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <View style={S.langSheet}>
            <View style={S.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Ionicons name="language" size={22} color={ACCENT} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: D.text, flex: 1 }}>
                Choose Language / भाषा चुनें / भाषा निवडा
              </Text>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[S.langOption, language === lang.code && { borderColor: ACCENT, backgroundColor: ACCENT + '10' }]}
                onPress={() => { setLanguage(lang.code); setShowLangModal(false); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 16, fontWeight: '700', color: D.text }, language === lang.code && { color: ACCENT }]}>
                    {lang.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: D.textFaint, marginTop: 2 }}>{lang.nativeName}</Text>
                </View>
                {language === lang.code && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    paddingTop: Platform.OS === 'android' ? 52 : 52,
    paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden',
  },
  heroTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  avatarWrap: { position: 'relative', width: 80, height: 80 },
  avatarGlow: {
    position: 'absolute', top: -5, left: -5,
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)' },
  avatarTxt: { fontSize: 30, fontWeight: '900', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  heroName:    { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 3 },
  heroPhone:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginBottom: 3 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  heroLoc:     { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  heroQuote:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: 2 },
  memberSince: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  editBtn:     { borderRadius: 20, overflow: 'hidden' },
  editBtnInner:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  editBtnTxt:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Stats Row ─────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 16, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  statCell:  { flex: 1, alignItems: 'center', gap: 4, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  statIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '900', color: D.text },
  statLabel: { fontSize: 11, color: D.textDim, fontWeight: '500' },

  // ── Section ───────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: D.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionDot:  { width: 6, height: 6, borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: D.textDim, letterSpacing: 0.8, textTransform: 'uppercase' },

  // ── Row Item ──────────────────────────────────────────────────
  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: D.border,
    gap: 14,
  },
  rowIcon:     { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '600', color: D.text },
  rowSubtitle: { fontSize: 12, color: D.textDim, marginTop: 2 },

  // ── Quick Tiles ───────────────────────────────────────────────
  quickGrid: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 16 },
  quickTile:  { alignItems: 'center', paddingVertical: 12, gap: 8, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  quickIcon:  { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: D.textDim, textAlign: 'center' },

  // ── Schemes Banner ────────────────────────────────────────────
  schemesGrad: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingVertical: 18,
  },
  schemesTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  schemesSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  // ── Version ───────────────────────────────────────────────────
  version: { textAlign: 'center', fontSize: 12, color: D.textFaint, marginTop: 16, marginBottom: 8 },

  // ── Modals ────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderColor: D.border,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: D.text, marginBottom: 20, textAlign: 'center' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: D.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 12, backgroundColor: '#F8F9FF',
  },
  fieldInput:  { flex: 1, fontSize: 15, color: D.text },
  saveBtn:     { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  saveBtnTxt:  { color: '#fff', fontSize: 16, fontWeight: '800' },

  langSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
    borderTopWidth: 1, borderColor: D.border,
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 14, marginBottom: 10,
    backgroundColor: '#F8F9FF', borderWidth: 1.5, borderColor: D.border,
  },
});
