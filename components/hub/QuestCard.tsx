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
                <View style={styles.topRow}>
                    <View style={[styles.imageBox, styles.lockedImageBox]}>
                        <Ionicons name="lock-closed" size={32} color="#94A3B8" />
                    </View>
                    <View style={styles.details}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, { color: '#94A3B8' }]}>UNKNOWN TARGET</Text>
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

    const exerciseLabel = EXERCISES[enemy.exercise as keyof typeof EXERCISES]?.label || enemy.exercise;

    return (
        <View style={styles.card}>
            {/* Top Section: Bestiary Info */}
            <View style={styles.topRow}>
                <View style={styles.imageBox}>
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

                    {/* New HP Indicator */}
                    <View style={styles.hpContainer}>
                        <Text style={styles.hpText}>HP: {enemy.hp}</Text>
                        <View style={styles.hpBarBg}>
                            <View style={[styles.hpBarFill, { width: '100%' }]} />
                        </View>
                    </View>

                    <Text style={styles.lore} numberOfLines={2}>
                        "{enemy.lore}"
                    </Text>
                </View>
            </View>

            {/* Bottom Section: Bounty & Action */}
            <View style={styles.bottomRow}>
                <View style={styles.questDetails}>
                    <View style={styles.bountyBox}>
                        <Text style={styles.boxLabel}>OBJECTIVE</Text>
                        <Text style={styles.objectiveText}>
                            {enemy.repsRequired} {exerciseLabel.toUpperCase()}S
                        </Text>
                    </View>
                    
                    <View style={styles.bountyBox}>
                        <Text style={styles.boxLabel}>BOUNTY</Text>
                        <View style={styles.xpRow}>
                            <MaterialCommunityIcons name="star-four-points" size={14} color={AuthColors.gold} />
                            <Text style={styles.xpText}>{enemy.xpReward} XP</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.fightButton}
                    activeOpacity={0.7}
                    onPress={onPress}
                >
                    <Text style={styles.fightButtonText}>FIGHT</Text>
                </TouchableOpacity>
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
        // Hard drop shadow for retro feel
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
        shadowOffset: { width: 0, height: 0 },
    },
    topRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    imageBox: {
        width: 88,
        height: 88,
        backgroundColor: '#F8FAFC', // Subtle off-white to frame the transparent image
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
        width: '100%',
        height: '100%',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.navy,
        flexShrink: 1,
        lineHeight: 18,
    },
    level: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        fontWeight: '700',
        color: AuthColors.tealLink,
    },
    hpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    hpText: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        color: AuthColors.crimson,
    },
    hpBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderWidth: 1,
        borderColor: AuthColors.navy,
    },
    hpBarFill: {
        height: '100%',
        backgroundColor: AuthColors.crimson,
    },
    lore: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: '#475569',
        lineHeight: 18,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 2,
        borderTopColor: '#E2E8F0',
        paddingTop: 12,
    },
    questDetails: {
        flexDirection: 'row',
        gap: 16,
        flex: 1,
    },
    bountyBox: {
        gap: 2,
    },
    boxLabel: {
        fontFamily: Fonts.pixel,
        fontSize: 8,
        color: '#94A3B8',
    },
    objectiveText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: AuthColors.navy,
        letterSpacing: 0.5,
    },
    xpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    xpText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        fontWeight: '700',
        color: AuthColors.gold,
    },
    fightButton: {
        backgroundColor: AuthColors.crimson,
        borderWidth: 3,
        borderColor: AuthColors.navy,
        borderBottomWidth: 6, // Creates a chunky 3D arcade button effect
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginLeft: 8,
    },
    fightButtonText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
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