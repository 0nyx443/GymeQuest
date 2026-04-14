/**
 * BattleHubScreen.tsx
 *
 * The new center of GymeQuest — replaces the old "Home" tab.
 * Contains a BATTLE button (quick-start with first enemy) and
 * a QUESTS button (goes to the full quest list), plus the
 * player avatar, XP bar, and active daily bounty preview.
 */
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
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

const getMilestoneImage = (level: number, equippedSkin?: string | null) => {
  if (equippedSkin === 'm_series') return require('@/assets/images/m_avatar.png');
  if (equippedSkin === 'omni_man') return require('@/assets/images/Omni-Man_profile.png');
  if (equippedSkin === 'atom_eve') return require('@/assets/images/Atom-Eve_profile.png');
  if (level >= 50) return require('@/assets/images/legend_avatar.png');
  if (level >= 25) return require('@/assets/images/champion_avatar.png');
  if (level >= 10) return require('@/assets/images/challenger_avatar.png');
  return require('@/assets/images/rookie_avatar.png');
};

const getRankName = (level: number) => {
  if (level >= 50) return 'LEGEND';
  if (level >= 25) return 'CHAMPION';
  if (level >= 10) return 'CHALLENGER';
  return 'ROOKIE';
};

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
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [statsHelpVisible, setStatsHelpVisible] = useState(false);
  const rewardScaleAnim = useRef(new Animated.Value(0)).current;

  const _claimReward = useCallback(() => {
    claimDailyReward().then(() => {
      setRewardAnimVisible(true);
      Animated.sequence([
        Animated.timing(rewardScaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
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

  // Check if endurance battle is available
  const isEnduranceLevelLocked = avatar.level < 10;
  const isEnduranceAvailable = !avatar.lastEnduranceDate || (new Date(avatar.lastEnduranceDate).getTime() < getThisMondaysMidnight());
  const enduranceBadgeText = isEnduranceLevelLocked ? 'LVL 10' : (isEnduranceAvailable ? 'PLAY' : weeklyTimeLeft);

  // Quick stat summary
  const dailyEnemy = useMemo(() => {
          if (!ENEMIES.length) return null;
          
          const todayStr = new Date().toISOString().split('T')[0];
          
          // Select an enemy from the roster rotating daily
          const dayOfYear = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
          const availableEnemies = ENEMIES.filter((e) => avatar.level >= (e.unlockLevel || 0) / 2);
          const pool = availableEnemies.length > 0 ? availableEnemies : [ENEMIES[0]];
          const baseEnemy = pool[dayOfYear % pool.length];

          // Daily Bounty should be decidedly harder and more rewarding than a Quick Fight
          const scaledReps = Math.floor(avatar.level * 2.5) + 10;
          const scaledHealth = Math.round((avatar.level * 2.5 + 10) * 15);
          
          return {
            ...baseEnemy,
            id: `daily_bounty_${todayStr}`,
            name: `Elite ${baseEnemy.name}`,
            title: 'Daily Bounty',
            repsRequired: scaledReps,
            hp: scaledHealth,
            health: scaledHealth,
            xpReward: Math.floor(avatar.level * 100) + 300,
            coinReward: Math.floor(avatar.level * 30) + 100,
          };
        }, [avatar.level]);

  const handleBattlePress = useCallback(() => {
          if (dailyEnemy && avatar.lastDailyBountyDate === new Date().toISOString().split('T')[0]) {
            Alert.alert('Daily Bounty Claimed!', 'You have already claimed this bounty today. Check out QUESTS for more battles!');
            return;
          }
          if (dailyEnemy) {
            startBattle(dailyEnemy);
            router.push('/combat');
          }
        }, [startBattle, router, dailyEnemy, avatar.lastDailyBountyDate]);


  const handleQuickFightPress = useCallback(() => {
    animPress(battleScaleAnim, () => {
      let baseEnemy = ENEMIES[0];
      for (let i = 0; i < ENEMIES.length; i++) {
         if (avatar.level >= ENEMIES[i].unlockLevel) {
            baseEnemy = ENEMIES[i];
         }
      }
      
      const availableExercises = ['push_up', 'sit_up', 'squat'];
      const randomEx = availableExercises[Math.floor(Math.random() * availableExercises.length)];
      
      const scaledReps = Math.floor(avatar.level * 1.2) + 4;
      const scaledHealth = Math.round((avatar.level * 1.2 + 4) * 12);
      const quickEnemy = {
        ...baseEnemy,
        id: `quick_fight_${new Date().getTime()}`,
        name: `Lvl ${avatar.level} Training`,
        title: 'Quick Fight',
        repsRequired: scaledReps,
        hp: scaledHealth,
        health: scaledHealth,
        xpReward: Math.floor(avatar.level * 40) + 100,
        coinReward: Math.floor(avatar.level * 10) + 40,
        exercise: randomEx as any,
      };
      startBattle(quickEnemy);
      router.push('/combat');
    });
  }, [avatar.level, battleScaleAnim, startBattle, router]);

  const handleQuestsPress = useCallback(() => {
    animPress(questScaleAnim, () => {
      onQuestsPress();
    });
  }, [onQuestsPress]);

  let hasLevelReward = false;
  for (let i = 2; i <= avatar.level; i++) {
      if (!avatar.claimedLevelRewards?.includes(i)) {
          hasLevelReward = true;
          break;
      }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            <View style={styles.headerPortraitBox}>
              <Image
                source={getMilestoneImage(avatar.level, avatar.equippedSkin)}
                style={styles.headerPortrait}
                resizeMode="contain"
              />
              <View style={styles.headerLvlBadge}>
                <Text style={styles.headerLvlText}>LVL {avatar.level}</Text>
              </View>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerSub} numberOfLines={1}>NAME</Text>
              <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">{(avatar.name || 'ADVENTURER').toUpperCase()}</Text>
              <Text style={[styles.headerSub, { marginTop: 4 }]} numberOfLines={1}>RANK</Text>
              <View style={styles.headerRankBadge}>
                <Text style={styles.headerRankText}>{getRankName(avatar.level)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerBadges}>
            {/* Streak Badge */}
            {avatar.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={16} color={AuthColors.goldBorder} />
                <Text style={styles.streakBadgeNum}>{avatar.currentStreak}</Text>
              </View>
            )}

            {/* Coin Badge */}
            <View style={{ gap: 6 }}>
              <View style={styles.coinBadge}>
                <MaterialCommunityIcons name="circle-multiple-outline" size={16} color="#FBBF24" />
                <Text style={styles.coinText}>{avatar.coins.toLocaleString()}</Text>
              </View>
              
              {/* Rewards Trail Button */}
              <TouchableOpacity 
                style={[styles.rewardsTrailBtn, !hasLevelReward && styles.rewardsTrailBtnInactive]} 
                onPress={() => router.push('/rewards')}
              >
                <MaterialCommunityIcons name="gift" size={12} color={hasLevelReward ? '#FFF' : AuthColors.navy} />
                <Text style={[styles.rewardsTrailText, !hasLevelReward && styles.rewardsTrailTextInactive]}>REWARDS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Avatar ── */}
        <AvatarStage />

        {/* ── Progression Box ── */}
        <View style={styles.progressionBox}>
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
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>STATS</Text>
              <TouchableOpacity onPress={() => setStatsHelpVisible(true)} style={{ marginLeft: 8, marginTop: -4 }} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <MaterialCommunityIcons name="help-circle-outline" size={20} color={AuthColors.navy} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.statsRow}>
            {[
              { label: 'STR', value: avatar.stats?.strength ?? 0 },
              { label: 'AGI', value: avatar.stats?.agility  ?? 0 },
              { label: 'STA', value: avatar.stats?.stamina  ?? 0 },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 10, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: Fonts.pixel, fontSize: 11, color: AuthColors.crimson, textAlign: 'center' }}>
              BASE ATK: {Math.round(10 * (1 + ((avatar.stats?.strength ?? 0) + (avatar.stats?.agility ?? 0) + (avatar.stats?.stamina ?? 0)) / 100))} DMG / REP
            </Text>
          </View>
        </View>

        {/* ── Combat & Activities ── */}
        <Text style={styles.sectionTitle}>COMBAT</Text>

        {/* ── CTA Buttons ── */}
        <View style={styles.ctaRow}>
          {/* BATTLE — primary action */}
          <Animated.View style={[styles.ctaBattleWrap, { transform: [{ scale: battleScaleAnim }] }]}>
            <TouchableOpacity
                style={styles.ctaBattle}
                activeOpacity={0.8}
                onPress={handleQuickFightPress}
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
          style={[styles.bossBattleCard, (isEnduranceLevelLocked || !isEnduranceAvailable) && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={() => {
            if (isEnduranceLevelLocked) {
              Alert.alert("Locked target", "Train harder! Boss Battles unlock at Level 10.");
              return;
            }
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
                title: '1.5 Minute Trial',
                timeLimit: Math.round(90 + avatar.level * 1.8),
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
            isCompleted={avatar.lastDailyBountyDate === new Date().toISOString().split('T')[0]}
            onPress={handleBattlePress}
          />
        )}

      </ScrollView>

      {/* ── Stats Info Overlay ── */}
      {statsHelpVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]} pointerEvents="auto">
          <View style={styles.statsHelpBox}>
            <Text style={styles.statsHelpTitle}>HOW STATS WORK</Text>
            
            <View style={styles.statsHelpRow}>
              <Text style={styles.statsHelpLabel}>STR (Strength)</Text>
              <Text style={styles.statsHelpDesc}>Gained from upper body Workouts. Boosts BASE ATK.</Text>
            </View>
            
            <View style={styles.statsHelpRow}>
              <Text style={styles.statsHelpLabel}>AGI (Agility)</Text>
              <Text style={styles.statsHelpDesc}>Gained from leg workouts / cardio. Boosts BASE ATK.</Text>
            </View>
            
            <View style={styles.statsHelpRow}>
              <Text style={styles.statsHelpLabel}>STA (Stamina)</Text>
              <Text style={styles.statsHelpDesc}>Gained from core routines. Essential for fights. Boosts BASE ATK.</Text>
            </View>

            <View style={styles.statsHelpRow}>
              <Text style={styles.statsHelpLabel}>BASE ATK</Text>
              <Text style={styles.statsHelpDesc}>Total combined stats modifier. Multiplies damage dealt per rep!</Text>
            </View>

            <TouchableOpacity style={styles.statsHelpCloseBtn} onPress={() => setStatsHelpVisible(false)} activeOpacity={0.8}>
              <Text style={styles.statsHelpCloseTxt}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Reward Claim Animation Overlay ── */}
      {rewardAnimVisible && (
        <View style={styles.rewardAnimOverlay} pointerEvents="none">
          <Animated.View style={[styles.rewardAnimBox, { transform: [{ scale: rewardScaleAnim }] }]}>
            <MaterialCommunityIcons name="party-popper" size={48} color="#FFD700" />
            <Text style={styles.rewardAnimText}>SUCCESS!</Text>
            <Text style={styles.rewardAnimSubtext}>CLAIMED {dailyRewardCoins} COINS</Text>
          </Animated.View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  progressionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    marginBottom: 24,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  dailyRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: AuthColors.navy,
    padding: 12,
    justifyContent: 'space-between',
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerPortraitBox: {
    width: 65,
    height: 65,
    backgroundColor: '#C6E8F8',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPortrait: { width: '100%', height: '100%' },
  headerLvlBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: AuthColors.crimson,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: AuthColors.navy,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  headerLvlText: { fontFamily: Fonts.pixel, fontSize: 8, color: '#FFFFFF' },
  headerInfo: {
    flex: 1,
  },
  headerSub: {
    fontFamily: Fonts.vt323,
    fontSize: 10,
    color: '#8D99AE',
    letterSpacing: 2,
    lineHeight: 12,
  },
  headerName: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
  },
  headerRankBadge: {
    backgroundColor: AuthColors.navy,
    borderWidth: 2,
    borderColor: AuthColors.crimson,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  headerRankText: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#FFFFFF',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    backgroundColor: AuthColors.white,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    alignItems: 'center',
    gap: 4,
  },
  streakBadgeNum: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.crimson,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    gap: 4,
  },
  coinText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FBBF24' },  rewardsTrailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthColors.gold,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    gap: 4,
    justifyContent: 'center',
  },
  rewardsTrailText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: '#FFF',
    letterSpacing: 1,
  },
  rewardsTrailBtnInactive: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  rewardsTrailTextInactive: {
    color: AuthColors.navy,
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
    justifyContent: 'center',
    flex: 1,
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
    justifyContent: 'center',
    flex: 1,
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
  
  // Stats Help Modal
  statsHelpBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: AuthColors.navy,
    padding: 24,
    width: '90%',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  statsHelpTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.crimson,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsHelpRow: {
    marginBottom: 16,
  },
  statsHelpLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  statsHelpDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: '#64748B',
    lineHeight: 20,
  },
  statsHelpCloseBtn: {
    backgroundColor: AuthColors.navy,
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  statsHelpCloseTxt: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: '#FFFFFF',
  },
    
  // Modals
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
    elevation: 1000,
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: AuthColors.navy, padding: 20, shadowColor: AuthColors.navy, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', padding: 12, marginBottom: 12 },
  attrModalRow: { marginBottom: 12, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', padding: 12 },
  attrModalLabel: { fontFamily: Fonts.vt323, fontSize: 18, color: AuthColors.crimson, marginBottom: 4 },
  attrModalDesc: { fontFamily: Fonts.vt323, fontSize: 16, color: '#3D494C' },
  modalBtn: { backgroundColor: AuthColors.navy, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 2, borderColor: '#FFFFFF' },
  modalBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF' },


  // Reward Anim
  rewardAnimOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    elevation: 1000,
  },
  rewardAnimBox: {
    backgroundColor: '#FFE169',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderWidth: 4,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  rewardAnimText: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.navy,
    marginTop: 12,
    letterSpacing: 2,
  },
  rewardAnimSubtext: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: AuthColors.navy,
    marginTop: 4,
    letterSpacing: 2,
  },
});