/**
 * BattleHubScreen.tsx
 *
 * The new center of GymeQuest — replaces the old "Home" tab.
 * Contains a BATTLE button (quick-start with first enemy) and
 * a QUESTS button (goes to the full quest list), plus the
 * player avatar, XP bar, and active daily bounty preview.
 */
import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { ENEMIES, XP_TABLE, MAX_LEVEL } from '@/constants/game';
import { AuthColors, Fonts } from '@/constants/theme';
import { AvatarStage } from '@/components/hub/AvatarStage';
import { ExpBar } from '@/components/hub/ExpBar';
import { DailyBountyCard } from '@/components/hub/DailyBountyCard';

interface BattleHubScreenProps {
  onQuestsPress: () => void;
}

export default function BattleHubScreen({ onQuestsPress }: BattleHubScreenProps) {
  const router     = useRouter();
  const avatar     = useGameStore((s) => s.avatar);
  const startBattle = useGameStore((s) => s.startBattle);
  const xpProgress  = useGameStore(selectXpProgress);

  const battleScaleAnim = useRef(new Animated.Value(1)).current;
  const questScaleAnim  = useRef(new Animated.Value(1)).current;

  const nextLevelXp = avatar.level < MAX_LEVEL ? XP_TABLE[avatar.level] : avatar.xp;

  const animPress = (anim: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start(callback);
  };

  const handleBattlePress = useCallback(() => {
    animPress(battleScaleAnim, () => {
      if (ENEMIES.length > 0) {
        startBattle(ENEMIES[0]);
        router.push('/combat');
      }
    });
  }, [startBattle, router]);

  const handleQuestsPress = useCallback(() => {
    animPress(questScaleAnim, () => {
      onQuestsPress();
    });
  }, [onQuestsPress]);

  // Quick stat summary
  const dailyEnemy = ENEMIES.length > 0 ? ENEMIES[0] : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>WELCOME BACK,</Text>
            <Text style={styles.headerName}>{(avatar.name || 'ADVENTURER').toUpperCase()}</Text>
          </View>
          <View style={styles.headerBadges}>
            {/* Coin Badge */}
            <View style={styles.coinBadge}>
              <MaterialCommunityIcons name="star-four-points" size={12} color="#FDE047" />
              <Text style={styles.coinBadgeNum}>{avatar.coins}</Text>
              <Text style={styles.coinBadgeLbl}>COINS</Text>
            </View>

            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeLbl}>LV</Text>
              <Text style={styles.levelBadgeNum}>{avatar.level}</Text>
            </View>
          </View>
        </View>

        {/* ── Avatar ── */}
        <AvatarStage />

        {/* ── XP Bar ── */}
        <ExpBar
          currentXp={avatar.xp}
          nextLevelXp={nextLevelXp}
          progress={xpProgress}
        />

        {/* ── CTA Buttons ── */}
        <View style={styles.ctaRow}>
          {/* BATTLE — primary action */}
          <Animated.View style={[styles.ctaBattleWrap, { transform: [{ scale: battleScaleAnim }] }]}>
            <TouchableOpacity
              style={styles.ctaBattle}
              activeOpacity={1}
              onPress={handleBattlePress}
            >
              <MaterialCommunityIcons name="sword-cross" size={36} color="#FFFFFF" />
              <Text style={styles.ctaBattleLabel}>BATTLE</Text>
              <Text style={styles.ctaBattleSub}>Quick fight</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* QUESTS — secondary */}
          <Animated.View style={[styles.ctaQuestWrap, { transform: [{ scale: questScaleAnim }] }]}>
            <TouchableOpacity
              style={styles.ctaQuest}
              activeOpacity={1}
              onPress={handleQuestsPress}
            >
              <MaterialCommunityIcons name="map-marker-path" size={30} color={AuthColors.navy} />
              <Text style={styles.ctaQuestLabel}>QUESTS</Text>
              <Text style={styles.ctaQuestSub}>Choose enemy</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Daily Bounty ── uses the full DailyBountyCard component ── */}
        {dailyEnemy && (
          <DailyBountyCard
            enemy={{ ...dailyEnemy, image: dailyEnemy.image }}
            isCompleted={avatar.defeatedEnemies.includes(dailyEnemy.id)}
            onPress={handleBattlePress}
          />
        )}

        {/* ── Stats Row ── */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 STATS</Text>
          <View style={styles.statsRow}>
            {[
              { label: 'STR', value: avatar.stats?.strength ?? 10 },
              { label: 'AGI', value: avatar.stats?.agility  ?? 10 },
              { label: 'STA', value: avatar.stats?.stamina  ?? 10 },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AuthColors.bg },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSub: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#8D99AE',
    letterSpacing: 2,
  },
  headerName: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  levelBadge: {
    backgroundColor: AuthColors.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    alignItems: 'center',
  },
  levelBadgeLbl: {
    fontFamily: Fonts.vt323,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  levelBadgeNum: {
    fontFamily: Fonts.pixel,
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  coinBadge: {
    backgroundColor: '#1E293B', // Dark slate
    borderWidth: 2,
    borderColor: '#EAB308', // Gold
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#EAB308',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  coinBadgeNum: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FEF08A', // Light Gold
    marginTop: 3, // Push text down to align baseline
  },
  coinBadgeLbl: {
    fontFamily: Fonts.vt323,
    fontSize: 13,
    color: '#FDE047',
    letterSpacing: 1,
    marginTop: 2, // Push text down to align baseline
  },

  // CTA Buttons
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  ctaBattleWrap: { flex: 2 },
  ctaBattle: {
    backgroundColor: AuthColors.crimson,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  ctaBattleLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  ctaBattleSub: {
    fontFamily: Fonts.vt323,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
  },

  ctaQuestWrap: { flex: 1 },
  ctaQuest: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  ctaQuestLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 11,
    color: AuthColors.navy,
    letterSpacing: 1,
  },
  ctaQuestSub: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#8D99AE',
    letterSpacing: 1,
  },

  // Daily Bounty
  bountySection: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  liveBadge: {
    backgroundColor: '#00C9A7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  liveBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 7,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bountyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bountyLeft: { flex: 1 },
  bountyEnemy: {
    fontFamily: Fonts.pixel,
    fontSize: 11,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  bountyDetail: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#8D99AE',
    letterSpacing: 1,
  },
  bountyFightBtn: {
    backgroundColor: AuthColors.crimson,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  bountyFightText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 2,
  },

  // Stats
  statsSection: { marginBottom: 24 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.pixel,
    fontSize: 22,
    color: AuthColors.crimson,
  },
  statLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#8D99AE',
    letterSpacing: 3,
    marginTop: 2,
  },
});
