import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function AnimalDetail({ route, navigation }) {
  const { listing } = route.params;

  const handleCall = () => {
    Linking.openURL(`tel:${listing.sellerPhone}`).catch(() =>
      Alert.alert('Error', 'Could not open phone app.')
    );
  };

  const handleChat = () => {
    navigation.navigate('Chat', {
      listingId: listing.id,
      sellerName: listing.sellerName,
      sellerId: listing.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Animal Image */}
        <LinearGradient colors={[COLORS.primaryLight + '60', COLORS.primaryPale]} style={styles.imageArea}>
          <Ionicons name="paw" size={90} color={COLORS.primary} />
          {listing.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.textWhite} />
              <Text style={styles.verifiedText}>Seller Verified</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {/* Title & Price */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.animalName}>{listing.animal} - {listing.breed}</Text>
              <Text style={styles.animalNameHi}>{listing.animalHi}</Text>
            </View>
            <Text style={styles.price}>₹{listing.price.toLocaleString()}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {listing.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Animal Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Animal Details</Text>
            <View style={styles.detailsGrid}>
              <InfoRow icon="male-female" label="Gender" value={listing.gender} />
              <InfoRow icon="time" label="Age" value={listing.age} />
              <InfoRow icon="barbell" label="Weight" value={listing.weight} />
              {listing.milkYield !== 'N/A' && (
                <InfoRow icon="water" label="Milk Yield" value={listing.milkYield} />
              )}
              <InfoRow icon="medkit" label="Vaccinated" value={listing.vaccinated ? 'Yes ✓' : 'Not mentioned'} />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Seller Info */}
          <View style={styles.sellerCard}>
            <Text style={styles.sectionTitle}>Seller Information</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerAvatarText}>{listing.sellerAvatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{listing.sellerName}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={COLORS.textLight} />
                  <Text style={styles.locationText}>{listing.sellerLocation}</Text>
                </View>
                <Text style={styles.postedDate}>Posted {listing.postedDate}</Text>
              </View>
              {listing.verified && (
                <View style={styles.verifiedSmall}>
                  <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                </View>
              )}
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.tipsCard}>
            <Ionicons name="warning" size={18} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipsTitle}>Safety Tips</Text>
              <Text style={styles.tipsText}>• Visit and physically inspect the animal before buying{'\n'}• Ask for vaccination certificate{'\n'}• Transfer payment only after receiving animal{'\n'}• FarmEasy is not responsible for transactions</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={22} color={COLORS.primary} />
          <Text style={styles.callBtnText}>Call Seller</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.chatGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="chatbubbles" size={22} color={COLORS.textWhite} />
            <Text style={styles.chatBtnText}>Chat with Seller</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  imageArea: { height: 220, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  verifiedBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedText: { color: COLORS.textWhite, fontSize: 13, fontWeight: '700' },

  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  animalName: { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
  animalNameHi: { fontSize: 16, color: COLORS.textMedium, fontWeight: '600', marginTop: 4 },
  price: { fontSize: 24, fontWeight: '900', color: COLORS.primary },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 14 },
  detailsGrid: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 4, ...SHADOWS.small },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '500' },
  infoValue: { fontSize: 15, color: COLORS.textDark, fontWeight: '700', marginTop: 2 },

  description: { fontSize: 15, color: COLORS.textMedium, lineHeight: 24 },

  sellerCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sellerInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { fontSize: 18, fontWeight: '800', color: COLORS.textWhite },
  sellerName: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: COLORS.textLight },
  postedDate: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  verifiedSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5EC', justifyContent: 'center', alignItems: 'center' },

  tipsCard: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF8E1', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.warning + '60' },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  tipsText: { fontSize: 13, color: COLORS.textMedium, lineHeight: 22 },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  chatBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  chatGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  chatBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textWhite },
});
