import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store/gameStore';
import { usePoseEngine, MEDIAPIPE_WEBVIEW_HTML } from '@/hooks/usePoseEngine';
import { PoseWireframe } from '@/components/combat/PoseWireframe';
import { RepCounter } from '@/components/combat/RepCounter';
import { CombatTimer } from '@/components/combat/CombatTimer';
import { HpBar } from '@/components/ui/StatBar';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';

const { width: W, height: H } = Dimensions.get('window');

export default function CombatScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const battle = useGameStore((s) => s.battle);
  const registerRep = useGameStore((s) => s.registerRep);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const resolveBattle = useGameStore((s) => s.resolveBattle);

  const [countdown, setCountdown] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false); 
  const [camLog, setCamLog] = useState("Camera: Waiting"); 

  const attackFlashAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRepsRef = useRef(0);

  const cameraRef = useRef<CameraView>(null);
  const webViewRef = useRef<WebView>(null);
  const isProcessingRef = useRef(false);

  const exercise = battle?.enemy.exercise ?? 'push_up';
  const exerciseDef = EXERCISES[exercise];

  const {
    landmarks, primaryAngle, repCount, formScore,
    isBodyVisible, resetReps, processPoseData, debugMsg,
  } = usePoseEngine(exercise, isActive);

  // ── Camera Loop ──
  useEffect(() => {
    if (!isActive || !isCameraReady) return;
    
    let isMounted = true;

    const captureLoop = async () => {
      if (!isMounted) return;

      if (cameraRef.current && webViewRef.current && !isProcessingRef.current) {
        isProcessingRef.current = true;
        try {
          const pic = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.25,
          });
          
          if (pic && pic.base64 && isMounted) {
            const cleanBase64 = pic.base64.replace(/(\r\n|\n|\r)/gm, "");
            setCamLog(`Cam: Sent ${Math.round(cleanBase64.length / 1024)}KB`);
            
            webViewRef.current.injectJavaScript(`
              if (window.processFrame) {
                window.processFrame('${cleanBase64}');
              }
              true;
            `);
          }
        } catch (e: any) {
          setCamLog(`Cam Err: ${e.message || 'Unknown Crash'}`);
        } finally {
          isProcessingRef.current = false;
        }
      }

      if (isMounted) {
        setTimeout(captureLoop, 200); 
      }
    };

    captureLoop();
    return () => { isMounted = false; };
  }, [isActive, isCameraReady]);

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
      }
    }, 1000);
    return () => clearInterval(cd);
  }, [battle?.phase]);

  // ── Timer ──
  useEffect(() => {
    if (!isActive) return;
    timerRef.current = setInterval(tickTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, tickTimer]);

  // ── Rep Check ──
  useEffect(() => {
    if (!isActive || !battle) return;
    if (repCount > prevRepsRef.current) {
      prevRepsRef.current = repCount;
      registerRep();

      Animated.sequence([
        Animated.timing(attackFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(attackFlashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [repCount, isActive]);

  // ── Game Over ──
  useEffect(() => {
    if (!battle) return;
    if (battle.phase === 'victory' || battle.phase === 'defeat') {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      resolveBattle(battle.phase);
      setTimeout(() => router.replace('/post-battle'), 800);
    }
  }, [battle?.phase]);

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
      
      {/* ── 1. The Real Camera Background ── */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        ratio="16:9"
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* ── 2. X-RAY MODE (The MediaPipe Debugger Box) ── */}
      {/* We made this fully visible and placed it in the top right corner */}
      <View style={styles.xrayBox} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ html: MEDIAPIPE_WEBVIEW_HTML }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          style={{ backgroundColor: 'transparent' }}
          onError={(e) => processPoseData(JSON.stringify({ log: `WV Error: ${e.nativeEvent.description}` }))}
          onHttpError={(e) => processPoseData(JSON.stringify({ log: `HTTP Error: ${e.nativeEvent.statusCode}` }))}
          onMessage={(event) => processPoseData(event.nativeEvent.data)}
        />
        <Text style={styles.xrayLabel}>AI X-RAY</Text>
      </View>

      {/* ── ON-SCREEN DEBUG MONITOR ── */}
      <View style={styles.debugMonitor}>
        <Text style={styles.debugText}>MP Bridge: {debugMsg}</Text>
        <Text style={[styles.debugText, { marginTop: 4, color: Colors.gold }]}>{camLog}</Text>
      </View>

      <View style={styles.scanlineOverlay} pointerEvents="none" />
      <PoseWireframe landmarks={landmarks} formScore={formScore} width={W} height={H} />
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
          <CombatTimer seconds={battle.secondsRemaining} totalSeconds={battle.enemy.timeLimit} />
          <RepCounter reps={battle.repsCompleted} required={battle.enemy.repsRequired} size={130} />
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
  visWarning: { position: 'absolute', top: H * 0.38, alignSelf: 'center', backgroundColor: 'rgba(192,40,42,0.85)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
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
  debugMonitor: { position: 'absolute', top: 120, left: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.teal },
  debugText: { color: Colors.teal, fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1 },
  
  // NEW X-RAY STYLES
  xrayBox: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 140,
    zIndex: 999,
    borderWidth: 2,
    borderColor: Colors.teal,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111'
  },
  xrayLabel: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: Colors.teal,
    fontFamily: Fonts.mono,
    fontSize: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});