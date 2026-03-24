import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

interface CombatTimerProps {
  seconds: number;
  totalSeconds: number;
}

export function CombatTimer({ seconds, totalSeconds }: CombatTimerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const pct = seconds / totalSeconds;

  const color =
    pct > 0.5 ? Colors.textHero :
    pct > 0.25 ? Colors.amber :
    Colors.textDanger;

  // Pulse when time is low
  useEffect(() => {
    if (seconds <= 10 && seconds > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [seconds]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Text style={styles.label}>TIME</Text>
      <Text style={[styles.time, { color }]}>{timeStr}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 3,
  },
  time: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 36,
  },
});
