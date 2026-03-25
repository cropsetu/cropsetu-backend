/**
 * DirectChatScreen — WhatsApp-like 1-on-1 chat.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

function fmtTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Avatar({ avatar, name, size = 40 }) {
  if (avatar) return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  const initials = (name || '?')[0].toUpperCase();
  const colors = ['#1A237E', '#B71C1C', '#4A148C', '#004D40', '#E65100', '#1B5E20'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

function MessageBubble({ msg, isMe }) {
  const readIcon = isMe && msg.readAt
    ? <Ionicons name="checkmark-done" size={13} color="#53BDEB" />
    : isMe
      ? <Ionicons name="checkmark-done" size={13} color="#999" />
      : null;

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {msg.imageUrl ? (
          <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
        ) : null}
        {msg.text ? <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{msg.text}</Text> : null}
        <View style={styles.msgMeta}>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{fmtTime(msg.createdAt)}</Text>
          {readIcon}
        </View>
      </View>
    </View>
  );
}

export default function DirectChatScreen({ navigation, route }) {
  // Support both { partner: {...} } and legacy flat { userId, name, avatar } params
  const rawPartner = route.params?.partner;
  const partner = rawPartner ?? {
    id:          route.params?.userId || route.params?.id,
    name:        route.params?.name,
    avatar:      route.params?.avatar,
    statusQuote: route.params?.statusQuote,
    isOnline:    route.params?.isOnline,
    lastSeenAt:  route.params?.lastSeenAt,
  };

  const partnerId = partner?.id || null;

  const { user } = useAuth();

  // ── All hooks declared unconditionally (Rules of Hooks) ──────────────────
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(partner?.isOnline || false);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const socketRef = useRef(null);

  // Load existing messages
  useEffect(() => {
    if (!partnerId) return;
    api.get(`/messages/${partnerId}`).then(({ data }) => {
      setMessages(data.data?.messages || []);
    }).catch(() => {});
  }, [partnerId]);

  // Socket
  useEffect(() => {
    if (!partnerId) return;
    let mounted = true;
    (async () => {
      const socket = await connectSocket();
      if (!socket || !mounted) return;
      socketRef.current = socket;

      socket.on('dm_new_message', (msg) => {
        if (!mounted) return;
        if (msg.senderId === partnerId || msg.senderId === user?.id) {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === msg.id);
            return exists ? prev : [...prev, msg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      });

      socket.on('dm_typing_update', ({ senderId, isTyping: typing }) => {
        if (!mounted || senderId !== partnerId) return;
        setIsTyping(typing);
      });

      socket.on('dm_read_receipt', ({ by }) => {
        if (!mounted || by !== partnerId) return;
        setMessages((prev) =>
          prev.map((m) => m.senderId === user?.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)
        );
      });

      socket.on('user_online', ({ userId }) => {
        if (userId === partnerId) setPartnerOnline(true);
      });
      socket.on('user_offline', ({ userId }) => {
        if (userId === partnerId) setPartnerOnline(false);
      });

      // Mark messages as read
      socket.emit('dm_read', { senderId: partnerId });
    })();

    return () => {
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        socket.off('dm_new_message');
        socket.off('dm_typing_update');
        socket.off('dm_read_receipt');
        socket.off('user_online');
        socket.off('user_offline');
      }
    };
  }, [partnerId, user?.id]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !partnerId) return;
    setSending(true);
    setText('');

    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit('dm_send', { receiverId: partnerId, text: trimmed });
    } else {
      try {
        const { data } = await api.post(`/messages/${partnerId}`, { text: trimmed });
        setMessages((prev) => [...prev, data.data]);
      } catch (e) { /* ignore */ }
    }

    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, sending, partnerId]);

  const handleTyping = useCallback((val) => {
    setText(val);
    const socket = socketRef.current || getSocket();
    if (!socket || !partnerId) return;
    socket.emit('dm_typing', { receiverId: partnerId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('dm_typing', { receiverId: partnerId, isTyping: false });
    }, 1500);
  }, [partnerId]);

  // ── Guard: render after all hooks ────────────────────────────────────────
  if (!partnerId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerName}>Chat</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 16 }}>Could not open chat.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group by date
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg, i) => {
    const label = fmtDate(msg.createdAt);
    if (label !== lastDate) {
      grouped.push({ type: 'date', id: `d-${i}`, label });
      lastDate = label;
    }
    grouped.push(msg);
  });

  const lastSeen = partner?.lastSeenAt
    ? `last seen ${new Date(partner.lastSeenAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Avatar avatar={partner?.avatar} name={partner?.name} size={40} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headerName}>{partner?.name || 'Farmer'}</Text>
            <Text style={styles.headerSub}>
              {isTyping ? 'typing...' : partnerOnline ? 'online' : lastSeen}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="call" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={grouped}
          keyExtractor={(item) => item.id || item.label}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return <View style={styles.dateDivider}><Text style={styles.dateDividerText}>{item.label}</Text></View>;
            }
            return <MessageBubble msg={item} isMe={item.senderId === user?.id} />;
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Avatar avatar={partner?.avatar} name={partner?.name} size={80} />
              <Text style={styles.emptyChatName}>{partner?.name}</Text>
              {partner?.statusQuote ? (
                <Text style={styles.emptyChatStatus}>"{partner.statusQuote}"</Text>
              ) : null}
              <Text style={styles.emptyChatHint}>Say hi to start a conversation 👋</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#999"
              value={text}
              onChangeText={handleTyping}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const WA_BG     = '#EDE8DA';    // warm parchment — earthy feel
const WA_HEADER = '#1A237E';    // deep indigo — community brand
const WA_SENT   = '#E8F5E9';    // soft mint green — sent bubbles
const WA_RECV   = '#FFFFFF';    // white — received bubbles

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WA_BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WA_HEADER, paddingHorizontal: 8, paddingVertical: 10,
  },
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#C5CAE9' },   // light indigo tint
  headerBtn: { padding: 6, marginLeft: 4 },

  list: { flex: 1 },
  listContent: { padding: 10, paddingBottom: 4 },

  dateDivider: { alignItems: 'center', marginVertical: 10 },
  dateDividerText: { backgroundColor: '#00000018', color: '#555', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },

  msgRow: { flexDirection: 'row', marginVertical: 2 },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  bubbleThem: { backgroundColor: WA_RECV, borderTopLeftRadius: 0 },
  bubbleMe: { backgroundColor: WA_SENT, borderTopRightRadius: 0 },
  msgImage: { width: 200, height: 160, borderRadius: 6, marginBottom: 4 },
  msgText: { fontSize: 15, color: '#111', lineHeight: 21 },
  msgTextMe: { color: '#111' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  msgTime: { fontSize: 11, color: '#999' },
  msgTimeMe: { color: '#607D8B' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F0F0F0', padding: 6, gap: 8 },
  inputWrap: { flex: 1, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 120, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  input: { fontSize: 15, color: '#111', padding: 0 },
  sendBtn: { backgroundColor: '#43A047', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CCC' },

  emptyChat: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyChatName: { fontSize: 22, fontWeight: '800', color: '#333' },
  emptyChatStatus: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  emptyChatHint: { fontSize: 14, color: '#888' },
});
