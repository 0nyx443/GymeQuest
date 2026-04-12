import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGameStore } from '@/store/gameStore';

interface ExpBarProps {
    currentXp: number;
    nextLevelXp: number;
    progress: number; // 0 to 1
    level?: number;
}

export function ExpBar({ currentXp, nextLevelXp, progress, level }: ExpBarProps) {
    const router = useRouter();
    const avatar = useGameStore((s) => s.avatar);
    
    // Check if there are unclaimed level rewards
    let hasLevelReward = false;
    for (let i = 2; i <= avatar.level; i++) {
        if (!avatar.claimedLevelRewards?.includes(i)) {
            hasLevelReward = true;
            break;
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.xpText}>XP: {currentXp} / {nextLevelXp}</Text>
                
                <View style={styles.rightSection}>
                    <TouchableOpacity 
                        style={[styles.rewardBtn, hasLevelReward && styles.rewardBtnActive]} 
                        onPress={() => router.push('/rewards')}
                    >
                        <MaterialCommunityIcons name="gift" size={12} color={hasLevelReward ? '#FFF' : AuthColors.navy} />
                        <Text style={[styles.rewardBtnText, hasLevelReward && styles.rewardBtnTextActive]}>
                            {hasLevelReward ? 'REWARDS!' : 'REWARDS'}
                        </Text>
                    </TouchableOpacity>

                    {level !== undefined && (
                        <Text style={styles.levelText}>LV {level}</Text>
                    )}
                </View>
            </View>
            <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${progress * 100}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rewardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#E2E8F0',
        borderWidth: 2,
        borderColor: AuthColors.navy,
        borderBottomWidth: 3,
    },
    rewardBtnActive: {
        backgroundColor: AuthColors.gold,
        borderColor: AuthColors.navy,
    },
    rewardBtnText: {
        fontFamily: Fonts.pixel,
        fontSize: 8,
        color: AuthColors.navy,
        marginTop: 2,
    },
    rewardBtnTextActive: {
        color: '#FFF',
    },
    xpText: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        color: AuthColors.navy,
    },
    levelText: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        color: AuthColors.navy,
    },
    barOuter: {
        width: '100%',
        height: 16,
        backgroundColor: '#d8f2ff', // surface-container
        borderWidth: 3,
        borderColor: AuthColors.navy,
        overflow: 'hidden',
    },
    barInner: {
        height: '100%',
        backgroundColor: AuthColors.goldBorder,
    },
});
