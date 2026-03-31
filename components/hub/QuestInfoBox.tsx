import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function QuestInfoBox() {
    return (
        <View style={styles.container}>
            <View style={styles.iconBox}>
                <Ionicons name="information-circle" size={24} color={AuthColors.crimson} />
            </View>
            <Text style={styles.text}>
                Quests refresh every 24 hours. Complete bounties to earn XP and Gold and unlock the BATTLE ARENA.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#D8F2FF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
        marginTop: 16,
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    iconBox: {
        width: 48,
        height: 48,
        backgroundColor: '#FFA19F',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flex: 1,
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: '#001F29',
        lineHeight: 22,
    },
});
