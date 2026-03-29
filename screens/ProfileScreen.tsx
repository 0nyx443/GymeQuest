import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, StatusBar, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const avatar = useGameStore((s) => s.avatar);

  // Helper for max 100 percent
  const getPercent = (val: number): any => `${Math.min((val / 100) * 100, 100)}%`;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF1E6" />
      
      <ScrollView 
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Page Header --- */}
        <View style={styles.pageHeader}>
          <Text style={styles.headerLicense}>[ ADVENTURER LICENSE ]</Text>
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        {/* --- Adventurer ID Card --- */}
        <View style={styles.idCard}>
          <View style={styles.decorativeCorner} />

          <View style={styles.idCardContent}>
            {/* Portrait */}
            <View style={styles.portraitBox}>
              <Image source={require('@/assets/images/portrait.png')} style={styles.portraitImage} resizeMode="cover" />
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>LVL {avatar.level}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.infoCol}>
              <View style={styles.nameBlock}>
                <Text style={styles.infoLabel}>NAME</Text>
                <Text style={styles.infoName}>{avatar.name}</Text>
              </View>

              <View style={styles.classRow}>
                <View style={styles.classBlock}>
                  <Text style={styles.infoLabel}>CLASS</Text>
                  <View style={styles.classBadge}>
                    <Text style={styles.classBadgeText}>{avatar.class || 'WARRIOR'}</Text>
                  </View>
                </View>
                <View style={styles.classIcon} /> 
              </View>
            </View>
          </View>
        </View>

        {/* --- Stat Bars Section --- */}
        <View style={styles.statSection}>
          <View style={styles.statHeaderRow}>
            <View style={styles.statIconMain} />
            <Text style={styles.statHeaderText}>ATTRIBUTES</Text>
          </View>

          {/* STR */}
          <View style={styles.statBlock}>
            <View style={styles.statLabels}>
              <Text style={styles.statValue}>{avatar.stats.strength}</Text>
              <Text style={styles.statName}>STR</Text>
            </View>
            <View style={styles.statBarOuter}>
              <View style={[styles.statBarInner, { width: getPercent(avatar.stats.strength), backgroundColor: AuthColors.crimson }]} />
            </View>
          </View>

          {/* AGI */}
          <View style={styles.statBlock}>
            <View style={styles.statLabels}>
              <Text style={styles.statValue}>{avatar.stats.agility}</Text>
              <Text style={styles.statName}>AGI</Text>
            </View>
            <View style={styles.statBarOuter}>
              <View style={[styles.statBarInner, { width: getPercent(avatar.stats.agility), backgroundColor: '#006A60' }]} />
            </View>
          </View>

          {/* STA */}
          <View style={styles.statBlock}>
            <View style={styles.statLabels}>
              <Text style={styles.statValue}>{avatar.stats.stamina}</Text>
              <Text style={styles.statName}>STA</Text>
            </View>
            <View style={styles.statBarOuter}>
              <View style={[styles.statBarInner, { width: getPercent(avatar.stats.stamina), backgroundColor: '#2563EB' }]} />
            </View>
          </View>
        </View>

        {/* --- History Grid --- */}
        <View style={styles.historySection}>
          <View style={styles.statHeaderRow}>
            <View style={[styles.statIconMain, { backgroundColor: '#765A05' }]} />
            <Text style={styles.statHeaderText}>MATCH HISTORY</Text>
          </View>

          <View style={styles.historyGrid}>
            {/* Card 1: Monsters Defeated */}
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                 <View style={styles.historyIcon} />
                 <Text style={styles.historyLabel}>MONSTERS{'\n'}DEFEATED</Text>
              </View>
              <Text style={styles.historyVal}>{avatar.victories.toLocaleString()}</Text>
            </View>

            {/* Card 2: Total Reps */}
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                 <View style={styles.historyIcon} />
                 <Text style={styles.historyLabel}>TOTAL{'\n'}REPS</Text>
              </View>
              <Text style={styles.historyVal}>{avatar.totalReps.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* --- Logout Button --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... original styles from StatsScreen ...
  screen: {
    flex: 1,
    backgroundColor: '#FDF1E6',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 120, // Avoid bottom nav overlap
  },
  
  // Page Header
  pageHeader: {
    marginBottom: 24,
  },
  headerLicense: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#3D494C',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 30,
    color: AuthColors.crimson,
  },

  // ID Card
  idCard: {
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    marginBottom: 32,
    overflow: 'visible',
    position: 'relative',

    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  decorativeCorner: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 64,
    height: 64,
    backgroundColor: AuthColors.goldBorder,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
  idCardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  portraitBox: {
    width: 96,
    height: 96,
    backgroundColor: '#C6E8F8',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: {
    width: 90,
    height: 90,
  },
  levelBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    backgroundColor: AuthColors.crimson,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: AuthColors.navy,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    color: AuthColors.white,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameBlock: {},
  infoLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#3D494C',
    marginBottom: 2,
  },
  infoName: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#001F29',
    textTransform: 'uppercase',
    flexShrink: 1, // Fix overflow if long name
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  classBlock: {
    flexShrink: 1,
  },
  classBadge: {
    backgroundColor: '#123441',
    borderWidth: 3,
    borderColor: AuthColors.crimson,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  classBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#F3FAFF',
    textTransform: 'uppercase',
  },
  classIcon: {
    width: 22,
    height: 21,
    backgroundColor: '#765A05',
    marginBottom: 4, 
  },

  // Stat Bars
  statSection: {
    marginBottom: 40,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statIconMain: {
    width: 16,
    height: 20,
    backgroundColor: AuthColors.crimson,
  },
  statHeaderText: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: '#001F29',
  },
  statBlock: {
    marginBottom: 24,
  },
  statLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#001F29',
  },
  statName: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#001F29',
  },
  statBarOuter: {
    height: 16,
    backgroundColor: '#D8F2FF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
  },
  statBarInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderColor: AuthColors.navy,
  },

  // History Grid
  historySection: {
    marginBottom: 40,
  },
  historyGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  historyCard: {
    flex: 1,
    minWidth: '45%',
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
  historyCardHeader: {
    marginBottom: 32,
  },
  historyIcon: {
    width: '100%', 
    height: 16,
    backgroundColor: '#3D494C',
    marginBottom: 12,
  },
  historyLabel: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#001F29',
    lineHeight: 14,
  },
  historyVal: {
    fontFamily: Fonts.vt323,
    fontSize: 34,
    color: AuthColors.crimson,
  },

  // Logout Button
  logoutButton: {
    backgroundColor: '#EBEBEB',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  logoutText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.crimson,
  }
});
