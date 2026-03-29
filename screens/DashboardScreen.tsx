import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { useRouter } from 'expo-router';
import { XP_TABLE, ENEMIES } from '@/constants/game';
import { AuthColors, Fonts } from '@/constants/theme';
import { supabase } from '@/utils/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const avatar = useGameStore((s) => s.avatar);
  const resetAvatar = useGameStore((s) => s.resetAvatar);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const xpProgress = useGameStore(selectXpProgress);
  const startBattle = useGameStore((s) => s.startBattle);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    resetBattle();
    resetAvatar();
  }, [resetAvatar, resetBattle]);

  const handleQuestPress = useCallback(() => {
    if (ENEMIES.length > 0) {
      startBattle(ENEMIES[0]);
      router.push('/combat');
    }
  }, [startBattle, router]);

  const nextLevelXp = avatar.level < 10 ? XP_TABLE[avatar.level] : avatar.xp;
  const currentBaseXp = avatar.xp - (avatar.level > 1 ? XP_TABLE[avatar.level - 1] : 0);
  const reqBaseXp = nextLevelXp - (avatar.level > 1 ? XP_TABLE[avatar.level - 1] : 0);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <ScrollView 
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Greeting Header --- */}
        <View style={styles.greetingHeader}>
          <View>
            <Text style={styles.greetingClassText}>{avatar.class || 'ADVENTURER'}</Text>
            <Text style={styles.greetingNameText}>{avatar.name}</Text>
          </View>
          <Text style={styles.greetingLevelText}>LVL {avatar.level}</Text>
        </View>

        {/* --- Avatar Hero Stage --- */}
        <View style={styles.avatarStage}>
          <Image 
            source={require('@/assets/images/chibi.png')}
            style={styles.chibiImage}
            resizeMode="contain"
          />
          <View style={styles.platformOuter} />
        </View>

        {/* --- EXP Bar Row --- */}
        <View style={styles.expSection}>
          <Text style={styles.expText}>XP: {avatar.xp} / {nextLevelXp}</Text>
          <View style={styles.expBarOuter}>
            <View style={[styles.expBarInner, { width: `${xpProgress * 100}%` }]} />
          </View>
        </View>

        {/* --- Mini Stat Blocks --- */}
        <View style={styles.statsRow}>
          {/* STR */}
          <View style={styles.statBox}>
            <View style={[styles.statIconPlaceholder, { backgroundColor: AuthColors.crimson }]} />
            <Text style={styles.statValue}>{avatar.stats.strength}</Text>
            <Text style={styles.statLabel}>STR</Text>
          </View>

          {/* AGI */}
          <View style={styles.statBox}>
            <View style={[styles.statIconPlaceholder, { backgroundColor: AuthColors.tealLink }]} />
            <Text style={styles.statValue}>{avatar.stats.agility}</Text>
            <Text style={styles.statLabel}>AGI</Text>
          </View>

          {/* STA */}
          <View style={styles.statBox}>
            <View style={[styles.statIconPlaceholder, { backgroundColor: '#007166' }]} />
            <Text style={styles.statValue}>{avatar.stats.stamina}</Text>
            <Text style={styles.statLabel}>STA</Text>
          </View>
        </View>

        {/* --- Daily Quest Card --- */}
        <View style={styles.dailyQuestCard}>
          <View style={styles.dqHeaderRow}>
             <Text style={styles.dqHeaderLabel}>DAILY QUEST</Text>
             <View style={styles.dqHeaderIcon} />
          </View>

          <View style={styles.dqContentRow}>
            <Image 
              source={require('@/assets/images/shroom.png')}
              style={styles.shroomImage}
              resizeMode="contain"
            />
            <Text style={styles.dqEnemyName}>SLAY:{'\n'}GRUMPY SHROOM</Text>

            <View style={styles.dqRewardRow}>
              <View style={styles.dqRewardIcon} />
              <Text style={styles.dqRewardText}>150 XP</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.dqButton} 
            activeOpacity={0.8}
            onPress={handleQuestPress}
          >
            <Text style={styles.dqButtonText}>START QUEST</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 80, // Increased to prevent bottom nav from cutting off content
  },
  
  // Greeting Header
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingClassText: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#6D797D',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  greetingNameText: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    color: AuthColors.navy,
    marginTop: 4,
  },
  greetingLevelText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    fontWeight: '700',
    color: AuthColors.goldBorder,
  },

  // Avatar Hero Stage
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 180,
    marginBottom: 24,
  },
  chibiImage: {
    width: 128,
    height: 128,
    marginBottom: 0, // Reset to 0 to prevent overlapping the platform line
    zIndex: 2,
  },
  platformOuter: {
    width: '100%',
    height: 48,
    backgroundColor: '#006A60',
    borderTopWidth: 3,
    borderColor: AuthColors.navy,
    zIndex: 1,
  },

  // EXP Bar
  expSection: {
    marginBottom: 24,
  },
  expText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  expBarOuter: {
    height: 16,
    backgroundColor: '#D8F2FF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
  },
  expBarInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: AuthColors.goldBorder,
  },

  // Stat Blocks
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    paddingVertical: 12,
    
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4, // for android
  },
  statIconPlaceholder: {
    width: 20,
    height: 20,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 10,
    color: '#6D797D',
    textTransform: 'uppercase',
  },

  // Daily Quest Card
  dailyQuestCard: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.crimson,
    padding: 20,
    marginBottom: 24,
    
    shadowColor: AuthColors.crimson,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  dqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dqHeaderLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.crimson,
  },
  dqHeaderIcon: {
    width: 4,
    height: 18,
    backgroundColor: AuthColors.crimson,
  },
  dqContentRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shroomImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  dqEnemyName: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    fontWeight: '700',
    color: AuthColors.navy,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  dqRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dqRewardIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#765A05',
    marginRight: 8,
  },
  dqRewardText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#765A05',
  },
  dqButton: {
    backgroundColor: AuthColors.crimson,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 16,
    alignItems: 'center',

    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  dqButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.white,
  },

  logoutBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  logoutText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: '#6D797D',
    textTransform: 'uppercase',
  }
});
