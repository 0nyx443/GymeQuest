/**
 * app/post-battle.tsx
 *
 * Post-battle results screen route.
 * Guards against navigation with no resolved battle.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import PostBattleScreen from '@/screens/PostBattleScreen';
import { Colors } from '@/constants/theme';

export default function PostBattleRoute() {
  const router = useRouter();
  const battle = useGameStore((s) => s.battle);

  useEffect(() => {
    if (!battle) router.replace('/');
  }, []);

  if (!battle) return <View style={styles.bg} />;

  return <PostBattleScreen />;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.bgVoid },
});
