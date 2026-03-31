import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatGridProps {
    strength: number;
    agility: number;
    stamina: number;
}

export function StatGrid({ strength, agility, stamina }: StatGridProps) {
    return (
        <View style={styles.container}>
            {/* STR */}
            <View style={styles.statBox}>
                <MaterialCommunityIcons name="sword" size={24} color={AuthColors.crimson} style={styles.icon} />
                <Text style={styles.value}>{strength}</Text>
                <Text style={styles.label}>STR</Text>
            </View>

            {/* AGI */}
            <View style={styles.statBox}>
                <MaterialCommunityIcons name="run" size={24} color={AuthColors.tealLink} style={styles.icon} />
                <Text style={styles.value}>{agility}</Text>
                <Text style={styles.label}>AGI</Text>
            </View>

            {/* STA */}
            <View style={styles.statBox}>
                <MaterialCommunityIcons name="shield" size={24} color="#007166" style={styles.icon} />
                <Text style={styles.value}>{stamina}</Text>
                <Text style={styles.label}>STA</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 12,
        alignItems: 'center',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    icon: {
        marginBottom: 4,
    },
    value: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.navy,
    },
    label: {
        fontFamily: Fonts.vt323,
        fontSize: 10,
        color: AuthColors.labelMuted,
        textTransform: 'uppercase',
    },
});
