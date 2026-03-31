import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, Image } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

import { useGameStore } from '@/store/gameStore';
import { usePoseEngine, MEDIAPIPE_WEBVIEW_HTML } from '@/hooks/usePoseEngine';
import { AuthColors, Fonts } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';

export default function CombatScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const battle = useGameStore((s) => s.battle);
  const registerRep = useGameStore((s) => s.registerRep);
  const resolveBattle = useGameStore((s) => s.resolveBattle);
  const setBattleActive = useGameStore((s) => s.setBattleActive);

  const [countdown, setCountdown] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(battle?.enemy.timeLimit || 60);

  const damageAnim = useRef(new Animated.Value(0)).current; // For floating damage
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
        setBattleActive();
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
      const repsScored = repCount - prevRepsRef.current;
      prevRepsRef.current = repCount;

      for (let i = 0; i < repsScored; i++) {
        registerRep();
      }

      // Flash & Damage animation
      damageAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(attackFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.timing(attackFlashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.timing(damageAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });

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

  const damageTranslateY = damageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });
  const damageOpacity = damageAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  const hpPercent = Math.max(0, Math.min(100, (battle.enemyHpRemaining / battle.enemy.hp) * 100));

  const formatTimeMinutesStr = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
          mediaCapturePermissionGrantType="grant"
          onMessage={(event) => processPoseData(event.nativeEvent.data)}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
        {/* CRT Scanline Overlay from Stitch (CSS gradient recreation) */}
        <View style={styles.scanlines} pointerEvents="none" />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.attackFlash, { opacity: flashOpacity }]} pointerEvents="none" />



      {/* TOP HUD ROW (Enemy Info + Timer) */}
      <View style={styles.topHudContainer} pointerEvents="box-none">

        <View style={styles.enemyCard}>
          <View style={styles.enemyCardInner}>
            <View style={styles.enemyAvatarWrapper}>
              <View style={styles.enemyAvatarPlaceholder} />
            </View>
            <View style={styles.enemyInfoBlock}>
              <Text style={styles.enemyName}>{battle.enemy.name.toUpperCase().replace(' ', '_')}</Text>
              <View style={styles.heartsRow}>
                <MaterialIcons name="favorite" size={12} color={AuthColors.crimson} />
                <MaterialIcons name="favorite" size={12} color={AuthColors.crimson} />
                <MaterialIcons name="favorite" size={12} color={AuthColors.crimson} />
                <MaterialIcons name="favorite" size={12} color="#CBD5E1" />
              </View>
              <View style={styles.hpBarBg}>
                <View style={[styles.hpBarFill, { width: `${hpPercent}%` }]} />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.fleeBtn}
            activeOpacity={0.7}
            onPress={() => { resolveBattle('defeat'); router.replace('/post-battle'); }}>
            <Text style={styles.fleeBtnText}>FLEE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>TIMER</Text>
          <Text style={styles.timerValue}>{formatTimeMinutesStr(localSeconds)}</Text>
        </View>

      </View>

      {/* FLOATING DAMAGE TEXT */}
      <Animated.View style={[styles.damageContainer, { opacity: damageOpacity, transform: [{ translateY: damageTranslateY }] }]} pointerEvents="none">
        <Text style={styles.damageText}>-10</Text>
      </Animated.View>

      {/* BOTTOM HUD (Rep Counters) */}
      <View style={styles.repCounterContainer} pointerEvents="box-none">
        <View style={styles.repsLeftCard}>
          <Text style={styles.repsLeftValue}>{Math.max(0, battle.enemy.repsRequired - repCount)}</Text>
          <View style={styles.dividerThin} />
          <Text style={styles.repsLeftLabel}>LEFT</Text>
        </View>

        <View style={styles.mainRepCard}>
          <Text style={styles.mainRepValue}>{repCount}</Text>
          <View style={styles.dividerThick} />
          <Text style={styles.mainRepLabel}>REPS</Text>
        </View>
      </View>

      {/* COMBO INDICATOR */}
      {repState === 'down' && (
        <View style={styles.comboContainer} pointerEvents="none">
          <View style={styles.comboCard}>
            <Text style={styles.comboText}>PERFECT!</Text>
          </View>
        </View>
      )}

      {/* COUNTDOWN OVERLAY */}
      {!isActive && countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownValue}>{countdown}</Text>
          <Text style={styles.countdownSubtitle}>GET READY</Text>
        </View>
      )}

      {/* VISIBILITY WARNING */}
      {isActive && !isBodyVisible && (
        <View style={styles.visWarning} pointerEvents="none">
          <Text style={styles.visWarningText}>⚠ Body not detected</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 52, 65, 0.2)',
  },
  attackFlash: { backgroundColor: AuthColors.white, zIndex: 10 },

  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: AuthColors.bg,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
    elevation: 4, // shadow for android
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    zIndex: 50,
  },
  topAppBarText: {
    fontFamily: Fonts.vt323,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 18,
    color: AuthColors.crimson,
  },
  topBattleMode: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.crimson,
  },

  topHudContainer: {
    position: 'absolute',
    top: 64, // below app bar
    left: '50%',
    transform: [{ translateX: -190 }], // center horizontally
    width: 380,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 40,
  },

  enemyCard: {
    flex: 1,
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enemyCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enemyAvatarWrapper: {
    width: 48,
    height: 48,
    borderWidth: 3,
    borderColor: '#123441',
    backgroundColor: '#c6e8f8',
    padding: 4,
  },
  enemyAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#6fd8c8',
  },
  enemyInfoBlock: {},
  enemyName: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#123441',
    marginBottom: 4,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  hpBarBg: {
    width: 96,
    height: 12,
    backgroundColor: '#E2E8F0', // slate-200
    borderWidth: 2,
    borderColor: '#123441',
    marginTop: 4,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: AuthColors.crimson,
  },
  fleeBtn: {
    backgroundColor: '#E2E8F0',
    borderWidth: 3,
    borderColor: '#123441',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#123441',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  fleeBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#123441',
  },

  timerCard: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#123441',
    marginBottom: 2,
  },
  timerValue: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.crimson,
  },

  damageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -48 }, { translateY: -96 }], // roughly centered
    zIndex: 60,
  },
  damageText: {
    fontFamily: Fonts.pixel,
    fontSize: 32,
    color: AuthColors.crimson,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
    fontStyle: 'italic',
  },

  repCounterContainer: {
    position: 'absolute',
    bottom: 120, // matching bottom-32 equivalent
    left: '50%',
    transform: [{ translateX: -100 }], // manual centering
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 40,
  },
  repsLeftCard: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 8,
    minWidth: 80,
    alignItems: 'center',
    marginBottom: 4, // slight baseline offset
  },
  repsLeftValue: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    color: '#006A60', // Teal/secondary
  },
  dividerThin: {
    height: 2,
    backgroundColor: '#123441',
    width: '100%',
    marginTop: 4,
    marginBottom: 2,
  },
  repsLeftLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    letterSpacing: 2,
    color: '#123441',
  },

  mainRepCard: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  mainRepValue: {
    fontFamily: Fonts.pixel,
    fontSize: 56,
    color: AuthColors.crimson,
    marginBottom: 4,
  },
  dividerThick: {
    height: 3,
    backgroundColor: '#123441',
    width: '100%',
    marginBottom: 4,
  },
  mainRepLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    letterSpacing: 4,
    color: '#123441',
  },

  comboContainer: {
    position: 'absolute',
    right: 24,
    bottom: 144, // matching bottom-36
    alignItems: 'center',
    zIndex: 50,
  },
  comboCard: {
    backgroundColor: AuthColors.gold, // tertiary
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 8,
    transform: [{ rotate: '12deg' }],
  },
  comboText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.white,
  },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,52,65,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  countdownValue: {
    fontFamily: Fonts.pixel,
    fontSize: 100,
    color: AuthColors.bg,
    textShadowColor: AuthColors.navy,
    textShadowOffset: { width: 8, height: 8 },
    textShadowRadius: 0,
  },
  countdownSubtitle: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    letterSpacing: 8,
    color: AuthColors.crimson,
    marginTop: 16,
  },

  visWarning: {
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    backgroundColor: AuthColors.crimson,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 80,
  },
  visWarningText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: AuthColors.white,
    letterSpacing: 1,
  },

  permScreen: {
    flex: 1,
    backgroundColor: AuthColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy, marginBottom: 16, textAlign: 'center', lineHeight: 24 },
  permBody: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C', textAlign: 'center', marginBottom: 32 },
  permBtn: { backgroundColor: AuthColors.crimson, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 3, borderColor: AuthColors.navy, shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  permBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: AuthColors.white },
});