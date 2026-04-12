import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { ENEMIES } from '@/constants/game';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { QuestHeader } from '@/components/hub/QuestHeader';
import { QuestCard } from '@/components/hub/QuestCard';
import { QuestInfoBox } from '@/components/hub/QuestInfoBox';

interface QuestScreenProps {
  onBack?: () => void;
}

// Static image map — updated with the new 5 enemies
const ENEMY_IMAGES: Record<number, any> = {
  0: require('@/assets/images/goblin_scout.png'),
  1: require('@/assets/images/iron_sentinel.png'),
  2: require('@/assets/images/shadow_monk.png'),
  3: require('@/assets/images/dragon_wyrmling.png'),
  4: require('@/assets/images/ancient_colossus.png'),
};

export default function QuestScreen({ onBack }: QuestScreenProps) {
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

      {/* Back button — only shown when accessed from Battle Hub */}
      {onBack && (
        <TouchableOpacity style={styles.backRow} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={AuthColors.navy} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <QuestHeader />

        <View style={styles.list}>
          {ENEMIES.map((enemy, index) => {
            const isLocked = avatarLevel < enemy.unlockLevel;

            // Only attach an image if we have one AND the card is not locked.
            // Passing null/undefined to <Image source={...}> causes the warning.
            const image = (!isLocked && ENEMY_IMAGES[index]) ? ENEMY_IMAGES[index] : undefined;

            const enemyWithImage = {
              ...enemy,
              level: enemy.unlockLevel,
              image,
              // Utilizing the color defined in your ENEMIES constant for better visual variety
              color: enemy.color || (index === 0 ? '#C6E8F8' : index === 1 ? '#8CF5E4' : '#E2E8F0'),
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

          <View style={styles.upcomingBox}>
            <Text style={styles.upcomingText}>More upcoming quests...</Text>
          </View>
        </View>

        <QuestInfoBox />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FDF1E6',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  list: {
    marginBottom: 16,
  },
  upcomingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderStyle: 'dashed',
    marginTop: 16,
  },
  upcomingText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 2,
  },
});