import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';

export default function LabourDetail({ route }) {
  const { labour } = route.params;
  const [days, setDays] = useState('');
  const [hours, setHours] = useState('');
  const [workers, setWorkers] = useState('1');

  const numWorkers = parseInt(workers) || 1;
  const costByDay = days ? parseInt(days) * labour.pricePerDay * numWorkers : 0;
  const costByHour = hours ? parseInt(hours) * labour.pricePerHour * numWorkers : 0;

  const handleHire = () => {
    if (!days && !hours) {
      Alert.alert('Enter Details', 'Please enter number of days or hours.');
      return;
    }
    Alert.alert(
      'Request Sent!',
      `Your labour hire request has been sent to ${labour.type === 'group' ? labour.groupName : labour.leader}. They will contact you within 1 hour.`,
      [{ text: 'OK' }]
    );
  };

  const handleCall = () => {
    Linking.openURL(`tel:${labour.phone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header Card */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.headerCard}>
          <View style={styles.labourAvatar}>
            <Text style={styles.labourAvatarText}>{labour.image}</Text>
          </View>
          <Text style={styles.labourName}>{labour.type === 'group' ? labour.groupName : labour.leader}</Text>
          <Text style={styles.labourType}>
            {labour.type === 'group' ? `👥 Group of ${labour.workers} workers` : '👤 Individual Labour Expert'}
          </Text>
          <View style={styles.availBadge}>
            <View style={[styles.availDot, { backgroundColor: labour.available ? COLORS.gold : COLORS.error }]} />
            <Text style={styles.availText}>{labour.available ? 'Available Now' : 'Currently Busy'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Rating */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingBig}>{labour.rating}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons key={s} name={s <= Math.round(labour.rating) ? 'star' : 'star-outline'} size={14} color={COLORS.gold} />
                ))}
              </View>
              <Text style={styles.ratingReviews}>{labour.reviews} Reviews</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingItem}>
              <Text style={styles.ratingBig}>₹{labour.pricePerDay}</Text>
              <Text style={styles.ratingLabel}>Per Day/Person</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingItem}>
              <Text style={styles.ratingBig}>₹{labour.pricePerHour}</Text>
              <Text style={styles.ratingLabel}>Per Hour/Person</Text>
            </View>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            <View style={styles.skillsGrid}>
              {labour.skills.map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{labour.description}</Text>
          </View>

          {/* Cost Calculator */}
          <View style={styles.calcCard}>
            <Text style={styles.sectionTitle}>Calculate Cost</Text>

            {labour.type === 'group' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Workers Needed</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Max ${labour.workers}`}
                  keyboardType="numeric"
                  value={workers}
                  onChangeText={v => setWorkers(Math.min(parseInt(v) || 1, labour.workers).toString())}
                />
                <Text style={styles.inputHint}>Available: {labour.workers} workers in this group</Text>
              </View>
            )}

            <View style={styles.calcRow}>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Days of Work</Text>
                <TextInput style={styles.calcInput} placeholder="e.g. 3" keyboardType="numeric" value={days} onChangeText={setDays} />
                {costByDay > 0 && <Text style={styles.calcResult}>₹{costByDay.toLocaleString()}</Text>}
              </View>
              <Text style={styles.orText}>OR</Text>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Hours of Work</Text>
                <TextInput style={styles.calcInput} placeholder="e.g. 6" keyboardType="numeric" value={hours} onChangeText={setHours} />
                {costByHour > 0 && <Text style={styles.calcResult}>₹{costByHour.toLocaleString()}</Text>}
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.locationText}>{labour.location}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={22} color={COLORS.primary} />
          <Text style={styles.callBtnText}>Call Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.hireBtn, !labour.available && { opacity: 0.5 }]}
          onPress={handleHire}
          disabled={!labour.available}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.hireGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="people" size={22} color={COLORS.textWhite} />
            <Text style={styles.hireBtnText}>{labour.available ? 'Hire Now' : 'Currently Busy'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerCard: { padding: 24, alignItems: 'center', gap: 10 },
  labourAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF30', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  labourAvatarText: { fontSize: 28, fontWeight: '800', color: COLORS.textWhite },
  labourName: { fontSize: 22, fontWeight: '800', color: COLORS.textWhite },
  labourType: { fontSize: 14, color: COLORS.primaryPale },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF20', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 13, fontWeight: '700', color: COLORS.textWhite },

  content: { padding: 16 },

  ratingCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  ratingItem: { flex: 1, alignItems: 'center', gap: 4 },
  ratingBig: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingReviews: { fontSize: 11, color: COLORS.textLight },
  ratingLabel: { fontSize: 12, color: COLORS.textMedium, textAlign: 'center' },
  ratingDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 12 },
  description: { fontSize: 15, color: COLORS.textMedium, lineHeight: 24 },

  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  skillText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  calcCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.textDark },
  inputHint: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },

  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calcBox: { flex: 1 },
  calcLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  calcInput: { backgroundColor: COLORS.inputBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  calcResult: { fontSize: 14, fontWeight: '800', color: COLORS.success, marginTop: 6 },
  orText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 15, color: COLORS.textMedium, fontWeight: '600' },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  hireBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  hireGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  hireBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textWhite },
});
