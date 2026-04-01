import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface DailyBountyCardProps {
    enemyName: string;
    rewardXp: number;
    onPress: () => void;
}

export function DailyBountyCard({ enemyName, rewardXp, onPress }: DailyBountyCardProps) {
    return (
        <View style={styles.cardOuter}>
            <View style={styles.header}>
                <Text style={styles.headerText}>[ DAILY BOUNTY ]</Text>
                <Ionicons name="alert-circle" size={16} color={AuthColors.crimson} />
            </View>

            <View style={styles.content}>
                {/* Using the original shroom sprite as per requirement */}
                <Image
                    source={require('@/assets/images/shroom.png')}
                    style={styles.image}
                    resizeMode="contain"
                />
                <Text style={styles.enemyName}>SLAY:{'\n'}{enemyName}</Text>
                <View style={styles.rewardRow}>
                    <Ionicons name="cash" size={20} color={AuthColors.gold} />
                    <Text style={styles.rewardText}>+ {rewardXp} XP</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={onPress}
            >
                <Text style={styles.buttonText}>START QUEST</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    cardOuter: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.crimson,
        padding: 20,
        marginBottom: 48,
        shadowColor: AuthColors.crimson,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: AuthColors.crimson,
    },
    content: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    image: {
        width: 80,
        height: 80,
    },
    enemyName: {
        fontFamily: Fonts.vt323,
        fontSize: 24,
        fontWeight: 'bold',
        color: AuthColors.navy,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    rewardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rewardText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: AuthColors.gold,
    },
    button: {
        backgroundColor: AuthColors.crimson,
        borderWidth: 3,
        borderColor: AuthColors.navy,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    buttonText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: '#FFFFFF',
    },
});
