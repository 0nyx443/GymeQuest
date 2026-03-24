/**
 * RepCounter.tsx
 *
 * Displays the real-time rep count with a flash animation on each new rep,
 * a colour-coded progress ring, and triggers haptic feedback.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Fonts, Radius } from '@/constants/theme';

interface RepCounterProps {
  reps: number;
  required: number;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RepCounter({ reps, required, size = 120 }: RepCounterProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevReps = useRef(reps);

  const progress = Math.min(reps / required, 1);
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const progressColor =
    progress >= 1 ? Colors.hpGreen :
    progress >= 0.6 ? Colors.teal :
    progress >= 0.3 ? Colors.amber :
    Colors.textMuted;

  useEffect(() => {
    if (reps > prevReps.current) {
      // Haptic punch on each rep
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Scale flash animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
      ]).start();

      // Gold flash
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    prevReps.current = reps;
  }, [reps]);

  const flashColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(200,146,42,0)', 'rgba(200,146,42,0.4)'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Flash overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.flash,
          { borderRadius: size / 2, backgroundColor: flashColor },
        ]}
      />

      {/* Progress ring */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={6}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={6}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>

      {/* Rep numbers */}
      <View style={styles.textBlock}>
        <Text style={[styles.repNumber, { color: progressColor }]}>{reps}</Text>
        <Text style={styles.repDenom}>/{required}</Text>
        <Text style={styles.repLabel}>REPS</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    zIndex: 1,
  },
  textBlock: {
    alignItems: 'center',
    zIndex: 2,
  },
  repNumber: {
    fontFamily: Fonts.display,
    fontSize: 36,
    lineHeight: 38,
  },
  repDenom: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  repLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
});
