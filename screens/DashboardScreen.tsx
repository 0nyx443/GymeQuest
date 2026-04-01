import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { useRouter } from 'expo-router';
import { XP_TABLE, ENEMIES } from '@/constants/game';
import { AuthColors } from '@/constants/theme';
import { supabase } from '@/utils/supabase';

import { GreetingHeader } from '@/components/hub/GreetingHeader';
import { AvatarStage } from '@/components/hub/AvatarStage';
import { ExpBar } from '@/components/hub/ExpBar';
import { StatGrid } from '@/components/hub/StatGrid';
import { DailyBountyCard } from '@/components/hub/DailyBountyCard';

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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      {/* Background Pixel Grid Pattern (Optional) */}
      <View style={styles.bgGrid} pointerEvents="none" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GreetingHeader
          playerName={avatar.name}
          playerLevel={avatar.level}
          playerClass={avatar.class || 'ADVENTURER'}
        />
        <AvatarStage />
        <ExpBar
          currentXp={avatar.xp}
          nextLevelXp={nextLevelXp}
          progress={xpProgress}
        />
        <StatGrid
          strength={avatar.stats.strength}
          agility={avatar.stats.agility}
          stamina={avatar.stats.stamina}
        />
        <DailyBountyCard
          enemyName="GRUMPY SHROOM"
          rewardXp={120}
          onPress={handleQuestPress}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AuthColors.bg,
    position: 'relative',
  },
  bgGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: 'transparent',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
