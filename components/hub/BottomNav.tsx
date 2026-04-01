import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Tab = 'home' | 'quests' | 'guild' | 'profile';

interface BottomNavProps {
    activeTab: Tab;
    onTabPress: (tab: Tab) => void;
    onBattlePress: () => void;
}

export function BottomNav({ activeTab, onTabPress, onBattlePress }: BottomNavProps) {
    return (
        <View style={styles.container}>
            {/* Home */}
            <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('home')}>
                <MaterialCommunityIcons
                    name="home"
                    size={24}
                    color={activeTab === 'home' ? AuthColors.crimson : '#8D99AE'}
                />
                <Text style={[styles.navLabel, activeTab === 'home' ? { color: AuthColors.crimson } : { color: '#8D99AE' }]}>
                    Home
                </Text>
                {activeTab === 'home' && <Text style={styles.activeDot}>❤</Text>}
            </TouchableOpacity>

            {/* Quests */}
            <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('quests')}>
                <MaterialCommunityIcons
                    name="compass"
                    size={24}
                    color={activeTab === 'quests' ? AuthColors.crimson : '#8D99AE'}
                />
                <Text style={[styles.navLabel, activeTab === 'quests' ? { color: AuthColors.crimson } : { color: '#8D99AE' }]}>
                    Quests
                </Text>
                {activeTab === 'quests' && <Text style={styles.activeDot}>❤</Text>}
            </TouchableOpacity>

            {/* Floating Battle Button */}
            <View style={styles.floatingContainer}>
                <TouchableOpacity
                    style={styles.floatingButton}
                    activeOpacity={0.8}
                    onPress={onBattlePress}
                >
                    <MaterialCommunityIcons name="sword-cross" size={32} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.floatingLabel}>BATTLE</Text>
            </View>

            {/* Guild (replaces Stats visually) */}
            <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('guild')}>
                <MaterialCommunityIcons
                    name="shield-half-full"
                    size={24}
                    color={activeTab === 'guild' ? AuthColors.crimson : '#8D99AE'}
                />
                <Text style={[styles.navLabel, activeTab === 'guild' ? { color: AuthColors.crimson } : { color: '#8D99AE' }]}>
                    Guild
                </Text>
                {activeTab === 'guild' && <Text style={styles.activeDot}>❤</Text>}
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('profile')}>
                <MaterialCommunityIcons
                    name="account"
                    size={24}
                    color={activeTab === 'profile' ? AuthColors.crimson : '#8D99AE'}
                />
                <Text style={[styles.navLabel, activeTab === 'profile' ? { color: AuthColors.crimson } : { color: '#8D99AE' }]}>
                    Profile
                </Text>
                {activeTab === 'profile' && <Text style={styles.activeDot}>❤</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 64,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 3,
        borderColor: '#123441',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingBottom: 4,
        position: 'relative',
    },
    navLabel: {
        fontFamily: Fonts.vt323,
        fontSize: 12,
        textTransform: 'uppercase',
        marginTop: 2,
        lineHeight: 12,
    },
    activeDot: {
        fontSize: 8,
        color: AuthColors.crimson,
        position: 'absolute',
        bottom: -8,
    },
    floatingContainer: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
        top: -1
    },
    floatingButton: {
        width: 56,
        height: 56,
        backgroundColor: '#E63946',
        borderWidth: 3,
        borderColor: '#123441',
        shadowColor: '#123441',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingLabel: {
        fontFamily: Fonts.pixel,
        fontSize: 10,
        color: '#123441',
        marginTop: 8,
    },
});
