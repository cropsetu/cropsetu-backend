import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import { CROPS } from '../../constants/mockData';

function CropCard({ crop, onPress }) {
  return (
    <TouchableOpacity style={styles.cropCard} onPress={() => onPress(crop)} activeOpacity={0.88}>
      <View style={styles.cropCardInner}>
        <Text style={styles.cropIcon}>{crop.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cropName}>{crop.name}</Text>
          <Text style={styles.cropNameHi}>{crop.nameHi}</Text>
          <View style={styles.cropMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar" size={12} color={COLORS.primary} />
              <Text style={styles.metaText}>{crop.season}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cropArrow}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </View>
      </View>
      <View style={styles.cropInfo}>
        <View style={styles.cropInfoItem}>
          <Text style={styles.cropInfoLabel}>Sowing</Text>
          <Text style={styles.cropInfoValue}>{crop.sowingMonth}</Text>
        </View>
        <View style={styles.cropInfoDivider} />
        <View style={styles.cropInfoItem}>
          <Text style={styles.cropInfoLabel}>Duration</Text>
          <Text style={styles.cropInfoValue}>{crop.duration}</Text>
        </View>
        <View style={styles.cropInfoDivider} />
        <View style={styles.cropInfoItem}>
          <Text style={styles.cropInfoLabel}>Harvest</Text>
          <Text style={styles.cropInfoValue}>{crop.harvestMonth}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CropCalendar({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCrops = CROPS.filter(c =>
    !searchQuery ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nameHi.includes(searchQuery)
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCrops}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Banner */}
            <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.banner}>
              <Ionicons name="leaf" size={40} color={COLORS.primaryPale} />
              <Text style={styles.bannerTitle}>Crop Calendar</Text>
              <Text style={styles.bannerSub}>Personalized growing schedule for your crop</Text>
            </LinearGradient>

            {/* Seasonal Guide */}
            <View style={styles.seasonSection}>
              <Text style={styles.sectionTitle}>Current Season Guide</Text>
              <View style={styles.seasonCards}>
                <View style={[styles.seasonCard, { backgroundColor: '#E8F5EC' }]}>
                  <Text style={styles.seasonEmoji}>🌧️</Text>
                  <Text style={styles.seasonName}>Kharif</Text>
                  <Text style={styles.seasonMonths}>Jun - Sep</Text>
                  <Text style={styles.seasonCrops}>Rice, Cotton, Soybean</Text>
                </View>
                <View style={[styles.seasonCard, { backgroundColor: '#FFF8E1' }]}>
                  <Text style={styles.seasonEmoji}>☀️</Text>
                  <Text style={styles.seasonName}>Rabi</Text>
                  <Text style={styles.seasonMonths}>Oct - Mar</Text>
                  <Text style={styles.seasonCrops}>Wheat, Mustard, Gram</Text>
                </View>
                <View style={[styles.seasonCard, { backgroundColor: '#E8F4FD' }]}>
                  <Text style={styles.seasonEmoji}>🌸</Text>
                  <Text style={styles.seasonName}>Zaid</Text>
                  <Text style={styles.seasonMonths}>Mar - Jun</Text>
                  <Text style={styles.seasonCrops}>Watermelon, Moong</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Select Your Crop</Text>
          </>
        }
        renderItem={({ item }) => (
          <CropCard crop={item} onPress={crop => navigation.navigate('CropDetail', { crop, cropName: crop.name })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 30 },

  banner: { padding: 28, alignItems: 'center', gap: 8 },
  bannerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textWhite },
  bannerSub: { fontSize: 14, color: COLORS.primaryPale, textAlign: 'center' },

  seasonSection: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 14, paddingHorizontal: 16 },
  seasonCards: { flexDirection: 'row', gap: 10 },
  seasonCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  seasonEmoji: { fontSize: 24 },
  seasonName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  seasonMonths: { fontSize: 11, color: COLORS.textLight },
  seasonCrops: { fontSize: 10, color: COLORS.textMedium, textAlign: 'center', lineHeight: 14 },

  cropCard: { backgroundColor: COLORS.surface, borderRadius: 18, marginHorizontal: 16, overflow: 'hidden', ...SHADOWS.small },
  cropCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  cropIcon: { fontSize: 40 },
  cropName: { fontSize: 19, fontWeight: '800', color: COLORS.textDark },
  cropNameHi: { fontSize: 14, color: COLORS.textMedium, fontWeight: '600', marginTop: 3 },
  cropMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  cropArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center' },

  cropInfo: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.divider },
  cropInfoItem: { flex: 1, padding: 12, alignItems: 'center' },
  cropInfoLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  cropInfoValue: { fontSize: 12, color: COLORS.textDark, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  cropInfoDivider: { width: 1, backgroundColor: COLORS.divider },
});
