/**
 * RentBookingsScreen
 *
 * Two tabs:
 *  • "Received"  — booking requests on MY listings (owner view)
 *                  PENDING → Approve / Reject
 *                  CONFIRMED / CANCELLED / others → status badge only
 *  • "My Bookings" — bookings I have made as a customer
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Image, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const GREEN  = '#2D9162';
const ORANGE = '#E65100';
const RED    = '#E53935';
const BLUE   = '#1565C0';
const GREY   = '#757575';

// ── Status config (tKey resolved at render time) ──────────────────────────────
const STATUS_CONFIG = {
  PENDING:   { tKey: 'statusPending',   color: ORANGE, bg: '#FFF3E0', icon: 'time-outline'           },
  CONFIRMED: { tKey: 'statusApproved',  color: GREEN,  bg: '#E8F5E9', icon: 'checkmark-circle-outline'},
  ACTIVE:    { tKey: 'statusActive',    color: BLUE,   bg: '#E3F2FD', icon: 'play-circle-outline'     },
  COMPLETED: { tKey: 'statusCompleted', color: GREY,   bg: '#F5F5F5', icon: 'ribbon-outline'          },
  CANCELLED: { tKey: 'statusRejected',  color: RED,    bg: '#FFEBEE', icon: 'close-circle-outline'    },
};

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Booking card (received) ───────────────────────────────────────────────────
function ReceivedCard({ item, onApprove, onReject, loading, t }) {
  const listing = item.machineryListing || item.labourListing;
  const type    = item.machineryListing ? t('rent.typeMachinery') : t('rent.typeLabour');
  const st      = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
  const requester = item.user;

  return (
    <View style={S.card}>
      {/* Listing name + type */}
      <View style={S.cardHeader}>
        <View style={S.typeTag}>
          <Ionicons name={item.machineryListing ? 'construct-outline' : 'people-outline'} size={11} color={GREEN} />
          <Text style={S.typeTagTxt}>{type}</Text>
        </View>
        <View style={[S.statusBadge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[S.statusTxt, { color: st.color }]}>{t('rent.' + st.tKey)}</Text>
        </View>
      </View>

      <Text style={S.listingName} numberOfLines={1}>{listing?.name || '—'}</Text>

      {/* Requester */}
      <View style={S.requesterRow}>
        <View style={S.avatar}>
          {requester?.avatar
            ? <Image source={{ uri: requester.avatar }} style={S.avatarImg} />
            : <Text style={S.avatarTxt}>{(requester?.name || 'U')[0].toUpperCase()}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.requesterName}>{requester?.name || 'Unknown User'}</Text>
          {requester?.phone && <Text style={S.requesterPhone}>{requester.phone}</Text>}
        </View>
      </View>

      {/* Dates + amount */}
      <View style={S.detailsRow}>
        <View style={S.detailItem}>
          <Ionicons name="calendar-outline" size={13} color="#888" />
          <Text style={S.detailTxt}>{fmt(item.startDate)} → {fmt(item.endDate)}</Text>
        </View>
        <View style={S.detailItem}>
          <Ionicons name="time-outline" size={13} color="#888" />
          <Text style={S.detailTxt}>{item.days} {t('rent.day')}</Text>
        </View>
        <View style={S.detailItem}>
          <Ionicons name="cash-outline" size={13} color="#888" />
          <Text style={S.detailTxt}>₹{item.totalAmount?.toLocaleString()}</Text>
        </View>
      </View>

      {item.notes ? (
        <View style={S.notesRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={12} color="#aaa" />
          <Text style={S.notesTxt} numberOfLines={2}>{item.notes}</Text>
        </View>
      ) : null}

      {/* Actions for PENDING */}
      {item.status === 'PENDING' && (
        <View style={S.actionRow}>
          <TouchableOpacity
            style={[S.rejectBtn, loading === item.id && { opacity: 0.5 }]}
            onPress={() => onReject(item)}
            disabled={!!loading}
          >
            <Ionicons name="close" size={16} color={RED} />
            <Text style={S.rejectTxt}>{t('rent.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.approveBtn, loading === item.id && { opacity: 0.5 }]}
            onPress={() => onApprove(item)}
            disabled={!!loading}
          >
            {loading === item.id
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={S.approveTxt}>{t('rent.approve')}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── My booking card (customer view) ──────────────────────────────────────────
function MyBookingCard({ item, t }) {
  const listing = item.machineryListing || item.labourListing;
  const type    = item.machineryListing ? t('rent.typeMachinery') : t('rent.typeLabour');
  const st      = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
  const thumb   = item.machineryListing?.images?.[0] || item.labourListing?.image || null;

  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View style={S.typeTag}>
          <Ionicons name={item.machineryListing ? 'construct-outline' : 'people-outline'} size={11} color={GREEN} />
          <Text style={S.typeTagTxt}>{type}</Text>
        </View>
        <View style={[S.statusBadge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[S.statusTxt, { color: st.color }]}>{t('rent.' + st.tKey)}</Text>
        </View>
      </View>

      <View style={S.myBookingTop}>
        {thumb
          ? <Image source={{ uri: thumb }} style={S.myThumb} />
          : (
            <View style={[S.myThumb, { backgroundColor: GREEN + '15', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name={item.machineryListing ? 'construct-outline' : 'people-outline'} size={22} color={GREEN} />
            </View>
          )
        }
        <View style={{ flex: 1 }}>
          <Text style={S.listingName} numberOfLines={1}>{listing?.name || '—'}</Text>
          <Text style={S.listingLoc} numberOfLines={1}>{listing?.location || ''}</Text>
        </View>
      </View>

      <View style={S.detailsRow}>
        <View style={S.detailItem}>
          <Ionicons name="calendar-outline" size={13} color="#888" />
          <Text style={S.detailTxt}>{fmt(item.startDate)} → {fmt(item.endDate)}</Text>
        </View>
        <View style={S.detailItem}>
          <Ionicons name="cash-outline" size={13} color="#888" />
          <Text style={S.detailTxt}>₹{item.totalAmount?.toLocaleString()}</Text>
        </View>
      </View>

      {item.status === 'PENDING' && (
        <View style={S.waitingRow}>
          <Ionicons name="hourglass-outline" size={13} color={ORANGE} />
          <Text style={S.waitingTxt}>{t('rent.waitingApproval')}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RentBookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [tab,      setTab]      = useState('received');
  const [received, setReceived] = useState([]);
  const [myBooks,  setMyBooks]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null); // id of booking being acted upon

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, mRes] = await Promise.allSettled([
        api.get('/rent/bookings/received'),
        api.get('/rent/bookings'),
      ]);
      setReceived(rRes.status === 'fulfilled' ? (rRes.value.data?.data || []) : []);
      setMyBooks( mRes.status === 'fulfilled' ? (mRes.value.data?.data || []) : []);
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleApprove = (item) => {
    Alert.alert(
      t('rent.confirmApprove'),
      t('rent.confirmApproveMsg'),
      [
        { text: t('rent.cancel'), style: 'cancel' },
        {
          text: t('rent.approve'), style: 'default',
          onPress: async () => {
            setActing(item.id);
            try {
              await api.put(`/rent/bookings/${item.id}/approve`);
              setReceived(prev => prev.map(b => b.id === item.id ? { ...b, status: 'CONFIRMED' } : b));
            } catch (e) {
              Alert.alert(t('rent.error'), e?.response?.data?.error?.message || t('rent.approveError'));
            } finally { setActing(null); }
          },
        },
      ]
    );
  };

  const handleReject = (item) => {
    Alert.alert(
      t('rent.confirmReject'),
      t('rent.confirmRejectMsg'),
      [
        { text: t('rent.cancel'), style: 'cancel' },
        {
          text: t('rent.reject'), style: 'destructive',
          onPress: async () => {
            setActing(item.id);
            try {
              await api.put(`/rent/bookings/${item.id}/reject`);
              setReceived(prev => prev.map(b => b.id === item.id ? { ...b, status: 'CANCELLED' } : b));
            } catch (e) {
              Alert.alert(t('rent.error'), e?.response?.data?.error?.message || t('rent.rejectError'));
            } finally { setActing(null); }
          },
        },
      ]
    );
  };

  const pendingCount = received.filter(b => b.status === 'PENDING').length;
  const data         = tab === 'received' ? received : myBooks;
  const isEmpty      = !loading && data.length === 0;

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{t('rent.rentBookings')}</Text>
          <Text style={S.headerSub}>{t('rent.manageRequests')}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={S.tabBar}>
        {[
          { key: 'received', tKey: 'receivedTab',   icon: 'download-outline'  },
          { key: 'mine',     tKey: 'myBookingsTab',  icon: 'calendar-outline'  },
        ].map(tb => (
          <TouchableOpacity
            key={tb.key}
            style={[S.tabItem, tab === tb.key && S.tabItemActive]}
            onPress={() => setTab(tb.key)}
          >
            <Ionicons name={tb.icon} size={15} color={tab === tb.key ? GREEN : '#999'} />
            <Text style={[S.tabTxt, tab === tb.key && S.tabTxtActive]}>{t('rent.' + tb.tKey)}</Text>
            {tb.key === 'received' && pendingCount > 0 && (
              <View style={S.tabBadge}>
                <Text style={S.tabBadgeTxt}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : isEmpty ? (
        <View style={S.center}>
          <Ionicons
            name={tab === 'received' ? 'download-outline' : 'calendar-outline'}
            size={58} color="#ddd"
          />
          <Text style={S.emptyTitle}>
            {tab === 'received' ? t('rent.noBookingRequests') : t('rent.noBookings')}
          </Text>
          <Text style={S.emptySub}>
            {tab === 'received' ? t('rent.noBookingRequestsSub') : t('rent.noBookingsSub')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => i.id}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[GREEN]} />}
          renderItem={({ item }) =>
            tab === 'received'
              ? <ReceivedCard item={item} onApprove={handleApprove} onReject={handleReject} loading={acting} t={t} />
              : <MyBookingCard item={item} t={t} />
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F0F7F4' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 10 },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  headerSub:   { fontSize: 11, color: '#999', marginTop: 1 },

  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabItem:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabItemActive:{ borderBottomColor: GREEN },
  tabTxt:       { fontSize: 13, fontWeight: '600', color: '#999' },
  tabTxtActive: { color: GREEN, fontWeight: '800' },
  tabBadge:     { backgroundColor: RED, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeTxt:  { color: '#fff', fontSize: 10, fontWeight: '800' },

  list: { padding: 14, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeTagTxt:  { fontSize: 10, color: GREEN, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },

  listingName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 },
  listingLoc:  { fontSize: 12, color: '#888' },

  requesterRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 10 },
  avatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: GREEN + '20', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg:   { width: '100%', height: '100%' },
  avatarTxt:   { fontSize: 16, fontWeight: '800', color: GREEN },
  requesterName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  requesterPhone:{ fontSize: 12, color: '#888', marginTop: 1 },

  myBookingTop:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  myThumb:     { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },

  detailsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  detailItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailTxt:   { fontSize: 12, color: '#555', fontWeight: '600' },

  notesRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10, backgroundColor: '#F5F5F5', borderRadius: 8, padding: 8 },
  notesTxt:   { fontSize: 12, color: '#666', flex: 1, lineHeight: 17 },

  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8, marginTop: 4 },
  waitingTxt: { fontSize: 12, color: ORANGE, fontWeight: '600' },

  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 10 },
  rejectBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: RED, borderRadius: 10, paddingVertical: 10 },
  rejectTxt:   { fontSize: 13, fontWeight: '700', color: RED },
  approveBtn:  { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 10 },
  approveTxt:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#aaa', marginTop: 8 },
  emptySub:   { fontSize: 13, color: '#bbb', textAlign: 'center', paddingHorizontal: 30 },
});
