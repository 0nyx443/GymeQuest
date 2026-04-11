import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';

interface ExpBarProps {
    currentXp: number;
    nextLevelXp: number;
    progress: number; // 0 to 1
    level?: number;
}

export function ExpBar({ currentXp, nextLevelXp, progress, level }: ExpBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.xpText}>XP: {currentXp} / {nextLevelXp}</Text>
                {level !== undefined && (
                    <Text style={styles.levelText}>LV {level}</Text>
                )}
            </View>
            <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${progress * 100}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    xpText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        color: AuthColors.navy,
    },
    levelText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
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
