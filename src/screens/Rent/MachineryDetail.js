import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';

export default function MachineryDetail({ route }) {
  const { machinery } = route.params;
  const [acres, setAcres] = useState('');
  const [hours, setHours] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const totalByAcre = acres ? parseInt(acres) * machinery.pricePerAcre : 0;
  const totalByHour = hours ? parseInt(hours) * machinery.pricePerHour : 0;

  const handleBook = () => {
    if (!acres && !hours) {
      Alert.alert('Enter Details', 'Please enter number of acres or hours to calculate cost.');
      return;
    }
    Alert.alert(
      'Booking Confirmed!',
      `Your ${machinery.equipment} booking request has been sent to ${machinery.ownerName}. They will contact you within 2 hours.`,
      [{ text: 'OK' }]
    );
  };

  const handleCall = () => {
    Linking.openURL(`tel:${machinery.ownerPhone}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <LinearGradient colors={[COLORS.primary + '30', COLORS.primaryPale]} style={styles.imageArea}>
          <Ionicons name="construct" size={90} color={COLORS.primary} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>{machinery.equipment}</Text>
              <Text style={styles.brand}>{machinery.brand}</Text>
            </View>
            <View style={[styles.availBadge, { backgroundColor: machinery.availability.includes('Now') ? '#E8F5EC' : '#FFF8E1' }]}>
              <View style={[styles.availDot, { backgroundColor: machinery.availability.includes('Now') ? COLORS.success : COLORS.warning }]} />
              <Text style={[styles.availText, { color: machinery.availability.includes('Now') ? COLORS.success : COLORS.warning }]}>
                {machinery.availability}
              </Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons key={s} name={s <= Math.round(machinery.rating) ? 'star' : 'star-outline'} size={18} color={COLORS.gold} />
            ))}
            <Text style={styles.ratingNum}>{machinery.rating} ({machinery.reviews} reviews)</Text>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Works For</Text>
            <View style={styles.featuresGrid}>
              {machinery.features.map((f, i) => (
                <View key={i} style={styles.featureChip}>
                  <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Equipment</Text>
            <Text style={styles.description}>{machinery.description}</Text>
          </View>

          {/* Cost Calculator */}
          <View style={styles.calculatorCard}>
            <Text style={styles.sectionTitle}>Cost Calculator</Text>
            <Text style={styles.calcSub}>Enter your requirement to estimate cost</Text>

            <View style={styles.calcRow}>
              <View style={styles.calcInput}>
                <Text style={styles.calcLabel}>Acres of Land</Text>
                <TextInput
                  style={styles.calcField}
                  placeholder="e.g. 3"
                  keyboardType="numeric"
                  value={acres}
                  onChangeText={setAcres}
                />
                {acres ? <Text style={styles.calcTotal}>= ₹{totalByAcre.toLocaleString()}</Text> : null}
              </View>
              <Text style={styles.orText}>OR</Text>
              <View style={styles.calcInput}>
                <Text style={styles.calcLabel}>Hours Needed</Text>
                <TextInput
                  style={styles.calcField}
                  placeholder="e.g. 5"
                  keyboardType="numeric"
                  value={hours}
                  onChangeText={setHours}
                />
                {hours ? <Text style={styles.calcTotal}>= ₹{totalByHour.toLocaleString()}</Text> : null}
              </View>
            </View>

            <View style={styles.rateCards}>
              <View style={styles.rateCard}>
                <Text style={styles.rateAmount}>₹{machinery.pricePerAcre}</Text>
                <Text style={styles.rateLabel}>per Acre</Text>
              </View>
              <View style={[styles.rateCard, { backgroundColor: COLORS.accent + '20' }]}>
                <Text style={[styles.rateAmount, { color: COLORS.accentDark }]}>₹{machinery.pricePerHour}</Text>
                <Text style={styles.rateLabel}>per Hour</Text>
              </View>
            </View>
          </View>

          {/* Owner Info */}
          <View style={styles.ownerCard}>
            <Text style={styles.sectionTitle}>Equipment Owner</Text>
            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                <Ionicons name="person" size={24} color={COLORS.textWhite} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{machinery.ownerName}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={COLORS.textLight} />
                  <Text style={styles.locationText}>{machinery.location}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callSmallBtn} onPress={handleCall}>
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={22} color={COLORS.primary} />
          <Text style={styles.callBtnText}>Call Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.bookGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="calendar" size={22} color={COLORS.textWhite} />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  imageArea: { height: 200, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
  brand: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: '700' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  ratingNum: { fontSize: 14, color: COLORS.textLight, marginLeft: 4 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 12 },
  description: { fontSize: 15, color: COLORS.textMedium, lineHeight: 24 },

  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  featureText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  calculatorCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, ...SHADOWS.small },
  calcSub: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  calcInput: { flex: 1 },
  calcLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  calcField: { backgroundColor: COLORS.inputBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  calcTotal: { fontSize: 14, fontWeight: '800', color: COLORS.success, marginTop: 6 },
  orText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  rateCards: { flexDirection: 'row', gap: 12 },
  rateCard: { flex: 1, backgroundColor: COLORS.primaryPale, borderRadius: 12, padding: 14, alignItems: 'center' },
  rateAmount: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  rateLabel: { fontSize: 13, color: COLORS.textMedium, marginTop: 4 },

  ownerCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, ...SHADOWS.small },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ownerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  ownerName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: COLORS.textLight },
  callSmallBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  bookBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  bookGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  bookBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textWhite },
});
