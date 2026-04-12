import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';
import { PASSIVE_SKILLS, getAvailableSkills, SkillId } from '@/utils/skills';
import { AuthColors, Fonts } from '@/constants/theme';

export function SkillsPanel() {
  const playerLevel = useGameStore((s) => s.avatar.level);
  const playerCoins = useGameStore((s) => s.avatar.coins);
  const purchasedSkills = useGameStore((s) => s.avatar.purchasedSkills);
  const equippedSkills = useGameStore((s) => s.avatar.equippedSkills);
  const purchaseSkill = useGameStore((s) => s.purchaseSkill);
  const toggleSkillEquip = useGameStore((s) => s.toggleSkillEquip);

  const availableSkills = getAvailableSkills(playerLevel);
  const allSkillIds = Object.keys(PASSIVE_SKILLS) as SkillId[];

  const handlePurchase = async (skillId: SkillId) => {
    const skill = PASSIVE_SKILLS[skillId];
    if (playerCoins < skill.purchaseCost) {
      Alert.alert('Not Enough Coins', `You need ${skill.purchaseCost} coins`);
      return;
    }
    const result = await purchaseSkill(skillId);
    if (result.success) {
      Alert.alert('Success', `${skill.name} purchased!`);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleToggleEquip = (skillId: SkillId) => {
    if (equippedSkills.length >= 3 && !equippedSkills.includes(skillId)) {
      Alert.alert('Slot Limit', 'Max 3 skills equipped');
      return;
    }
    toggleSkillEquip(skillId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.panelTitle}>⚡ PASSIVE SKILLS</Text>
      <Text style={styles.slotInfo}>Active Slots: {equippedSkills.length}/3</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillsScroll}>
        {allSkillIds.map((skillId) => {
          const skill = PASSIVE_SKILLS[skillId];
          const isAvailable = availableSkills.includes(skillId);
          const isPurchased = purchasedSkills.includes(skillId);
          const isEquipped = equippedSkills.includes(skillId);

          return (
            <View key={skillId} style={styles.skillCard}>
              {!isAvailable && (
                <View style={styles.lockOverlay}>
                  <MaterialCommunityIcons name="lock-closed" size={20} color="#FFF" />
                  <Text style={styles.lockText}>Lvl {skill.unlockLevel}</Text>
                </View>
              )}

              <Text style={styles.skillIcon}>{skill.icon}</Text>
              <Text style={styles.skillName}>{skill.name}</Text>
              <Text style={styles.skillCost}>
                {isPurchased ? '✓' : `${skill.purchaseCost}`}
              </Text>

              {isAvailable && !isPurchased && (
                <TouchableOpacity
                  style={styles.buyBtn}
                  onPress={() => handlePurchase(skillId)}
                  disabled={playerCoins < skill.purchaseCost}
                >
                  <Text style={styles.btnText}>BUY</Text>
                </TouchableOpacity>
              )}

              {isPurchased && (
                <TouchableOpacity
                  style={[styles.equipBtn, isEquipped && styles.equipBtnActive]}
                  onPress={() => handleToggleEquip(skillId)}
                >
                  <Text style={styles.btnText}>{isEquipped ? '✓' : 'EQUIP'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  panelTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    letterSpacing: 1,
    marginBottom: 8,
  },
  slotInfo: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  skillsScroll: {
    flexGrow: 0,
  },
  skillCard: {
    width: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: AuthColors.navy,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    fontFamily: Fonts.vt323,
    fontSize: 10,
    color: '#FFF',
    marginTop: 4,
  },
  skillIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  skillName: {
    fontFamily: Fonts.vt323,
    fontSize: 10,
    color: AuthColors.navy,
    textAlign: 'center',
    marginBottom: 4,
  },
  skillCost: {
    fontFamily: Fonts.pixel,
    fontSize: 11,
    color: '#EAB308',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  buyBtn: {
    backgroundColor: AuthColors.navy,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: '100%',
  },
  equipBtn: {
    backgroundColor: '#64748B',
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: '100%',
  },
  equipBtnActive: {
    backgroundColor: '#F59E0B',
  },
  btnText: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
