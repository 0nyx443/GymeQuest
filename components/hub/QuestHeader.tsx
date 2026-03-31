import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';

export function QuestHeader() {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>[ QUEST BOARD ]</Text>
            </View>
            <Text style={styles.title}>BOUNTIES</Text>
            <Text style={styles.subtitle}>Defeat monsters to earn XP and Gold</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 16,
    },
    badge: {
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
    badgeText: {
        fontFamily: Fonts.vt323,
        fontSize: 24,
        color: '#5E4700',
        letterSpacing: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: Fonts.pixel,
        fontSize: 28,
        color: AuthColors.crimson,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: Fonts.vt323,
        fontSize: 20,
        color: '#6D797D',
        textAlign: 'center',
    },
});
