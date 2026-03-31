import React from 'react';
import { View, Text, StyleSheet, Image, DimensionValue } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function ProfileLicense() {
    const avatar = useGameStore((s) => s.avatar);

    const getPercent = (val: number): DimensionValue => `${Math.min((val / 100) * 100, 100)}%`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>[ ADVENTURER LICENSE ]</Text>
                <Text style={styles.headerTitle}>STATS</Text>
            </View>

            {/* Portrait & Basic Info */}
            <View style={styles.idCard}>
                <View style={styles.portraitBox}>
                    <Image
                        source={require('@/assets/images/portrait.png')}
                        style={styles.portraitImage}
                        resizeMode="cover"
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
                        <Text style={styles.statValue}>{avatar.stats.strength} / 100</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getPercent(avatar.stats.strength), backgroundColor: AuthColors.crimson }]} />
                    </View>
                </View>

                {/* AGI */}
                <View style={styles.statBlock}>
                    <View style={styles.statLabels}>
                        <Text style={styles.statName}>AGILITY (AGI)</Text>
                        <Text style={styles.statValue}>{avatar.stats.agility} / 100</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getPercent(avatar.stats.agility), backgroundColor: '#1DB8A0' }]} />
                    </View>
                </View>

                {/* STA */}
                <View style={styles.statBlock}>
                    <View style={styles.statLabels}>
                        <Text style={styles.statName}>STAMINA (STA)</Text>
                        <Text style={styles.statValue}>{avatar.stats.stamina} / 100</Text>
                    </View>
                    <View style={styles.statBarOuter}>
                        <View style={[styles.statBarInner, { width: getPercent(avatar.stats.stamina), backgroundColor: '#2563EB' }]} />
                    </View>
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
                        <MaterialCommunityIcons name="map-marker-distance" size={20} color="#3D494C" />
                        <Text style={styles.recordLabel}>KM TRAVELED</Text>
                        <Text style={styles.recordVal}>142.5</Text>
                    </View>
                    <View style={styles.recordCard}>
                        <MaterialCommunityIcons name="star-circle" size={20} color="#3D494C" />
                        <Text style={styles.recordLabel}>S-RANK FINISH</Text>
                        <Text style={styles.recordVal}>12</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
    },
    header: {
        marginBottom: 20,
    },
    headerLabel: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: '#3D494C',
        letterSpacing: 2,
    },
    headerTitle: {
        fontFamily: Fonts.pixel,
        fontSize: 28,
        color: AuthColors.crimson,
        marginTop: 4,
    },
    idCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    portraitBox: {
        width: 90,
        height: 90,
        backgroundColor: '#C6E8F8',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        position: 'relative',
    },
    portraitImage: {
        width: '100%',
        height: '100%',
    },
    lvlBadge: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        backgroundColor: AuthColors.crimson,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: AuthColors.navy,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    lvlText: {
        fontFamily: Fonts.pixel,
        fontSize: 8,
        color: '#FFFFFF',
    },
    infoCol: {
        flex: 1,
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        color: '#3D494C',
        marginBottom: 2,
    },
    infoName: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.navy,
    },
    rankRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    rankBadge: {
        backgroundColor: AuthColors.navy,
        borderWidth: 2,
        borderColor: AuthColors.crimson,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    rankText: {
        fontFamily: Fonts.pixel,
        fontSize: 10,
        color: '#FFFFFF',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: AuthColors.navy,
    },
    statBlock: {
        marginBottom: 20,
    },
    statLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    statName: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: '#3D494C',
    },
    statValue: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: AuthColors.navy,
    },
    statBarOuter: {
        height: 12,
        backgroundColor: '#D8F2FF',
        borderWidth: 2,
        borderColor: AuthColors.navy,
    },
    statBarInner: {
        height: '100%',
        borderRightWidth: 2,
        borderColor: AuthColors.navy,
    },
    recordsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    recordCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 12,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    recordLabel: {
        fontFamily: Fonts.pixel,
        fontSize: 8,
        color: '#3D494C',
        marginTop: 8,
        lineHeight: 12,
    },
    recordVal: {
        fontFamily: Fonts.vt323,
        fontSize: 28,
        color: AuthColors.crimson,
        marginTop: 4,
    },
});
