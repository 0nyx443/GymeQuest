import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { MAX_LEVEL } from '@/constants/game';
import { PASSIVE_SKILLS, PassiveSkill } from '@/utils/skills';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RewardsScreen() {
  const router = useRouter();
  const avatar = useGameStore((s) => s.avatar);
  const claimLevelReward = useGameStore((s) => s.claimLevelReward);

  // Generate levels 1 to 50
  // Array reversed so Level 50 is at index 0 (top), Level 1 is at index 49 (bottom).
  const levels = Array.from({ length: MAX_LEVEL }, (_, i) => MAX_LEVEL - i);

  // Use a ref to scroll to bottom on mount
  const scrollRef = useRef<ScrollView>(null);
  const [selectedSkill, setSelectedSkill] = useState<PassiveSkill | null>(null);

  useEffect(() => {
    // Small timeout ensures layout is computed before scrolling
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClaim = async (level: number) => {
    if (level <= avatar.level && !avatar.claimedLevelRewards?.includes(level)) {
      await claimLevelReward(level);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left-thick" size={24} color={AuthColors.navy} />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>REWARDS TRAIL</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineWrapper}>
          {/* Constant vertical rope connecting the nodes */}
          <View style={styles.ropeLine} />

          {levels.map((level) => {
            const isClaimed = level === 1 || avatar.claimedLevelRewards?.includes(level);
            const isUnlockable = level <= avatar.level;
            const canClaim = isUnlockable && !isClaimed;

            let circleBgColor = '#27272a';
            let circleBorderColor = '#52525b';
            let iconColor = '#a1a1aa';

            if (isClaimed) {
              circleBgColor = '#064e3b';
              circleBorderColor = '#10b981';
              iconColor = '#10b981';
            } else if (canClaim) {
              circleBgColor = '#78350f';
              circleBorderColor = '#f59e0b';
              iconColor = '#f59e0b';
            } else {
              circleBgColor = '#450a0a';
              circleBorderColor = '#ef4444';
              iconColor = '#ef4444';
            }

            const rewardCols = level === 1 ? 0 : level * 50;
            const unlockedSkill = Object.values(PASSIVE_SKILLS).find((s: any) => s.unlockLevel === level);
            let slotUpgrade = '';
            if (level === 10) slotUpgrade = 'Unlock 2nd Skill Slot';
            if (level === 20) slotUpgrade = 'Unlock 3rd Skill Slot';

            return (
              <View key={level} style={styles.row}>
                {/* Timeline Circle */}
                <View style={[styles.circleNode, { borderColor: circleBorderColor, backgroundColor: circleBgColor }]}>
                  {canClaim ? (
                    <View style={styles.pulseActive} />
                  ) : isClaimed ? (
                    <MaterialCommunityIcons name="check" size={16} color={iconColor} />
                  ) : (
                    <Text style={[styles.lockedMark, { color: iconColor }]}>X</Text>
                  )}
                </View>

                {/* Reward Information Card */}
                <View style={[styles.card, !isUnlockable && styles.cardLocked, canClaim && styles.cardActive]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.levelText, !isUnlockable && styles.textLocked]}>
                      LEVEL {level}
                    </Text>
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {level > 1 && (
                        <View style={[styles.rewardTag, !isUnlockable && styles.rewardTagLocked]}>
                          <Text style={[styles.rewardTagText, !isUnlockable && styles.textLocked]}>
                            +{rewardCols} Coins
                          </Text>
                        </View>
                      )}
                      {unlockedSkill && (
                        <TouchableOpacity style={[styles.rewardTag, !isUnlockable && styles.rewardTagLocked, { backgroundColor: isUnlockable ? AuthColors.tealLink + '20' : '#E8E8E8' }]} onPress={() => setSelectedSkill(unlockedSkill as PassiveSkill)}>
                          <Text style={[styles.rewardTagText, { color: isUnlockable ? AuthColors.tealLink : '#999' }]}>
                            🌟 {unlockedSkill.name} Skill
                          </Text>
                        </TouchableOpacity>
                      )}
                      {slotUpgrade !== '' && (
                        <View style={[styles.rewardTag, !isUnlockable && styles.rewardTagLocked, { backgroundColor: isUnlockable ? '#FFD700' + '30' : '#E8E8E8' }]}>
                          <Text style={[styles.rewardTagText, { color: isUnlockable ? '#B8860B' : '#999', fontWeight: 'bold' }]}>
                            🎒 {slotUpgrade}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    {canClaim ? (
                      <TouchableOpacity style={styles.claimButton} onPress={() => handleClaim(level)}>
                        <Text style={styles.claimButtonText}>COLLECT REWARD</Text>
                      </TouchableOpacity>
                    ) : isClaimed ? (
                      <Text style={styles.statusTextDone}>{level === 1 ? 'JOURNEY STARTED' : 'OBTAINED'}</Text>
                    ) : (
                      <Text style={styles.statusTextLocked}>LOCKED</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Skill Detail Modal */}
      <Modal visible={!!selectedSkill} transparent animationType="fade" onRequestClose={() => setSelectedSkill(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSkill(null)}>
          <Pressable style={styles.modalContent}>
            {selectedSkill && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedSkill.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedSkill(null)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close-thick" size={24} color={AuthColors.navy} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalDesc}>{selectedSkill.description}</Text>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>{selectedSkill.category.charAt(0).toUpperCase() + selectedSkill.category.slice(1) + ' Skill'}</Text>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 4,
    borderBottomColor: AuthColors.navy,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  appBarTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 60,
  },
  timelineWrapper: {
    paddingHorizontal: 24,
    position: 'relative',
  },
  ropeLine: {
    position: 'absolute',
    width: 4,
    backgroundColor: '#CBD5E1',
    top: 0,
    bottom: 0,
    left: 40, // perfectly aligns with the center of the 36px circle
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  circleNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#27272a',
  },
  pulseActive: {
    width: 16,
    height: 16,
    backgroundColor: AuthColors.gold,
    borderRadius: 8,
  },
  lockedMark: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    marginTop: -2,
    marginLeft: 2,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffffEE', // slightly translucent white
    borderWidth: 3,
    borderColor: AuthColors.navy,
    borderBottomWidth: 6,
    padding: 12,
    borderRadius: 4,
    opacity: 0.95,
  },
  cardLocked: {
    backgroundColor: '#E2E8F0', // light grey instead of dark translucent
    borderColor: '#94A3B8',
    opacity: 0.9,
  },
  cardActive: {
    backgroundColor: '#FFF',
    borderColor: AuthColors.goldBorder,
    borderWidth: 3,
    borderBottomWidth: 6,
  },
  cardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  levelText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginTop: 4,
  },
  rewardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  rewardTagLocked: {
    backgroundColor: '#334155',
    borderColor: '#0F172A',
  },
  rewardTagText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: AuthColors.navy,
  },
  textLocked: {
    color: '#94A3B8',
  },
  cardFooter: {
    alignItems: 'flex-start',
  },
  claimButton: {
    backgroundColor: AuthColors.gold,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    borderBottomWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  claimButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFF',
  },
  statusTextDone: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.navy,
    opacity: 0.6,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusTextLocked: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#94A3B8',
    opacity: 0.8,
    letterSpacing: 1,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', width: '100%', padding: 20, borderWidth: 4, borderColor: AuthColors.navy, borderBottomWidth: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: AuthColors.navy, paddingBottom: 12, marginBottom: 16 },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy, flex: 1 },
  closeBtn: { padding: 4 },
  modalDesc: { fontFamily: Fonts.vt323, fontSize: 18, color: AuthColors.textDark, lineHeight: 24, marginBottom: 16 },
  modalBadge: { alignSelf: 'flex-start', backgroundColor: AuthColors.tealLink, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: AuthColors.navy },
  modalBadgeText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#FFF' },
});
