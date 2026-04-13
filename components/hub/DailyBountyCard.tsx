import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Enemy, EXERCISES } from '@/constants/game';

interface DailyBountyCardProps {
    enemy: Enemy;
    isCompleted?: boolean;
    onPress: () => void;
}

export function DailyBountyCard({ enemy, isCompleted, onPress }: DailyBountyCardProps) {
    const [timeLeft, setTimeLeft] = useState<string>('Loading...');

    // ── Midnight Countdown Timer Logic ──
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const difference = tomorrow.getTime() - now.getTime();

            const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((difference % (1000 * 60)) / 1000);

            // Format strings to always have 2 digits (e.g., 09h 05m)
            const format = (num: number) => num.toString().padStart(2, '0');
            setTimeLeft(`${format(h)}h ${format(m)}m ${format(s)}s`);
        };

        calculateTimeLeft(); // Run immediately
        const timer = setInterval(calculateTimeLeft, 1000); // Update every second

        return () => clearInterval(timer);
    }, []);

    const exerciseLabel = EXERCISES[enemy.exercise as keyof typeof EXERCISES]?.label || enemy.exercise;

    return (
        <View style={styles.cardOuter}>
            {/* Header with Timer */}
            <View style={styles.header}>
                <Text style={styles.headerText}>[ DAILY BOUNTY ]</Text>
                <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={14} color={AuthColors.crimson} />
                    <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <View style={styles.imageBox}>
                    <Image
                        source={enemy.image}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>
                
                <Text style={styles.enemyName}>SLAY:{'\n'}{enemy.name}</Text>

                <View style={styles.statsContainer}>
                    {/* The Target Workout */}
                    <View style={styles.statRow}>
                        <Ionicons name="fitness" size={20} color={AuthColors.navy} />
                        <Text style={styles.workoutText}>
                            TARGET: {enemy.health} DMG ({exerciseLabel.toUpperCase()})
                        </Text>
                    </View>
                    
                    {/* The XP & Gold Reward */}
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="star-four-points" size={20} color={AuthColors.gold} />
                        <Text style={styles.rewardText}>REWARD: {enemy.xpReward} XP</Text>
                    </View>
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="circle-multiple-outline" size={20} color={AuthColors.gold} />
                        <Text style={styles.rewardText}>LOOT: {enemy.coinReward} COINS</Text>
                    </View>
                </View>
            </View>

            {isCompleted ? (
                <View style={[styles.button, styles.buttonCompleted]}>
                    <Text style={styles.buttonCompletedText}>COMPLETED</Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.button}
                    activeOpacity={0.8}
                    onPress={onPress}
                >
                    <Text style={styles.buttonText}>START QUEST</Text>
                </TouchableOpacity>
            )}
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
        borderBottomWidth: 2,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 8,
    },
    headerText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: AuthColors.crimson,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEE2E2', // Light crimson background
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    timerText: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: AuthColors.crimson,
    },
    content: {
        alignItems: 'center',
        paddingVertical: 8,
        gap: 12,
    },
    imageBox: {
        width: 96,
        height: 96,
        backgroundColor: '#F8FAFC',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    enemyName: {
        fontFamily: Fonts.vt323,
        fontSize: 24,
        fontWeight: 'bold',
        color: AuthColors.navy,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    statsContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        padding: 12,
        gap: 8,
        marginBottom: 8,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    workoutText: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: AuthColors.navy,
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
        borderBottomWidth: 6, // 3D arcade button look
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonCompleted: {
        backgroundColor: '#CBD5E1',
        borderColor: '#94A3B8',
        borderBottomWidth: 3,
    },
    buttonText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: '#FFFFFF',
    },
    buttonCompletedText: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: '#64748b',
    },
});