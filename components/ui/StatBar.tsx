import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: string;
  showValue?: boolean;
}

export function StatBar({ label, value, max = 100, color, showValue = true }: StatBarProps) {
  const pct = Math.min(value / max, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {showValue && (
          <Text style={[styles.value, { color }]}>{value}</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

interface HpBarProps {
  current: number;
  max: number;
  label?: string;
  thick?: boolean;
}

export function HpBar({ current, max, label, thick = false }: HpBarProps) {
  const pct = Math.max(0, Math.min(current / max, 1));
  const color =
    pct > 0.5 ? Colors.hpGreen :
    pct > 0.25 ? Colors.hpYellow :
    Colors.hpRed;

  return (
    <View>
      {label && (
        <View style={styles.hpHeader}>
          <Text style={styles.hpLabel}>{label}</Text>
          <Text style={[styles.hpValue, { color }]}>{current} / {max}</Text>
        </View>
      )}
      <View style={[styles.hpTrack, thick && styles.hpTrackThick]}>
        <View
          style={[
            styles.hpFill,
            thick && styles.hpFillThick,
            { width: `${pct * 100}%` as any, backgroundColor: color },
          ]}
        />
        {/* Segment dividers every 25% */}
        {[0.25, 0.5, 0.75].map((mark) => (
          <View
            key={mark}
            style={[styles.segment, { left: `${mark * 100}%` as any }]}
          />
        ))}
      </View>
    </View>
  );
}

interface XpBarProps {
  progress: number; // 0-1
  currentXp: number;
  nextXp: number;
}

export function XpBar({ progress, currentXp, nextXp }: XpBarProps) {
  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <Text style={styles.xpLabel}>EXP</Text>
        <Text style={styles.xpValue}>
          {currentXp} / {nextXp}
        </Text>
      </View>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 6 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.borderFaint,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // HP bar
  hpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hpLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hpValue: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  hpTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  hpTrackThick: { height: 16, borderRadius: 6 },
  hpFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: Radius.full,
  },
  hpFillThick: { borderRadius: 6 },
  segment: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // XP bar
  xpContainer: { marginVertical: 4 },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  xpLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  xpValue: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.xpBlue,
  },
  xpTrack: {
    height: 8,
    backgroundColor: 'rgba(68,136,255,0.1)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(68,136,255,0.2)',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.xpBlue,
    borderRadius: Radius.full,
    shadowColor: Colors.xpBlue,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
