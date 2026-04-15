/**
 * AddMachineryScreen — List your equipment for rent.
 * Collects: category, name, brand, age, mileage, HP, fuel, features,
 *           pricing, availability dates, location, images (up to 5), video (1).
 * Uploads media to Cloudinary via /upload/image and /upload/video,
 * then creates listing via POST /rent/machinery.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { compressImage, compressVideo } from '../../utils/mediaCompressor';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';

const GREEN = '#2D9162';

const CATEGORIES = [
  { key: 'tractor',      tKey: 'catTractor',      icon: 'construct-outline',      color: '#1565C0' },
  { key: 'harvester',    tKey: 'catHarvester',    icon: 'leaf-outline',            color: '#6A1B9A' },
  { key: 'sprayer',      tKey: 'catSprayer',      icon: 'water-outline',           color: '#00838F' },
  { key: 'rotavator',    tKey: 'catRotavator',    icon: 'refresh-circle-outline',  color: '#E65100' },
  { key: 'thresher',     tKey: 'catThresher',     icon: 'aperture-outline',        color: '#C62828' },
  { key: 'transplanter', tKey: 'catTransplanter', icon: 'git-branch-outline',      color: '#2E7D32' },
  { key: 'truck',        tKey: 'catTruck',        icon: 'bus-outline',             color: '#37474F' },
  { key: 'tempo',        tKey: 'catTempo',        icon: 'car-outline',             color: '#6D4C41' },
  { key: 'other',        tKey: 'catOther',        icon: 'ellipsis-horizontal',     color: '#757575' },
];

const FUEL_KEYS       = ['diesel', 'petrol', 'electric'];
const COMMON_FEATURES = ['4WD','Power Steering','GPS Tracked','AC Cabin','Hydraulic','PTO','Front Loader','Rear Blade'];

function SectionLabel({ children }) {
  return <Text style={S.sectionLabel}>{children}</Text>;
}

function FieldInput({ label, value, onChangeText, placeholder, keyboardType, multiline, required }) {
  return (
    <View style={S.field}>
      <Text style={S.label}>{label}{required && <Text style={S.req}> *</Text>}</Text>
      <TextInput
        style={[S.input, multiline && S.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ChipGroup({ options, selected, onToggle, singleSelect }) {
  return (
    <View style={S.chipGroup}>
      {options.map(opt => {
        const active = singleSelect ? selected === opt.key : selected.includes(opt.key);
        return (
          <TouchableOpacity
            key={opt.key}
            style={[S.chip, active && { backgroundColor: opt.color || GREEN, borderColor: opt.color || GREEN }]}
            onPress={() => onToggle(opt.key)}
          >
            {opt.icon && <Ionicons name={opt.icon} size={13} color={active ? '#fff' : (opt.color || '#555')} />}
            <Text style={[S.chipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AddMachineryScreen({ navigation, route }) {
  const insets    = useSafeAreaInsets();
  const { t }         = useLanguage();
  const { coords: gpsCoords } = useLocation();
  const existing  = route?.params?.listing  || null;
  const editMode  = route?.params?.editMode || false;

  const [category,      setCategory]     = useState(existing?.category     || '');
  const [name,          setName]         = useState(existing?.name         || '');
  const [brand,         setBrand]        = useState(existing?.brand        || '');
  const [ageYears,      setAgeYears]     = useState(existing?.ageYears     != null ? String(existing.ageYears) : '');
  const [mileageHours,  setMileageHours] = useState(existing?.mileageHours != null ? String(existing.mileageHours) : '');
  const [horsePower,    setHorsePower]   = useState(existing?.horsePower   || '');
  const [fuelType,      setFuelType]     = useState(existing?.fuelType     || '');
  const [features,      setFeatures]     = useState(existing?.features     || []);
  const [description,   setDescription]  = useState(existing?.description  || '');
  const [pricePerHour,  setPricePerHour] = useState(existing?.pricePerHour != null ? String(existing.pricePerHour) : '');
  const [pricePerDay,   setPricePerDay]  = useState(existing?.pricePerDay  != null ? String(existing.pricePerDay)  : '');
  const [pricePerAcre,  setPricePerAcre] = useState(existing?.pricePerAcre != null ? String(existing.pricePerAcre) : '');
  const [availableFrom, setAvailableFrom]= useState(existing?.availableFrom ? existing.availableFrom.slice(0, 10) : '');
  const [availableTo,   setAvailableTo]  = useState(existing?.availableTo   ? existing.availableTo.slice(0, 10)   : '');
  const [location,      setLocation]     = useState(existing?.location     || '');
  const [district,      setDistrict]     = useState(existing?.district     || '');
  const [ownerName,     setOwnerName]    = useState(existing?.ownerName    || '');
  const [ownerPhone,    setOwnerPhone]   = useState(existing?.ownerPhone   || '');
  // Existing images from server are already uploaded URLs; new picks have base64
  const [images,        setImages]       = useState(
    (existing?.images || []).map(url => ({ uri: url, url }))
  );
  const [video,         setVideo]        = useState(
    existing?.videos?.[0] ? { uri: existing.videos[0], url: existing.videos[0] } : null
  );
  const [lat,           setLat]          = useState(existing?.lat  ?? null);
  const [lng,           setLng]          = useState(existing?.lng  ?? null);
  const gpsLoading = false; // GPS fetched globally at app start
  const [uploading,     setUploading]    = useState(false);
  const [submitting,    setSubmitting]   = useState(false);

  // ── Use global GPS from LocationContext ──────────────────────────────────
  const fetchGPS = () => {
    if (gpsCoords) {
      setLat(gpsCoords.latitude);
      setLng(gpsCoords.longitude);
    } else {
      Alert.alert(t('rent.permissionDenied'), t('rent.locationPermission'));
    }
  };

  const toggleFeature = (key) => {
    setFeatures(f => f.includes(key) ? f.filter(x => x !== key) : [...f, key]);
  };

  // ── Upload image (compress → base64 → server) ─────────────────────────────
  const uploadImage = async (uri) => {
    const { base64 } = await compressImage(uri);
    const res = await api.post('/upload/image', { base64 }, { timeout: 60000 });
    return res.data.data.url;
  };

  // ── Upload video (compress → multipart → server) ───────────────────────────
  const uploadVideo = async (rawUri) => {
    const uri      = await compressVideo(rawUri);
    const fileName = uri.split('/').pop();
    const ext      = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeMap  = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo' };
    const mime     = mimeMap[ext] || 'video/mp4';

    const formData = new FormData();
    formData.append('video', { uri, name: fileName, type: mime });
    const res = await api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data.data.url;
  };

  // ── Pick images ────────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= 5) { Alert.alert('Max 5 images'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.75, allowsMultipleSelection: true, base64: true,
    });
    if (res.canceled || !res.assets?.length) return;

    const toAdd = res.assets.slice(0, 5 - images.length);
    setImages(prev => [...prev, ...toAdd.map(a => ({ uri: a.uri, url: null }))]);
  };

  const pickFromCamera = async () => {
    if (images.length >= 5) { Alert.alert('Max 5 images'); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission required'); return; }

    const res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.75 });
    if (res.canceled || !res.assets?.[0]) return;
    setImages(prev => [...prev, { uri: res.assets[0].uri, url: null }]);
  };

  // ── Pick video ─────────────────────────────────────────────────────────────
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos', quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setVideo({ uri: res.assets[0].uri, url: null });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!category)     { Alert.alert(t('rent.required'), t('rent.selectCategoryAlert')); return; }
    if (!name.trim())  { Alert.alert(t('rent.required'), t('rent.enterEquipmentName')); return; }
    if (!pricePerDay)  { Alert.alert(t('rent.required'), t('rent.enterPriceDay')); return; }
    if (!location.trim()) { Alert.alert(t('rent.required'), t('rent.enterLocation')); return; }
    if (!district.trim()) { Alert.alert(t('rent.required'), t('rent.enterDistrict')); return; }

    setUploading(true);
    let imageUrls = [];
    let videoUrl  = null;

    try {
      // Upload images
      for (const img of images) {
        if (img.url) { imageUrls.push(img.url); continue; }
        const url = await uploadImage(img.uri);
        imageUrls.push(url);
      }
      // Upload video
      if (video && !video.url) {
        videoUrl = await uploadVideo(video.uri);
      } else if (video?.url) {
        videoUrl = video.url;
      }
    } catch (e) {
      setUploading(false);
      Alert.alert(t('rent.uploadFailed'), t('rent.uploadFailedMsg'));
      return;
    }
    setUploading(false);
    setSubmitting(true);

    const payload = {
      name:         name.trim(),
      category,
      brand:        brand.trim()       || null,
      ageYears:     ageYears           || null,
      mileageHours: mileageHours       || null,
      horsePower:   horsePower.trim()  || null,
      fuelType:     fuelType           || null,
      features,
      description:  description.trim() || null,
      pricePerHour: pricePerHour       || null,
      pricePerDay,
      pricePerAcre: pricePerAcre       || null,
      availableFrom: availableFrom     || null,
      availableTo:  availableTo        || null,
      location:     location.trim(),
      district:     district.trim(),
      ownerName:    ownerName.trim()   || null,
      ownerPhone:   ownerPhone.trim()  || null,
      images:       imageUrls,
      videos:       videoUrl ? [videoUrl] : [],
      lat:          lat  ?? null,
      lng:          lng  ?? null,
    };

    try {
      if (editMode && existing?.id) {
        await api.put(`/rent/machinery/${existing.id}`, payload);
        Alert.alert(t('rent.updatedTitle'), t('rent.updatedMsg'), [
          { text: t('rent.done'), onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.post('/rent/machinery', payload);
        Alert.alert(t('rent.listedSuccess'), t('rent.listedSuccessMsg'), [
          { text: t('rent.viewListings'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || t('rent.error');
      Alert.alert(t('rent.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = uploading || submitting;

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View>
          <Text style={S.headerTitle}>{editMode ? t('rent.editListing') : t('rent.listYourMachinery')}</Text>
          <Text style={S.headerSub}>{editMode ? t('rent.updateEquipment') : t('rent.earnMoney')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scrollContent}>

          {/* ── Category ── */}
          <SectionLabel>{t('rent.equipmentCategory')} *</SectionLabel>
          <ChipGroup
            options={CATEGORIES.map(cat => ({ ...cat, label: t('rent.' + cat.tKey) }))}
            selected={category}
            onToggle={setCategory}
            singleSelect
          />

          {/* ── Basic Info ── */}
          <SectionLabel>{t('rent.equipmentDetails')}</SectionLabel>
          <FieldInput label={t('rent.equipmentName')} value={name}   onChangeText={setName}   placeholder="e.g. Mahindra 575 DI Tractor" required />
          <FieldInput label={t('rent.brandModel')}    value={brand}  onChangeText={setBrand}  placeholder="e.g. Mahindra, John Deere" />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.ageYears')} value={ageYears} onChangeText={setAgeYears} placeholder="e.g. 3" keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.mileageHours')} value={mileageHours} onChangeText={setMileageHours} placeholder="e.g. 1200" keyboardType="numeric" />
            </View>
          </View>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.horsePower')} value={horsePower} onChangeText={setHorsePower} placeholder="e.g. 47 HP" />
            </View>
          </View>

          {/* Fuel type */}
          <Text style={S.label}>{t('rent.fuelType')}</Text>
          <ChipGroup
            options={FUEL_KEYS.map(f => ({ key: f, label: t('rent.fuel' + f.charAt(0).toUpperCase() + f.slice(1)) }))}
            selected={fuelType}
            onToggle={setFuelType}
            singleSelect
          />

          {/* Features */}
          <SectionLabel>{t('rent.featuresSection')}</SectionLabel>
          <ChipGroup
            options={COMMON_FEATURES.map(f => ({ key: f, label: f }))}
            selected={features}
            onToggle={toggleFeature}
          />

          <FieldInput label={t('rent.descriptionLabel')} value={description} onChangeText={setDescription} placeholder="Describe condition, what work it's suitable for…" multiline />

          {/* ── Pricing ── */}
          <SectionLabel>{t('rent.pricingSection2')}</SectionLabel>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.pricePerHour')} value={pricePerHour} onChangeText={setPricePerHour} placeholder="e.g. 450" keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.pricePerDay')} value={pricePerDay} onChangeText={setPricePerDay} placeholder="e.g. 3200" keyboardType="numeric" required />
            </View>
          </View>
          <FieldInput label={t('rent.pricePerAcreOptional')} value={pricePerAcre} onChangeText={setPricePerAcre} placeholder="e.g. 800" keyboardType="numeric" />

          {/* ── Availability ── */}
          <SectionLabel>{t('rent.availabilityDates')}</SectionLabel>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.fromDate')} value={availableFrom} onChangeText={setAvailableFrom} placeholder="YYYY-MM-DD" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.toDate')} value={availableTo}   onChangeText={setAvailableTo}   placeholder="YYYY-MM-DD" />
            </View>
          </View>

          {/* ── Location ── */}
          <SectionLabel>{t('rent.location')}</SectionLabel>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.villageCityLabel')} value={location} onChangeText={setLocation} placeholder="e.g. Nashik" required />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.districtLabel')} value={district} onChangeText={setDistrict} placeholder="e.g. Nashik" required />
            </View>
          </View>

          {/* GPS auto-fill */}
          <TouchableOpacity
            style={[S.gpsBtnRow, lat != null && S.gpsBtnRowDone]}
            onPress={fetchGPS}
            disabled={gpsLoading}
          >
            {gpsLoading
              ? <ActivityIndicator size="small" color={GREEN} />
              : <Ionicons name={lat != null ? 'location' : 'location-outline'} size={18} color={lat != null ? '#fff' : GREEN} />
            }
            <Text style={[S.gpsBtnTxt, lat != null && { color: '#fff' }]}>
              {gpsLoading
                ? t('rent.fetchingGps')
                : lat != null
                  ? `${t('rent.gpsSaved')}  (${lat.toFixed(4)}, ${lng.toFixed(4)})`
                  : t('rent.useGps')}
            </Text>
          </TouchableOpacity>

          {/* ── Contact ── */}
          <SectionLabel>{t('rent.contactInfo')}</SectionLabel>
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.ownerName')} value={ownerName} onChangeText={setOwnerName} placeholder="Your name" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FieldInput label={t('rent.phone')} value={ownerPhone} onChangeText={setOwnerPhone} placeholder="10-digit number" keyboardType="phone-pad" />
            </View>
          </View>

          {/* ── Photos ── */}
          <SectionLabel>{t('rent.photosUp5')}</SectionLabel>
          <View style={S.mediaRow}>
            {images.map((img, i) => (
              <View key={i} style={S.mediaThumb}>
                <Image source={{ uri: img.uri }} style={S.thumbImg} />
                <TouchableOpacity style={S.removeBtn} onPress={() => setImages(arr => arr.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={20} color="#E53935" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <View style={S.addMediaGroup}>
                <TouchableOpacity style={S.addMediaBtn} onPress={pickImages}>
                  <Ionicons name="images-outline" size={22} color={GREEN} />
                  <Text style={S.addMediaTxt}>{t('rent.gallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.addMediaBtn} onPress={pickFromCamera}>
                  <Ionicons name="camera-outline" size={22} color={GREEN} />
                  <Text style={S.addMediaTxt}>{t('rent.camera')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Video ── */}
          <SectionLabel>{t('rent.videoOptional')}</SectionLabel>
          {video ? (
            <View style={S.videoWrap}>
              <Ionicons name="videocam" size={28} color={GREEN} />
              <Text style={S.videoName} numberOfLines={1}>{video.uri.split('/').pop()}</Text>
              <TouchableOpacity onPress={() => setVideo(null)} style={S.removeVideoBtn}>
                <Ionicons name="trash-outline" size={18} color="#E53935" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={S.videoPickBtn} onPress={pickVideo}>
              <Ionicons name="cloud-upload-outline" size={24} color={GREEN} />
              <Text style={S.videoPickTxt}>{t('rent.chooseVideo')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[S.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={S.submitTxt}>
                    {uploading ? t('rent.uploadingMedia') : editMode ? t('rent.saveChanges') : t('rent.listMyEquipment')}
                  </Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn:{ padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  headerSub:   { fontSize: 12, color: '#888' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionLabel: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginTop: 16, marginBottom: 10 },
  label:        { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  req:          { color: '#E53935' },
  field:        { marginBottom: 12 },
  input:        { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8E8', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A1A' },
  inputMulti:   { minHeight: 80, textAlignVertical: 'top' },
  row:          { flexDirection: 'row', alignItems: 'flex-end' },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0' },
  chipTxt:   { fontSize: 12, fontWeight: '700', color: '#555' },

  mediaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  mediaThumb:    { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImg:      { width: '100%', height: '100%' },
  removeBtn:     { position: 'absolute', top: 2, right: 2 },
  addMediaGroup: { flexDirection: 'row', gap: 8 },
  addMediaBtn:   { width: 80, height: 80, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addMediaTxt:   { fontSize: 10, color: GREEN, fontWeight: '700' },

  videoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: GREEN + '40', marginBottom: 4 },
  videoName:    { flex: 1, fontSize: 13, color: '#444' },
  removeVideoBtn:{ padding: 6 },
  videoPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', borderStyle: 'dashed', padding: 18, justifyContent: 'center', marginBottom: 4 },
  videoPickTxt: { fontSize: 14, color: GREEN, fontWeight: '700' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  gpsBtnRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: GREEN, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, backgroundColor: '#fff' },
  gpsBtnRowDone: { backgroundColor: GREEN, borderColor: GREEN },
  gpsBtnTxt:     { fontSize: 13, fontWeight: '700', color: GREEN, flex: 1 },
});
