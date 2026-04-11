import React from 'react';
import { View, Text, StyleSheet, Image, DimensionValue } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ── NEW: Added the dynamic image helper here too! ──
const getMilestoneImage = (level: number) => {
  if (level >= 50) return require('@/assets/images/legend_avatar.png');
  if (level >= 25) return require('@/assets/images/champion_avatar.png');
  if (level >= 10) return require('@/assets/images/challenger_avatar.png');
  return require('@/assets/images/rookie_avatar.png');
};

export function ProfileLicense() {
    const avatar = useGameStore((s) => s.avatar);

    // Calculate dynamic milestone caps (e.g., 50 -> 100 -> 150 -> 200)
    const getMilestoneData = (val: number) => {
        const milestone = Math.ceil((val + 1) / 50) * 50;
        const prevMilestone = milestone - 50;
        const currentProgress = val - prevMilestone;
        const percent = (currentProgress / 50) * 100;
        return {
            max: milestone,
            percent: `${Math.min(Math.max(percent, 0), 100)}%` as DimensionValue
        };
    };

    const getAge = (birthdayStr?: string) => {
        if (!birthdayStr) return null;
        const birthDate = new Date(birthdayStr);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>[ ADVENTURER LICENSE ]</Text>
                <Text style={styles.headerTitle}>STATS</Text>
            </View>

            {/* Portrait & Basic Info */}
            <View style={styles.idCard}>
                <View style={styles.portraitBox}>
                    {/* ── UPDATED: Uses your dynamic image and resizeMode="contain" ── */}
                    <Image
                        source={getMilestoneImage(avatar.level)}
                        style={styles.portraitImage}
                        resizeMode="contain"
                    />
                    <View style={styles.lvlBadge}>
                        <Text style={styles.lvlText}>LVL {avatar.level}</Text>
                    </View>
                </View>

                <View style={styles.infoCol}>
                    <View>
                        <Text style={styles.infoLabel}>NAME</Text>
                        <Text style={styles.infoName}>{avatar.name.toUpperCase()}</Text>
                    </View>

                    <View style={styles.rankRow}>
                        <View>
                            <Text style={styles.infoLabel}>RANK</Text>
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankText}>RANK E</Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="shield-check" size={24} color={AuthColors.gold} />
                    </View>
                </View>
            </View>

            {/* Physical Traits */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="human" size={20} color={AuthColors.crimson} />
                    <Text style={styles.sectionTitle}>PHYSICAL TRAITS</Text>
                </View>
                <View style={styles.traitsGrid}>
                    <View style={styles.traitCard}>
                        <Text style={styles.traitLabel}>BIRTHDAY</Text>
                        <Text style={styles.traitValue}>
                            {avatar.birthday 
                                ? `${avatar.birthday}\n(${getAge(avatar.birthday) ?? '?'} YRS)` 
                                : "?"}
                        </Text>
                    </View>
                    <View style={styles.traitCard}>
                        <Text style={styles.traitLabel}>SEX</Text>
                        <Text style={styles.traitValue}>{avatar.sex ? (avatar.sex as string).toUpperCase() : "?"}</Text>
                    </View>
                    <View style={styles.traitCard}>
                        <Text style={styles.traitLabel}>HEIGHT</Text>
                        <Text style={styles.traitValue}>{avatar.height_cm ? `${avatar.height_cm} CM` : "?"}</Text>
                    </View>
                    <View style={styles.traitCard}>
                        <Text style={styles.traitLabel}>WEIGHT</Text>
                        <Text style={styles.traitValue}>{avatar.weight_kg ? `${avatar.weight_kg} KG` : "?"}</Text>
                    </View>
                </View>
            </View>

            {/* Core Attributes */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="flash" size={20} color={AuthColors.crimson} />
                    <Text style={styles.sectionTitle}>CORE ATTRIBUTES</Text>
                </View>

                {/* STR */}
                <View style={styles.statBlock}>
                    <View style={styles.statLabels}>
                        <Text style={styles.statName}>STRENGTH (STR)</Text>
                        <Text style={styles.statValue}>{avatar.stats.strength} / {getMilestoneData(avatar.stats.strength).max}</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getMilestoneData(avatar.stats.strength).percent, backgroundColor: AuthColors.crimson }]} />
                    </View>
                    <Text style={styles.statDesc}>-1 required rep per 10 STR (Min: 1)</Text>
                </View>

                {/* AGI */}
                <View style={styles.statBlock}>
                    <View style={styles.statLabels}>
                        <Text style={styles.statName}>AGILITY (AGI)</Text>
                        <Text style={styles.statValue}>{avatar.stats.agility} / {getMilestoneData(avatar.stats.agility).max}</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getMilestoneData(avatar.stats.agility).percent, backgroundColor: '#1DB8A0' }]} />
                    </View>
                    <Text style={styles.statDesc}>+1% more coin drops per 1 AGI</Text>
                </View>

                {/* STA */}
                <View style={styles.statBlock}>
                    <View style={styles.statLabels}>
                        <Text style={styles.statName}>STAMINA (STA)</Text>
                        <Text style={styles.statValue}>{avatar.stats.stamina} / {getMilestoneData(avatar.stats.stamina).max}</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getMilestoneData(avatar.stats.stamina).percent, backgroundColor: '#2563EB' }]} />
                    </View>
                    <Text style={styles.statDesc}>+1 sec combo timer per 1 STA</Text>
                </View>
            </View>

            {/* Combat Records */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="sword-cross" size={20} color={AuthColors.gold} />
                    <Text style={styles.sectionTitle}>COMBAT RECORDS</Text>
                </View>

                <View style={styles.recordsGrid}>
                    <View style={styles.recordCard}>
                        <MaterialCommunityIcons name="skull" size={20} color="#3D494C" />
                        <Text style={styles.recordLabel}>MONSTERS DEFEATED</Text>
                        <Text style={styles.recordVal}>{avatar.victories.toLocaleString()}</Text>
                    </View>
                    <View style={styles.recordCard}>
                        <MaterialCommunityIcons name="flash-outline" size={20} color="#3D494C" />
                        <Text style={styles.recordLabel}>TOTAL REPS</Text>
                        <Text style={styles.recordVal}>{avatar.totalReps.toLocaleString()}</Text>
                    </View>
                    <View style={styles.recordCard}>
                        <MaterialCommunityIcons name="fire" size={20} color={AuthColors.crimson} />
                        <Text style={styles.recordLabel}>CURRENT STREAK</Text>
                        <Text style={styles.recordVal}>{avatar.currentStreak} DAYS</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  header: { marginBottom: 20 },
  headerLabel: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C', letterSpacing: 2 },
  headerTitle: { fontFamily: Fonts.pixel, fontSize: 28, color: AuthColors.crimson, marginTop: 4 },
  idCard: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 16, flexDirection: 'row', gap: 16, marginBottom: 32, shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  portraitBox: { width: 90, height: 90, backgroundColor: '#C6E8F8', borderWidth: 3, borderColor: AuthColors.navy, position: 'relative', overflow: 'hidden' }, // Added overflow hidden just in case
  portraitImage: { width: '100%', height: '100%' },
  lvlBadge: { position: 'absolute', bottom: -3, right: -3, backgroundColor: AuthColors.crimson, borderTopWidth: 3, borderLeftWidth: 3, borderColor: AuthColors.navy, paddingHorizontal: 4, paddingVertical: 2 },
  lvlText: { fontFamily: Fonts.pixel, fontSize: 8, color: '#FFFFFF' },
  infoCol: { flex: 1, justifyContent: 'space-between' },
  infoLabel: { fontFamily: Fonts.vt323, fontSize: 14, color: '#3D494C', marginBottom: 2 },
  infoName: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.navy },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rankBadge: { backgroundColor: AuthColors.navy, borderWidth: 2, borderColor: AuthColors.crimson, paddingHorizontal: 8, paddingVertical: 4 },
  rankText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#FFFFFF' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontFamily: Fonts.pixel, fontSize: 12, color: AuthColors.navy },
  traitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  traitCard: { width: '48%', backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', padding: 12, borderRadius: 4 },
  traitLabel: { fontFamily: Fonts.pixel, fontSize: 8, color: '#64748B', marginBottom: 6, lineHeight: 12 },
  traitValue: { fontFamily: Fonts.vt323, fontSize: 20, color: AuthColors.navy, lineHeight: 20 },
  statBlock: { marginBottom: 20 },
  statLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statName: { fontFamily: Fonts.vt323, fontSize: 16, color: '#3D494C' },
  statValue: { fontFamily: Fonts.vt323, fontSize: 16, color: AuthColors.navy },
  statBarOuter: { height: 12, backgroundColor: '#D8F2FF', borderWidth: 2, borderColor: AuthColors.navy },
  statBarInner: { height: '100%', borderRightWidth: 2, borderColor: AuthColors.navy },
  statDesc: { fontFamily: Fonts.pixel, fontSize: 8, color: '#64748B', marginTop: 6 },
  recordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  recordCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 12, shadowColor: AuthColors.navy, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  recordLabel: { fontFamily: Fonts.pixel, fontSize: 8, color: '#3D494C', marginTop: 8, lineHeight: 12 },
  recordVal: { fontFamily: Fonts.vt323, fontSize: 28, color: AuthColors.crimson, marginTop: 4 },
});