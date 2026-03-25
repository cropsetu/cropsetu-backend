/**
 * GroupsScreen — WhatsApp-like group list with discover + my groups tabs.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Avatar helper ─────────────────────────────────────────────────────────────
function GroupAvatar({ avatar, name, size = 54 }) {
  if (avatar) {
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initials = (name || 'G').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#1A237E', '#B71C1C', '#4A148C', '#004D40', '#E65100', '#1B5E20', '#880E4F'];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ group, onPress, showJoin, onJoin, joining }) {
  const timeStr = group.lastMessageAt
    ? new Date(group.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
      <GroupAvatar avatar={group.avatar} name={group.name} size={54} />
      <View style={styles.groupInfo}>
        <View style={styles.groupTopRow}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.groupTime}>{timeStr}</Text>
        </View>
        <View style={styles.groupBottomRow}>
          <Text style={styles.groupLastMsg} numberOfLines={1}>
            {group.lastMessage || group.description || 'No messages yet'}
          </Text>
          {showJoin ? (
            <TouchableOpacity
              style={[styles.joinBtn, joining && { opacity: 0.6 }]}
              onPress={onJoin}
              disabled={joining}
            >
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join'}</Text>
            </TouchableOpacity>
          ) : group.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{group.unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.groupMeta}>
          {group.memberCount} members
          {group.district ? ` · ${group.district}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GroupsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'discover'
  const [myGroups, setMyGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState({});

  const tabAnim = useRef(new Animated.Value(0)).current;

  const fetchMyGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/groups/my');
      setMyGroups(data.data || []);
    } catch (e) {
      console.warn('fetchMyGroups:', e.message);
    }
  }, []);

  const fetchAllGroups = useCallback(async () => {
    try {
      const params = {};
      if (user?.district) params.district = user.district;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/groups', { params });
      setAllGroups(data.data || []);
    } catch (e) {
      console.warn('fetchAllGroups:', e.message);
    }
  }, [user?.district, search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchMyGroups(), fetchAllGroups()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAllGroups, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyGroups(), fetchAllGroups()]);
    setRefreshing(false);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'my' ? 0 : 1,
      useNativeDriver: false,
    }).start();
  };

  const handleJoin = async (groupId) => {
    setJoining((p) => ({ ...p, [groupId]: true }));
    try {
      await api.post(`/groups/${groupId}/join`);
      await Promise.all([fetchMyGroups(), fetchAllGroups()]);
    } catch (e) {
      // ignore
    } finally {
      setJoining((p) => ({ ...p, [groupId]: false }));
    }
  };

  const tabIndicatorLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  const myGroupIds = new Set(myGroups.map((g) => g.id));
  const discoverGroups = allGroups.filter((g) => !myGroupIds.has(g.id));

  const currentData = activeTab === 'my' ? myGroups : discoverGroups;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      {/* Header */}
      <LinearGradient colors={['#1A237E', '#283593']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Ionicons name="add-circle-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab('my')}>
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            My Groups ({myGroups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab('discover')}>
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
        <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
      </View>

      {/* Group List */}
      <FlatList
        data={currentData}
        keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            showJoin={activeTab === 'discover'}
            joining={!!joining[item.id]}
            onJoin={() => handleJoin(item.id)}
            onPress={() => navigation.navigate('GroupChat', { group: item })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={72} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'my' ? 'No Groups Yet' : 'No Groups Found'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'my'
                ? 'Join a group or create your own!'
                : 'Try a different search or create a new group.'}
            </Text>
            {activeTab === 'my' && (
              <TouchableOpacity
                style={styles.createGroupBtn}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Text style={styles.createGroupBtnText}>+ Create Group</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EE' },

  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  createBtn: { padding: 4 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
    position: 'relative',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#1A237E', fontWeight: '800' },
  tabIndicator: {
    position: 'absolute', bottom: 0, width: '50%',
    height: 3, backgroundColor: '#1A237E', borderRadius: 2,
  },

  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
    backgroundColor: '#fff',
  },
  groupInfo: { flex: 1 },
  groupTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  groupName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111', marginRight: 8 },
  groupTime: { fontSize: 12, color: '#666' },
  groupBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupLastMsg: { flex: 1, fontSize: 14, color: '#666', marginRight: 8 },
  groupMeta: { fontSize: 11, color: '#AAA', marginTop: 3 },

  unreadBadge: {
    backgroundColor: '#1A237E', borderRadius: 12,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  joinBtn: {
    backgroundColor: '#1A237E', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 84 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  createGroupBtn: {
    backgroundColor: '#1A237E', borderRadius: 24,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  createGroupBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
