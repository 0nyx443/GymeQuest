import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { EXERCISES } from '@/constants/game';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface QuestCardProps {
    enemy: {
        name: string;
        level: number;
        lore: string;
        hp: number;
        repsRequired: number;
        exercise: string;
        xpReward: number;
        image?: any;
        color?: string;
    };
    isLocked?: boolean;
    onPress: () => void;
}

export function QuestCard({ enemy, isLocked, onPress }: QuestCardProps) {
    if (isLocked) {
        return (
            <View style={[styles.card, styles.lockedCard]}>
                <View style={styles.contentRow}>
                    <View style={[styles.imageBox, styles.lockedImageBox]}>
                        <Ionicons name="lock-closed" size={32} color="#94A3B8" />
                    </View>
                    <View style={styles.details}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, { color: '#94A3B8' }]}>???</Text>
                            <Text style={[styles.level, { color: '#94A3B8' }]}>LVL {enemy.level}</Text>
                        </View>
                        <Text style={[styles.lore, { color: '#94A3B8' }]}>
                            The fog of war obscures this bounty. Train harder to reveal the foe.
                        </Text>
                        <View style={styles.lockedFooter}>
                            <Text style={styles.unlockText}>UNLOCKS AT LVL {enemy.level}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.contentRow}>
                <View style={[styles.imageBox, { backgroundColor: enemy.color || '#E2E8F0' }]}>
                    <Image
                        source={enemy.image}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.details}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>{enemy.name}</Text>
                        <Text style={styles.level}>LVL {enemy.level}</Text>
                    </View>

                    <Text style={styles.lore} numberOfLines={2}>
                        "{enemy.lore}"
                    </Text>

                    <View style={styles.footerRow}>
                        <View style={styles.statsRow}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {enemy.repsRequired} {(EXERCISES[enemy.exercise as any]?.label || enemy.exercise).toUpperCase()}S
                                </Text>
                            </View>
                            <View style={styles.xpBox}>
                                <MaterialCommunityIcons name="star-four-points" size={16} color={AuthColors.gold} />
                                <Text style={styles.xpText}>{enemy.xpReward} XP</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.fightButton}
                            activeOpacity={0.8}
                            onPress={onPress}
                        >
                            <Text style={styles.fightButtonText}>FIGHT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 16,
        marginBottom: 20,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    lockedCard: {
        backgroundColor: '#FAFDFD',
        borderStyle: 'dashed',
        borderColor: '#94A3B8',
        elevation: 0,
        shadowOpacity: 0,
    },
    contentRow: {
        flexDirection: 'row',
        gap: 16,
    },
    imageBox: {
        width: 80,
        height: 80,
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
    image: {
        width: 64,
        height: 64,
    },
    details: {
        flex: 1,
        gap: 4,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.navy,
        flexShrink: 1,
    },
    level: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        fontWeight: '700',
        color: AuthColors.tealLink,
    },
    lore: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: '#3D494C',
        lineHeight: 20,
        marginBottom: 8,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    badge: {
        backgroundColor: AuthColors.navy,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignItems: 'center',
    },
    badgeText: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    xpBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    xpText: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        fontWeight: '700',
        color: AuthColors.gold,
    },
    fightButton: {
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
    fightButtonText: {
        fontFamily: Fonts.pixel,
        fontSize: 10,
        color: '#FFFFFF',
    },
    lockedFooter: {
        marginTop: 8,
    },
    unlockText: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
});
