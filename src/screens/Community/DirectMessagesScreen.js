/**
 * DirectMessagesScreen — conversation list.
 * API returns flat: { partnerId, partnerName, partnerAvatar, partnerOnline,
 *                     partnerStatusQuote, partnerLastSeen, lastMessage, unreadCount }
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';

// WhatsApp-inspired white theme
const COMM_PRIMARY = '#1B5E20';   // FarmEasy brand green
const COMM_BADGE   = '#25D366';   // WhatsApp green for badges / online
const WA_DARK      = '#111111';
const WA_GRAY      = '#54656F';

// Avatar initials colours — earthy + vibrant variety (not just greens)
const AVATAR_COLORS = ['#1A237E', '#B71C1C', '#4A148C', '#004D40', '#E65100', '#1B5E20', '#880E4F'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Avatar({ uri, name, size = 50, isOnline }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const bg = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.34 }}>{initials}</Text>
        </View>
      )}
      {isOnline && (
        <View style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 13, height: 13, borderRadius: 7,
          backgroundColor: COMM_BADGE, borderWidth: 2, borderColor: '#fff',
        }} />
      )}
    </View>
  );
}

// ── Conversation Row ───────────────────────────────────────────────────────────
function ConversationRow({ item, onPress }) {
  const name        = item.partnerName    || 'Farmer';
  const avatar      = item.partnerAvatar;
  const isOnline    = item.partnerOnline  || false;
  const statusQuote = item.partnerStatusQuote;
  const unread      = item.unreadCount    || 0;
  const lastMsg     = item.lastMessage;
  const preview     = lastMsg?.imageUrl ? '📷 Photo' : (lastMsg?.text || 'Say hi!');
  const isFromMe    = lastMsg?.receiverId === item.partnerId;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Avatar uri={avatar} name={name} size={50} isOnline={isOnline} />
      <View style={styles.rowInfo}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.rowTime, unread > 0 && styles.rowTimeUnread]}>
            {fmtTime(lastMsg?.createdAt)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.rowPreview, unread > 0 && styles.rowPreviewBold]} numberOfLines={1}>
            {isFromMe ? `You: ${preview}` : preview}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        {statusQuote ? (
          <Text style={styles.statusQuote} numberOfLines={1}>"{statusQuote}"</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function DirectMessagesScreen({ navigation }) {
  const [convos,     setConvos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConvos = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConvos(data.data || []);
    } catch (e) {
      console.warn('fetchConvos:', e?.message);
    }
  }, []);

  useEffect(() => {
    fetchConvos().finally(() => setLoading(false));

    (async () => {
      const socket = await connectSocket();
      if (!socket) return;

      socket.on('user_online', ({ userId }) => {
        setConvos((prev) =>
          prev.map((c) => c.partnerId === userId ? { ...c, partnerOnline: true } : c)
        );
      });
      socket.on('user_offline', ({ userId }) => {
        setConvos((prev) =>
          prev.map((c) => c.partnerId === userId ? { ...c, partnerOnline: false } : c)
        );
      });
      socket.on('dm_new_message', () => fetchConvos());
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConvos();
    setRefreshing(false);
  };

  const openChat = (item) => {
    navigation.navigate('DirectChat', {
      partner: {
        id:          item.partnerId,
        name:        item.partnerName,
        avatar:      item.partnerAvatar,
        statusQuote: item.partnerStatusQuote,
        isOnline:    item.partnerOnline,
        lastSeenAt:  item.partnerLastSeen,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={WA_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('NewChat')}>
          <Ionicons name="create-outline" size={22} color={WA_GRAY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COMM_PRIMARY} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={convos}
            keyExtractor={(item) => item.partnerId || String(Math.random())}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COMM_PRIMARY]}
                tintColor={COMM_PRIMARY}
              />
            }
            renderItem={({ item }) => (
              <ConversationRow item={item} onPress={() => openChat(item)} />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={72} color="#D6D3D1" />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptyText}>Tap the compose button to start chatting!</Text>
              </View>
            }
          />

          {/* Compose FAB — start a new conversation */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('NewChat')}
            activeOpacity={0.85}
          >
            <Ionicons name="create" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { padding: 6 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: WA_DARK },
  headerBtn:   { padding: 6 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
  },
  rowInfo:  { flex: 1 },
  rowTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  rowName:  { flex: 1, fontSize: 16, fontWeight: '700', color: WA_DARK, marginRight: 8 },
  rowTime:  { fontSize: 12, color: WA_GRAY },
  rowTimeUnread: { color: COMM_BADGE, fontWeight: '700' },

  rowBottom:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowPreview:     { flex: 1, fontSize: 14, color: WA_GRAY, marginRight: 8 },
  rowPreviewBold: { color: WA_DARK, fontWeight: '600' },
  statusQuote:    { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },

  badge: {
    backgroundColor: COMM_BADGE, borderRadius: 12,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  sep: { height: 0.7, backgroundColor: '#F5F5F4', marginLeft: 80 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#57534E' },
  emptyText:  { fontSize: 14, color: '#A8A29E', textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});
