/**
 * MyAnimalListingsScreen — shows the user's own animal listings
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

const GREEN  = '#2D9162';
const BG     = '#F4F6F9';
const CARD   = '#FFFFFF';
const BORDER = '#E8EAED';
const MUTED  = '#6B7280';

function ListingCard({ item, onDelete }) {
  const firstImg = item.images?.[0];
  const price    = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
  const date     = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        {firstImg ? (
          <Image source={{ uri: firstImg }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="paw-outline" size={28} color={MUTED} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.animalName} numberOfLines={1}>
            {item.animal} — {item.breed}
          </Text>
          <Text style={styles.detail}>{item.age} · {item.gender}</Text>
          <Text style={styles.location} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={MUTED} /> {item.sellerLocation}
          </Text>
          <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="eye-outline" size={13} color={MUTED} />
          <Text style={styles.footerTxt}>{item.viewCount ?? 0} views</Text>
          <Text style={[styles.footerTxt, { marginLeft: 10 }]}>{date}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Remove Listing', 'Are you sure you want to delete this listing?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
            ])
          }
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyAnimalListingsScreen({ navigation }) {
  const [listings,   setListings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchListings = useCallback(async (refresh = false) => {
    try {
      setError(null);
      const { data } = await api.get('/animals/my');
      setListings(data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to load listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Refresh on focus so a newly-posted listing shows up immediately
  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const handleRefresh = () => { setRefreshing(true); fetchListings(true); };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/animals/${id}`);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      Alert.alert('Error', 'Could not delete listing. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AnimalTrade', { screen: 'AddAnimalListing' })}
        >
          <Ionicons name="add" size={24} color={GREEN} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchListings()}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => <ListingCard item={item} onDelete={handleDelete} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[GREEN]} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="paw-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to list an animal for sale</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { marginTop: 12 }]}
                onPress={() => navigation.navigate('AnimalTrade', { screen: 'AddAnimalListing' })}
              >
                <Text style={styles.retryTxt}>Add Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#1E293B' },
  addBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardInner: { flexDirection: 'row', padding: 14 },
  thumb:     { width: 72, height: 72, borderRadius: 10, backgroundColor: '#F3F4F6' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },

  animalName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 3 },
  detail:     { fontSize: 12, color: MUTED, marginBottom: 2 },
  location:   { fontSize: 12, color: MUTED, marginBottom: 4 },
  price:      { fontSize: 16, fontWeight: '800', color: GREEN },

  footer:      { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 14, paddingVertical: 10 },
  footerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  footerTxt:   { fontSize: 12, color: MUTED },
  deleteBtn:   { padding: 6 },

  errorTxt: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
  retryBtn: { backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  emptyTitle:    { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 4 },
});
