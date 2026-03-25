import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import { COMMUNITY_COMMENTS, POST_CATEGORIES } from '../../constants/mockData';

function CommentCard({ comment }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes);
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{comment.authorAvatar}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <Text style={styles.commentTime}>{comment.timeAgo}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <TouchableOpacity
          style={styles.commentLike}
          onPress={() => { setLiked(l => !l); setLikes(n => liked ? n - 1 : n + 1); }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={14} color={liked ? COLORS.error : COLORS.textLight} />
          <Text style={[styles.commentLikeText, liked && { color: COLORS.error }]}>{likes} helpful</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PostDetail({ route }) {
  const { post } = route.params;
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(COMMUNITY_COMMENTS[post.id] || []);
  const catInfo = POST_CATEGORIES.find(c => c.id === post.category) || POST_CATEGORIES[0];

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `c_${Date.now()}`,
      authorName: 'You',
      authorAvatar: 'SY',
      text: newComment.trim(),
      timeAgo: 'Just now',
      likes: 0,
    };
    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Category banner */}
          <LinearGradient colors={[catInfo.color + '30', catInfo.color + '10']} style={styles.catBanner}>
            <View style={[styles.catIcon, { backgroundColor: catInfo.color }]}>
              <Ionicons name={catInfo.icon} size={20} color={COLORS.textWhite} />
            </View>
            <Text style={[styles.catLabel, { color: catInfo.color }]}>{catInfo.label}</Text>
          </LinearGradient>

          <View style={styles.content}>
            {/* Author */}
            <View style={styles.authorRow}>
              <View style={[styles.authorAvatar, post.verified && { borderWidth: 2, borderColor: COLORS.success }]}>
                <Text style={styles.authorAvatarText}>{post.authorAvatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{post.authorName}</Text>
                  {post.verified && <Ionicons name="checkmark-circle" size={15} color={COLORS.success} style={{ marginLeft: 4 }} />}
                </View>
                <Text style={styles.authorMeta}>{post.authorLocation} · Grows {post.authorCrop}</Text>
                <Text style={styles.postTime}>{post.timeAgo}</Text>
              </View>
            </View>

            {/* Title & Content */}
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postBody}>{post.description}</Text>

            {/* Tags */}
            <View style={styles.tagsRow}>
              {post.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => { setLiked(l => !l); setLikes(n => liked ? n - 1 : n + 1); }}
              >
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? COLORS.error : COLORS.textMedium} />
                <Text style={[styles.actionCount, liked && { color: COLORS.error }]}>{likes} Likes</Text>
              </TouchableOpacity>
              <View style={styles.actionItem}>
                <Ionicons name="chatbubble-outline" size={22} color={COLORS.textMedium} />
                <Text style={styles.actionCount}>{comments.length} Comments</Text>
              </View>
              <TouchableOpacity style={styles.actionItem}>
                <Ionicons name="share-social-outline" size={22} color={COLORS.textMedium} />
                <Text style={styles.actionCount}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Comments section */}
            <Text style={styles.commentsTitle}>{comments.length} Answers & Comments</Text>

            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-ellipses-outline" size={44} color={COLORS.border} />
                <Text style={styles.noCommentsText}>Be the first to help this farmer!</Text>
              </View>
            ) : (
              comments.map(c => <CommentCard key={c.id} comment={c} />)
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInput}>
          <View style={styles.inputAvatar}>
            <Text style={styles.inputAvatarText}>SY</Text>
          </View>
          <TextInput
            style={styles.commentField}
            placeholder="Write your answer or comment..."
            placeholderTextColor={COLORS.textLight}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.4 }]}
            onPress={handleSendComment}
            disabled={!newComment.trim()}
          >
            <Ionicons name="send" size={20} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  catBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingHorizontal: 20 },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catLabel: { fontSize: 14, fontWeight: '800' },

  content: { padding: 16 },

  authorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  authorAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  authorAvatarText: { fontSize: 18, fontWeight: '800', color: COLORS.textWhite },
  authorNameRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  authorMeta: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  postTime: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  postTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark, marginBottom: 14, lineHeight: 28 },
  postBody: { fontSize: 15, color: COLORS.textMedium, lineHeight: 24, marginBottom: 16 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: COLORS.primaryPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 12, color: COLORS.primaryMedium, fontWeight: '600' },

  actionBar: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.divider, paddingVertical: 12, marginBottom: 24 },
  actionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionCount: { fontSize: 13, fontWeight: '600', color: COLORS.textMedium },

  commentsTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },

  commentCard: { flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12, ...SHADOWS.small },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryMedium, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 13, fontWeight: '800', color: COLORS.textWhite },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  commentTime: { fontSize: 11, color: COLORS.textLight },
  commentText: { fontSize: 14, color: COLORS.textMedium, lineHeight: 21 },
  commentLike: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  commentLikeText: { fontSize: 12, color: COLORS.textLight },

  noComments: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noCommentsText: { fontSize: 15, color: COLORS.textLight },

  commentInput: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  inputAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  inputAvatarText: { fontSize: 13, fontWeight: '800', color: COLORS.textWhite },
  commentField: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.textDark, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
