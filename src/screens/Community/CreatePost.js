import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';
import { POST_CATEGORIES } from '../../constants/mockData';

const POSTING_TIPS = [
  'Be specific about crop type and symptoms',
  'Mention your location and soil type',
  'Add relevant tags for better visibility',
  'Experts answer faster with more details',
];

export default function CreatePost({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [posting, setPosting] = useState(false);

  const addTag = () => {
    const cleaned = tagInput.trim().replace('#', '');
    if (cleaned && !tags.includes(cleaned) && tags.length < 5) {
      setTags(t => [...t, cleaned]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(t => t.filter(x => x !== tag));

  const handlePost = () => {
    if (!title.trim()) { Alert.alert('Required', 'Please add a title for your post.'); return; }
    if (!selectedCategory) { Alert.alert('Required', 'Please select a category.'); return; }
    if (description.trim().length < 30) { Alert.alert('More Detail Needed', 'Please describe your issue in at least 30 characters for better answers.'); return; }

    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      Alert.alert(
        'Posted Successfully! 🎉',
        'Your question/post is live. Farmers and experts will reply soon.',
        [{ text: 'View Post', onPress: () => navigation.goBack() }]
      );
    }, 1500);
  };

  const categories = POST_CATEGORIES.filter(c => c.id !== 'all');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={18} color={COLORS.gold} />
            <Text style={styles.tipsTitle}>Tips for better answers</Text>
          </View>
          {POSTING_TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === cat.id && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.color + '15' }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.color + '25' }]}>
                  <Ionicons name={cat.icon} size={20} color={cat.color} />
                </View>
                <Text style={[styles.catLabel, selectedCategory === cat.id && { color: cat.color, fontWeight: '800' }]}>
                  {cat.label}
                </Text>
                {selectedCategory === cat.id && (
                  <Ionicons name="checkmark-circle" size={16} color={cat.color} style={styles.catCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="e.g. Tomato leaves turning yellow – what disease is this?"
            placeholderTextColor={COLORS.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Text style={styles.charCount}>{title.length}/120</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe in detail *</Text>
          <TextInput
            style={styles.descInput}
            placeholder="Describe your crop problem, farming tip, or question in detail. Include crop age, soil type, weather, symptoms..."
            placeholderTextColor={COLORS.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags (up to 5)</Text>
          <Text style={styles.sectionSub}>e.g. Tomato, Yellow Leaves, Fungal Disease</Text>
          <View style={styles.tagInput}>
            <TextInput
              style={styles.tagField}
              placeholder="Type a tag and press Add"
              placeholderTextColor={COLORS.textLight}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
              <Text style={styles.addTagBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsRow}>
            {tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Ionicons name="close" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Community rules */}
        <View style={styles.rulesCard}>
          <Ionicons name="information-circle" size={18} color={COLORS.info} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rulesTitle}>Community Guidelines</Text>
            <Text style={styles.rulesText}>Be respectful. Share genuine farming knowledge. No selling/spam in discussions. Help each other grow!</Text>
          </View>
        </View>

      </ScrollView>

      {/* Post Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.draftBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postBtn, posting && { opacity: 0.6 }]}
          onPress={handlePost}
          disabled={posting}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.postGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="send" size={18} color={COLORS.textWhite} />
            <Text style={styles.postBtnText}>{posting ? 'Posting...' : 'Post to Community'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 20 },

  tipsCard: { backgroundColor: '#FFF8E1', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.gold + '60' },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipText: { fontSize: 13, color: COLORS.textMedium, flex: 1 },

  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, ...SHADOWS.small },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.textLight, marginBottom: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  categoryCard: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background, position: 'relative' },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMedium, flex: 1 },
  catCheck: { position: 'absolute', top: 6, right: 6 },

  titleInput: { backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textDark, marginTop: 10 },
  descInput: { backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingTop: 12, fontSize: 15, color: COLORS.textDark, height: 150, marginTop: 10 },
  charCount: { fontSize: 11, color: COLORS.textLight, textAlign: 'right', marginTop: 4 },

  tagInput: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tagField: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textDark },
  addTagBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addTagBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textWhite },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryPale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  rulesCard: { flexDirection: 'row', gap: 12, backgroundColor: '#E8F4FD', borderRadius: 14, padding: 14, alignItems: 'flex-start' },
  rulesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  rulesText: { fontSize: 12, color: COLORS.textMedium, lineHeight: 18 },

  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  draftBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 2, borderColor: COLORS.border, borderRadius: 14, justifyContent: 'center' },
  draftBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textMedium },
  postBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  postGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  postBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textWhite },
});
