/**
 * AvatarDisplay.tsx
 *
 * Renders the player's milestone image based on their current level.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

interface AvatarDisplayProps {
  level: number;
  size?: number;
  animated?: boolean;
}

// ── We grab the correct image based on the level, matching the milestones!
function getMilestoneImage(level: number, equippedSkin?: string | null) {
  if (equippedSkin === 'm_series') return require('@/assets/images/m_avatar.png');
  if (equippedSkin === 'omni_man') return require('@/assets/images/Omni-Man_profile.png');
  if (equippedSkin === 'atom_eve') return require('@/assets/images/Atom-Eve_profile.png');

  if (level >= 50) return require('@/assets/images/legend.png');
  if (level >= 25) return require('@/assets/images/champion.png');
  if (level >= 10) return require('@/assets/images/challenger.png');
  return require('@/assets/images/rookie.png');
}

// ── Update aura colors to match the new milestone levels
function getAuraColor(level: number): string {
  if (level >= 50) return Colors.gold;
  if (level >= 25) return Colors.crimson;
  if (level >= 10) return Colors.teal;
  return '#4488AA';
}

export function AvatarDisplay({ level, size = 120, animated = true }: AvatarDisplayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const auraColor = getAuraColor(level);
  const equippedSkin = useGameStore(state => state.avatar.equippedSkin);
  
  // Get the correct PNG file
  const avatarImage = getMilestoneImage(level, equippedSkin);

  useEffect(() => {
    if (!animated) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [animated]);

  const s = size;

  return (
    <Animated.View style={{ transform: [{ scale: animated ? pulseAnim : 1 }] }}>
      {/* Aura glow ring */}
      <View
        style={[
          styles.auraRing,
          {
            width: s + 20,
            height: s + 20,
            borderRadius: (s + 20) / 2,
            borderColor: auraColor,
            opacity: 0.35,
            shadowColor: auraColor,
          },
        ]}
      />

      {/* Avatar frame circle */}
      <View
        style={[
          styles.avatarFrame,
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            borderColor: auraColor,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
         {/* ── We render your PNG inside the circle instead of drawing SVGs ── */}
         <Image 
            source={avatarImage}
            style={{ width: s * 0.8, height: s * 0.8 }}
            resizeMode="contain"
         />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  auraRing: {
    position: 'absolute',
    top: -10, left: -10,
    borderWidth: 1,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarFrame: {
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0A0A18',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});