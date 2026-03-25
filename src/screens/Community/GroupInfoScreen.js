/**
 * GroupInfoScreen — WhatsApp-like group info/members/settings.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

function MemberRow({ member, isMe, isAdmin, myRole, onMessage, onRemove }) {
  return (
    <View style={styles.memberRow}>
      {member.user?.avatar ? (
        <Image source={{ uri: member.user.avatar }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatar, { backgroundColor: '#43A047', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {(member.user?.name || '?')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{isMe ? 'You' : (member.user?.name || 'Unknown')}</Text>
          {member.role === 'ADMIN' && (
            <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
          )}
        </View>
        {member.user?.statusQuote ? (
          <Text style={styles.memberStatus} numberOfLines={1}>"{member.user.statusQuote}"</Text>
        ) : (
          <Text style={styles.memberStatus}>
            {member.user?.isOnline ? '🟢 Online' : 'Farmer'}
          </Text>
        )}
      </View>
      {!isMe && (
        <View style={styles.memberActions}>
          <TouchableOpacity style={styles.memberActionBtn} onPress={onMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          {myRole === 'ADMIN' && !isAdmin && (
            <TouchableOpacity style={styles.memberActionBtn} onPress={onRemove}>
              <Ionicons name="person-remove-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function GroupInfoScreen({ navigation, route }) {
  const { group: initialGroup } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(initialGroup);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/groups/${initialGroup.id}`).then(({ data }) => {
      setGroup(data.data);
    }).finally(() => setLoading(false));
  }, [initialGroup.id]);

  const myMember = group.members?.find((m) => m.userId === user?.id);
  const myRole = myMember?.role;

  const handleLeave = () => {
    Alert.alert('Leave Group', `Leave "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/groups/${group.id}/leave`);
            navigation.popToTop();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error?.message || 'Could not leave group');
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (memberId) => {
    Alert.alert('Remove Member', 'Remove this member from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/groups/${group.id}/members/${memberId}`);
            setGroup((prev) => ({
              ...prev,
              members: prev.members.filter((m) => m.userId !== memberId),
            }));
          } catch (e) { /* ignore */ }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#1A237E', '#283593']} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {group.avatar ? (
            <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
          ) : (
            <View style={[styles.groupAvatar, { backgroundColor: '#43A047', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 40, color: '#fff', fontWeight: '900' }}>
                {(group.name || 'G')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>
            Group · {group.members?.length || group.memberCount || 0} members
          </Text>
          {group.district && (
            <View style={styles.locationBadge}>
              <Ionicons name="location-outline" size={13} color="#fff" />
              <Text style={styles.locationText}>{group.district}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Description */}
        {group.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <Text style={styles.descText}>{group.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{group.members?.length || group.memberCount || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{group.isPublic ? 'Public' : 'Private'}</Text>
            <Text style={styles.statLabel}>Privacy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{new Date(group.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MEMBERS ({group.members?.length || 0})</Text>
          {(group.members || []).map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.userId === user?.id}
              isAdmin={member.role === 'ADMIN'}
              myRole={myRole}
              onMessage={() => navigation.navigate('DirectChat', { partner: member.user })}
              onRemove={() => handleRemoveMember(member.userId)}
            />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Ionicons name="exit-outline" size={20} color={COLORS.error} />
            <Text style={styles.leaveBtnText}>Leave Group</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EE' },

  hero: { alignItems: 'center', paddingBottom: 24, paddingTop: 10, position: 'relative' },
  backBtn: { position: 'absolute', top: 14, left: 16, padding: 4 },
  groupAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff', marginTop: 8, marginBottom: 12 },
  groupName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  groupMeta: { fontSize: 13, color: '#C5CAE9', marginTop: 4 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#00000030', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  locationText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  section: { backgroundColor: '#fff', marginBottom: 8, padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1.2, marginBottom: 12 },
  descText: { fontSize: 15, color: '#333', lineHeight: 22 },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#1A237E' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  memberAvatar: { width: 46, height: 46, borderRadius: 23 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#111' },
  memberStatus: { fontSize: 13, color: '#888', marginTop: 2 },
  adminBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  adminBadgeText: { fontSize: 11, color: '#388E3C', fontWeight: '700' },
  memberActions: { flexDirection: 'row', gap: 4 },
  memberActionBtn: { padding: 6 },

  actionsSection: { backgroundColor: '#fff', margin: 8, borderRadius: 12, overflow: 'hidden' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderWidth: 1.5, borderColor: COLORS.error + '40', borderRadius: 12, margin: 12 },
  leaveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.error },
});
