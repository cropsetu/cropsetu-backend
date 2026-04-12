import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, SHADOWS } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { compressImage } from '../../utils/mediaCompressor';

const ANIMAL_TYPE_KEYS = ['animalCow', 'animalBuffalo', 'animalGoat', 'animalBullock', 'animalSheep', 'animalPig', 'animalHorse', 'animalCamel'];
// English values used for form submission (backend expects English)
const ANIMAL_TYPE_VALUES = ['Cow', 'Buffalo', 'Goat', 'Bullock', 'Sheep', 'Pig', 'Horse', 'Camel'];

function SelectChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputField({ label, placeholder, value, onChangeText, keyboardType = 'default', multiline = false }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function AddAnimalListing({ navigation }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    animal: '', breed: '', age: '', gender: 'Female', weight: '',
    milkYield: '', price: '', description: '', location: '', vaccinated: false,
  });
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | done | denied

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert(t('addAnimal.limitReached'), t('addAnimal.maxPhotos'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos(p => [...p, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    if (!form.animal || !form.breed || !form.price || !form.location) {
      Alert.alert(t('addAnimal.missingInfo'), t('addAnimal.missingInfoMsg'));
      return;
    }
    setLoading(true);

    // ── Get GPS coordinates ──────────────────────────────────────────────────
    let lat = null;
    let lng = null;
    try {
      setGpsState('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        setGpsState('done');
      } else {
        setGpsState('denied');
      }
    } catch {
      setGpsState('denied');
    }

    // ── Build FormData ───────────────────────────────────────────────────────
    try {
      const formData = new FormData();
      formData.append('animal',         form.animal);
      formData.append('breed',          form.breed);
      formData.append('age',            form.age || '—');
      formData.append('gender',         form.gender === 'Male' ? 'MALE' : 'FEMALE');
      formData.append('weight',         form.weight || '—');
      formData.append('price',          form.price);
      formData.append('sellerLocation', form.location);
      if (form.milkYield) formData.append('milkYield',   form.milkYield + ' Litre/Day');
      if (form.description) formData.append('description', form.description);
      if (lat != null)    formData.append('lat', String(lat));
      if (lng != null)    formData.append('lng', String(lng));
      if (form.vaccinated) formData.append('tags[]', 'Vaccinated');

      for (const photo of photos) {
        const { uri: compressedUri } = await compressImage(photo.uri);
        const filename = `photo_${Date.now()}.jpg`;
        formData.append('images', { uri: compressedUri, name: filename, type: 'image/jpeg' });
      }

      await api.post('/animals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000, // 90s — Cloudinary upload can take up to 55s
      });

      Alert.alert(t('listingPosted'), t('listingPostedMsg'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        t('product.error'),
        err?.response?.data?.error?.message || t('addAnimal.failedToPost')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.addPhotosTitle', { count: photos.length })}</Text>
          <Text style={styles.sectionSub}>{t('addAnimal.goodPhotos')}</Text>
          <View style={styles.photoRow}>
            {photos.map((_, i) => (
              <View key={i} style={styles.photoThumb}>
                <Ionicons name="image" size={30} color={COLORS.primaryLight} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setPhotos(p => p.filter((_, pi) => pi !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 4 && (
              <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                <Text style={styles.photoAddText}>{t('addAnimal.addPhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Animal Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.animalTypeSection')}</Text>
          <View style={styles.chipGrid}>
            {ANIMAL_TYPE_KEYS.map((tKey, idx) => (
              <SelectChip key={tKey} label={t('addAnimal.' + tKey)} selected={form.animal === ANIMAL_TYPE_VALUES[idx]} onPress={() => update('animal', ANIMAL_TYPE_VALUES[idx])} />
            ))}
          </View>
        </View>

        {/* Basic Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.basicDetails')}</Text>
          <InputField label={t('addAnimal.breedRequired')} placeholder="e.g. Gir, Murrah, Beetal" value={form.breed} onChangeText={v => update('breed', v)} />
          <InputField label={t('age')} placeholder="e.g. 4 years" value={form.age} onChangeText={v => update('age', v)} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('addAnimal.genderLabel')}</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                  onPress={() => update('gender', g)}
                >
                  <Ionicons name={g === 'Male' ? 'male' : 'female'} size={18} color={form.gender === g ? COLORS.textWhite : COLORS.primary} />
                  <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>
                    {g === 'Male' ? t('addAnimal.male') : t('addAnimal.female')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <InputField label={t('addAnimal.weightKg')} placeholder="e.g. 350" value={form.weight} onChangeText={v => update('weight', v)} keyboardType="numeric" />
          {(form.animal === 'Cow' || form.animal === 'Buffalo' || form.gender === 'Female') && (
            <InputField label={t('dailyMilk')} placeholder="e.g. 12" value={form.milkYield} onChangeText={v => update('milkYield', v)} keyboardType="numeric" />
          )}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.pricingSection')}</Text>
          <InputField label={t('askingPrice')} placeholder="e.g. 55000" value={form.price} onChangeText={v => update('price', v)} keyboardType="numeric" />
          <Text style={styles.priceHint}>{t('addAnimal.priceHint')}</Text>
        </View>

        {/* Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.healthInfo')}</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('addAnimal.vaccinated')}</Text>
              <Text style={styles.switchSub}>{t('addAnimal.vaccinatedSub')}</Text>
            </View>
            <Switch
              value={form.vaccinated}
              onValueChange={v => update('vaccinated', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={form.vaccinated ? COLORS.primary : COLORS.surface}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.descriptionSection')}</Text>
          <InputField
            label={t('addAnimal.descLabel')}
            placeholder={t('addAnimal.descPlaceholder')}
            value={form.description}
            onChangeText={v => update('description', v)}
            multiline
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addAnimal.locationSection')}</Text>
          <InputField
            label={t('addAnimal.locationLabel')}
            placeholder={t('addAnimal.locationPlaceholder')}
            value={form.location}
            onChangeText={v => update('location', v)}
          />
          {/* GPS note */}
          <View style={styles.gpsNote}>
            <Ionicons
              name={gpsState === 'done' ? 'location' : 'location-outline'}
              size={13}
              color={gpsState === 'done' ? COLORS.primary : gpsState === 'denied' ? COLORS.error : '#999'}
            />
            <Text style={[
              styles.gpsNoteTxt,
              gpsState === 'done'   && { color: COLORS.primary },
              gpsState === 'denied' && { color: COLORS.error },
            ]}>
              {gpsState === 'done'    ? t('addAnimal.gpsCoordsSaved')
               : gpsState === 'denied' ? t('addAnimal.gpsAccessDenied')
               : gpsState === 'loading' ? t('addAnimal.gpsLoading')
               : t('addAnimal.gpsAutoSave')}
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <View style={[styles.submitInner, { backgroundColor: COLORS.primary }]}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.submitText}>{t('postFreeListing')}</Text>
                </>
            }
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 30 },

  section:      { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  sectionSub:   { fontSize: 13, color: COLORS.textLight, marginBottom: 14 },

  photoRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  photoThumb:   { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.divider, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  photoRemove:  { position: 'absolute', top: -8, right: -8 },
  photoAdd:     { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoAddText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  chipGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip:          { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:      { fontSize: 14, fontWeight: '600', color: COLORS.textMedium },
  chipTextActive:{ color: COLORS.textWhite },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  input:      { backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textDark },
  textArea:   { height: 100, textAlignVertical: 'top' },

  genderRow:       { flexDirection: 'row', gap: 12 },
  genderBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary },
  genderBtnActive: { backgroundColor: COLORS.primary },
  genderText:      { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  genderTextActive:{ color: COLORS.textWhite },

  priceHint: { fontSize: 13, color: COLORS.textLight, marginTop: 4, fontStyle: 'italic' },

  switchRow:   { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  switchSub:   { fontSize: 13, color: COLORS.textLight, marginTop: 2 },

  gpsNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#F5FCF9', borderRadius: 8 },
  gpsNoteTxt: { flex: 1, fontSize: 12, color: '#888', lineHeight: 17 },

  bottomBar:   { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitBtn:   { borderRadius: 14, overflow: 'hidden' },
  submitInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  submitText:  { fontSize: 17, fontWeight: '800', color: '#fff' },
});
