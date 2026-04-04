import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

import { useGameStore } from '@/store/gameStore';
import { AuthColors, Fonts } from '@/constants/theme';

export default function PostBattleScreen() {
  const router = useRouter();
  const battle = useGameStore((s) => s.battle);
  const resetBattle = useGameStore((s) => s.resetBattle);
  
  // 1. Get the player's current level
  const avatarLevel = useGameStore((s) => s.avatar.level);

  const isVictory = battle?.phase === 'victory';

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (isVictory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [isVictory]);

  const handleContinue = () => {
    resetBattle();
    router.replace('/');
  };

  // 2. Helper for Defeated Images (── NOW ACTIVE! ──)
  const getDefeatedImage = (level: number) => {
    // We are now pointing directly to the generated defeated files from your assets folder!
    if (level >= 50) return require('@/assets/images/legend_defeated.png');
    if (level >= 25) return require('@/assets/images/champion_defeated.png');
    if (level >= 10) return require('@/assets/images/challenger_defeated.png');
    return require('@/assets/images/rookie_defeated.png');
  };

  // 3. Helper for Victory Images (Uses the standard standing poses)
  const getVictoryImage = (level: number) => {
    if (level >= 50) return require('@/assets/images/legend.png');
    if (level >= 25) return require('@/assets/images/champion.png');
    if (level >= 10) return require('@/assets/images/challenger.png');
    return require('@/assets/images/rookie.png');
  };

  if (!battle) {
    router.replace('/');
    return null;
  }

  const repsCompleted = battle.repsCompleted;
  const repsRequired = battle.enemy.repsRequired;

  if (isVictory) {
    return (
      <View style={styles.vScreen}>

        <LinearGradient colors={['#f3faff', '#c6e8f8']} style={StyleSheet.absoluteFillObject} />

        <Animated.View style={{ flex: 1, zIndex: 10, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <ScrollView contentContainerStyle={styles.mainWrap} showsVerticalScrollIndicator={false}>
            <Text style={styles.vTitle}>VICTORY!</Text>

            <View style={styles.vAvatarBlock}>
              <Image
                source={getVictoryImage(avatarLevel)}
                style={styles.vAvatarImage}
                resizeMode="contain"
              />
              <View style={styles.vAvatarShadow} />
            </View>

            <View style={styles.vRewardCard}>
              <View style={styles.vRewardHeader}>
                <MaterialIcons name="inventory" size={32} color={AuthColors.gold} />
                <View>
                  <Text style={styles.vRewardSub}>QUEST COMPLETE</Text>
                  <Text style={styles.vRewardTitle}>{battle.enemy.name.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.vRewardContent}>
                <Text style={styles.vRewardXp}>+{battle.enemy.xpReward} XP</Text>
                <Text style={styles.vRewardLoot}>Loot Gained: 50 Gold</Text>
              </View>

              <TouchableOpacity style={styles.vBtn} onPress={handleContinue}>
                <Text style={styles.vBtnText}>COLLECT REWARD</Text>
                <MaterialIcons name="keyboard-double-arrow-right" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // DEFEAT
  return (
    <View style={styles.dScreen}>

      <Animated.View style={{ flex: 1, zIndex: 10, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.mainWrap} showsVerticalScrollIndicator={false}>
          <Text style={styles.dTitle}>WIPED OUT</Text>

          <View style={styles.dAvatarBlock}>
            <Image
              source={getDefeatedImage(avatarLevel)}
              style={styles.dAvatarImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.dDialogBox}>
            <View style={styles.dDialogDecoration} />
            <Text style={styles.dDialogText}>
              You only did <Text style={{ color: AuthColors.crimson, fontFamily: Fonts.pixel, fontSize: 16 }}>{repsCompleted} / {repsRequired}</Text> reps.
            </Text>
            <View style={styles.dDialogDivider} />
            <Text style={styles.dDialogSub}>Rest up at the inn and try again!</Text>
          </View>

          <TouchableOpacity style={styles.dBtnContainer} activeOpacity={0.8} onPress={handleContinue}>
            <View style={styles.dBtnShadow} />
            <View style={styles.dBtnInner}>
              <Text style={styles.dBtnText}>RETURN TO TOWN</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... Styles are the same as before ...
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: AuthColors.bg,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
    elevation: 4,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    zIndex: 50,
  },
  topAppBarText: {
    fontFamily: Fonts.vt323,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 18,
    color: AuthColors.crimson,
  },
  topBattleMode: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.crimson,
  },
  mainWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 80,
  },

  // VICTORY
  vScreen: { flex: 1, backgroundColor: '#c6e8f8' },
  vTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 40,
    color: '#ffdf96',
    textShadowColor: AuthColors.navy,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    marginBottom: 40,
  },
  vAvatarBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  vAvatarImage: {
    width: 160,
    height: 160,
  },
  vAvatarShadow: {
    width: 120,
    height: 18,
    backgroundColor: 'rgba(18,52,65,0.15)',
    borderRadius: 100,
    marginTop: 12,
  },
  vRewardCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 24,
    alignItems: 'center',
  },
  vRewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    borderBottomWidth: 3,
    borderColor: '#c6e8f8',
    paddingBottom: 16,
    marginBottom: 16,
  },
  vRewardSub: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#6d797d',
    marginBottom: 4,
  },
  vRewardTitle: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#123441',
  },
  vRewardContent: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#e6f6ff',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#bcc9cc',
    padding: 16,
    marginBottom: 20,
  },
  vRewardXp: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    color: AuthColors.gold,
  },
  vRewardLoot: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#006A60',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  vBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#006a60',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  vBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: AuthColors.white,
  },

  // DEFEAT
  dScreen: { flex: 1, backgroundColor: '#8D99AE' },
  dTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 32,
    color: '#123441',
    textShadowColor: AuthColors.white,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
    marginBottom: 48,
  },
  dAvatarBlock: {
    width: 192,
    height: 192,
    backgroundColor: '#e6f6ff',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dAvatarImage: {
    width: 160,
    height: 160,
  },
  dDialogBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    padding: 24,
    position: 'relative',
    marginBottom: 40,
  },
  dDialogDecoration: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 16,
    height: 16,
    backgroundColor: AuthColors.crimson,
    borderWidth: 2,
    borderColor: '#123441',
  },
  dDialogText: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#123441',
    textAlign: 'center',
  },
  dDialogDivider: {
    height: 2,
    backgroundColor: '#123441',
    opacity: 0.1,
    width: '100%',
    marginVertical: 16,
  },
  dDialogSub: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#3d494c',
    textAlign: 'center',
  },
  dBtnContainer: {
    position: 'relative',
  },
  dBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#123441',
    transform: [{ translateX: 4 }, { translateY: 4 }],
  },
  dBtnInner: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: '#123441',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  dBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#123441',
  },
});