/**
 * screens/DashboardScreen.tsx
 *
 * Main home screen: avatar, level, EXP, stats, and Quest Map.
 */
import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { ENEMIES, Enemy, XP_TABLE } from '@/constants/game';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { AvatarDisplay } from '@/components/avatar/AvatarDisplay';
import { StatBar, XpBar } from '@/components/ui/StatBar';
import { supabase } from '@/utils/supabase';

const DIFFICULTY_LABELS = ['', 'Initiate', 'Adept', 'Warrior', 'Champion', 'Legend'];

export default function DashboardScreen() {
  const router = useRouter();
  const avatar = useGameStore((s) => s.avatar);
  const startBattle = useGameStore((s) => s.startBattle);
  const resetAvatar = useGameStore((s) => s.resetAvatar);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const xpProgress = useGameStore(selectXpProgress);

  const nextLevelXp =
    avatar.level < 10 ? XP_TABLE[avatar.level + 1] : avatar.xp;

  const handleQuestPress = useCallback((enemy: Enemy) => {
    startBattle(enemy);
    router.push('/combat');
  }, [startBattle, router]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    resetBattle();
    resetAvatar();
  }, [resetAvatar, resetBattle]);

  const isUnlocked = (enemy: Enemy) =>
    avatar.level >= enemy.difficulty - 1;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgVoid} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>GYME QUEST</Text>
        <View style={styles.currencyPill}>
          <Text style={styles.currencyText}>⚔ {avatar.victories} Victories</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar Stage ── */}
        <LinearGradient
          colors={['rgba(124,77,255,0.12)', 'transparent']}
          style={styles.avatarStage}
        >
          <AvatarDisplay level={avatar.level} size={120} animated />

          <Text style={styles.avatarName}>{avatar.name}</Text>
          <Text style={styles.avatarClass}>{avatar.class}</Text>

          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {avatar.level}</Text>
          </View>
        </LinearGradient>

        {/* ── XP Bar ── */}
        <View style={styles.section}>
          <XpBar
            progress={xpProgress}
            currentXp={avatar.xp - XP_TABLE[avatar.level]}
            nextXp={nextLevelXp - XP_TABLE[avatar.level]}
          />
        </View>

        {/* ── Stats ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMBAT STATS</Text>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: Colors.crimson }]}>
                {avatar.stats.strength}
              </Text>
              <StatBar
                label="STR"
                value={avatar.stats.strength}
                max={100}
                color={Colors.crimson}
                showValue={false}
              />
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: Colors.teal }]}>
                {avatar.stats.agility}
              </Text>
              <StatBar
                label="AGI"
                value={avatar.stats.agility}
                max={100}
                color={Colors.teal}
                showValue={false}
              />
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: Colors.xpBlue }]}>
                {avatar.stats.stamina}
              </Text>
              <StatBar
                label="STA"
                value={avatar.stats.stamina}
                max={100}
                color={Colors.xpBlue}
                showValue={false}
              />
            </View>
          </View>

          {/* Battle record */}
          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={styles.recordNum}>{avatar.totalBattles}</Text>
              <Text style={styles.recordLabel}>Battles</Text>
            </View>
            <View style={styles.recordDivider} />
            <View style={styles.recordItem}>
              <Text style={[styles.recordNum, { color: Colors.hpGreen }]}>
                {avatar.victories}
              </Text>
              <Text style={styles.recordLabel}>Victories</Text>
            </View>
            <View style={styles.recordDivider} />
            <View style={styles.recordItem}>
              <Text style={[styles.recordNum, { color: Colors.amber }]}>
                {avatar.totalReps}
              </Text>
              <Text style={styles.recordLabel}>Total Reps</Text>
            </View>
          </View>
        </View>

        {/* ── Quest Map ── */}
        <View style={styles.questMapHeader}>
          <Text style={styles.cardTitle}>QUEST MAP</Text>
          <Text style={styles.questMapSub}>Choose your battle</Text>
        </View>

        {ENEMIES.map((enemy, i) => {
          const unlocked = isUnlocked(enemy);
          const defeated = avatar.defeatedEnemies.includes(enemy.id);

          return (
            <TouchableOpacity
              key={enemy.id}
              style={[
                styles.questNode,
                !unlocked && styles.questNodeLocked,
                defeated && styles.questNodeDefeated,
              ]}
              onPress={() => unlocked && handleQuestPress(enemy)}
              activeOpacity={unlocked ? 0.7 : 1}
            >
              {/* Connector line to next node */}
              {i < ENEMIES.length - 1 && (
                <View style={styles.connector} />
              )}

              {/* Enemy colour accent stripe */}
              <View style={[styles.accentStripe, { backgroundColor: enemy.color }]} />

              <View style={styles.questContent}>
                {/* Icon */}
                <View style={[styles.questIconWrap, { borderColor: enemy.color }]}>
                  {defeated ? (
                    <Text style={styles.questIconText}>✓</Text>
                  ) : unlocked ? (
                    <Text style={styles.questIconText}>⚔</Text>
                  ) : (
                    <Text style={styles.questIconText}>🔒</Text>
                  )}
                </View>

                <View style={styles.questInfo}>
                  <Text style={styles.questEnemyName}>{enemy.name}</Text>
                  <Text style={styles.questEnemyTitle}>{enemy.title}</Text>
                  <View style={styles.questTags}>
                    <View style={[styles.tag, { borderColor: enemy.color }]}>
                      <Text style={[styles.tagText, { color: enemy.color }]}>
                        {DIFFICULTY_LABELS[enemy.difficulty]}
                      </Text>
                    </View>
                    <Text style={styles.questMeta}>
                      {enemy.repsRequired} {enemy.exercise.replace('_', '-')}s
                    </Text>
                    <Text style={styles.questMeta}>
                      {Math.floor(enemy.timeLimit / 60)}:{String(enemy.timeLimit % 60).padStart(2, '0')}
                    </Text>
                  </View>
                </View>

                <View style={styles.questReward}>
                  <Text style={styles.xpReward}>+{enemy.xpReward}</Text>
                  <Text style={styles.xpLabel}>XP</Text>
                  {/* Difficulty dots */}
                  <View style={styles.diffDots}>
                    {Array.from({ length: 5 }).map((_, d) => (
                      <View
                        key={d}
                        style={[
                          styles.dot,
                          d < enemy.difficulty
                            ? { backgroundColor: enemy.color }
                            : styles.dotEmpty,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {!unlocked && (
                <Text style={styles.lockHint}>
                  Reach Level {enemy.difficulty} to unlock
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerEyebrow: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.gold,
    letterSpacing: 3,
  },
  currencyPill: {
    backgroundColor: 'rgba(200,146,42,0.1)',
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  currencyText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.gold,
  },
  logoutBtn: {
    marginLeft: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    backgroundColor: Colors.bgPanel,
  },
  logoutText: {
    fontFamily: Fonts.uiBold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Avatar
  avatarStage: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textHero,
    marginTop: 12,
    letterSpacing: 1,
  },
  avatarClass: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    color: Colors.teal,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  levelBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(200,146,42,0.12)',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  levelText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.goldLight,
    letterSpacing: 1,
  },

  // Section
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // Card
  card: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 3,
    marginBottom: Spacing.md,
  },

  // Stats
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },

  // Record
  recordRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderFaint,
  },
  recordItem: {
    flex: 1,
    alignItems: 'center',
  },
  recordNum: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.textHero,
  },
  recordLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recordDivider: {
    width: 1,
    backgroundColor: Colors.borderFaint,
  },

  // Quest Map
  questMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  questMapSub: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    color: Colors.teal,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Quest node
  questNode: {
    marginHorizontal: Spacing.xl,
    marginBottom: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    overflow: 'hidden',
    position: 'relative',
  },
  questNodeLocked: {
    opacity: 0.45,
  },
  questNodeDefeated: {
    borderColor: 'rgba(56,217,112,0.25)',
  },
  connector: {
    position: 'absolute',
    left: 30,
    bottom: -10,
    width: 1,
    height: 10,
    backgroundColor: Colors.borderFaint,
    zIndex: 1,
  },
  accentStripe: {
    height: 2,
  },
  questContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  questIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexShrink: 0,
  },
  questIconText: {
    fontSize: 20,
  },
  questInfo: {
    flex: 1,
  },
  questEnemyName: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.textHero,
    marginBottom: 1,
  },
  questEnemyTitle: {
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  questTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  questMeta: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  questReward: {
    alignItems: 'center',
    flexShrink: 0,
  },
  xpReward: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.gold,
  },
  xpLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.goldDim,
    letterSpacing: 2,
  },
  diffDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
  },
  dotEmpty: {
    backgroundColor: 'rgba(200,146,42,0.15)',
  },
  lockHint: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: 8,
    letterSpacing: 1,
  },
});
