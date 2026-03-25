/**
 * GroupChatScreen — WhatsApp-like group chat.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

// ── Time formatter ─────────────────────────────────────────────────────────────
function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ avatar, name, size = 32 }) {
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

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar }) {
  if (msg.type === 'system') {
    return (
      <View style={styles.systemMsgWrap}>
        <Text style={styles.systemMsg}>{msg.text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      {!isMe && showAvatar ? (
        <Avatar avatar={msg.sender?.avatar} name={msg.sender?.name} size={28} />
      ) : !isMe ? <View style={{ width: 28 }} /> : null}

      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && showAvatar && (
          <Text style={styles.senderName}>{msg.sender?.name || 'Unknown'}</Text>
        )}
        {msg.imageUrl ? (
          <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
        ) : null}
        {msg.text ? <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{msg.text}</Text> : null}
        <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{fmtTime(msg.createdAt)}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GroupChatScreen({ navigation, route }) {
  const { group: initialGroup } = route.params;
  const { user } = useAuth();

  const [group, setGroup] = useState(initialGroup);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(initialGroup.isMember ?? false);
  const [joining, setJoining] = useState(false);

  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const socketRef = useRef(null);

  // Load group detail + messages
  const loadGroup = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${group.id}`);
      setGroup(data.data);
      setIsMember(!!data.data.isMember);
    } catch (e) { /* ignore */ }
  }, [group.id]);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${group.id}/messages`);
      setMessages(data.data || []);
    } catch (e) { /* ignore */ }
  }, [group.id]);

  useEffect(() => {
    loadGroup();
    if (isMember) loadMessages();
  }, [isMember]);

  // Socket setup
  useEffect(() => {
    let mounted = true;

    (async () => {
      const socket = await connectSocket();
      if (!socket || !mounted) return;
      socketRef.current = socket;

      if (isMember) {
        socket.emit('join_group', { groupId: group.id });

        socket.on('group_history', (msgs) => {
          if (mounted) setMessages(msgs);
        });

        socket.on('group_new_message', (msg) => {
          if (mounted) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        });

        socket.on('group_typing_update', ({ userId, isTyping }) => {
          if (!mounted || userId === user?.id) return;
          setTypingUsers((prev) =>
            isTyping ? [...new Set([...prev, userId])] : prev.filter((id) => id !== userId)
          );
        });
      }
    })();

    return () => {
      mounted = false;
      const socket = socketRef.current;
      if (socket) {
        socket.off('group_history');
        socket.off('group_new_message');
        socket.off('group_typing_update');
        socket.emit('leave_group_room', { groupId: group.id });
      }
    };
  }, [isMember, group.id, user?.id]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');

    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit('group_message', { groupId: group.id, text: trimmed });
    } else {
      try {
        const { data } = await api.post(`/groups/${group.id}/messages`, { text: trimmed });
        setMessages((prev) => [...prev, data.data]);
      } catch (e) { /* ignore */ }
    }

    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, sending, group.id]);

  const handleTyping = useCallback((val) => {
    setText(val);
    const socket = socketRef.current || getSocket();
    if (!socket) return;
    socket.emit('group_typing', { groupId: group.id, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('group_typing', { groupId: group.id, isTyping: false });
    }, 1500);
  }, [group.id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/groups/${group.id}/join`);
      setIsMember(true);
      await loadGroup();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error?.message || 'Could not join');
    } finally {
      setJoining(false);
    }
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg, i) => {
    const dateLabel = fmtDate(msg.createdAt);
    if (dateLabel !== lastDate) {
      groupedMessages.push({ type: 'date', id: `date-${i}`, label: dateLabel });
      lastDate = dateLabel;
    }
    const prevMsg = messages[i - 1];
    const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.type === 'system';
    groupedMessages.push({ ...msg, showAvatar });
  });

  const memberCount = group.members?.length || group.memberCount || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfo}
            onPress={() => navigation.navigate('GroupInfo', { group })}
          >
            {group.avatar ? (
              <Image source={{ uri: group.avatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: '#43A047', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                  {(group.name || 'G')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{group.name}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {memberCount} members
                {typingUsers.length > 0 ? ' · typing...' : ''}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('GroupInfo', { group })}>
            <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {isMember ? (
          <FlatList
            ref={flatListRef}
            data={groupedMessages}
            keyExtractor={(item) => item.id || item.label}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return <View style={styles.dateDivider}><Text style={styles.dateDividerText}>{item.label}</Text></View>;
              }
              return (
                <MessageBubble
                  msg={item}
                  isMe={item.senderId === user?.id}
                  showAvatar={item.showAvatar}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Say hello! 👋</Text>
              </View>
            }
          />
        ) : (
          <View style={styles.notMemberBanner}>
            <Ionicons name="lock-closed-outline" size={40} color="#888" />
            <Text style={styles.notMemberTitle}>Join to chat</Text>
            <Text style={styles.notMemberText}>{group.description || 'Join this group to see and send messages.'}</Text>
            <TouchableOpacity
              style={[styles.joinBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin}
              disabled={joining}
            >
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join Group'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>Someone is typing...</Text>
          </View>
        )}

        {/* Input bar */}
        {isMember && (
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const WA_BG     = '#EDE8DA';   // warm parchment
const WA_HEADER = '#1A237E';   // deep indigo
const WA_SENT   = '#E8F5E9';   // soft mint (sent bubbles)
const WA_RECV = '#FFFFFF';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WA_BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WA_HEADER, paddingHorizontal: 8, paddingVertical: 10,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#B2DFDB', marginTop: 1 },

  messageList: { flex: 1 },
  messageContent: { padding: 10, paddingBottom: 4 },

  dateDivider: { alignItems: 'center', marginVertical: 12 },
  dateDividerText: {
    backgroundColor: '#00000020', color: '#555', fontSize: 12,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },

  systemMsgWrap: { alignItems: 'center', marginVertical: 6 },
  systemMsg: { backgroundColor: '#00000018', color: '#555', fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2, gap: 6 },
  msgRowMe: { flexDirection: 'row-reverse', gap: 0 },

  bubble: {
    maxWidth: '75%', borderRadius: 8, padding: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  bubbleThem: { backgroundColor: WA_RECV, borderTopLeftRadius: 0 },
  bubbleMe: { backgroundColor: WA_SENT, borderTopRightRadius: 0 },

  senderName: { fontSize: 12, fontWeight: '700', color: '#3949AB', marginBottom: 3 },
  msgImage: { width: 200, height: 160, borderRadius: 6, marginBottom: 4 },
  msgText: { fontSize: 15, color: '#111', lineHeight: 21 },
  msgTextMe: { color: '#111' },
  msgTime: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 3 },
  msgTimeMe: { color: '#607D8B' },

  notMemberBanner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  notMemberTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  notMemberText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  joinBtn: { backgroundColor: '#1A237E', borderRadius: 24, paddingHorizontal: 36, paddingVertical: 14, marginTop: 8 },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  typingBar: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: '#3949AB', fontStyle: 'italic' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#F0F0F0', padding: 6, gap: 8,
  },
  inputWrap: {
    flex: 1, backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 8, maxHeight: 120,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  input: { fontSize: 15, color: '#111', padding: 0 },
  sendBtn: { backgroundColor: '#43A047', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CCC' },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 14, color: '#888' },
});
