/**
 * BattleHubScreen.tsx
 *
 * The new center of GymeQuest — replaces the old "Home" tab.
 * Contains a BATTLE button (quick-start with first enemy) and
 * a QUESTS button (goes to the full quest list), plus the
 * player avatar, XP bar, and active daily bounty preview.
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Animated, Alert, Modal, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { ENEMIES, BOSSES, XP_TABLE, MAX_LEVEL, EXERCISES } from '@/constants/game';
import { AuthColors, Fonts } from '@/constants/theme';
import { AvatarStage } from '@/components/hub/AvatarStage';
import { ExpBar } from '@/components/hub/ExpBar';
import { DailyBountyCard } from '@/components/hub/DailyBountyCard';

function getThisMondaysMidnight(): number {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).setHours(0,0,0,0);
}

function getNextMondaysMidnight(): number {
  return getThisMondaysMidnight() + 7 * 24 * 60 * 60 * 1000;
}

interface BattleHubScreenProps {
  onQuestsPress: () => void;
}

export default function BattleHubScreen({ onQuestsPress }: BattleHubScreenProps) {
  const router     = useRouter();
  const avatar     = useGameStore((s) => s.avatar);
  const startBattle = useGameStore((s) => s.startBattle);
  const xpProgress  = useGameStore(selectXpProgress);
  const showDailyReward = useGameStore((s) => s.showDailyLoginReward);
  const dailyRewardCoins = useGameStore((s) => s.dailyRewardCoins);
  const claimDailyReward = useGameStore((s) => s.claimDailyReward);

  const battleScaleAnim = useRef(new Animated.Value(1)).current;
  const questScaleAnim  = useRef(new Animated.Value(1)).current;

  const nextLevelXp = avatar.level < MAX_LEVEL ? XP_TABLE[avatar.level + 1] : avatar.xp;

  const [timeLeft, setTimeLeft] = useState('');
  const [weeklyTimeLeft, setWeeklyTimeLeft] = useState('');
  const [rewardAnimVisible, setRewardAnimVisible] = useState(false);
  const rewardScaleAnim = useRef(new Animated.Value(0)).current;

  const _claimReward = useCallback(() => {
    claimDailyReward().then(() => {
      setRewardAnimVisible(true);
      Animated.sequence([
        Animated.spring(rewardScaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setRewardAnimVisible(false));
    });
  }, [claimDailyReward, rewardScaleAnim]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const diffMs = tomorrow.getTime() - now.getTime();
      
      const h = Math.floor(diffMs / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((diffMs % (1000 * 60)) / 1000).toString().padStart(2, '0');
      
      setTimeLeft(`${h}h ${m}m ${s}s`);

      const nextMondayTime = getNextMondaysMidnight();
      const weeklyDiffMs = Math.max(0, nextMondayTime - now.getTime());
      const dW = Math.floor(weeklyDiffMs / (1000 * 60 * 60 * 24));
      const hW = Math.floor((weeklyDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
      const mW = Math.floor((weeklyDiffMs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      
      setWeeklyTimeLeft(dW > 0 ? `${dW}d ${hW}h` : `${hW}h ${mW}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Check if endurance battle is available
  const isEnduranceAvailable = !avatar.lastEnduranceDate || (new Date(avatar.lastEnduranceDate).getTime() < getThisMondaysMidnight());
  const enduranceBadgeText = isEnduranceAvailable ? 'PLAY' : weeklyTimeLeft;

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
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerSub} numberOfLines={1}>WELCOME BACK,</Text>
            <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">{(avatar.name || 'ADVENTURER').toUpperCase()}</Text>
          </View>
          <View style={styles.headerBadges}>
            {/* Streak Badge */}
            {avatar.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={14} color={AuthColors.goldBorder} />
                <Text style={styles.streakBadgeNum}>{avatar.currentStreak}</Text>
                <Text style={styles.streakBadgeLbl}>STREAK</Text>
              </View>
            )}

            {/* Coin Badge */}
            <View style={styles.coinBadge}>
              <MaterialCommunityIcons name="star-four-points" size={12} color="#FDE047" />
              <Text style={styles.coinBadgeNum}>{avatar.coins}</Text>
              <Text style={styles.coinBadgeLbl}>COINS</Text>
            </View>

            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeLbl}>LVL</Text>
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
          level={avatar.level}
        />

        {/* ── Daily Reward Card ── */}
        <View style={styles.dailyRewardCard}>
          <View style={styles.dailyRewardInfo}>
            <MaterialCommunityIcons name="treasure-chest" size={24} color={AuthColors.gold} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.dailyRewardTitle}>DAILY REWARD</Text>
              <Text style={styles.dailyRewardSub}>
                {showDailyReward ? `+${dailyRewardCoins} Coins available!` : `Next reward in: ${timeLeft}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.dailyRewardBtn, !showDailyReward && styles.dailyRewardBtnDisabled]} 
            onPress={showDailyReward ? _claimReward : undefined}
            activeOpacity={showDailyReward ? 0.7 : 1}
          >
            <Text style={styles.dailyRewardBtnTxt}>{showDailyReward ? 'CLAIM' : 'CLAIMED'}</Text>
          </TouchableOpacity>
        </View>

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

        {/* ── Boss Battles (Endurance Mode) ── */}
        <TouchableOpacity
          style={[styles.bossBattleCard, !isEnduranceAvailable && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={() => {
            if (!isEnduranceAvailable) {
              Alert.alert("Already Played", "You can only play Boss Battles once a week. Come back next Monday!");
              return;
            }
            if (BOSSES && BOSSES.length > 0) {
              const baseBoss = BOSSES[0];
              const singleBoss = {
                ...baseBoss,
                id: 'endurance_weekly_boss',
                name: 'Weekly Boss',
                title: '1 Minute Trial',
                timeLimit: 60, // Exactly 1 minute
                difficulty: 3 as const,
                exercise: 'squat' as any, // Defaulting to squat
                phases: undefined
              };
              startBattle(singleBoss);
              router.push('/combat');
            }
          }}
        >
          <View style={styles.bossInfo}>
            <MaterialCommunityIcons name="skull" size={28} color={AuthColors.crimson} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.bossTitle}>BOSS BATTLES</Text>
              <Text style={styles.bossSub}>Endurance Mode</Text>
            </View>
          </View>
          <View style={styles.bossBadge}>
            <Text style={styles.bossBadgeTxt}>{enduranceBadgeText}</Text>
          </View>
        </TouchableOpacity>

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

      {/* ── Reward Claim Animation Overlay ── */}
      {rewardAnimVisible && (
        <Modal
          transparent
          visible={rewardAnimVisible}
          animationType="fade"
        >
          <View style={[styles.rewardAnimOverlay, { zIndex: 100, elevation: 100 }]}>
            <Animated.View style={[styles.rewardAnimBox, { transform: [{ scale: rewardScaleAnim }] }]}>
              <MaterialCommunityIcons name="star-four-points" size={80} color="#FFD700" />
              <Text style={styles.rewardAnimText}>+{dailyRewardCoins} Coins</Text>
              <Text style={styles.rewardAnimSubtext}>Daily Reward Claimed!</Text>
            </Animated.View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  dailyRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  dailyRewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyRewardTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.navy,
  },
  dailyRewardSub: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#8D99AE',
  },
  dailyRewardBtn: {
    backgroundColor: AuthColors.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    marginLeft: 8,
  },
  dailyRewardBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  dailyRewardBtnTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: AuthColors.navy,
  },
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
    flexShrink: 0,
    gap: 8,
  },
  streakBadge: {
    backgroundColor: AuthColors.white,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    alignItems: 'center',
    minWidth: 44,
  },
  streakBadgeNum: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.crimson,
    marginTop: 2,
  },
  streakBadgeLbl: {
    fontFamily: Fonts.vt323,
    fontSize: 10,
    color: AuthColors.crimson,
    letterSpacing: 0,
    marginTop: 1,
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

  // Boss Battle
  bossBattleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderWidth: 3,
    borderColor: AuthColors.crimson,
    padding: 16,
    marginBottom: 24,
    shadowColor: AuthColors.crimson,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 0,
  },
  bossInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bossTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FEF08A',
  },
  bossSub: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#CBD5E1',
    letterSpacing: 2,
    marginTop: 2,
  },
  bossBadge: {
    backgroundColor: AuthColors.crimson,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#FEF08A',
  },
  bossBadgeTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
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
    
  // Modals
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  modalTitle: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    color: AuthColors.navy,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubTitle: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  bossOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bossOptionTextWrap: {
    flex: 1,
  },
  bossOptionName: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    marginBottom: 4,
  },
  bossOptionMeta: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: "#64748B",
  },
  exerciseOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  exerciseEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  exerciseOptionName: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: AuthColors.navy,
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
  },
  modalCancelTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  // Reward Anim
  rewardAnimOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  rewardAnimBox: {
    backgroundColor: "#1E293B",
    borderWidth: 4,
    borderColor: "#FFD700",
    borderRadius: 16,
    alignItems: "center",
    padding: 30,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  rewardAnimText: {
    fontFamily: Fonts.mono,
    fontSize: 24,
    color: "#FFD700",
    marginTop: 16,
  },
  rewardAnimSubtext: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: "#FFF",
    marginTop: 8,
  },
});