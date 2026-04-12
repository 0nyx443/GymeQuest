import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Fonts, AuthColors } from '@/constants/theme';

interface SkillTriggerProps {
  skillName: string;
  skillId: string;
  triggerTime: number; // timestamp
  onComplete?: () => void;
}

/**
 * Displays a floating skill trigger notification
 * Shows which skill was triggered and animates out
 */
export const SkillTrigger: React.FC<SkillTriggerProps> = ({
  skillName,
  skillId,
  triggerTime,
  onComplete,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide up and fade out animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -80,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete?.();
    });
  }, [slideAnim, fadeAnim, scaleAnim, onComplete]);

  // Map skill IDs to icons and colors
  const skillConfig = {
    adrenaline_rush: { icon: 'lightning-bolt', color: '#FFD700', label: 'ADRENALINE!' },
    heavy_strike: { icon: 'hammer-screwdriver', color: '#FF6B6B', label: 'CRITICAL HIT!' },
    second_wind: { icon: 'wind-power', color: '#00D4FF', label: 'SECOND WIND!' },
    form_mastery: { icon: 'medal', color: '#00FF88', label: 'PERFECT FORM!' },
    loot_scavenger: { icon: 'treasure-chest', color: '#FFB84D', label: 'LOOT DROP!' },
    iron_lungs: { icon: 'lungs', color: '#8B4789', label: 'IRON LUNGS!' },
  } as Record<string, { icon: string; color: string; label: string }>;

  const config = skillConfig[skillId] || {
    icon: 'star',
    color: '#00FF00',
    label: 'SKILL!',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: config.color + '30' }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={20}
          color={config.color}
          style={styles.icon}
        />
        <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
      </View>
    </Animated.View>
  );
};

/**
 * Container that manages multiple skill trigger notifications
 */
export interface SkillTriggerEvent {
  id: string;
  skillId: string;
  skillName: string;
  timestamp: number;
}

interface SkillTriggersContainerProps {
  triggers: SkillTriggerEvent[];
  onTriggerComplete: (id: string) => void;
}

export const SkillTriggersContainer: React.FC<SkillTriggersContainerProps> = ({
  triggers,
  onTriggerComplete,
}) => {
  return (
    <View style={styles.triggersContainer} pointerEvents="none">
      {triggers.map((trigger, index) => (
        <View key={trigger.id} style={{ marginTop: index * 50 }}>
          <SkillTrigger
            skillName={trigger.skillName}
            skillId={trigger.skillId}
            triggerTime={trigger.timestamp}
            onComplete={() => onTriggerComplete(trigger.id)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  triggersContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 50,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    ...Fonts.vt323,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
