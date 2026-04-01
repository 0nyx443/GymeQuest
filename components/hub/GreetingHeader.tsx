import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface GreetingHeaderProps {
    playerName: string;
    playerLevel: number;
    playerClass: string;
    onNotificationsPress?: () => void;
}

export function GreetingHeader({ playerName, playerLevel, playerClass, onNotificationsPress }: GreetingHeaderProps) {
    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.greetingText}>GOOD MORNING</Text>
                <Text style={styles.nameText}>{playerName}</Text>
                <Text style={styles.levelText}>LVL {playerLevel} {playerClass}</Text>
            </View>
            <TouchableOpacity
                style={styles.bellButton}
                activeOpacity={0.8}
                onPress={onNotificationsPress}
            >
                <Ionicons name="notifications" size={24} color={AuthColors.navy} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 16,
        marginBottom: 24,
    },
    greetingText: {
        fontFamily: Fonts.vt323,
        fontSize: 14,
        color: AuthColors.labelMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    nameText: {
        fontFamily: Fonts.pixel,
        fontSize: 24,
        color: AuthColors.navy,
        marginTop: 4,
    },
    levelText: {
        fontFamily: Fonts.vt323,
        fontSize: 16,
        color: '#DAB65E', // tertiary-container
        fontWeight: 'bold',
        marginTop: 4,
    },
    bellButton: {
        width: 40,
        height: 40,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
