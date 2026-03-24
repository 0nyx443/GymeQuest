/**
 * app/combat.tsx
 *
 * Combat screen route. Guards against direct navigation if no
 * active battle exists in the store.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';
import CombatScreen from '@/screens/CombatScreen';
import { Colors, Fonts } from '@/constants/theme';

export default function CombatRoute() {
  const router = useRouter();
  const battle = useGameStore((s) => s.battle);

  // Guard: no active battle → redirect home
  useEffect(() => {
    if (!battle) {
      router.replace('/');
    }
  }, []);

  if (!battle) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Loading battle…</Text>
      </View>
    );
  }

  return <CombatScreen />;
}

const styles = StyleSheet.create({
  guard: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
});
