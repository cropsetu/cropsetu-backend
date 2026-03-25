/**
 * CommunityHome — Bright Indigo 3D
 * Tabs: CHATS | UPDATES | GROUPS
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, StatusBar, Animated,
  Dimensions, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { TiltCard, FloatingParticle, EntrySlide, D } from '../../components/ui/ImmersiveKit';

const { width: SCREEN_W } = Dimensions.get('window');

const ACCENT = D.indigo; // #6366F1

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function fmtTime(dateStr) {
  if (!dateStr) return '';
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const AVATAR_COLORS = ['#4338CA', '#B91C1C', '#7C3AED', '#065F46', '#C2410C', '#1D4ED8', '#9D174D'];

function Avatar({ uri, name, size = 50, isOnline }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const bg       = AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <View style={{ position: 'relative' }}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: ACCENT + '30' }} />
        : (
          <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: bg,
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1.5, borderColor: ACCENT + '25',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.34 }}>{initials}</Text>
          </View>
        )}
      {isOnline && (
        <View style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 13, height: 13, borderRadius: 7,
          backgroundColor: D.green, borderWidth: 2, borderColor: '#fff',
        }} />
      )}
    </View>
  );
}

// ── Chat row ──────────────────────────────────────────────────────────────────
function ChatRow({ avatar, name, isOnline, previewLine1, previewLine2, time, unread, onPress, index = 0 }) {
  return (
    <EntrySlide delay={index * 40} fromX={-30}>
      <TouchableOpacity style={S.chatRow} onPress={onPress} activeOpacity={0.75}>
        <Avatar uri={avatar} name={name} size={50} isOnline={isOnline} />
        <View style={S.chatMid}>
          <View style={S.chatTop}>
            <Text style={S.chatName} numberOfLines={1}>{name}</Text>
            <Text style={[S.chatTime, unread > 0 && { color: ACCENT, fontWeight: '700' }]}>{time}</Text>
          </View>
          <View style={S.chatBottom}>
            <Text style={[S.chatPreview, unread > 0 && S.chatPreviewBold]} numberOfLines={1}>
              {previewLine1}
            </Text>
            {unread > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
          {previewLine2 ? <Text style={S.chatSub} numberOfLines={1}>{previewLine2}</Text> : null}
        </View>
      </TouchableOpacity>
    </EntrySlide>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — CHATS
// ══════════════════════════════════════════════════════════════════════════════
const CHAT_FILTERS = ['All', 'Unread', 'Favourites', 'Groups'];

function ChatsTab({ navigation }) {
  const [convos,       setConvos]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      setConvos(data.data || []);
    } catch { /* offline */ }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = activeFilter === 'Unread'
    ? convos.filter((c) => (c.unreadCount || 0) > 0)
    : convos;

  if (loading) return <View style={S.center}><ActivityIndicator color={ACCENT} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow} style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: D.border }}>
        {CHAT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[S.chip, activeFilter === f && { backgroundColor: ACCENT + '15', borderColor: ACCENT }]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[S.chipText, activeFilter === f && { color: ACCENT, fontWeight: '700' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.partnerId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        renderItem={({ item, index }) => (
          <ChatRow
            index={index}
            avatar={item.partnerAvatar}
            name={item.partnerName || 'Farmer'}
            isOnline={item.partnerOnline}
            previewLine1={item.lastMessage?.imageUrl ? '📷 Photo' : (item.lastMessage?.text || 'Say hi!')}
            previewLine2={item.partnerStatusQuote ? `"${item.partnerStatusQuote}"` : null}
            time={fmtTime(item.lastMessage?.createdAt)}
            unread={item.unreadCount || 0}
            onPress={() => navigation.navigate('DirectChat', {
              partner: {
                id: item.partnerId, name: item.partnerName, avatar: item.partnerAvatar,
                statusQuote: item.partnerStatusQuote, isOnline: item.partnerOnline, lastSeenAt: item.partnerLastSeen,
              },
            })}
          />
        )}
        ItemSeparatorComponent={() => <View style={S.sep} />}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="chatbubbles-outline" size={72} color={`${ACCENT}40`} />
            <Text style={S.emptyTitle}>No conversations yet</Text>
            <Text style={S.emptyText}>Find a farmer and start chatting!</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80, backgroundColor: '#fff' }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — UPDATES
// ══════════════════════════════════════════════════════════════════════════════
const POST_CATEGORIES = [
  { id: 'all',          label: 'All',       icon: 'apps-outline',        color: ACCENT },
  { id: 'crop-tips',    label: 'Crop Tips', icon: 'leaf-outline',        color: D.green },
  { id: 'market',       label: 'Market',    icon: 'trending-up-outline', color: D.amber },
  { id: 'weather',      label: 'Weather',   icon: 'rainy-outline',       color: D.blue },
  { id: 'pest-disease', label: 'Pest',      icon: 'bug-outline',         color: D.red },
  { id: 'success',      label: 'Success',   icon: 'trophy-outline',      color: D.gold },
  { id: 'general',      label: 'General',   icon: 'chatbubbles-outline', color: D.purple },
];

const SCOPES = [
  { id: 'all',      label: 'All India',   icon: 'earth-outline' },
  { id: 'district', label: 'My District', icon: 'map-outline' },
  { id: 'city',     label: 'My Town',     icon: 'home-outline' },
];

function PostCard({ post, onPress, index = 0 }) {
  const [liked,     setLiked]     = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const cat      = POST_CATEGORIES.find((c) => c.id === post.category) || POST_CATEGORIES[0];
  const initials = (post.author?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLike = async () => {
    const was = liked;
    setLiked(!was); setLikeCount((n) => was ? n - 1 : n + 1);
    try { await api.post(`/community/posts/${post.id}/like`); }
    catch { setLiked(was); setLikeCount((n) => was ? n + 1 : n - 1); }
  };

  return (
    <EntrySlide delay={index * 55} fromY={20}>
      <TiltCard style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
        <TouchableOpacity style={[S.postCard, { shadowColor: cat.color }]} onPress={() => onPress(post)} activeOpacity={0.92}>
          {/* Left accent line */}
          <View style={[S.postAccentBar, { backgroundColor: cat.color }]} />

          <View style={S.authorRow}>
            {post.author?.avatar
              ? <Image source={{ uri: post.author.avatar }} style={S.authorAv} />
              : (
                <View style={[S.authorAv, {
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: AVATAR_COLORS[(post.author?.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length],
                }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{initials}</Text>
                </View>
              )}
            <View style={{ flex: 1 }}>
              <Text style={S.authorName}>{post.author?.name || 'Farmer'}</Text>
              <Text style={S.authorMeta}>{post.district ? `${post.district} · ` : ''}{timeAgo(post.createdAt)}</Text>
            </View>
            <View style={[S.catBadge, { backgroundColor: cat.color + '15', borderColor: cat.color + '30' }]}>
              <Ionicons name={cat.icon} size={12} color={cat.color} />
              <Text style={[S.catText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          </View>

          <Text style={S.postTitle}>{post.title}</Text>
          <Text style={S.postBody} numberOfLines={3}>{post.description}</Text>

          {post.images?.length > 0 && (
            <Image source={{ uri: post.images[0] }} style={S.postImg} resizeMode="cover" />
          )}

          {post.tags?.length > 0 && (
            <View style={S.tagsRow}>
              {post.tags.slice(0, 4).map((tag, i) => (
                <View key={i} style={[S.tag, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '30' }]}>
                  <Text style={[S.tagText, { color: ACCENT }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={S.actRow}>
            <TouchableOpacity style={S.actBtn} onPress={handleLike}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? D.red : D.textDim} />
              <Text style={[S.actText, liked && { color: D.red }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actBtn} onPress={() => onPress(post)}>
              <Ionicons name="chatbubble-outline" size={19} color={D.textDim} />
              <Text style={S.actText}>{post.commentCount || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.actBtn}>
              <Ionicons name="share-social-outline" size={20} color={D.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={S.actBtn} onPress={async () => { try { await api.post(`/community/posts/${post.id}/bookmark`); } catch {} }}>
              <Ionicons name={post.bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={post.bookmarked ? ACCENT : D.textDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TiltCard>
    </EntrySlide>
  );
}

function UpdatesTab({ navigation }) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeScope,    setActiveScope]    = useState('all');
  const [posts,          setPosts]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fetching = useRef(false);

  const fetchPosts = useCallback(async (reset = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const pg     = reset ? 1 : page;
      const params = { page: pg, limit: 15 };
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeScope !== 'all') {
        params.scope = activeScope;
        if (user?.district) params.district = user.district;
        if (activeScope === 'city' && user?.city) params.city = user.city;
      }
      const { data } = await api.get('/community/posts', { params });
      const newPosts = data.data || [];
      setPosts(reset ? newPosts : (prev) => [...prev, ...newPosts]);
      const meta = data.meta || {};
      setHasMore((meta.page || 1) < (meta.totalPages || 1));
      if (reset) setPage(2); else setPage((p) => p + 1);
    } catch (e) { console.warn('fetchPosts:', e.message); }
    finally { fetching.current = false; }
  }, [activeCategory, activeScope, user?.district, user?.city, page]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(true).finally(() => setLoading(false));
  }, [activeCategory, activeScope]);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(true); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Add update banner */}
      <TouchableOpacity style={S.addUpdateRow} onPress={() => navigation.navigate('CreatePost')}>
        <View style={S.addUpdateAv}>
          <View style={S.addUpdateDot}>
            <Ionicons name="add" size={14} color="#fff" />
          </View>
          {user?.avatar
            ? <Image source={{ uri: user.avatar }} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: ACCENT + '40' }} />
            : (
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: ACCENT + '20', borderWidth: 1.5, borderColor: ACCENT + '40', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 18 }}>
                  {(user?.name || 'F')[0].toUpperCase()}
                </Text>
              </View>
            )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.addUpdateTitle}>Add farm update</Text>
          <Text style={S.addUpdateSub}>Share tips, market prices, crop news...</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Ionicons name="camera-outline" size={24} color={D.textDim} />
          <Ionicons name="pencil-outline" size={22} color={D.textDim} />
        </View>
      </TouchableOpacity>

      <View style={S.sectionDivider} />

      {/* Scope chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow} style={{ backgroundColor: '#fff' }}>
        {SCOPES.map((sc) => (
          <TouchableOpacity
            key={sc.id}
            style={[S.chip, activeScope === sc.id && { backgroundColor: ACCENT + '15', borderColor: ACCENT }]}
            onPress={() => setActiveScope(sc.id)}
          >
            <Ionicons name={sc.icon} size={12} color={activeScope === sc.id ? ACCENT : D.textDim} />
            <Text style={[S.chipText, activeScope === sc.id && { color: ACCENT, fontWeight: '700' }]}>
              {sc.id === 'district' && user?.district ? user.district
                : sc.id === 'city' && user?.city ? user.city
                : sc.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category row */}
      <FlatList
        horizontal
        data={POST_CATEGORIES}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: D.border, flexGrow: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[S.catPill, { borderColor: item.color + '40' },
              activeCategory === item.id && { backgroundColor: item.color + '15', borderColor: item.color }
            ]}
            onPress={() => setActiveCategory(item.id)}
          >
            <Ionicons name={item.icon} size={12} color={activeCategory === item.id ? item.color : D.textDim} />
            <Text style={[S.catPillText, activeCategory === item.id && { color: item.color, fontWeight: '700' }]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Posts */}
      {loading ? (
        <View style={S.center}><ActivityIndicator color={ACCENT} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item, index }) => (
            <PostCard post={item} index={index} onPress={(p) => navigation.navigate('PostDetail', { post: p })} />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: 100, backgroundColor: D.bg }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasMore) fetchPosts(false); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="chatbubbles-outline" size={70} color={`${ACCENT}40`} />
              <Text style={S.emptyTitle}>No discussions found</Text>
              <Text style={S.emptyText}>
                {activeScope !== 'all' ? 'No posts in your area yet. Be the first!' : 'No posts match your filters.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — GROUPS
// ══════════════════════════════════════════════════════════════════════════════
function GroupsTab({ navigation }) {
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState('my');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(tab === 'my' ? '/groups/my' : '/groups');
      setGroups(data.data || []);
    } catch { /* offline */ }
  }, [tab]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [tab]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      <View style={S.subTabBar}>
        {['my', 'discover'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[S.subTab, tab === t && { borderBottomColor: ACCENT }]}
            onPress={() => setTab(t)}
          >
            <Text style={[S.subTabText, tab === t && { color: ACCENT, fontWeight: '800' }]}>
              {t === 'my' ? 'My Groups' : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator color={ACCENT} /></View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item, index }) => {
            const isMy = tab === 'my';
            const preview = isMy
              ? (item.lastMessage || `${item.memberCount || 0} members`)
              : (item.description || `${item.memberCount || 0} members`);
            return (
              <ChatRow
                index={index}
                avatar={item.avatar}
                name={item.name}
                isOnline={false}
                previewLine1={preview}
                previewLine2={null}
                time={isMy ? fmtTime(item.lastMessageAt) : ''}
                unread={0}
                onPress={() => isMy ? navigation.navigate('GroupChat', { group: item }) : null}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={S.sep} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="people-outline" size={72} color={`${ACCENT}40`} />
              <Text style={S.emptyTitle}>{tab === 'my' ? 'No groups yet' : 'No public groups'}</Text>
              <Text style={S.emptyText}>{tab === 'my' ? 'Join or create a group to get started.' : 'Create one for your community!'}</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 80, backgroundColor: '#fff' }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={S.fab} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.85}>
        <LinearGradient colors={[ACCENT, ACCENT + 'CC']} style={S.fabGrad}>
          <Ionicons name="people" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — CommunityHome
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'CHATS',   label: 'Chats',   icon: 'chatbubble-outline' },
  { key: 'UPDATES', label: 'Updates', icon: 'radio-outline' },
  { key: 'GROUPS',  label: 'Groups',  icon: 'people-outline' },
];

const PARTICLES = [
  { icon: 'people', size: 18, delay: 0,   duration: 3200, particleStyle: { top: '12%', left: '4%' } },
  { icon: 'star',   size: 10, delay: 400, duration: 2700, particleStyle: { top: '8%',  left: '50%' } },
  { icon: 'leaf',   size: 13, delay: 800, duration: 3000, particleStyle: { top: '35%', right: '6%' } },
  { icon: 'star',   size: 8,  delay: 200, duration: 2900, particleStyle: { top: '55%', left: '7%' } },
];

export default function CommunityHome({ navigation }) {
  const { user } = useAuth();
  const [activeTab,   setActiveTab]   = useState(0);
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const indicatorX = useRef(new Animated.Value(0)).current;

  const switchTab = (idx) => {
    setActiveTab(idx);
    Animated.spring(indicatorX, {
      toValue: (SCREEN_W / TABS.length) * idx,
      useNativeDriver: true, tension: 60, friction: 10,
    }).start();
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <LinearGradient colors={['#3730A3', '#4338CA', '#6366F1']} style={S.hero}>
        {PARTICLES.map((p, i) => (
          <FloatingParticle key={i} {...p}>
            <Ionicons name={p.icon} size={p.size} color="rgba(255,255,255,0.5)" />
          </FloatingParticle>
        ))}

        {showSearch ? (
          <View style={S.searchActiveRow}>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={S.searchActiveInput}
              placeholder="Search farmers, groups..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        ) : (
          <>
            <View style={S.headerTop}>
              <View>
                <Text style={S.headerSub}>Connect · Share · Grow</Text>
                <Text style={S.headerTitle}>Kisan Community</Text>
              </View>
              <View style={S.headerIcons}>
                <TouchableOpacity style={S.iconBtn} onPress={() => setShowSearch(true)}>
                  <Ionicons name="search" size={22} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={S.headerFab}
                  onPress={() => activeTab === 0
                    ? navigation.navigate('NewChat')
                    : activeTab === 2
                    ? navigation.navigate('CreateGroup')
                    : navigation.navigate('CreatePost')}
                >
                  <View style={S.headerFabInner}>
                    <Ionicons name="add" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={S.searchBar} onPress={() => setShowSearch(true)} activeOpacity={0.8}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={S.searchPlaceholder}>
                {activeTab === 0 ? 'Search farmers...' : activeTab === 1 ? 'Search discussions...' : 'Search groups...'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>

      {/* ── Top Tab Bar ──────────────────────────────────────────── */}
      <View style={S.tabBar}>
        {TABS.map((tab, idx) => {
          const focused = activeTab === idx;
          return (
            <TouchableOpacity key={tab.key} style={S.tabItem} onPress={() => switchTab(idx)} activeOpacity={0.8}>
              <Ionicons
                name={focused ? tab.icon.replace('-outline', '') : tab.icon}
                size={18}
                color={focused ? ACCENT : D.textDim}
              />
              <Text style={[S.tabText, focused && { color: ACCENT, fontWeight: '800' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Animated.View
          style={[S.tabIndicator, { width: SCREEN_W / TABS.length, transform: [{ translateX: indicatorX }] }]}
        />
      </View>

      {/* ── Content ──────────────────────────────────────────────── */}
      <View style={{ flex: 1, backgroundColor: D.bg }}>
        {activeTab === 0 && <ChatsTab   navigation={navigation} />}
        {activeTab === 1 && <UpdatesTab navigation={navigation} />}
        {activeTab === 2 && <GroupsTab  navigation={navigation} />}
      </View>

      {/* FAB for Chats tab */}
      {activeTab === 0 && (
        <TouchableOpacity style={S.fab} onPress={() => navigation.navigate('NewChat')} activeOpacity={0.85}>
          <LinearGradient colors={[ACCENT, ACCENT + 'CC']} style={S.fabGrad}>
            <Ionicons name="create" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },

  // ── Hero ──────────────────────────────────────────────────────
  hero: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 14, overflow: 'hidden' },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn:     { padding: 8 },
  headerFab:   { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', marginLeft: 4 },
  headerFabInner: { flex: 1, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },

  searchActiveRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  searchActiveInput: { flex: 1, fontSize: 16, color: '#fff', paddingVertical: 6 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  searchPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  // ── Tab Bar ───────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: D.border,
    position: 'relative',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  tabText: { fontSize: 11, fontWeight: '600', color: D.textDim, letterSpacing: 0.4 },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 2.5,
    backgroundColor: ACCENT, borderRadius: 2,
  },

  // ── Filter chips ──────────────────────────────────────────────
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F8F9FF',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: D.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: D.textDim },

  // ── Chat row ──────────────────────────────────────────────────
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
    backgroundColor: '#fff',
  },
  chatMid:    { flex: 1 },
  chatTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  chatName:   { flex: 1, fontSize: 16, fontWeight: '700', color: D.text, marginRight: 8 },
  chatTime:   { fontSize: 12, color: D.textDim },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatPreview:     { flex: 1, fontSize: 14, color: D.textDim, marginRight: 8 },
  chatPreviewBold: { color: D.text, fontWeight: '600' },
  chatSub: { fontSize: 12, color: D.textFaint, fontStyle: 'italic', marginTop: 2 },

  badge:     { backgroundColor: ACCENT, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  sep: { height: 0.7, backgroundColor: D.border, marginLeft: 80 },

  // ── Add update row ────────────────────────────────────────────
  addUpdateRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  addUpdateAv:  { position: 'relative', width: 52, height: 52 },
  addUpdateDot: {
    position: 'absolute', bottom: 0, right: 0, zIndex: 1,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: ACCENT, borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  addUpdateTitle: { fontSize: 15, fontWeight: '700', color: D.text, marginBottom: 3 },
  addUpdateSub:   { fontSize: 13, color: D.textDim },

  sectionDivider: { height: 6, backgroundColor: D.bg },

  // ── Sub-tabs (Groups) ──────────────────────────────────────────
  subTabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  subTab:     { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  subTabText: { fontSize: 14, fontWeight: '600', color: D.textDim },

  // ── Post card ─────────────────────────────────────────────────
  postCard: {
    backgroundColor: D.surface,
    borderRadius: 16, padding: 15, overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    position: 'relative',
  },
  postAccentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    elevation: 2,
  },
  authorRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 8 },
  authorAv:   { width: 42, height: 42, borderRadius: 21 },
  authorName: { fontSize: 15, fontWeight: '700', color: D.text },
  authorMeta: { fontSize: 12, color: D.textDim, marginTop: 2 },
  catBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  catText:    { fontSize: 11, fontWeight: '700' },
  postTitle:  { fontSize: 16, fontWeight: '800', color: D.text, marginBottom: 6, lineHeight: 22, paddingLeft: 8 },
  postBody:   { fontSize: 14, color: D.textDim, lineHeight: 21, marginBottom: 10, paddingLeft: 8 },
  postImg:    { width: '100%', height: 180, borderRadius: 10, marginBottom: 10 },
  tagsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, paddingLeft: 8 },
  tag:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  tagText:    { fontSize: 12, fontWeight: '600' },
  actRow:     { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: D.border, paddingTop: 10, gap: 4 },
  actBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center', paddingVertical: 3 },
  actText:    { fontSize: 13, color: D.textDim, fontWeight: '600' },

  // ── Category pills ────────────────────────────────────────────
  catPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, backgroundColor: '#F8F9FF' },
  catPillText: { fontSize: 12, fontWeight: '600', color: D.textDim },

  // ── FAB ───────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    elevation: 8,
    shadowColor: ACCENT, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Empty / center ────────────────────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: D.textDim },
  emptyText:  { fontSize: 14, color: D.textFaint, textAlign: 'center', lineHeight: 22 },
});
