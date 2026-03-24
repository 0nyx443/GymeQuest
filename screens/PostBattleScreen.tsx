/**
 * screens/PostBattleScreen.tsx
 *
 * Victory: animated XP gain, stat boosts, level-up fanfare.
 * Defeat: encouraging message, reps completed vs needed, retry option.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { XP_TABLE } from '@/constants/game';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export default function PostBattleScreen() {
  const router = useRouter();
  const avatar = useGameStore((s) => s.avatar);
  const battle = useGameStore((s) => s.battle);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const xpProgress = useGameStore(selectXpProgress);

  const isVictory = battle?.phase === 'victory';

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Haptic pattern
    if (isVictory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // XP bar fill animation
    setTimeout(() => {
      Animated.timing(xpAnim, { toValue: xpProgress, duration: 1200, useNativeDriver: false }).start();
    }, 700);
  }, []);

  const xpBarWidth = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleContinue = () => {
    resetBattle();
    router.replace('/');
  };

  const handleRetry = () => {
    if (!battle?.enemy) {
      router.replace('/');
      return;
    }
    // Re-queue same enemy
    useGameStore.getState().startBattle(battle.enemy);
    router.replace('/combat');
  };

  if (!battle) {
    router.replace('/');
    return null;
  }

  const repsCompleted = battle.repsCompleted;
  const repsRequired = battle.enemy.repsRequired;
  const statBoosts = battle.enemy.statBoosts;

  return (
    <View style={styles.screen}>
      {/* Background gradient */}
      <LinearGradient
        colors={
          isVictory
            ? ['rgba(56,217,112,0.08)', Colors.bgVoid, Colors.bgDeep]
            : ['rgba(192,40,42,0.08)', Colors.bgVoid, Colors.bgDeep]
        }
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Result banner ── */}
        <Animated.View
          style={[
            styles.banner,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={[
            styles.bannerText,
            isVictory ? styles.victoryText : styles.defeatText,
          ]}>
            {isVictory ? 'VICTORY' : 'DEFEAT'}
          </Text>
          <Text style={styles.bannerSub}>
            {isVictory
              ? `${battle.enemy.name} has fallen.`
              : "The enemy endures... for now."}
          </Text>
        </Animated.View>

        {/* ── Avatar ── */}
        <Animated.View
          style={[
            styles.avatarBlock,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <AvatarDisplay level={avatar.level} size={100} animated={isVictory} />
          {isVictory && (
            <Text style={styles.levelUpTag}>Level {avatar.level}</Text>
          )}
        </Animated.View>

        {/* ── Stats block ── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Rep summary */}
          <View style={styles.repSummaryRow}>
            <View style={styles.repSummaryItem}>
              <Text style={styles.repSummaryVal}>{repsCompleted}</Text>
              <Text style={styles.repSummaryLabel}>Reps Completed</Text>
            </View>
            <View style={styles.repSummaryDivider} />
            <View style={styles.repSummaryItem}>
              <Text style={styles.repSummaryVal}>{repsRequired}</Text>
              <Text style={styles.repSummaryLabel}>Reps Required</Text>
            </View>
            <View style={styles.repSummaryDivider} />
            <View style={styles.repSummaryItem}>
              <Text style={[styles.repSummaryVal, { color: isVictory ? Colors.hpGreen : Colors.crimson }]}>
                {Math.round((repsCompleted / repsRequired) * 100)}%
              </Text>
              <Text style={styles.repSummaryLabel}>Completion</Text>
            </View>
          </View>

          {/* Rep progress bar */}
          <View style={styles.repTrack}>
            <View
              style={[
                styles.repFill,
                {
                  width: `${Math.min(repsCompleted / repsRequired, 1) * 100}%` as any,
                  backgroundColor: isVictory ? Colors.hpGreen : Colors.crimson,
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* ── XP / Rewards (victory only) ── */}
        {isVictory && (
          <Animated.View
            style={[styles.card, { opacity: fadeAnim }]}
          >
            <Text style={styles.cardTitle}>REWARDS EARNED</Text>

            {/* XP gained */}
            <View style={styles.xpGainRow}>
              <View style={styles.xpGainLeft}>
                <Text style={styles.xpGainLabel}>Experience</Text>
                <Text style={styles.xpGainSub}>Level {avatar.level}</Text>
              </View>
              <Text style={styles.xpGainVal}>+{battle.enemy.xpReward} XP</Text>
            </View>

            {/* XP progress bar */}
            <View style={styles.xpTrack}>
              <Animated.View
                style={[
                  styles.xpFill,
                  { width: xpBarWidth as any },
                ]}
              />
            </View>

            {/* Stat boosts */}
            {Object.entries(statBoosts).map(([stat, boost]) => (
              <View key={stat} style={styles.boostRow}>
                <Text style={styles.boostStat}>
                  {stat.toUpperCase()}
                </Text>
                <Text style={styles.boostVal}>+{boost}</Text>
                <View style={[
                  styles.boostBar,
                  { width: `${Math.min((boost ?? 0) * 5, 100)}%` as any },
                ]} />
              </View>
            ))}

            {/* Lore unlock */}
            <View style={styles.lorePill}>
              <Text style={styles.loreEmoji}>📜</Text>
              <Text style={styles.loreText}>{battle.enemy.lore}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Defeat encouragement ── */}
        {!isVictory && (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={styles.cardTitle}>BATTLE ANALYSIS</Text>
            <Text style={styles.encourageText}>
              You completed {repsCompleted} of {repsRequired} reps.
              {repsCompleted >= repsRequired * 0.7
                ? " You were so close! Train harder and try again."
                : " Keep pushing your limits. Each rep makes you stronger."}
            </Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>TRAINING TIP</Text>
              <Text style={styles.tipText}>
                {battle.enemy.exercise === 'push_up'
                  ? "Keep your core tight and lower your chest all the way to the ground."
                  : battle.enemy.exercise === 'squat'
                  ? "Drive through your heels and keep your chest proud throughout the movement."
                  : battle.enemy.exercise === 'sit_up'
                  ? "Exhale as you crunch up. Controlled movement beats momentum."
                  : "Full hang at the bottom, chin clears the bar at the top. No kipping."}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Action buttons ── */}
        <Animated.View style={[styles.buttonGroup, { opacity: fadeAnim }]}>
          {isVictory ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
              <Text style={styles.primaryBtnText}>RETURN TO QUEST MAP</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
                <Text style={styles.primaryBtnText}>CHALLENGE AGAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleContinue}>
                <Text style={styles.secondaryBtnText}>QUEST MAP</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
  },
  scroll: {
    padding: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 50,
    gap: 16,
  },

  // Banner
  banner: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerText: {
    fontFamily: Fonts.display,
    fontSize: 48,
    letterSpacing: 6,
  },
  victoryText: {
    color: Colors.hpGreen,
    textShadowColor: Colors.hpGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  defeatText: {
    color: Colors.crimson,
    textShadowColor: Colors.crimson,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  bannerSub: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Avatar
  avatarBlock: {
    alignItems: 'center',
    marginVertical: 8,
  },
  levelUpTag: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 2,
    marginTop: 10,
    backgroundColor: 'rgba(200,146,42,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 3,
    marginBottom: Spacing.md,
  },

  // Rep summary
  repSummaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  repSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  repSummaryDivider: {
    width: 1,
    backgroundColor: Colors.borderFaint,
  },
  repSummaryVal: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.textHero,
  },
  repSummaryLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  repTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  repFill: {
    height: '100%',
    borderRadius: Radius.full,
  },

  // XP gain
  xpGainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpGainLeft: {},
  xpGainLabel: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  xpGainSub: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  xpGainVal: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.xpBlue,
  },
  xpTrack: {
    height: 8,
    backgroundColor: 'rgba(68,136,255,0.1)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(68,136,255,0.15)',
    marginBottom: 16,
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.xpBlue,
    borderRadius: Radius.full,
  },

  // Stat boosts
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  boostStat: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    width: 36,
  },
  boostVal: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.teal,
    width: 28,
  },
  boostBar: {
    height: 4,
    backgroundColor: Colors.teal,
    borderRadius: Radius.full,
    opacity: 0.5,
  },

  // Lore
  lorePill: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },
  loreEmoji: { fontSize: 14 },
  loreText: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Defeat
  encourageText: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 16,
  },
  tipBox: {
    backgroundColor: 'rgba(29,184,160,0.07)',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(29,184,160,0.2)',
  },
  tipTitle: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.teal,
    letterSpacing: 2,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // Buttons
  buttonGroup: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.bgVoid,
    letterSpacing: 2,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
});
