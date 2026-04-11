import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

import { useGameStore } from '@/store/gameStore';
// 1. ADDED AUDIO STORE IMPORT
import { useAudioStore, intensityToHaptic } from '@/store/audioStore';
import { usePoseEngine, MEDIAPIPE_WEBVIEW_HTML } from '@/hooks/usePoseEngine';
import { AuthColors, Fonts } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';

// Each tick = 100ms; body must be visible for 30 ticks (3 seconds) to confirm
const POSITION_TICKS_NEEDED = 30;

export default function CombatScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const battle        = useGameStore((s) => s.battle);
  const registerRep   = useGameStore((s) => s.registerRep);
  const resolveBattle = useGameStore((s) => s.resolveBattle);
  const setBattleActive = useGameStore((s) => s.setBattleActive);
  const resetBattle   = useGameStore((s) => s.resetBattle);
  
  // Inventory actions
  const inventory = useGameStore((s) => s.inventory);
  const consumeQueuedItem = useGameStore((s) => s.consumeQueuedItem);
  const applyItemToCurrentBattle = useGameStore((s) => s.applyItemToCurrentBattle);
  const catalog = useGameStore((s) => s.catalog);
  const avatar  = useGameStore((s) => s.avatar);

  const [countdown, setCountdown]         = useState(3);
  const [isActive, setIsActive]           = useState(false);
  const [localSeconds, setLocalSeconds]   = useState(battle?.enemy.timeLimit || 60);
  const [webViewReady, setWebViewReady]   = useState(false);
  const [showItemModal, setShowItemModal] = useState(!battle?.enemy.isEndurance && inventory.length > 0);

  // ── Positioning phase state ────────────────────────────────────────────────
  // 'waiting'  = overlay shown, waiting for user to get into position
  // 'detected' = body detected, filling confirm bar
  // 'ready'    = confirmed, starting countdown
  const [positionPhase, setPositionPhase] = useState<'waiting' | 'detected' | 'ready'>('waiting');
  const [detectProgress, setDetectProgress] = useState(0); // 0-100
  // Timer-based approach: poll isBodyVisible every 100ms via ref
  const confirmTicksRef    = useRef(0);
  const isBodyVisibleRef   = useRef(false);   // mirror of isBodyVisible for the interval
  const positionReadyRef   = useRef(false);   // prevents double-firing
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionPulseAnim  = useRef(new Animated.Value(1)).current;
  const positionFadeAnim   = useRef(new Animated.Value(1)).current;

  const damageAnim       = useRef(new Animated.Value(0)).current;
  const attackFlashAnim  = useRef(new Animated.Value(0)).current;
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRepsRef      = useRef(0);
  const lastRepTimeRef   = useRef(Date.now()); // For endurance inactivity tracking
  const webViewRef       = useRef<WebView>(null);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const phaseList = battle?.enemy.phases;
  const hasPhases = battle?.enemy.isEndurance && phaseList && phaseList.length > 0;
  const currentPhase = hasPhases ? phaseList[currentPhaseIndex % phaseList.length] : null;

  const exercise    = currentPhase ? currentPhase.exercise : (battle?.enemy.exercise ?? 'push_up');
  const phaseGoal   = currentPhase ? currentPhase.reps : (battle?.effectiveReps ?? battle?.enemy.repsRequired ?? 10);
  const exerciseDef = EXERCISES[exercise];

  const {
    repState, repCount, isBodyVisible, isPositionReady, formFeedback, processPoseData,
  } = usePoseEngine(exercise, isActive);

  // 2. ADDED AUDIO PREFS INITIALIZATION
  const audioPrefs = useAudioStore();

  // ── Inject exercise type & speak "get in position" when WebView is ready ──
  useEffect(() => {
    if (!webViewReady || !webViewRef.current || showItemModal) return;
    const exerciseName = exercise.replace('_', ' ');
    // setExerciseType configures the rep logic
    // speakGetInPosition tells the user to prepare their stance
    webViewRef.current.injectJavaScript(`
      (function() {
        if (typeof window.setExerciseType === 'function') {
          window.setExerciseType('${exercise}');
        }
        if (typeof window.speakGetInPosition === 'function') {
          window.speakGetInPosition('${exerciseName}');
        }
      })();
      true;
    `);

    // Start the positioning pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(positionPulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(positionPulseAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [webViewReady, exercise, showItemModal]);

  // ── Keep isBodyVisibleRef in sync so the interval can read it ─────────────
  // Uses isPositionReady (shoulders+hips+knees) not just isBodyVisible (shoulders only),
  // so face-only camera views don't falsely complete the positioning gate.
  useEffect(() => {
    isBodyVisibleRef.current = isPositionReady;
  }, [isPositionReady]);

  // ── Positioning timer — polls every 100ms ──────────────────────────────────
  // useEffect(isBodyVisible) only fires on value CHANGES, not per frame.
  // A setInterval guarantees steady ticking regardless of React re-renders.
  useEffect(() => {
    if (!webViewReady || showItemModal) return;
    if (positionReadyRef.current) return; // already confirmed

    positionIntervalRef.current = setInterval(() => {
      if (positionReadyRef.current) {
        clearInterval(positionIntervalRef.current!);
        return;
      }

      if (isBodyVisibleRef.current) {
        confirmTicksRef.current = Math.min(confirmTicksRef.current + 1, POSITION_TICKS_NEEDED);
      } else {
        // Decay 2× faster when body is lost
        confirmTicksRef.current = Math.max(0, confirmTicksRef.current - 2);
      }

      const progress = Math.round((confirmTicksRef.current / POSITION_TICKS_NEEDED) * 100);
      setDetectProgress(progress);
      setPositionPhase(isBodyVisibleRef.current && confirmTicksRef.current > 0 ? 'detected' : 'waiting');

      if (confirmTicksRef.current >= POSITION_TICKS_NEEDED) {
        // ✅ Confirmed! Clean up.
        clearInterval(positionIntervalRef.current!);
        positionReadyRef.current = true;
        setPositionPhase('ready');
        positionPulseAnim.stopAnimation();

        webViewRef.current?.injectJavaScript(`
          if (typeof window.speakBattleStart === 'function') window.speakBattleStart();
          true;
        `);
        Animated.timing(positionFadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start();

        // ── Inline countdown ────────────────────────────────────────────────
        // Do NOT drive this through a positionPhase useEffect — that causes the
        // tick to restart every time React re-renders with positionPhase→'ready'.
        // Instead we fire the interval directly from here (one guaranteed start).
        let tick = 3;
        const countdownInterval = setInterval(() => {
          tick--;
          setCountdown(tick);
          if (tick <= 0) {
            clearInterval(countdownInterval);
            const exName = exercise.replace('_', ' ');
            webViewRef.current?.injectJavaScript(`
              if (typeof window.speakStart === 'function') window.speakStart('${exName}');
              true;
            `);
            setIsActive(true);
            setBattleActive();
          }
        }, 1000);
      }
    }, 100);

    return () => {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
    };
  }, [webViewReady, showItemModal]);

  const handleUseItem = async (itemId: string) => {
    const catalogItem = catalog.find(c => c.id === itemId);
    if (!catalogItem) return;
    
    // consume the item via Supabase RPC (decrements by 1)
    await consumeQueuedItem(itemId);
    
    // apply effect instantly to the active battle
    applyItemToCurrentBattle(catalogItem);
    
    alert(`Consumed ${catalogItem.name}!`);
    setShowItemModal(false);
  };


  // ── Guaranteed local timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !battle) return;

    // Reset inactivity timer when starting
    lastRepTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      // Inactivity Check for Endurance
      if (battle.enemy.isEndurance && Date.now() - lastRepTimeRef.current > 7000) {
        // 7 seconds without a rep -> DEFEAT
        resolveBattle('defeat');
        router.replace('/post-battle');
        return;
      }

      setLocalSeconds((prev) => {
        if (prev <= 1) {
          if (battle.enemy.isEndurance) {
            resolveBattle('victory');
          } else {
            resolveBattle('defeat');
          }
          router.replace('/post-battle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isActive, resolveBattle, router, battle]);

  // ── Rep detection & flash ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !battle) return;

    if (repCount < prevRepsRef.current) {
      prevRepsRef.current = repCount;
      lastRepTimeRef.current = Date.now();
    } else if (repCount > prevRepsRef.current) {
      const scored = repCount - prevRepsRef.current;
      prevRepsRef.current = repCount;
      lastRepTimeRef.current = Date.now();
      for (let i = 0; i < scored; i++) registerRep();

      damageAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(attackFlashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.timing(attackFlashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
        Animated.timing(damageAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start();
      
      // 3. UPDATED HAPTICS LOGIC TO USE STORE PREFERENCES
      if (audioPrefs.repVibrationEnabled) {
        const style = intensityToHaptic(audioPrefs.repVibrationIntensity);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]).catch(() => {});
      }

      if (hasPhases && repCount >= phaseGoal) {
        setCurrentPhaseIndex(i => i + 1);
      } else if (!battle.enemy.isEndurance && repCount >= (battle.effectiveReps ?? battle.enemy.repsRequired)) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setIsActive(false);
        // Fire victory speech
        webViewRef.current?.injectJavaScript(`
          if (typeof window.speakVictory === 'function') window.speakVictory();
          true;
        `);
        resolveBattle('victory');
        setTimeout(() => router.replace('/post-battle'), 800);
      }
    }
  }, [
    repCount, 
    isActive, 
    battle, 
    registerRep, 
    resolveBattle, 
    router, 
    audioPrefs.repVibrationEnabled, 
    audioPrefs.repVibrationIntensity,
    hasPhases,
    phaseGoal
  ]); // Added audio prefs to dependency array

  if (!permission?.granted) {
    return (
      <View style={styles.permScreen}>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permBody}>GYME Quest needs your camera for real-time pose tracking.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!battle) return null;

  const flashOpacity = attackFlashAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.35] });
  const damageTransY = damageAnim.interpolate({ inputRange: [0,1], outputRange: [0,-50] });
  const damageOpacity = damageAnim.interpolate({ inputRange: [0,0.8,1], outputRange: [1,1,0] });
  const hpPercent = Math.max(0, Math.min(100, (battle.enemyHpRemaining / battle.enemy.hp) * 100));

  // ── DYNAMIC HEARTS CALCULATION ──
  const totalHearts = 5;
  const activeHearts = Math.ceil((hpPercent / 100) * totalHearts);

  const fmtTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const exerciseColors: Record<string, string> = {
    push_up: '#E63946',
    squat:   '#006A60',
    sit_up:  '#765A05',
    pull_up: '#4A1F6B',
  };
  const badgeColor = exerciseColors[exercise] ?? '#123441';

  return (
    <View style={styles.screen}>

      {/* WebView — full screen camera + skeleton */}
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webViewRef}
          source={{ html: MEDIAPIPE_WEBVIEW_HTML, baseUrl: 'https://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess
          allowUniversalAccessFromFileURLs
          mediaCapturePermissionGrantType="grant"
          onMessage={(e) => processPoseData(e.nativeEvent.data)}
          onLoadEnd={() => setWebViewReady(true)}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
        <View style={styles.scanlines} pointerEvents="none" />
      </View>

      {/* Attack flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.attackFlash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

      {/* ── TOP HUD ── */}
      <View style={styles.topHud} pointerEvents="box-none">
        <View style={styles.enemyCard}>
          <View style={styles.enemyInner}>
            
            {/* ── IMPLEMENTED ENEMY IMAGE ── */}
            <View style={styles.enemyAvatar}>
              {battle.enemy.image ? (
                <Image 
                  source={battle.enemy.image} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="contain" 
                />
              ) : (
                <View style={styles.enemyAvatarInner} />
              )}
            </View>
            <View>
              <Text style={styles.enemyName}>{battle.enemy.name.toUpperCase().replace(' ','_')}</Text>
              <View style={styles.heartsRow}>
                {[...Array(totalHearts)].map((_, i) => (
                  <MaterialIcons key={i} name="favorite" size={12} color={i < activeHearts ? AuthColors.crimson : "#CBD5E1"} />
                ))}
              </View>
              <View style={styles.hpBg}>
                <View style={[styles.hpFill, { width: `${hpPercent}%` as any }]} />
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.fleeBtn} onPress={() => { resetBattle(); router.replace('/'); }}>
            <Text style={styles.fleeBtnText}>FLEE</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rightHud}>
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={14} color={AuthColors.gold} />
            <Text style={styles.streakText}>{avatar.currentStreak}</Text>
          </View>
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>TIMER</Text>
            <Text style={styles.timerValue}>{fmtTime(localSeconds)}</Text>
          </View>
        </View>
      </View>

      {/* ── ALERTS / REPS HUD ── */}
      <View style={styles.repRow} pointerEvents="none">
        <View style={styles.repsLeftCard}>
          <Text style={styles.repsLeftVal}>
            {battle.enemy.isEndurance ? '∞' : (battle.effectiveReps ?? battle.enemy.repsRequired)}
          </Text>
          <View style={styles.divThin} />
          <Text style={styles.repsLeftLbl}>GOAL</Text>
        </View>
        <View style={styles.mainRepCard}>
          <Text style={styles.mainRepVal}>{repCount}</Text>
          <View style={styles.divThick} />
          <Text style={styles.mainRepLbl}>REPS</Text>
        </View>
      </View>

      {formFeedback && isActive && (
        <View style={styles.formFeedbackBadge}>
          <MaterialIcons name="error-outline" size={14} color={AuthColors.white} />
          <Text style={styles.formFeedbackText}>{formFeedback}</Text>
        </View>
      )}

      {battle?.activeEffect && (
        <View style={styles.activeEffectBadge}>
          <MaterialIcons name="auto-awesome" size={14} color={AuthColors.gold} />
          <Text style={styles.activeEffectText}>
            {(() => {
              const eff = battle.activeEffect;
              if (!eff) return '';
              if (eff.item_type === 'potion') return `REPS -${eff.effect_value}`;
              if (eff.item_type === 'exp_boost') return `XP x${eff.effect_value}`;
              if (eff.item_type === 'streak_restore') return `STREAK SHIELD`;
              return '';
            })()}
          </Text>
        </View>
      )}

      {showItemModal && (
        <View style={styles.itemModalOverlay}>
          <View style={styles.itemModalContent}>
            <Text style={styles.itemModalTitle}>PREPARE FOR BATTLE</Text>
            <Text style={styles.itemModalSub}>Use an item before fighting?</Text>
            <View style={{ maxHeight: 250, width: '100%', marginBottom: 16 }}>
              {inventory.map((inv) => {
                const item = catalog.find(c => c.id === inv.item_id);
                if (!item) return null;
                return (
                  <TouchableOpacity key={inv.item_id} style={styles.itemModalRow} onPress={() => handleUseItem(item.id)}>
                    <View style={styles.itemModalRowLeft}>
                      <Text style={styles.itemModalName}>{item.name}</Text>
                      <Text style={styles.itemModalDesc}>{item.description}</Text>
                    </View>
                    <View style={styles.itemModalRowRight}>
                      <Text style={styles.itemModalQty}>x{inv.quantity}</Text>
                      <View style={styles.itemModalUseBtn}><Text style={styles.itemModalUseTxt}>USE</Text></View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.itemModalSkipBtn} onPress={() => setShowItemModal(false)}>
              <Text style={styles.itemModalSkipTxt}>SKIP & FIGHT</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isActive && !showItemModal && positionPhase !== 'ready' && (
        <Animated.View style={[styles.positioningOverlay, { opacity: positionFadeAnim }]} pointerEvents="none">
          <Animated.Text style={[styles.positioningIcon, { transform: [{ scale: positionPulseAnim }] }]}>{exerciseDef?.emoji ?? '💪'}</Animated.Text>
          <Text style={styles.positioningTitle}>GET IN POSITION</Text>
          <Text style={styles.positioningExercise}>{exerciseDef?.label?.toUpperCase() ?? exercise.toUpperCase()}</Text>
          <Text style={styles.positioningHint}>{positionPhase === 'waiting' ? 'Step back so your full body is visible' : '✓ Body detected — hold your position!'}</Text>
          <View style={styles.detectBarBg}>
            <Animated.View style={[styles.detectBarFill, { width: `${detectProgress}%` as any, backgroundColor: positionPhase === 'detected' ? '#00C9A7' : '#E63946' }]} />
          </View>
          <Text style={styles.detectBarLabel}>{positionPhase === 'detected' ? `${detectProgress}% — almost there…` : 'Waiting for body detection'}</Text>
        </Animated.View>
      )}

      {positionPhase === 'ready' && !isActive && countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownNum}>{countdown}</Text>
          <Text style={styles.countdownSub}>GET READY</Text>
          <View style={[styles.exercisePill, { backgroundColor: badgeColor }]}><Text style={styles.exercisePillText}>{exerciseDef?.emoji} {exerciseDef?.label?.toUpperCase()}</Text></View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scanlines: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,52,65,0.2)' },
  attackFlash: { backgroundColor: AuthColors.white, zIndex: 10 },
  topHud: { position: 'absolute', top: 64, left: '50%', transform: [{ translateX: -190 }], width: 380, flexDirection: 'row', alignItems: 'flex-start', gap: 8, zIndex: 40 },
  enemyCard: { flex: 1, backgroundColor: AuthColors.white, borderWidth: 3, borderColor: '#123441', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enemyInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  enemyAvatar: { width: 48, height: 48, borderWidth: 3, borderColor: '#123441', backgroundColor: '#c6e8f8', padding: 4, overflow: 'hidden', position: 'relative' },
  enemyAvatarInner: { flex: 1, backgroundColor: '#6fd8c8' },
  enemyName: { fontFamily: Fonts.pixel, fontSize: 10, color: '#123441', marginBottom: 4 },
  heartsRow: { flexDirection: 'row', gap: 2 },
  hpBg: { width: 96, height: 12, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: '#123441', marginTop: 4, overflow: 'hidden' },
  hpFill: { height: '100%', backgroundColor: AuthColors.crimson },
  fleeBtn: { backgroundColor: '#E2E8F0', borderWidth: 3, borderColor: '#123441', paddingHorizontal: 16, paddingVertical: 4 },
  fleeBtnText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#123441' },
  rightHud: { gap: 8 },
  streakBadge: { backgroundColor: AuthColors.navy, borderWidth: 3, borderColor: AuthColors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 4, gap: 4 },
  streakText: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.gold, paddingTop: 2 },
  timerCard: { backgroundColor: AuthColors.white, borderWidth: 3, borderColor: '#123441', padding: 8, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  timerLabel: { fontFamily: Fonts.vt323, fontSize: 12, color: '#123441', marginBottom: 2 },
  timerValue: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.crimson },

  badgeContainer: { position: 'absolute', bottom: 210, left: 16, gap: 6, zIndex: 40 },
  exerciseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 3, borderColor: '#123441',
    shadowColor: '#123441', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
  },
  exerciseEmoji: { fontSize: 16 },
  exerciseLabel: { fontFamily: Fonts.pixel, fontSize: 8, color: '#FFFFFF' },
  ttsTag: { backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 4 },
  ttsText: { fontFamily: Fonts.vt323, fontSize: 14, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },

  dmgContainer: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -48 }, { translateY: -96 }], zIndex: 60 },
  dmgText: { fontFamily: Fonts.pixel, fontSize: 32, color: AuthColors.crimson, textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },

  repRow: { position: 'absolute', bottom: 120, left: '50%', transform: [{ translateX: -100 }], flexDirection: 'row', alignItems: 'flex-end', gap: 12, zIndex: 40 },
  repsLeftCard: { backgroundColor: AuthColors.white, borderWidth: 3, borderColor: '#123441', shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, padding: 8, minWidth: 80, alignItems: 'center', marginBottom: 4 },
  repsLeftVal: { fontFamily: Fonts.pixel, fontSize: 24, color: '#006A60' },
  divThin: { height: 2, backgroundColor: '#123441', width: '100%', marginTop: 4, marginBottom: 2 },
  repsLeftLbl: { fontFamily: Fonts.vt323, fontSize: 14, letterSpacing: 2, color: '#123441' },
  mainRepCard: { backgroundColor: AuthColors.white, borderWidth: 3, borderColor: '#123441', shadowColor: '#123441', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, padding: 16, minWidth: 120, alignItems: 'center' },
  mainRepVal: { fontFamily: Fonts.pixel, fontSize: 56, color: AuthColors.crimson, marginBottom: 4 },
  divThick: { height: 3, backgroundColor: '#123441', width: '100%', marginBottom: 4 },
  mainRepLbl: { fontFamily: Fonts.vt323, fontSize: 24, letterSpacing: 4, color: '#123441' },

  comboWrap: { position: 'absolute', right: 24, bottom: 144, alignItems: 'center', zIndex: 50 },
  comboCard: { borderWidth: 3, borderColor: '#123441', shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, padding: 8, transform: [{ rotate: '12deg' }] },
  comboText: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.white },

  activeEffectBadge: { position: 'absolute', top: 140, left: '50%', transform: [{ translateX: -70 }], flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: AuthColors.gold, zIndex: 50 },
  activeEffectText: { fontFamily: Fonts.pixel, fontSize: 9, color: AuthColors.gold, marginLeft: 6, letterSpacing: 1 },
  positioningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,10,20,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 100, paddingHorizontal: 32 },
  positioningIcon: { fontSize: 72, marginBottom: 16 },
  positioningTitle: { fontFamily: Fonts.pixel, fontSize: 18, color: '#FFFFFF', letterSpacing: 4, textAlign: 'center', marginBottom: 6 },
  positioningExercise: { fontFamily: Fonts.vt323, fontSize: 20, color: '#00C9A7', letterSpacing: 6, textAlign: 'center', marginBottom: 20 },
  positioningHint: { fontFamily: Fonts.vt323, fontSize: 16, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24 },
  detectBarBg: { width: '85%', height: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 7, overflow: 'hidden', marginBottom: 10 },
  detectBarFill: { height: '100%', borderRadius: 7 },
  detectBarLabel: { fontFamily: Fonts.vt323, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,52,65,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  countdownNum: { fontFamily: Fonts.pixel, fontSize: 100, color: AuthColors.bg, textShadowColor: AuthColors.navy, textShadowOffset: { width: 8, height: 8 }, textShadowRadius: 0 },
  countdownSub: { fontFamily: Fonts.vt323, fontSize: 24, letterSpacing: 8, color: AuthColors.crimson, marginTop: 16 },
  exercisePill: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 3, borderColor: '#FFFFFF' },
  exercisePillText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF', letterSpacing: 2 },
  
  visWarn: { position: 'absolute', top: 130, alignSelf: 'center', backgroundColor: AuthColors.crimson, borderWidth: 2, borderColor: AuthColors.navy, paddingHorizontal: 16, paddingVertical: 8, zIndex: 80 },
  visWarnText: { fontFamily: Fonts.vt323, fontSize: 16, color: AuthColors.white, letterSpacing: 1 },

  permScreen: { flex: 1, backgroundColor: AuthColors.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy, marginBottom: 16, textAlign: 'center', lineHeight: 24 },
  permBody: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C', textAlign: 'center', marginBottom: 32 },
  permBtn: { backgroundColor: AuthColors.crimson, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 3, borderColor: AuthColors.navy, shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  permBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: AuthColors.white },

  itemModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,10,20,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
    paddingHorizontal: 20,
  },
  itemModalContent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: AuthColors.navy,
    width: '100%',
    padding: 20,
    alignItems: 'center',
    shadowColor: AuthColors.crimson,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  itemModalTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  itemModalSub: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: '#8D99AE',
    marginBottom: 20,
    textAlign: 'center',
  },
  itemModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
    width: '100%',
  },
  itemModalRowLeft: {
    flex: 1,
    paddingRight: 10,
  },
  itemModalName: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  itemModalDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 14,
  },
  itemModalRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  itemModalQty: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.navy,
    marginBottom: 8,
  },
  itemModalUseBtn: {
    backgroundColor: AuthColors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  itemModalUseTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#FFFFFF',
  },
  itemModalSkipBtn: {
    borderBottomWidth: 2,
    borderColor: AuthColors.navy,
    marginTop: 12,
  },
  itemModalSkipTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  formFeedbackBadge: {
    position: 'absolute',
    bottom: 220,
    alignSelf: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.9)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    zIndex: 50,
  },
  formFeedbackText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    top: 1, // baseline tweak
  },
});