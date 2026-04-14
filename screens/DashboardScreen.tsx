import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useGameStore, selectXpProgress } from '@/store/gameStore';
import { useRouter } from 'expo-router';
// MAX_LEVEL here so your XP isn't capped at 10
import { XP_TABLE, ENEMIES, MAX_LEVEL } from '@/constants/game';
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
    // Make sure we have enemies before trying to battle
    if (ENEMIES && ENEMIES.length > 1) {
      startBattle(ENEMIES[1]); // Iron Sentinel
      router.push('/combat');
    }
  }, [startBattle, router]);

  // Calculate if the daily bounty is actually completed TODAY
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isDailyCompleted = avatar.lastActiveDate === todayStr 
    && ENEMIES.length > 1 
    && avatar.defeatedEnemies.includes(ENEMIES[1].id);

  // Replaced the hardcoded 10 with MAX_LEVEL so it scales with your 1.2M XP
  const nextLevelXp = avatar.level < MAX_LEVEL ? XP_TABLE[avatar.level + 1] : avatar.xp;

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
          onStorePress={() => router.push('/store')}
        />

        <AvatarStage />

        <ExpBar
          currentXp={avatar.xp}
          nextLevelXp={nextLevelXp}
          progress={xpProgress}
          level={avatar.level}
        />

        <StatGrid
          strength={avatar.stats.strength}
          agility={avatar.stats.agility}
          stamina={avatar.stats.stamina}
        />

        {/* Updated to pass the full Enemy object so the Timer card works */}
        <DailyBountyCard
          enemy={ENEMIES && ENEMIES.length > 1 ? ENEMIES[1] : (ENEMIES[0] as any)}
          isCompleted={isDailyCompleted}
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