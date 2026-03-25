/**
 * NewChatScreen — browse all farmers and start a new 1-on-1 conversation.
 * Like WhatsApp's "New chat" contact picker.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const COMM_PRIMARY  = '#1A237E';
const COMM_MED      = '#283593';
const ONLINE_GREEN  = '#43A047';
const AVATAR_COLORS = ['#1A237E', '#B71C1C', '#4A148C', '#004D40', '#E65100', '#1B5E20', '#880E4F'];

function Avatar({ uri, name, size = 48, isOnline }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const bg = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.34 }}>{initials}</Text>
        </View>
      )}
      {isOnline && (
        <View style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 12, height: 12, borderRadius: 6,
          backgroundColor: ONLINE_GREEN, borderWidth: 2, borderColor: '#fff',
        }} />
      )}
    </View>
  );
}

function UserRow({ item, onPress }) {
  const name     = item.name || item.fullName || 'Farmer';
  const avatar   = item.avatar || item.profileImage;
  const district = item.district || item.location || item.village || '';
  const isOnline = item.isOnline || false;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Avatar uri={avatar} name={name} size={50} isOnline={isOnline} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {district ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#A8A29E" /> {district}
          </Text>
        ) : (
          <Text style={styles.rowSub}>Farmer</Text>
        )}
      </View>
      <View style={styles.msgBtn}>
        <Ionicons name="chatbubble-outline" size={20} color={COMM_PRIMARY} />
      </View>
    </TouchableOpacity>
  );
}

export default function NewChatScreen({ navigation }) {
  const { user } = useAuth();

  const [allUsers,  setAllUsers]  = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [query,     setQuery]     = useState('');
  const [loading,   setLoading]   = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      // Exclude self
      const others = (data.data || data || []).filter((u) => u.id !== user?.id && u._id !== user?.id);
      setAllUsers(others);
      setFiltered(others);
    } catch (e) {
      console.warn('NewChatScreen loadUsers:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSearch = (val) => {
    setQuery(val);
    const q = val.trim().toLowerCase();
    if (!q) { setFiltered(allUsers); return; }
    setFiltered(
      allUsers.filter((u) => {
        const name = (u.name || u.fullName || '').toLowerCase();
        const loc  = (u.district || u.location || u.village || '').toLowerCase();
        return name.includes(q) || loc.includes(q);
      })
    );
  };

  const openChat = (item) => {
    navigation.navigate('DirectChat', {
      partner: {
        id:     item.id || item._id,
        name:   item.name || item.fullName || 'Farmer',
        avatar: item.avatar || item.profileImage || null,
        statusQuote: item.statusQuote || item.bio || null,
        isOnline:    item.isOnline || false,
        lastSeenAt:  item.lastSeenAt || null,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COMM_PRIMARY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>New conversation</Text>
          <Text style={styles.headerSub}>{allUsers.length} farmers</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#A8A29E" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location…"
          placeholderTextColor="#A8A29E"
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#A8A29E" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COMM_PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={({ item }) => (
            <UserRow item={item} onPress={() => openChat(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#D6D3D1" />
              <Text style={styles.emptyTitle}>
                {query ? 'No farmers found' : 'No farmers yet'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? 'Try a different name or location'
                  : 'Farmers will appear here once they join FarmEasy'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EE' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COMM_PRIMARY,
    paddingHorizontal: 12, paddingVertical: 12, gap: 10,
  },
  backBtn:     { padding: 6 },
  headerText:  { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: '#C5CAE9', marginTop: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 14, marginVertical: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#1C1917', shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1917', padding: 0 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
  },
  rowInfo:  { flex: 1 },
  rowName:  { fontSize: 15, fontWeight: '700', color: '#1C1917', marginBottom: 2 },
  rowSub:   { fontSize: 13, color: '#A8A29E' },
  msgBtn:   { padding: 8 },

  sep: { height: 0.7, backgroundColor: '#F5F5F4', marginLeft: 80 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#57534E' },
  emptyText:  { fontSize: 14, color: '#A8A29E', textAlign: 'center', lineHeight: 22 },
});
