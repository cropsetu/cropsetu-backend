/**
 * CreateGroupScreen — Create a new WhatsApp-like community group.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

function ScopeChip({ label, icon, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={selected ? '#fff' : COLORS.primary} />
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CreateGroupScreen({ navigation }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [scope, setScope] = useState('district'); // 'district' | 'city' | 'state' | 'all'
  const [avatarUri, setAvatarUri] = useState(null);
  const [creating, setCreating] = useState(false);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a group name.'); return; }
    setCreating(true);

    try {
      const form = new FormData();
      form.append('name', name.trim());
      if (description.trim()) form.append('description', description.trim());
      form.append('isPublic', String(isPublic));

      // Auto-set district/city from user profile based on scope
      if (scope === 'district' && user?.district) form.append('district', user.district);
      if (scope === 'city' && user?.city) form.append('city', user.city);

      if (avatarUri) {
        const ext = avatarUri.split('.').pop() || 'jpg';
        form.append('images', { uri: avatarUri, type: `image/${ext}`, name: `avatar.${ext}` });
      }

      const { data } = await api.post('/groups', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigation.replace('GroupChat', { group: data.data });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error?.message || 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <LinearGradient colors={['#1A237E', '#283593']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity
          style={[styles.createBtn, (!name.trim() || creating) && { opacity: 0.5 }]}
          onPress={handleCreate}
          disabled={!name.trim() || creating}
        >
          {creating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.createBtnText}>Create</Text>}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color="#1A237E" />
                <Text style={styles.avatarHint}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>GROUP NAME *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ahmednagar Farmers 🌾"
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoFocus
            />
            <Text style={styles.charCount}>{name.length}/60</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this group about?"
            value={description}
            onChangeText={setDescription}
            maxLength={300}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Privacy */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>PRIVACY</Text>
          <View style={styles.chipRow}>
            <ScopeChip icon="earth-outline" label="Public" selected={isPublic} onPress={() => setIsPublic(true)} />
            <ScopeChip icon="lock-closed-outline" label="Private" selected={!isPublic} onPress={() => setIsPublic(false)} />
          </View>
          <Text style={styles.hintText}>
            {isPublic ? 'Anyone can find and join this group.' : 'Only people you invite can join.'}
          </Text>
        </View>

        {/* Location scope */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>LOCATION SCOPE</Text>
          <View style={styles.chipRow}>
            <ScopeChip icon="home-outline" label="My City" selected={scope === 'city'} onPress={() => setScope('city')} />
            <ScopeChip icon="map-outline" label="My District" selected={scope === 'district'} onPress={() => setScope('district')} />
            <ScopeChip icon="globe-outline" label="All Maharashtra" selected={scope === 'all'} onPress={() => setScope('all')} />
          </View>
          <Text style={styles.hintText}>
            {scope === 'city' && user?.city
              ? `Group scoped to ${user.city}`
              : scope === 'district' && user?.district
                ? `Group scoped to ${user.district} district`
                : 'Visible to all Maharashtra farmers'}
          </Text>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            You will be the group admin. You can add members, change the group icon, and manage settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EE' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  createBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  createBtnInner: {},
  createBtnText: { color: '#1A237E', fontWeight: '800', fontSize: 15 },

  body: { padding: 20, gap: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 10 },
  avatarPicker: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E8EAF6', borderWidth: 2, borderColor: '#1A237E',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  avatarHint: { fontSize: 12, color: '#1A237E', fontWeight: '600' },

  inputSection: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  label: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1.2 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: '#111', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 8 },
  textArea: { height: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, marginTop: 4 },
  charCount: { fontSize: 12, color: '#AAA', marginLeft: 8 },

  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  chipTextActive: { color: '#fff' },
  hintText: { fontSize: 12, color: '#888', fontStyle: 'italic' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.primaryPale, borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 20 },
});
