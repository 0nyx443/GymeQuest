/**
 * screens/CombatScreen.tsx
 *
 * The live battle arena. Layers:
 *  1. CameraView (expo-camera) — full-screen camera feed
 *  2. PoseWireframe SVG overlay — real-time skeleton
 *  3. Game HUD — enemy HP, countdown timer, rep counter
 *  4. Attack flash effect — triggered on each validated rep
 *
 * MediaPipe frames flow:
 *  CameraView → onCameraReady/captureInterval → base64 JPEG
 *  → hidden WebView (MEDIAPIPE_WEBVIEW_HTML) → onMessage
 *  → usePoseEngine processes landmarks → repCount updates
 *  → registerRep() called in game store
 */
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store/gameStore';
import { usePoseEngine } from '@/hooks/usePoseEngine';
import { PoseWireframe } from '@/components/combat/PoseWireframe';
import { RepCounter } from '@/components/combat/RepCounter';
import { CombatTimer } from '@/components/combat/CombatTimer';
import { HpBar } from '@/components/ui/StatBar';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';

const { width: W, height: H } = Dimensions.get('window');

// Countdown phases before battle starts
const COUNTDOWN_BEATS = [3, 2, 1, 0];

export default function CombatScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const battle = useGameStore((s) => s.battle);
  const registerRep = useGameStore((s) => s.registerRep);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const resolveBattle = useGameStore((s) => s.resolveBattle);

  const [countdown, setCountdown] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const attackFlashAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRepsRef = useRef(0);

  const exercise = battle?.enemy.exercise ?? 'push_up';
  const exerciseDef = EXERCISES[exercise];

  // ── Pose engine ──
  const {
    landmarks, primaryAngle, repCount, formScore,
    isBodyVisible, resetReps,
  } = usePoseEngine(exercise, isActive);

  // ── Countdown sequence ──
  useEffect(() => {
    if (!battle || battle.phase !== 'countdown') return;
    let tick = 3;
    const cd = setInterval(() => {
      tick--;
      setCountdown(tick);
      if (tick <= 0) {
        clearInterval(cd);
        setIsActive(true);
      }
    }, 1000);
    return () => clearInterval(cd);
  }, [battle?.phase]);

  // ── Game timer (1-second tick) ──
  useEffect(() => {
    if (!isActive) return;
    timerRef.current = setInterval(tickTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, tickTimer]);

  // ── Rep detection → game store ──
  useEffect(() => {
    if (!isActive || !battle) return;
    if (repCount > prevRepsRef.current) {
      prevRepsRef.current = repCount;
      registerRep();

      // Attack flash
      Animated.sequence([
        Animated.timing(attackFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(attackFlashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      // Heavy haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [repCount, isActive]);

  // ── Battle resolution ──
  useEffect(() => {
    if (!battle) return;
    if (battle.phase === 'victory' || battle.phase === 'defeat') {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      resolveBattle(battle.phase);
      // Navigate after a short pause
      setTimeout(() => router.replace('/post-battle'), 800);
    }
  }, [battle?.phase]);

  // Camera permission gate
  if (!permission?.granted) {
    return (
      <View style={styles.permScreen}>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permBody}>
          GYME Quest uses your camera for real-time pose estimation.
          All processing happens on-device — nothing leaves your phone.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!battle) return null;

  const hpPct = battle.enemyHpRemaining / battle.enemy.hp;

  const flashOpacity = attackFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <View style={styles.screen}>
      {/* ── Camera Feed ── */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="front"
        ratio="16:9"
      />

      {/* ── Scan-line overlay ── */}
      <View style={styles.scanlineOverlay} pointerEvents="none" />

      {/* ── Pose Wireframe ── */}
      <PoseWireframe
        landmarks={landmarks}
        formScore={formScore}
        width={W}
        height={H}
      />

      {/* ── Attack Flash ── */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.attackFlash,
          { opacity: flashOpacity },
        ]}
        pointerEvents="none"
      />

      {/* ── TOP HUD: Enemy HP ── */}
      <LinearGradient
        colors={['rgba(6,6,15,0.92)', 'rgba(6,6,15,0.5)', 'transparent']}
        style={styles.topHud}
        pointerEvents="none"
      >
        <View style={styles.enemyHudRow}>
          <View style={styles.enemyHudLeft}>
            <Text style={styles.enemyName}>{battle.enemy.name}</Text>
            <Text style={styles.enemyTitle}>{battle.enemy.title}</Text>
          </View>
          <View style={[styles.enemyTypePill, { borderColor: battle.enemy.color }]}>
            <Text style={[styles.enemyTypeText, { color: battle.enemy.color }]}>
              BOSS
            </Text>
          </View>
        </View>
        <HpBar
          current={Math.round(battle.enemyHpRemaining)}
          max={battle.enemy.hp}
          thick
        />
      </LinearGradient>

      {/* ── MIDDLE: Countdown overlay ── */}
      {!isActive && countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownSub}>GET READY</Text>
          <Text style={styles.countdownExercise}>{exerciseDef.label.toUpperCase()}</Text>
          <Text style={styles.countdownDesc}>{exerciseDef.description}</Text>
        </View>
      )}

      {/* ── BODY NOT VISIBLE warning ── */}
      {isActive && !isBodyVisible && (
        <View style={styles.visWarning} pointerEvents="none">
          <Text style={styles.visWarningText}>⚠ Body not detected — adjust position</Text>
        </View>
      )}

      {/* ── BOTTOM HUD ── */}
      <LinearGradient
        colors={['transparent', 'rgba(6,6,15,0.6)', 'rgba(6,6,15,0.95)']}
        style={styles.bottomHud}
        pointerEvents="box-none"
      >
        {/* Exercise info */}
        <View style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exerciseDef.label.toUpperCase()}</Text>
          <View style={styles.angleChip}>
            <Text style={styles.angleLabel}>ANGLE</Text>
            <Text style={styles.angleValue}>{primaryAngle}°</Text>
          </View>
        </View>

        {/* Main instruments row */}
        <View style={styles.instrumentsRow}>
          {/* Timer */}
          <CombatTimer
            seconds={battle.secondsRemaining}
            totalSeconds={battle.enemy.timeLimit}
          />

          {/* Rep counter */}
          <RepCounter
            reps={battle.repsCompleted}
            required={battle.enemy.repsRequired}
            size={130}
          />

          {/* XP preview */}
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewLabel}>REWARD</Text>
            <Text style={styles.xpPreviewVal}>+{battle.enemy.xpReward}</Text>
            <Text style={styles.xpPreviewXp}>XP</Text>
          </View>
        </View>

        {/* Abort button */}
        <TouchableOpacity
          style={styles.abortBtn}
          onPress={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            resolveBattle('defeat');
            router.replace('/post-battle');
          }}
        >
          <Text style={styles.abortText}>RETREAT</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Scanline CRT effect
  scanlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(29,184,160,0.012) 3px,rgba(29,184,160,0.012) 4px)',
  } as any,

  // Attack flash
  attackFlash: {
    backgroundColor: Colors.gold,
    zIndex: 10,
  },

  // TOP HUD
  topHud: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: Spacing.xl,
  },
  enemyHudRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  enemyHudLeft: {},
  enemyName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.textHero,
  },
  enemyTitle: {
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  enemyTypePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  enemyTypeText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Countdown
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,6,15,0.7)',
  },
  countdownNumber: {
    fontFamily: Fonts.display,
    fontSize: 120,
    color: Colors.gold,
    lineHeight: 120,
    textShadowColor: Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  countdownSub: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 6,
    marginTop: 8,
  },
  countdownExercise: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.teal,
    marginTop: 24,
    letterSpacing: 3,
  },
  countdownDesc: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // Visibility warning
  visWarning: {
    position: 'absolute',
    top: H * 0.38,
    alignSelf: 'center',
    backgroundColor: 'rgba(192,40,42,0.85)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  visWarningText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // BOTTOM HUD
  bottomHud: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: Spacing.xl,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 3,
  },
  angleChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },
  angleLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  angleValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '700',
  },

  // Instruments
  instrumentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  // XP preview
  xpPreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,146,42,0.2)',
  },
  xpPreviewLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  xpPreviewVal: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.gold,
  },
  xpPreviewXp: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.goldDim,
    letterSpacing: 2,
  },

  // Abort
  abortBtn: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(192,40,42,0.35)',
    borderRadius: Radius.full,
  },
  abortText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.crimson,
    letterSpacing: 3,
  },

  // Permission screen
  permScreen: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textHero,
    marginBottom: 16,
  },
  permBody: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.bgVoid,
    letterSpacing: 1,
  },
});
