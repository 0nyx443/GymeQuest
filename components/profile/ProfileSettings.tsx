import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

interface SettingsItemProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    onPress?: () => void;
}

function SettingsItem({ icon, label, onPress }: SettingsItemProps) {
    return (
        <TouchableOpacity
            style={styles.item}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={styles.itemLeft}>
                <MaterialCommunityIcons name={icon} size={20} color={AuthColors.navy} />
                <Text style={styles.itemLabel}>{label}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#8D99AE" />
        </TouchableOpacity>
    );
}

export function ProfileSettings() {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>[ PAUSE MENU ]</Text>
                <Text style={styles.headerTitle}>PROFILE</Text>
            </View>

            <View style={styles.list}>
                <SettingsItem icon="volume-high" label="Audio & Music" />
                <SettingsItem icon="camera" label="Calibrate Camera" />
                <SettingsItem icon="bell" label="Workout Reminders" />
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.8}
                onPress={handleLogout}
            >
                <MaterialCommunityIcons name="logout" size={20} color={AuthColors.crimson} />
                <Text style={styles.logoutText}>SAVE & QUIT</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    headerLabel: {
        fontFamily: Fonts.vt323,
        fontSize: 18,
        color: '#3D494C',
        letterSpacing: 2,
    },
    headerTitle: {
        fontFamily: Fonts.pixel,
        fontSize: 28,
        color: AuthColors.crimson,
        marginTop: 4,
    },
    list: {
        gap: 12,
        marginBottom: 32,
    },
    item: {
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: AuthColors.navy,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontFamily: Fonts.pixel,
        fontSize: 12,
        color: AuthColors.navy,
    },
    logoutButton: {
        borderWidth: 3,
        borderColor: AuthColors.crimson,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: AuthColors.navy,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    logoutText: {
        fontFamily: Fonts.pixel,
        fontSize: 14,
        color: AuthColors.crimson,
    },
});
