/**
 * AvatarDisplay.tsx
 *
 * Renders the player's procedurally-styled RPG avatar using react-native-svg.
 * Avatar visuals evolve with player level — armour gets more elaborate,
 * aura colour shifts, and a level glow ring intensifies.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, {
  Circle, Ellipse, Rect, Path, Defs,
  RadialGradient, Stop, G, Polygon,
} from 'react-native-svg';
import { Colors, Fonts, Radius } from '@/constants/theme';

interface AvatarDisplayProps {
  level: number;
  size?: number;
  animated?: boolean;
}

function getAuraColor(level: number): string {
  if (level >= 9) return Colors.gold;
  if (level >= 7) return Colors.crimson;
  if (level >= 5) return Colors.teal;
  if (level >= 3) return Colors.violet;
  return '#4488AA';
}

function getArmourTier(level: number): 'novice' | 'warrior' | 'champion' | 'legend' {
  if (level >= 8) return 'legend';
  if (level >= 5) return 'champion';
  if (level >= 3) return 'warrior';
  return 'novice';
}

export function AvatarDisplay({ level, size = 120, animated = true }: AvatarDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const auraColor = getAuraColor(level);
  const tier = getArmourTier(level);

  useEffect(() => {
    if (!animated) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [animated]);

  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  return (
    <Animated.View style={{ transform: [{ scale: animated ? pulseAnim : 1 }] }}>
      {/* Aura glow ring */}
      <View
        style={[
          styles.auraRing,
          {
            width: s + 20,
            height: s + 20,
            borderRadius: (s + 20) / 2,
            borderColor: auraColor,
            opacity: 0.35,
            shadowColor: auraColor,
          },
        ]}
      />

      {/* Avatar frame circle */}
      <View
        style={[
          styles.avatarFrame,
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            borderColor: auraColor,
          },
        ]}
      >
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <Defs>
            <RadialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#2A2060" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0A0A18" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="auraGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={auraColor} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={auraColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Background */}
          <Circle cx={cx} cy={cy} r={s / 2} fill="url(#bodyGrad)" />
          <Circle cx={cx} cy={cy} r={s / 2 - 2} fill="url(#auraGrad)" />

          {/* ── Character body ── */}
          {/* Head */}
          <Circle cx={cx} cy={cy * 0.52} r={s * 0.14} fill="#D4A882" />

          {/* Neck */}
          <Rect
            x={cx - s * 0.04} y={cy * 0.66}
            width={s * 0.08} height={s * 0.06}
            fill="#C49870"
          />

          {/* Body / torso armour */}
          {tier === 'novice' && (
            <Rect
              x={cx - s * 0.16} y={cy * 0.72}
              width={s * 0.32} height={s * 0.28}
              rx={4} fill="#2A3550"
            />
          )}
          {tier === 'warrior' && (
            <G>
              <Rect
                x={cx - s * 0.17} y={cy * 0.72}
                width={s * 0.34} height={s * 0.28}
                rx={4} fill="#3A4A6A"
              />
              {/* Chest plate */}
              <Rect
                x={cx - s * 0.12} y={cy * 0.74}
                width={s * 0.24} height={s * 0.14}
                rx={3} fill="#4A6090"
              />
            </G>
          )}
          {tier === 'champion' && (
            <G>
              <Rect
                x={cx - s * 0.18} y={cy * 0.71}
                width={s * 0.36} height={s * 0.29}
                rx={5} fill="#3A3A5A"
              />
              <Rect
                x={cx - s * 0.13} y={cy * 0.73}
                width={s * 0.26} height={s * 0.15}
                rx={3} fill={Colors.teal} opacity={0.7}
              />
              {/* Shoulder pads */}
              <Circle cx={cx - s * 0.2} cy={cy * 0.76} r={s * 0.06} fill="#5A5A8A" />
              <Circle cx={cx + s * 0.2} cy={cy * 0.76} r={s * 0.06} fill="#5A5A8A" />
            </G>
          )}
          {tier === 'legend' && (
            <G>
              <Rect
                x={cx - s * 0.2} y={cy * 0.70}
                width={s * 0.40} height={s * 0.30}
                rx={6} fill="#2A1A40"
              />
              <Rect
                x={cx - s * 0.14} y={cy * 0.72}
                width={s * 0.28} height={s * 0.16}
                rx={4} fill={Colors.gold} opacity={0.5}
              />
              {/* Gold shoulder guards */}
              <Rect
                x={cx - s * 0.26} y={cy * 0.70}
                width={s * 0.10} height={s * 0.12}
                rx={4} fill={Colors.gold}
              />
              <Rect
                x={cx + s * 0.16} y={cy * 0.70}
                width={s * 0.10} height={s * 0.12}
                rx={4} fill={Colors.gold}
              />
              {/* Gem in chest */}
              <Circle cx={cx} cy={cy * 0.80} r={s * 0.04} fill={Colors.crimson} />
            </G>
          )}

          {/* Arms */}
          <Rect
            x={cx - s * 0.28} y={cy * 0.72}
            width={s * 0.09} height={s * 0.22}
            rx={4}
            fill={tier === 'legend' ? Colors.gold : tier === 'champion' ? '#5A5A8A' : '#2A3550'}
          />
          <Rect
            x={cx + s * 0.19} y={cy * 0.72}
            width={s * 0.09} height={s * 0.22}
            rx={4}
            fill={tier === 'legend' ? Colors.gold : tier === 'champion' ? '#5A5A8A' : '#2A3550'}
          />

          {/* Hair / helmet */}
          {tier === 'novice' && (
            <Ellipse cx={cx} cy={cy * 0.43} rx={s * 0.14} ry={s * 0.07} fill="#3A2A10" />
          )}
          {tier !== 'novice' && (
            <G>
              <Ellipse cx={cx} cy={cy * 0.41} rx={s * 0.15} ry={s * 0.08}
                fill={tier === 'legend' ? Colors.gold : '#4A5A7A'}
              />
              {tier === 'legend' && (
                <Polygon
                  points={`${cx},${cy * 0.28} ${cx - s * 0.06},${cy * 0.40} ${cx + s * 0.06},${cy * 0.40}`}
                  fill={Colors.gold}
                />
              )}
            </G>
          )}

          {/* Eyes */}
          <Circle cx={cx - s * 0.05} cy={cy * 0.53} r={s * 0.025} fill={auraColor} />
          <Circle cx={cx + s * 0.05} cy={cy * 0.53} r={s * 0.025} fill={auraColor} />

          {/* Level ring */}
          <Circle
            cx={cx} cy={cy}
            r={s / 2 - 1}
            fill="none"
            stroke={auraColor}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  auraRing: {
    position: 'absolute',
    top: -10, left: -10,
    borderWidth: 1,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarFrame: {
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0A0A18',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
