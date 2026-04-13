import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';
import { PASSIVE_SKILLS, getAvailableSkills, SkillId } from '@/utils/skills';
import { AuthColors, Fonts } from '@/constants/theme';

interface SkillCardProps {
  skillId: SkillId;
  isAvailable: boolean;
  isPurchased: boolean;
  isEquipped: boolean;
  onPurchase: () => void;
  onToggleEquip: () => void;
  playerCoins: number;
}

function SkillCard({
  skillId,
  isAvailable,
  isPurchased,
  isEquipped,
  onPurchase,
  onToggleEquip,
  playerCoins,
}: SkillCardProps) {
  const skill = PASSIVE_SKILLS[skillId];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    if (!isPurchased) {
      onPurchase();
    } else {
      onToggleEquip();
    }

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.05, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const canAfford = playerCoins >= skill.purchaseCost;
  const buttonDisabled = !isAvailable || (isPurchased ? false : !canAfford);
  const buttonText = isPurchased
    ? isEquipped
      ? '✓ EQUIPPED'
      : 'EQUIP'
    : `BUY ${skill.purchaseCost}`;

  return (
    <Animated.View style={[styles.skillCard, { transform: [{ scale: scaleAnim }] }]}>
      {/* Availability Badge */}
      <View style={styles.badgeContainer}>
        {!isAvailable && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={14} color="#FFF" />
            <Text style={styles.lockedText}>LVL {skill.unlockLevel}</Text>
          </View>
        )}
        {isAvailable && isPurchased && (
          <View style={[styles.purchasedBadge, isEquipped && styles.equippedBadge]}>
            <Ionicons name={isEquipped ? 'checkmark-circle' : 'checkmark'} size={14} color="#FFF" />
            <Text style={styles.purchasedText}>{isEquipped ? 'ACTIVE' : 'OWNED'}</Text>
          </View>
        )}
      </View>

      {/* Skill Icon & Name */}
      <View style={styles.headerSection}>
        <Text style={styles.skillIcon}>{skill.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.skillName}>{skill.name}</Text>
          <Text style={styles.skillCategory}>
            {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.skillDescription}>{skill.description}</Text>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          isEquipped && styles.actionButtonEquipped,
          buttonDisabled && styles.actionButtonDisabled,
        ]}
        onPress={onPress}
        disabled={buttonDisabled}
      >
        <Text style={styles.actionButtonText}>{buttonText}</Text>
      </TouchableOpacity>

      {/* Availability Message */}
      {!isAvailable && (
        <View style={styles.notAvailableMessage}>
          <Text style={styles.notAvailableText}>Unlock at Level {skill.unlockLevel}</Text>
        </View>
      )}
      {isAvailable && !isPurchased && !canAfford && (
        <View style={styles.notAvailableMessage}>
          <Text style={styles.notAvailableText}>Not enough coins</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function SkillsScreen() {
  const playerLevel = useGameStore((s) => s.avatar.level);
  const playerCoins = useGameStore((s) => s.avatar.coins);
  const purchasedSkills = useGameStore((s) => s.avatar.purchasedSkills);
  const equippedSkills = useGameStore((s) => s.avatar.equippedSkills);
  const purchaseSkill = useGameStore((s) => s.purchaseSkill);
  const toggleSkillEquip = useGameStore((s) => s.toggleSkillEquip);

  const availableSkills = useMemo(() => getAvailableSkills(playerLevel), [playerLevel]);
  const allSkillIds = Object.keys(PASSIVE_SKILLS) as SkillId[];

  const handlePurchaseSkill = async (skillId: SkillId) => {
    const skill = PASSIVE_SKILLS[skillId];
    if (playerCoins < skill.purchaseCost) {
      Alert.alert('Not Enough Coins', `You need ${skill.purchaseCost} coins to purchase this skill.`);
      return;
    }

    const result = await purchaseSkill(skillId);
    if (!result.success) {
      Alert.alert('Purchase Failed', result.error ?? 'Unknown error');
    } else {
      Alert.alert(
        'Skill Purchased!',
        `${skill.name} is now yours! You can equip it on the next battle.`
      );
    }
  };

  const handleToggleEquip = (skillId: SkillId) => {
    if (equippedSkills.length >= 3 && !equippedSkills.includes(skillId)) {
      Alert.alert('Slot Limit', 'You can only equip 3 skills at once.');
      return;
    }
    toggleSkillEquip(skillId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚔️ PASSIVE SKILLS</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>LVL</Text>
            <Text style={styles.statValue}>{playerLevel}</Text>
          </View>
          <View style={styles.statBadge}>
            <MaterialCommunityIcons name="star-four-points" size={12} color="#FDE047" />
            <Text style={styles.statValue}>{playerCoins}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={styles.statValue}>{equippedSkills.length}/3</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={allSkillIds}
        renderItem={({ item: skillId }) => (
          <SkillCard
            skillId={skillId}
            isAvailable={availableSkills.includes(skillId)}
            isPurchased={purchasedSkills.includes(skillId)}
            isEquipped={equippedSkills.includes(skillId)}
            onPurchase={() => handlePurchaseSkill(skillId)}
            onToggleEquip={() => handleToggleEquip(skillId)}
            playerCoins={playerCoins}
          />
        )}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 4,
    borderBottomColor: AuthColors.navy,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.navy,
    letterSpacing: 2,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: AuthColors.navy,
    borderWidth: 2,
    borderColor: '#FDE047',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 11,
    color: '#FFF',
    letterSpacing: 1,
  },
  statValue: {
    fontFamily: Fonts.pixel,
    fontSize: 13,
    color: '#FEF08A',
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  skillCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  lockedBadge: {
    backgroundColor: '#64748B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedText: {
    fontFamily: Fonts.vt323,
    fontSize: 11,
    color: '#FFF',
  },
  purchasedBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equippedBadge: {
    backgroundColor: '#F59E0B',
  },
  purchasedText: {
    fontFamily: Fonts.vt323,
    fontSize: 11,
    color: '#FFF',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  skillIcon: {
    fontSize: 32,
  },
  skillName: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    fontWeight: 'bold',
  },
  skillCategory: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  skillDescription: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.labelMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: AuthColors.navy,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  actionButtonEquipped: {
    backgroundColor: '#F59E0B',
    borderColor: '#FCD34D',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  notAvailableMessage: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
  },
  notAvailableText: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
});
