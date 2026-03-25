/**
 * FarmEasy UIKit — Shared design-system components
 * SkeletonCard · EmptyState · StatusBadge · SectionHeader · PillChip · PriceTag
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, TYPE, SPACE } from '../../constants/colors';

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
export function SkeletonBox({ width, height, radius = RADIUS.md, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.border, opacity }, style]}
    />
  );
}

export function SkeletonCard({ style }) {
  return (
    <View style={[skStyles.card, style]}>
      <SkeletonBox width="100%" height={130} radius={RADIUS.lg} />
      <View style={{ padding: 12, gap: 8 }}>
        <SkeletonBox width="60%" height={10} />
        <SkeletonBox width="90%" height={13} />
        <SkeletonBox width="40%" height={10} />
        <SkeletonBox width="50%" height={16} radius={RADIUS.sm} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <View style={{ gap: 14, padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[skStyles.card, { flexDirection: 'row', gap: 14 }]}>
          <SkeletonBox width={80} height={80} radius={RADIUS.md} />
          <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
            <SkeletonBox width="70%" height={13} />
            <SkeletonBox width="50%" height={10} />
            <SkeletonBox width="40%" height={16} radius={RADIUS.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'search-outline', title, subtitle, action, onAction }) {
  return (
    <View style={esStyles.container}>
      <View style={esStyles.iconWrap}>
        <Ionicons name={icon} size={40} color={COLORS.primaryLight} />
      </View>
      <Text style={esStyles.title}>{title}</Text>
      {subtitle && <Text style={esStyles.subtitle}>{subtitle}</Text>}
      {action && (
        <View style={esStyles.actionBtn}>
          <Text style={esStyles.actionText} onPress={onAction}>{action}</Text>
        </View>
      )}
    </View>
  );
}

const esStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 10 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: TYPE.size.md, fontWeight: TYPE.weight.bold, color: COLORS.textDark, textAlign: 'center' },
  subtitle: { fontSize: TYPE.size.sm, color: COLORS.textMedium, textAlign: 'center', lineHeight: 20 },
  actionBtn: {
    marginTop: 8, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 10,
  },
  actionText: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, color: COLORS.textWhite },
});

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  available:  { bg: COLORS.successLight, text: COLORS.success, dot: COLORS.success,  label: 'Available' },
  busy:       { bg: COLORS.errorLight,   text: COLORS.error,   dot: COLORS.error,    label: 'Busy' },
  verified:   { bg: COLORS.primaryPale,  text: COLORS.primary, dot: null,            icon: 'shield-checkmark' },
  new:        { bg: COLORS.tealPale,     text: COLORS.tealDark,dot: null,            label: 'New' },
  offer:      { bg: COLORS.errorLight,   text: COLORS.error,   dot: null,            label: 'SALE' },
  booking:    { bg: COLORS.goldPale,     text: '#92610A',      dot: COLORS.gold,     label: 'Booking Open' },
};

export function StatusBadge({ type = 'available', label, small }) {
  const cfg = STATUS_MAP[type] || STATUS_MAP.available;
  const sz = small ? { paddingHorizontal: 8, paddingVertical: 3 } : { paddingHorizontal: 11, paddingVertical: 5 };
  return (
    <View style={[bdStyles.badge, { backgroundColor: cfg.bg }, sz]}>
      {cfg.dot && <View style={[bdStyles.dot, { backgroundColor: cfg.dot }]} />}
      {cfg.icon && <Ionicons name={cfg.icon} size={small ? 11 : 13} color={cfg.text} />}
      <Text style={[bdStyles.text, { color: cfg.text }, small && { fontSize: 10 }]}>
        {label || cfg.label}
      </Text>
    </View>
  );
}

const bdStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: TYPE.weight.bold },
});

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ icon, title, color, right }) {
  return (
    <View style={shStyles.row}>
      <View style={[shStyles.iconWrap, { backgroundColor: (color || COLORS.primary) + '18' }]}>
        <Ionicons name={icon} size={17} color={color || COLORS.primary} />
      </View>
      <Text style={shStyles.title}>{title}</Text>
      {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  iconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: TYPE.size.base, fontWeight: TYPE.weight.black, color: COLORS.textDark },
});

// ── Pill chip ─────────────────────────────────────────────────────────────────
export function PillChip({ label, icon, color, active, onPress }) {
  const bg = active ? (color || COLORS.primary) : COLORS.surface;
  const fg = active ? COLORS.textWhite : (color || COLORS.textBody);
  const border = active ? (color || COLORS.primary) : COLORS.border;
  return (
    <View
      style={[pcStyles.chip, { backgroundColor: bg, borderColor: border }]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
    >
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text style={[pcStyles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const pcStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: RADIUS.full, borderWidth: 1.5,
  },
  label: { fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold },
});

// ── Price tag ─────────────────────────────────────────────────────────────────
export function PriceTag({ price, mrp, size = 'md' }) {
  const isLg = size === 'lg';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={{ fontSize: isLg ? 22 : 17, fontWeight: TYPE.weight.black, color: COLORS.primary }}>
        ₹{Number(price).toLocaleString()}
      </Text>
      {mrp && mrp > price && (
        <Text style={{ fontSize: isLg ? 13 : 11, color: COLORS.textMedium, textDecorationLine: 'line-through' }}>
          ₹{Number(mrp).toLocaleString()}
        </Text>
      )}
    </View>
  );
}
