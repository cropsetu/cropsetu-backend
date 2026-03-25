import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/colors';

const STAGE_COLORS = [
  '#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D',
  '#95D5B2', '#B7E4C7', '#D8F3DC',
];

function StageCard({ stage, index, total, isActive }) {
  const color = STAGE_COLORS[index % STAGE_COLORS.length];
  const progressPct = ((index + 1) / total) * 100;

  return (
    <View style={styles.stageWrapper}>
      {/* Timeline line */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: color }, isActive && styles.timelineDotActive]}>
          <Text style={styles.timelineDotNum}>{index + 1}</Text>
        </View>
        {index < total - 1 && <View style={styles.timelineLine} />}
      </View>

      {/* Stage card */}
      <View style={[styles.stageCard, isActive && { borderColor: color, borderWidth: 2 }]}>
        <View style={styles.stageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stageName}>{stage.name}</Text>
            <Text style={styles.stageNameHi}>{stage.nameHi}</Text>
          </View>
          <View style={[styles.stageDayBadge, { backgroundColor: color }]}>
            <Text style={styles.stageDayText}>Day {stage.day}</Text>
          </View>
        </View>

        <View style={styles.stageDurationRow}>
          <Ionicons name="time" size={14} color={COLORS.textLight} />
          <Text style={styles.stageDuration}>{stage.duration} days duration</Text>
        </View>

        {/* Tip */}
        <View style={styles.stageTip}>
          <Ionicons name="bulb" size={14} color={COLORS.gold} />
          <Text style={styles.stageTipText}>{stage.tip}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.stageProgressBar}>
          <View style={[styles.stageProgressFill, { width: `${progressPct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.stageProgressLabel}>{Math.round(progressPct)}% of crop cycle</Text>
      </View>
    </View>
  );
}

export default function CropDetail({ route }) {
  const { crop } = route.params;
  const [activeStageIndex, setActiveStageIndex] = useState(1);

  const totalDays = crop.stages[crop.stages.length - 1].day + crop.stages[crop.stages.length - 1].duration;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Crop Header */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryMedium]} style={styles.cropHeader}>
          <Text style={styles.cropIcon}>{crop.icon}</Text>
          <Text style={styles.cropName}>{crop.name}</Text>
          <Text style={styles.cropNameHi}>{crop.nameHi}</Text>
          <View style={styles.seasonBadge}>
            <Ionicons name="calendar" size={14} color={COLORS.textWhite} />
            <Text style={styles.seasonText}>{crop.season}</Text>
          </View>
        </LinearGradient>

        {/* Crop Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{crop.sowingMonth}</Text>
            <Text style={styles.summaryLabel}>Best Sowing Time</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="time" size={20} color={COLORS.accent} />
            <Text style={styles.summaryValue}>{crop.duration}</Text>
            <Text style={styles.summaryLabel}>Total Duration</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="cut" size={20} color={COLORS.success} />
            <Text style={styles.summaryValue}>{crop.harvestMonth}</Text>
            <Text style={styles.summaryLabel}>Harvest Time</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="water" size={20} color={COLORS.info} />
            <Text style={styles.summaryValue} numberOfLines={2}>{crop.waterNeeded.split('(')[0]}</Text>
            <Text style={styles.summaryLabel}>Water Needed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="thermometer" size={20} color={COLORS.error} />
            <Text style={styles.summaryValue}>{crop.idealTemp}</Text>
            <Text style={styles.summaryLabel}>Ideal Temperature</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="layers" size={20} color={COLORS.gold} />
            <Text style={styles.summaryValue} numberOfLines={2}>{crop.soilType}</Text>
            <Text style={styles.summaryLabel}>Best Soil</Text>
          </View>
        </View>

        {/* Visual Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Crop Growth Timeline</Text>
          <Text style={styles.sectionSub}>{crop.stages.length} stages · {totalDays} total days</Text>

          {/* Stage selector mini-bar */}
          <View style={styles.stageSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageSelectorScroll}>
              {crop.stages.map((stage, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.stageSelectorChip, activeStageIndex === i && styles.stageSelectorChipActive]}
                  onPress={() => setActiveStageIndex(i)}
                >
                  <Text style={[styles.stageSelectorText, activeStageIndex === i && styles.stageSelectorTextActive]}>
                    {i + 1}. {stage.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Highlighted stage detail */}
          <View style={styles.activeStageDetail}>
            <LinearGradient colors={[COLORS.primary + '20', COLORS.primaryPale]} style={styles.activeStageGradient}>
              <View style={styles.activeStageHeader}>
                <Text style={styles.activeStageName}>{crop.stages[activeStageIndex].name}</Text>
                <Text style={styles.activeStageHi}>{crop.stages[activeStageIndex].nameHi}</Text>
              </View>
              <View style={styles.activeStageStats}>
                <View style={styles.activeStatItem}>
                  <Ionicons name="play" size={16} color={COLORS.primary} />
                  <Text style={styles.activeStatLabel}>Starts Day</Text>
                  <Text style={styles.activeStatValue}>{crop.stages[activeStageIndex].day}</Text>
                </View>
                <View style={styles.activeStatItem}>
                  <Ionicons name="time" size={16} color={COLORS.accent} />
                  <Text style={styles.activeStatLabel}>Duration</Text>
                  <Text style={styles.activeStatValue}>{crop.stages[activeStageIndex].duration}d</Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Ionicons name="bulb" size={18} color={COLORS.gold} />
                <Text style={styles.tipBoxText}>{crop.stages[activeStageIndex].tip}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Full timeline */}
          <View style={styles.timeline}>
            {crop.stages.map((stage, i) => (
              <StageCard
                key={i}
                stage={stage}
                index={i}
                total={crop.stages.length}
                isActive={activeStageIndex === i}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  cropHeader: { padding: 28, alignItems: 'center', gap: 8 },
  cropIcon: { fontSize: 56 },
  cropName: { fontSize: 26, fontWeight: '900', color: COLORS.textWhite },
  cropNameHi: { fontSize: 18, color: COLORS.primaryPale, fontWeight: '600' },
  seasonBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF20', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  seasonText: { fontSize: 14, fontWeight: '600', color: COLORS.textWhite },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  summaryCard: { width: '30%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, ...SHADOWS.small, flex: 1, minWidth: '30%' },
  summaryValue: { fontSize: 13, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
  summaryLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },

  timelineSection: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  sectionSub: { fontSize: 13, color: COLORS.textLight, marginTop: 4, marginBottom: 16 },

  stageSelector: { marginBottom: 16 },
  stageSelectorScroll: { gap: 10 },
  stageSelectorChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  stageSelectorChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stageSelectorText: { fontSize: 13, fontWeight: '600', color: COLORS.textMedium },
  stageSelectorTextActive: { color: COLORS.textWhite },

  activeStageDetail: { borderRadius: 16, overflow: 'hidden', marginBottom: 24, ...SHADOWS.small },
  activeStageGradient: { padding: 16 },
  activeStageHeader: { marginBottom: 12 },
  activeStageName: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  activeStageHi: { fontSize: 14, color: COLORS.textMedium, fontWeight: '600', marginTop: 4 },
  activeStageStats: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  activeStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeStatLabel: { fontSize: 13, color: COLORS.textMedium },
  activeStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  tipBox: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.textWhite + 'AA', borderRadius: 12, padding: 12 },
  tipBoxText: { flex: 1, fontSize: 14, color: COLORS.textDark, lineHeight: 20 },

  timeline: { paddingBottom: 10 },
  stageWrapper: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  timelineCol: { width: 32, alignItems: 'center' },
  timelineDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  timelineDotActive: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: COLORS.gold },
  timelineDotNum: { fontSize: 13, fontWeight: '800', color: COLORS.textWhite },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4, minHeight: 20 },

  stageCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  stageName: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },
  stageNameHi: { fontSize: 12, color: COLORS.textMedium, marginTop: 3 },
  stageDayBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  stageDayText: { fontSize: 12, fontWeight: '700', color: COLORS.textWhite },
  stageDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  stageDuration: { fontSize: 12, color: COLORS.textLight },
  stageTip: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginBottom: 10 },
  stageTipText: { flex: 1, fontSize: 13, color: COLORS.textMedium, lineHeight: 18 },
  stageProgressBar: { height: 5, backgroundColor: COLORS.divider, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  stageProgressFill: { height: '100%', borderRadius: 3 },
  stageProgressLabel: { fontSize: 11, color: COLORS.textLight },
});
