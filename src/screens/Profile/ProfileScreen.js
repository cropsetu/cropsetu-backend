/**
 * ProfileScreen — Bright Purple 3D
 */
import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, Alert, Modal, TextInput,
  Image, ActivityIndicator, Platform, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../context/LanguageContext';
import { INDIAN_STATES, getStatesByRegion, REGION_ORDER } from '../../i18n/stateMappings';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { compressImage } from '../../utils/mediaCompressor';
import { EntrySlide, D } from '../../components/ui/ImmersiveKit';

const ACCENT = '#2D9162';

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
  const { t } = useLanguage();
  const [name,        setName]        = useState(user?.name || '');
  const [statusQuote, setStatusQuote] = useState(user?.statusQuote || '');
  const [district,    setDistrict]    = useState(user?.district || '');
  const [city,        setCity]        = useState(user?.city || '');
  const [pincode,     setPincode]     = useState(user?.pincode || '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('product.error'), t('profile.nameEmpty')); return; }
    setSaving(true);
    try {
      const { data } = await api.put('/users/me', { name, statusQuote, district, city, pincode });
      onSaved(data.data);
    } catch (e) {
      Alert.alert(t('product.error'), e?.response?.data?.error?.message || t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { icon: 'person-outline',             color: ACCENT,   value: name,        setter: setName,        placeholder: t('profile.fullNamePlaceholder'), maxLen: 80  },
    { icon: 'chatbubble-ellipses-outline', color: D.cyan,  value: statusQuote, setter: setStatusQuote, placeholder: t('profile.statusPlaceholder'),   maxLen: 200 },
    { icon: 'business-outline',           color: D.green,  value: district,    setter: setDistrict,    placeholder: t('profile.districtPlaceholder'), maxLen: 100 },
    { icon: 'location-outline',           color: D.amber,  value: city,        setter: setCity,        placeholder: t('profile.cityPlaceholder'),     maxLen: 100 },
    { icon: 'pin-outline',                color: D.gold,   value: pincode,     setter: setPincode,     placeholder: t('profile.pincodePlaceholder'),  maxLen: 6, keyboard: 'numeric' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={S.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={S.editSheet}>
          <View style={S.sheetHandle} />
          <Text style={S.sheetTitle}>{t('editProfile')}</Text>
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
            <View style={[S.saveBtnGrad, { backgroundColor: ACCENT }]}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.saveBtnTxt}>{t('profile.saveChanges')}</Text>}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const STAT_CONFIGS = [
  { key: 'animalListings', labelKey: 'profile.animals', icon: 'paw-outline',       color: D.amber },
  { key: 'orders',         labelKey: 'profile.orders',  icon: 'cart-outline',      color: D.green },
  { key: 'bookings',       labelKey: 'profile.rentals', icon: 'construct-outline', color: D.cyan },
];

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const { t, language, setLanguage, setLanguageByState, selectedState, LANGUAGES } = useLanguage();

  const [notifications,   setNotifications]  = useState(true);
  const [showLangModal,   setShowLangModal]  = useState(false);
  const [showStateModal,  setShowStateModal] = useState(false);
  const [showEditModal,   setShowEditModal]  = useState(false);
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
      Alert.alert(t('profile.permissionNeeded'), t('profile.photoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',           // expo-image-picker v15+ API
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled) return;

    const asset    = result.assets[0];
    const uri      = asset.uri;
    const filename = uri.split('/').pop();
    const ext      = filename.split('.').pop().toLowerCase();

    // ── Client-side validation (server must also validate independently) ────
    const ALLOWED = ['jpg', 'jpeg', 'png', 'webp'];
    if (!ALLOWED.includes(ext)) {
      Alert.alert(t('profile.invalidFileType'), t('profile.invalidFileMsg'));
      return;
    }
    setUploadingPhoto(true);
    try {
      const { uri: compressedUri } = await compressImage(uri);
      const formData = new FormData();
      formData.append('file', { uri: compressedUri, name: 'avatar.jpg', type: 'image/jpeg' });
      const { data } = await api.put('/users/me', formData);
      updateUser({ avatar: data.data.avatar });
    } catch {
      Alert.alert(t('profile.uploadFailed'), t('profile.uploadFailedMsg'));
    } finally {
      setUploadingPhoto(false);
    }
  }, [updateUser]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
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
          <LinearGradient
            colors={['#1A6644', '#2D9162', '#38B07A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={S.hero}
          >

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
                {t('memberSince')} {user?.createdAt ? new Date(user.createdAt).getFullYear() : '—'}
              </Text>
              <TouchableOpacity style={S.editBtn} onPress={() => setShowEditModal(true)}>
                <View style={S.editBtnInner}>
                  <Ionicons name="pencil-outline" size={13} color="#fff" />
                  <Text style={S.editBtnTxt}>{t('editProfile')}</Text>
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
                <Text style={S.statLabel}>{t(stat.labelKey)}</Text>
              </View>
            </EntrySlide>
          ))}
        </View>

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <View style={S.section}>
          <SectionHeader title={t('profile.quickActions')} />
          <View style={S.quickGrid}>
            <QuickTile index={0} icon="cart"     label={t('myOrders')}          color={D.green}  onPress={() => {}} />
            <QuickTile index={1} icon="bookmark" label={t('savedPosts')}        color={D.gold}   onPress={() => {}} />
            <QuickTile index={2} icon="paw"      label={t('profile.myListings')} color={D.amber}  onPress={() => {}} />
            <QuickTile index={3} icon="headset"  label={t('profile.helpCenter')} color={D.blue}   onPress={() => Alert.alert(t('profile.support'), t('profile.helpline'))} />
          </View>
        </View>

        {/* ── Account Settings ────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title={t('profile.accountSettings')} />
          <RowItem icon="person-circle-outline" iconColor={ACCENT}   label={t('editProfile')}              subtitle={t('profile.nameQuoteAddress')}                                  onPress={() => setShowEditModal(true)} />
          <RowItem icon="location-outline"      iconColor={D.green}  label={t('profile.savedAddresses')}   subtitle={user?.city ? `${[user.city, user.district].filter(Boolean).join(', ')}` : t('profile.addAddress')} onPress={() => setShowEditModal(true)} />
          <RowItem
            icon="globe-outline" iconColor={D.cyan}
            label={t('profile.selectState')}
            subtitle={selectedState ? `${selectedState} · ${currentLang?.nativeName || 'English'}` : currentLang?.nativeName || 'English'}
            onPress={() => setShowStateModal(true)}
          />
          <RowItem
            icon="notifications-outline" iconColor={D.blue}
            label={t('profile.notificationSettings')} subtitle={t('profile.notificationSub')}
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
          <RowItem icon="shield-checkmark-outline" iconColor={D.purple} label={t('profile.privacyCenter')} subtitle={t('profile.privacySub')} onPress={() => {}} noBorder />
        </View>

        {/* ── Personal Information ────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title={t('personalInfo')} />
          <RowItem icon="call-outline"     iconColor={D.green}  label={t('profile.mobileNumber')} subtitle={user?.phone || '—'}                                  showArrow={false} />
          <RowItem icon="mail-outline"     iconColor={D.blue}   label={t('profile.email')}         subtitle={t('profile.notAddedYet')}                            showArrow={false} />
          <RowItem icon="business-outline" iconColor={D.cyan}   label={t('profile.district')}      subtitle={user?.district || '—'}                               showArrow={false} />
          <RowItem icon="location-outline" iconColor={D.amber}  label={t('profile.cityTown')}      subtitle={user?.city || '—'}                                   showArrow={false} />
          <RowItem icon="map-outline"      iconColor={D.indigo} label={t('profile.state')}         subtitle={user?.farmDetail?.state || user?.state || '—'}       showArrow={false} />
          <RowItem icon="pin-outline"      iconColor={D.gold}   label={t('profile.pincode')}       subtitle={user?.pincode || '—'}                                showArrow={false} noBorder />
        </View>

        {/* ── My Activity ────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title={t('myActivity')} />
          <RowItem icon="paw-outline"       iconColor={D.amber} label={t('myAnimalListings')}          subtitle={t('profile.listingsCount', { count: counts.animalListings || 0 })}   onPress={() => {}} />
          <RowItem icon="construct-outline" iconColor={D.cyan}  label={t('myRentListings')}            subtitle={t('profile.bookingsCount', { count: counts.bookings || 0 })}         onPress={() => navigation.navigate('MyRentListings')} noBorder />
        </View>

        {/* ── Farm Details ─────────────────────────────────────────── */}
        {user?.farmDetail && (
          <View style={[S.section, { marginTop: 8 }]}>
            <SectionHeader title={t('farmDetails')} />
            <RowItem icon="resize-outline" iconColor={D.green}  label={t('profile.totalLand')}  subtitle={user.farmDetail.landAcres ? t('profile.landAcres', { acres: user.farmDetail.landAcres }) : '—'} showArrow={false} />
            <RowItem icon="layers-outline" iconColor={D.amber}  label={t('profile.soilType')}   subtitle={user.farmDetail.soilType || '—'}       showArrow={false} />
            <RowItem icon="water-outline"  iconColor={D.cyan}   label={t('profile.irrigation')} subtitle={user.farmDetail.irrigationType || '—'} showArrow={false} />
            <RowItem icon="flower-outline" iconColor={ACCENT}   label={t('profile.mainCrops')}  subtitle={(user.farmDetail.cropTypes || []).join(', ') || '—'} showArrow={false} noBorder />
          </View>
        )}

        {/* ── Govt Schemes Banner ────────────────────────────────── */}
        <TouchableOpacity style={{ marginTop: 8 }} activeOpacity={0.85}>
          <View style={S.schemesGrad}>
            <Ionicons name="ribbon-outline" size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={S.schemesTitle}>{t('profile.schemesTitle')}</Text>
              <Text style={S.schemesSub}>{t('profile.schemesSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>

        {/* ── Feedback ────────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <SectionHeader title={t('profile.feedbackInfo')} />
          <RowItem icon="star-outline"              iconColor={D.gold}   label={t('rate')}                        subtitle={t('profile.rateStar')}          onPress={() => Alert.alert(t('profile.thankYou'), t('profile.thankYouMsg'))} />
          <RowItem icon="help-circle-outline"       iconColor={D.blue}   label={t('help')}                        subtitle={t('helpSub')}                   onPress={() => Alert.alert(t('profile.support'), t('profile.callUs'))} />
          <RowItem icon="document-text-outline"     iconColor={D.purple} label={t('profile.termsLabel')}                                                    onPress={() => {}} />
          <RowItem icon="chatbubble-ellipses-outline" iconColor={D.cyan} label={t('profile.browseFAQs')}          subtitle={t('profile.faqsSub')}           onPress={() => {}} noBorder />
        </View>

        {/* ── Seller Portal ────────────────────────────────────────── */}
        <TouchableOpacity
          style={{ marginTop: 8 }}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SellerPortal')}
        >
          <LinearGradient
            colors={['#E65100', '#F57C00', '#FF9800']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={S.sellerBanner}
          >
            <View style={S.sellerIconWrap}>
              <Ionicons name="storefront" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.sellerTitle}>Seller Dashboard</Text>
              <Text style={S.sellerSub}>Manage products, orders & earnings</Text>
            </View>
            <View style={S.sellerArrow}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <View style={[S.section, { marginTop: 8 }]}>
          <TouchableOpacity style={[S.rowItem, { borderBottomWidth: 0 }]} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[S.rowIcon, { backgroundColor: D.red + '15', borderColor: D.red + '25' }]}>
              <Ionicons name="log-out-outline" size={20} color={D.red} />
            </View>
            <Text style={[S.rowLabel, { color: D.red }]}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={S.version}>{t('profile.versionText')}</Text>
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      <EditProfileModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => { updateUser(updated); setShowEditModal(false); }}
      />

      {/* State Picker Modal */}
      <Modal visible={showStateModal} transparent animationType="slide" onRequestClose={() => setShowStateModal(false)}>
        <View style={S.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowStateModal(false)} />
          <View style={S.stateSheet}>
            <View style={S.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, paddingHorizontal: 4 }}>
              <Ionicons name="globe-outline" size={22} color={ACCENT} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: D.text, flex: 1 }}>
                {t('profile.selectState')}
              </Text>
              <TouchableOpacity onPress={() => { setShowStateModal(false); setShowLangModal(true); }}>
                <Text style={{ fontSize: 12, color: D.cyan, fontWeight: '600' }}>{t('profile.manualLang')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: D.textDim, marginBottom: 16, paddingHorizontal: 4 }}>
              {t('profile.stateLangHint')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {REGION_ORDER.map((region) => {
                const states = getStatesByRegion()[region];
                if (!states || states.length === 0) return null;
                return (
                  <View key={region}>
                    <Text style={S.regionHeader}>{region}</Text>
                    {states.map((state) => {
                      const isSelected = selectedState === state.name;
                      return (
                        <TouchableOpacity
                          key={state.name}
                          style={[S.stateOption, isSelected && { borderColor: ACCENT, backgroundColor: ACCENT + '10' }]}
                          onPress={() => { setLanguageByState(state.name); setShowStateModal(false); }}
                          activeOpacity={0.75}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[S.stateName, isSelected && { color: ACCENT }]}>{state.name}</Text>
                            {state.nativeName ? (
                              <Text style={S.stateNative}>{state.nativeName}</Text>
                            ) : null}
                          </View>
                          <Text style={S.stateLangBadge}>{state.lang.toUpperCase()}</Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color={ACCENT} style={{ marginLeft: 6 }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Picker Modal (manual override) */}
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
    paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#1A6644', shadowOpacity: 0.35, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
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
    paddingVertical: 18, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: D.border,
    marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statCell:  { flex: 1, alignItems: 'center', gap: 4, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  statIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
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
  sectionDot:  { width: 6, height: 6, borderRadius: 3 },
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
    backgroundColor: '#278C5E', borderRadius: 14,
  },
  schemesTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  schemesSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  // ── Seller Banner ─────────────────────────────────────────────
  sellerBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingVertical: 18,
    borderRadius: 14,
  },
  sellerIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  sellerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sellerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  sellerArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

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

  // ── State Picker ──────────────────────────────────────────────
  stateSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderColor: D.border,
    maxHeight: '85%',
  },
  regionHeader: {
    fontSize: 11, fontWeight: '700', color: D.textDim,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: 4, paddingTop: 14, paddingBottom: 6,
  },
  stateOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: '#F8F9FF', borderWidth: 1.5, borderColor: D.border,
  },
  stateName:     { fontSize: 15, fontWeight: '600', color: D.text },
  stateNative:   { fontSize: 12, color: D.textFaint, marginTop: 1 },
  stateLangBadge:{
    fontSize: 11, fontWeight: '700', color: D.textFaint,
    backgroundColor: D.border, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
});
