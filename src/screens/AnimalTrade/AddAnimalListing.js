import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS } from '../../constants/colors';

const ANIMAL_TYPES = ['Cow', 'Buffalo', 'Goat', 'Bullock', 'Sheep', 'Pig', 'Horse', 'Camel'];

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
  const [form, setForm] = useState({
    animal: '', breed: '', age: '', gender: 'Female', weight: '',
    milkYield: '', price: '', description: '', location: '', vaccinated: false,
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Limit reached', 'Maximum 4 photos allowed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  };

  const handleSubmit = () => {
    if (!form.animal || !form.breed || !form.price || !form.location) {
      Alert.alert('Missing Information', 'Please fill in animal type, breed, price and location.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Listing Posted!', 'Your animal listing is now live. Buyers can contact you shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos ({photos.length}/4)</Text>
          <Text style={styles.sectionSub}>Good photos get 3x more responses</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Ionicons name="image" size={30} color={COLORS.primaryLight} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos(p => p.filter((_, pi) => pi !== i))}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 4 && (
              <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                <Text style={styles.photoAddText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Animal Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animal Type *</Text>
          <View style={styles.chipGrid}>
            {ANIMAL_TYPES.map(a => (
              <SelectChip key={a} label={a} selected={form.animal === a} onPress={() => update('animal', a)} />
            ))}
          </View>
        </View>

        {/* Basic Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <InputField label="Breed *" placeholder="e.g. Gir, Murrah, Beetal" value={form.breed} onChangeText={v => update('breed', v)} />
          <InputField label="Age" placeholder="e.g. 4 years" value={form.age} onChangeText={v => update('age', v)} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                  onPress={() => update('gender', g)}
                >
                  <Ionicons name={g === 'Male' ? 'male' : 'female'} size={18} color={form.gender === g ? COLORS.textWhite : COLORS.primary} />
                  <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <InputField label="Weight (kg)" placeholder="e.g. 350" value={form.weight} onChangeText={v => update('weight', v)} keyboardType="numeric" />
          {(form.animal === 'Cow' || form.animal === 'Buffalo' || form.gender === 'Female') && (
            <InputField label="Daily Milk Yield (litres)" placeholder="e.g. 12" value={form.milkYield} onChangeText={v => update('milkYield', v)} keyboardType="numeric" />
          )}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing *</Text>
          <InputField label="Asking Price (₹)" placeholder="e.g. 55000" value={form.price} onChangeText={v => update('price', v)} keyboardType="numeric" />
          <Text style={styles.priceHint}>💡 Tip: Fair price brings more buyers. Check market rates before listing.</Text>
        </View>

        {/* Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Information</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Vaccinated</Text>
              <Text style={styles.switchSub}>Animal has been vaccinated</Text>
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
          <Text style={styles.sectionTitle}>Description</Text>
          <InputField
            label="Tell buyers about the animal"
            placeholder="Write about health, temperament, feeding habits, reason for selling..."
            value={form.description}
            onChangeText={v => update('description', v)}
            multiline
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location *</Text>
          <InputField label="Village/City, State" placeholder="e.g. Nashik, Maharashtra" value={form.location} onChangeText={v => update('location', v)} />
        </View>

      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.textWhite} />
            <Text style={styles.submitText}>{loading ? 'Posting...' : 'Post Free Listing'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 30 },

  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 14 },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.divider, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  photoRemove: { position: 'absolute', top: -8, right: -8 },
  photoAdd: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoAddText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: COLORS.textMedium },
  chipTextActive: { color: COLORS.textWhite },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textDark },
  textArea: { height: 100, textAlignVertical: 'top' },

  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary },
  genderBtnActive: { backgroundColor: COLORS.primary },
  genderText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  genderTextActive: { color: COLORS.textWhite },

  priceHint: { fontSize: 13, color: COLORS.textLight, marginTop: 4, fontStyle: 'italic' },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  switchSub: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },

  bottomBar: { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitBtn: { borderRadius: 14, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  submitText: { fontSize: 17, fontWeight: '800', color: COLORS.textWhite },
});
