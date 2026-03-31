import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { AuthColors } from '@/constants/theme';
import { ENEMIES } from '@/constants/game';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';

import { QuestHeader } from '@/components/hub/QuestHeader';
import { QuestCard } from '@/components/hub/QuestCard';
import { QuestInfoBox } from '@/components/hub/QuestInfoBox';

export default function QuestScreen() {
  const router = useRouter();
  const startBattle = useGameStore((s) => s.startBattle);
  const avatarLevel = useGameStore((s) => s.avatar.level);

  const handleQuestPress = useCallback((enemyIndex: number) => {
    if (ENEMIES.length > enemyIndex) {
      startBattle(ENEMIES[enemyIndex]);
      router.push('/combat');
    }
  }, [startBattle, router]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF1E6" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <QuestHeader />

        <View style={styles.list}>
          {ENEMIES.map((enemy, index) => {
            const isLocked = avatarLevel < enemy.difficulty;
            // Map original sprites to enemy objects if not already there
            // In a real app these would be in constants/game.ts
            const enemyWithImage = {
              ...enemy,
              level: enemy.difficulty, // Map difficulty to level for the card
              image: index === 0
                ? require('@/assets/images/shroom.png')
                : index === 1
                  ? require('@/assets/images/slime.png')
                  : null, // Others locked/no image provided yet
              color: index === 0 ? '#C6E8F8' : index === 1 ? '#8CF5E4' : '#E2E8F0',
            };

            return (
              <QuestCard
                key={enemy.id}
                enemy={enemyWithImage}
                isLocked={isLocked}
                onPress={() => handleQuestPress(index)}
              />
            );
          })}
        </View>

        <QuestInfoBox />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FDF1E6', // Original design background
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  list: {
    marginBottom: 16,
  },
});
