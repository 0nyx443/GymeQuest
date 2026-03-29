import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { ENEMIES } from '@/constants/game';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';

export default function QuestScreen() {
  const router = useRouter();
  const startBattle = useGameStore((s) => s.startBattle);
  
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
        {/* --- Header Section --- */}
        <View style={styles.headerSection}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>QUEST MAP</Text>
          </View>
          <Text style={styles.headerTitle}>BOUNTIES</Text>
          <Text style={styles.headerSubtitle}>Defeat monsters to earn XP and Gold</Text>
        </View>

        {/* --- Quest List Grid --- */}
        <View style={styles.questGrid}>
          
          {/* CARD 1: Grumpy Shroom */}
          <View style={styles.card}>
            <View style={styles.cardContentRow}>
              <View style={[styles.imageBox, { backgroundColor: '#C6E8F8' }]}>
                 <Image source={require('@/assets/images/shroom.png')} style={styles.monsterImage} resizeMode="contain" />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitleText}>GRUMPY SHROOM</Text>
                  <Text style={[styles.cardLevelText, { color: '#006A60' }]}>LVL 1</Text>
                </View>

                <Text style={styles.cardLore}>
                  "Quit trampling my spores! Do 10 push-ups to pay for the damage."
                </Text>

                <View style={styles.rewardRow}>
                  <View style={styles.rewardPills}>
                    <View style={[styles.rewardBadge, { backgroundColor: '#765A05', borderColor: AuthColors.navy }]}>
                       <Text style={styles.rewardBadgeText}>10</Text>
                    </View>
                    <View style={styles.xpWrapper}>
                      <View style={[styles.xpDot, { backgroundColor: '#765A05' }]} />
                      <Text style={[styles.xpText, { color: '#765A05' }]}>150 XP</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    activeOpacity={0.8}
                    onPress={() => handleQuestPress(0)}
                  >
                    <Text style={styles.actionButtonText}>FIGHT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* CARD 2: Slime King */}
          <View style={styles.card}>
            <View style={styles.cardContentRow}>
              <View style={[styles.imageBox, { backgroundColor: '#8CF5E4' }]}>
                 <Image source={require('@/assets/images/slime.png')} style={styles.monsterImage} resizeMode="contain" />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitleText}>SLIME KING</Text>
                  <Text style={[styles.cardLevelText, { color: '#006A60' }]}>LVL 2</Text>
                </View>

                <Text style={styles.cardLore}>
                  "The floor is lava, but I am the floor. Give me 20 squats, mortal."
                </Text>

                <View style={styles.rewardRow}>
                  <View style={styles.rewardPills}>
                    <View style={[styles.rewardBadge, { backgroundColor: '#006A60', borderColor: AuthColors.navy }]}>
                       <Text style={styles.rewardBadgeText}>20</Text>
                    </View>
                    <View style={styles.xpWrapper}>
                      <View style={[styles.xpDot, { backgroundColor: '#765A05' }]} />
                      <Text style={[styles.xpText, { color: '#765A05' }]}>280 XP</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    activeOpacity={0.8}
                    onPress={() => handleQuestPress(1)}
                  >
                    <Text style={styles.actionButtonText}>FIGHT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* CARD 3: Locked */}
          <View style={[styles.card, styles.lockedCard]}>
            <View style={styles.cardContentRow}>
              <View style={[styles.imageBox, styles.lockedImageBox]}>
                <View style={styles.lockedIconPlaceholder} />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitleText, { color: '#64748B' }]}>???</Text>
                  <Text style={[styles.cardLevelText, { color: '#94A3B8' }]}>LVL 3</Text>
                </View>

                <Text style={[styles.cardLore, { color: '#94A3B8' }]}>
                  "The fog of war obscures this bounty. Train harder to reveal the foe."
                </Text>

                <View style={styles.rewardRow}>
                  <View style={styles.rewardPills}>
                    <View style={[styles.rewardBadge, { backgroundColor: '#CBD5E1', borderColor: '#94A3B8' }]}>
                       <Text style={[styles.rewardBadgeText, { color: '#475569' }]}>???</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

        </View>

        {/* --- Decorative Board Info --- */}
        <View style={styles.infoBoard}>
           <View style={styles.infoIconBox}>
              <View style={styles.infoIconInner} />
           </View>
           <Text style={styles.infoBoardText}>
             Quests refresh every 24 hours. Complete bounties to earn XP and Gold
           </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FDF1E6',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingHorizontal: 24, 
    paddingBottom: 120, // Avoid bottom nav overlap
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerBadge: {
    backgroundColor: AuthColors.goldBorder,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
    
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerBadgeText: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#5E4700',
    letterSpacing: 4.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 28, // Mockup 36, reduced for fit
    color: AuthColors.crimson,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 40,
  },
  headerSubtitle: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#6D797D',
    textAlign: 'center',
  },

  // Bento Quest Grid
  questGrid: {
    gap: 24,
    marginBottom: 32,
  },
  card: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16, 
    
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  lockedCard: {
    backgroundColor: '#FAFDFD', // Lighter bg for locked feeling
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
  cardContentRow: {
    flexDirection: 'row',
    gap: 16,
  },
  imageBox: {
    width: 72,
    height: 72,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedImageBox: {
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  lockedIconPlaceholder: {
    width: 24,
    height: 32,
    backgroundColor: '#64748B',
  },
  monsterImage: {
    width: 64,
    height: 64,
  },
  cardDetails: {
    flex: 1,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleText: {
    fontFamily: Fonts.pixel,
    fontSize: 14, 
    color: AuthColors.navy,
    flexShrink: 1,
  },
  cardLevelText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    fontWeight: '700',
  },
  cardLore: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#3D494C',
    lineHeight: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rewardPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardBadge: {
    borderWidth: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadgeText: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.white,
  },
  xpWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpDot: {
    width: 8,
    height: 8,
  },
  xpText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: AuthColors.crimson,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 10,
    paddingHorizontal: 16,

    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  actionButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.white,
  },

  // Info board
  infoBoard: {
    backgroundColor: '#D8F2FF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,

    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  infoIconBox: {
    width: 45,
    height: 45,
    backgroundColor: '#FFA19F',
    borderWidth: 2,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconInner: {
    width: 20,
    height: 20,
    backgroundColor: AuthColors.crimson,
  },
  infoBoardText: {
    flex: 1,
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#001F29',
    lineHeight: 24,
  }
});
