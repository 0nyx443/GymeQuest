import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useCameraPermissions } from 'expo-camera'; 
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store/gameStore';
import { usePoseEngine, MEDIAPIPE_WEBVIEW_HTML } from '@/hooks/usePoseEngine';
import { RepCounter } from '@/components/combat/RepCounter';
import { CombatTimer } from '@/components/combat/CombatTimer';
import { HpBar } from '@/components/ui/StatBar';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';

export default function CombatScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const battle = useGameStore((s) => s.battle);
  const registerRep = useGameStore((s) => s.registerRep);
  const resolveBattle = useGameStore((s) => s.resolveBattle);
  const setBattleActive = useGameStore((s) => s.setBattleActive); // <-- NEW!

  const [countdown, setCountdown] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(battle?.enemy.timeLimit || 60);

  const attackFlashAnim = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRepsRef = useRef(0);
  const webViewRef = useRef<WebView>(null);

  const exercise = battle?.enemy.exercise ?? 'push_up';
  const exerciseDef = EXERCISES[exercise];

  const {
    primaryAngle, repState, repCount,
    isBodyVisible, processPoseData, debugMsg,
  } = usePoseEngine(exercise, isActive);

  // ── Countdown ──
  useEffect(() => {
    if (!battle || battle.phase !== 'countdown') return;
    let tick = 3;
    const cd = setInterval(() => {
      tick--;
      setCountdown(tick);
      if (tick <= 0) {
        clearInterval(cd);
        setIsActive(true);
        setBattleActive(); // <-- Tells the store to unlock and accept reps!
      }
    }, 1000);
    return () => clearInterval(cd);
  }, [battle?.phase, setBattleActive]);

  // ── Guaranteed Local Timer ──
  useEffect(() => {
    if (!isActive) return;
    
    timerIntervalRef.current = setInterval(() => {
      setLocalSeconds((prev) => {
        if (prev <= 1) {
          resolveBattle('defeat');
          router.replace('/post-battle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => { 
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); 
    };
  }, [isActive, resolveBattle, router]);

  // ── Guaranteed Rep Check & Flash ──
  useEffect(() => {
    if (!isActive || !battle) return;
    
    if (repCount > prevRepsRef.current) {
      // Catch how many reps were done (usually 1, but this prevents dropped frames)
      const repsScored = repCount - prevRepsRef.current;
      prevRepsRef.current = repCount;
      
      for (let i = 0; i < repsScored; i++) {
        registerRep(); // Now the global store will actually listen to this!
      }

      Animated.sequence([
        Animated.timing(attackFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(attackFlashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Check for Victory
      if (repCount >= battle.enemy.repsRequired) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setIsActive(false);
        resolveBattle('victory');
        setTimeout(() => router.replace('/post-battle'), 800);
      }
    }
  }, [repCount, isActive, battle, registerRep, resolveBattle, router]);

  if (!permission?.granted) {
    return (
      <View style={styles.permScreen}>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permBody}>GYME Quest uses your camera for real-time pose estimation.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!battle) return null;

  const flashOpacity = attackFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <View style={styles.screen}>
      
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webViewRef}
          source={{ html: MEDIAPIPE_WEBVIEW_HTML, baseUrl: 'https://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}       
          mediaPlaybackRequiresUserAction={false} 
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          style={{ flex: 1, backgroundColor: '#000' }}
          onError={(e) => processPoseData(JSON.stringify({ log: `WV Error: ${e.nativeEvent.description}` }))}
          onHttpError={(e) => processPoseData(JSON.stringify({ log: `HTTP Error: ${e.nativeEvent.statusCode}` }))}
          onMessage={(event) => processPoseData(event.nativeEvent.data)}
        />
      </View>

      <View style={styles.debugMonitor}>
        <Text style={styles.debugText}>{debugMsg}</Text>
        <Text style={[styles.debugText, { color: repState === 'down' ? Colors.crimson : Colors.gold }]}>
          STATE: {repState.toUpperCase()}
        </Text>
      </View>

      <View style={styles.scanlineOverlay} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, styles.attackFlash, { opacity: flashOpacity }]} pointerEvents="none" />

      <LinearGradient colors={['rgba(6,6,15,0.92)', 'rgba(6,6,15,0.5)', 'transparent']} style={styles.topHud} pointerEvents="none">
        <View style={styles.enemyHudRow}>
          <View style={styles.enemyHudLeft}>
            <Text style={styles.enemyName}>{battle.enemy.name}</Text>
            <Text style={styles.enemyTitle}>{battle.enemy.title}</Text>
          </View>
        </View>
        <HpBar current={Math.round(battle.enemyHpRemaining)} max={battle.enemy.hp} thick />
      </LinearGradient>

      {!isActive && countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownSub}>GET READY</Text>
          <Text style={styles.countdownExercise}>{exerciseDef.label.toUpperCase()}</Text>
        </View>
      )}

      {isActive && !isBodyVisible && (
        <View style={styles.visWarning} pointerEvents="none">
          <Text style={styles.visWarningText}>⚠ Body not detected — adjust position</Text>
        </View>
      )}

      <LinearGradient colors={['transparent', 'rgba(6,6,15,0.6)', 'rgba(6,6,15,0.95)']} style={styles.bottomHud} pointerEvents="box-none">
        <View style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exerciseDef.label.toUpperCase()}</Text>
          <View style={styles.angleChip}>
            <Text style={styles.angleLabel}>ANGLE</Text>
            <Text style={styles.angleValue}>{primaryAngle}°</Text>
          </View>
        </View>
        <View style={styles.instrumentsRow}>
          
          <CombatTimer seconds={localSeconds} totalSeconds={battle.enemy.timeLimit} />
          <RepCounter reps={repCount} required={battle.enemy.repsRequired} size={130} />
          
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewLabel}>REWARD</Text>
            <Text style={styles.xpPreviewVal}>+{battle.enemy.xpReward}</Text>
            <Text style={styles.xpPreviewXp}>XP</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.abortBtn} onPress={() => { resolveBattle('defeat'); router.replace('/post-battle'); }}>
          <Text style={styles.abortText}>RETREAT</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scanlineOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(29,184,160,0.012) 3px,rgba(29,184,160,0.012) 4px)' } as any,
  attackFlash: { backgroundColor: Colors.gold, zIndex: 10 },
  topHud: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 48, paddingBottom: 20, paddingHorizontal: Spacing.xl },
  enemyHudRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  enemyHudLeft: {},
  enemyName: { fontFamily: Fonts.display, fontSize: 18, color: Colors.textHero },
  enemyTitle: { fontFamily: Fonts.ui, fontSize: 11, color: Colors.textMuted, letterSpacing: 1 },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,6,15,0.7)' },
  countdownNumber: { fontFamily: Fonts.display, fontSize: 120, color: Colors.gold, lineHeight: 120, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30 },
  countdownSub: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.textMuted, letterSpacing: 6, marginTop: 8 },
  countdownExercise: { fontFamily: Fonts.display, fontSize: 24, color: Colors.teal, marginTop: 24, letterSpacing: 3 },
  visWarning: { position: 'absolute', top: 80, alignSelf: 'center', backgroundColor: 'rgba(192,40,42,0.85)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, zIndex: 50 },
  visWarningText: { fontFamily: Fonts.mono, fontSize: 12, color: '#FFF', letterSpacing: 0.5 },
  bottomHud: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 40, paddingBottom: 32, paddingHorizontal: Spacing.xl },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { fontFamily: Fonts.display, fontSize: 13, color: Colors.gold, letterSpacing: 3 },
  angleChip: { flexDirection: 'row', alignItems: 'baseline', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.borderFaint },
  angleLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  angleValue: { fontFamily: Fonts.mono, fontSize: 14, color: Colors.teal, fontWeight: '700' },
  instrumentsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  xpPreview: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(200,146,42,0.2)' },
  xpPreviewLabel: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  xpPreviewVal: { fontFamily: Fonts.display, fontSize: 22, color: Colors.gold },
  xpPreviewXp: { fontFamily: Fonts.mono, fontSize: 9, color: Colors.goldDim, letterSpacing: 2 },
  abortBtn: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(192,40,42,0.35)', borderRadius: Radius.full },
  abortText: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.crimson, letterSpacing: 3 },
  permScreen: { flex: 1, backgroundColor: Colors.bgDeep, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.textHero, marginBottom: 16 },
  permBody: { fontFamily: Fonts.ui, fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permBtn: { backgroundColor: Colors.teal, borderRadius: Radius.full, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText: { fontFamily: Fonts.display, fontSize: 14, color: Colors.bgVoid, letterSpacing: 1 },
  debugMonitor: { position: 'absolute', top: 120, left: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.teal },
  debugText: { color: Colors.teal, fontFamily: Fonts.mono, fontSize: 12, letterSpacing: 1 },
});