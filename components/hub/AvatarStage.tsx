import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { AuthColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';

export function AvatarStage() {
    const translateY = useSharedValue(0);
    
    // 1. Fetch the player's current level and skin from the store
    const avatarLevel = useGameStore((state) => state.avatar.level);
    const equippedSkin = useGameStore((state) => state.avatar.equippedSkin);

    useEffect(() => {
        // A bouncy pixel-like step animation
        translateY.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 500, easing: Easing.steps(2) }),
                withTiming(0, { duration: 500, easing: Easing.steps(2) })
            ),
            -1, // infinite
            true // reverse
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    // 2. Helper function to determine the correct image based on level
    const getAvatarImage = (level: number) => {
        if (equippedSkin === 'm_series') return require('@/assets/images/m_battle.png');
        if (equippedSkin === 'omni_man') return require('@/assets/images/Omni-Man_combat_idle.png');
        if (equippedSkin === 'atom_eve') return require('@/assets/images/Atom-Eve_combat_idle.png');

        // IMPORTANT: Change these filenames to match exactly what is in your screenshot!
        if (level >= 50) return require('@/assets/images/legend.png');
        if (level >= 25) return require('@/assets/images/champion.png');
        if (level >= 10) return require('@/assets/images/challenger.png');
        return require('@/assets/images/rookie.png');
    };

    const isOmniMan = equippedSkin === 'omni_man';
    const isAtomEve = equippedSkin === 'atom_eve';
    const isInvincible = equippedSkin === 'm_series';

    return (
        <View style={[
            styles.container, 
            isOmniMan && { backgroundColor: '#1A1829', borderColor: '#1E1B4B' },
            isAtomEve && { backgroundColor: '#E0F2FE', borderColor: '#0284C7' },
            isInvincible && { backgroundColor: '#7DD3FC', borderColor: '#0284C7' }
        ]}>
            {isOmniMan ? (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    {/* Stars - using rigid squares for pixel look */}
                    <View style={[styles.pixelStar, { top: '15%', left: '20%', width: 4, height: 4 }]} />
                    <View style={[styles.pixelStar, { top: '25%', left: '80%', width: 6, height: 6 }]} />
                    <View style={[styles.pixelStar, { top: '45%', left: '10%', width: 4, height: 4, backgroundColor: '#FDE68A' }]} />
                    <View style={[styles.pixelStar, { top: '70%', left: '60%', width: 5, height: 5 }]} />
                    <View style={[styles.pixelStar, { top: '10%', left: '50%', width: 3, height: 3 }]} />
                    <View style={[styles.pixelStar, { top: '35%', left: '35%', width: 4, height: 4, backgroundColor: '#93C5FD' }]} />
                    <View style={[styles.pixelStar, { top: '80%', left: '85%', width: 5, height: 5 }]} />
                    <View style={[styles.pixelStar, { top: '60%', left: '40%', width: 3, height: 3 }]} />
                    <View style={[styles.pixelStar, { top: '20%', left: '65%', width: 4, height: 4 }]} />
                    
                    {/* Pixel Planet */}
                    <View style={styles.pixelPlanet}>
                        <View style={[styles.crater, { top: '20%', left: '30%', width: 12, height: 12 }]} />
                        <View style={[styles.crater, { top: '60%', left: '60%', width: 8, height: 8 }]} />
                        <View style={[styles.crater, { top: '40%', left: '70%', width: 16, height: 16 }]} />
                    </View>
                </View>
            ) : isAtomEve ? (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    {/* Sun */}
                    <View style={[styles.pixelPlanet, { backgroundColor: '#FDE047', borderColor: '#F59E0B', top: '10%', right: '10%', width: 60, height: 60 }]} />
                    
                    {/* Clouds (less opaque for day) */}
                    <View style={styles.cloudsWrapper} pointerEvents="none">
                        <Ionicons name="cloud" size={48} color="white" style={{ marginTop: 16, opacity: 0.8 }} />
                        <Ionicons name="cloud" size={36} color="white" style={{ marginTop: 48, opacity: 0.8 }} />
                        <Ionicons name="cloud" size={44} color="white" style={{ marginTop: 24, marginLeft: '30%', opacity: 0.7 }} />
                    </View>

                    {/* Pixel Forest Background */}
                    <View style={styles.cityscape} pointerEvents="none">
                        {/* Back layer trees */}
                        <View style={[styles.tree, { left: '5%', width: '15%', height: 160, backgroundColor: '#064E3B' }]} />
                        <View style={[styles.tree, { left: '30%', width: '20%', height: 180, backgroundColor: '#064E3B' }]} />
                        <View style={[styles.tree, { left: '55%', width: '18%', height: 150, backgroundColor: '#064E3B' }]} />
                        <View style={[styles.tree, { left: '80%', width: '16%', height: 170, backgroundColor: '#064E3B' }]} />
                        
                        {/* Mid layer trees */}
                        <View style={[styles.tree, { left: '0%', width: '14%', height: 120, backgroundColor: '#047857' }]} />
                        <View style={[styles.tree, { left: '18%', width: '20%', height: 140, backgroundColor: '#047857' }]} />
                        <View style={[styles.tree, { left: '40%', width: '18%', height: 110, backgroundColor: '#047857' }]} />
                        <View style={[styles.tree, { left: '62%', width: '24%', height: 130, backgroundColor: '#047857' }]} />
                        <View style={[styles.tree, { left: '85%', width: '20%', height: 115, backgroundColor: '#047857' }]} />
                        
                        {/* Front layer pines */}
                        <View style={[styles.tree, { left: '12%', width: '22%', height: 90, backgroundColor: '#059669' }]} />
                        <View style={[styles.tree, { left: '46%', width: '20%', height: 100, backgroundColor: '#059669' }]} />
                        <View style={[styles.tree, { left: '72%', width: '25%', height: 85, backgroundColor: '#059669' }]} />
                    </View>
                </View>
            ) : isInvincible ? (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    {/* Clouds */}
                    <View style={styles.cloudsWrapper} pointerEvents="none">
                        <Ionicons name="cloud" size={48} color="white" style={{ marginTop: 16, opacity: 0.8 }} />
                        <Ionicons name="cloud" size={36} color="white" style={{ marginTop: 48, opacity: 0.8 }} />
                        <Ionicons name="cloud" size={44} color="white" style={{ marginTop: 24, marginLeft: '30%', opacity: 0.7 }} />
                    </View>

                    {/* Pentagon Background */}
                    <View style={styles.cityscape} pointerEvents="none">
                        {/* Grass Lawn behind pentagon base */}
                        <View style={[styles.bldg, { left: '0%', width: '100%', height: 60, backgroundColor: '#4ADE80' }]} />
                        
                        {/* Pentagon Main Building */}
                        <View style={[styles.bldg, { left: '0%', width: '100%', height: 160, backgroundColor: '#E2E8F0', borderLeftWidth: 0, borderRightWidth: 0 }]} />
                        <View style={[styles.bldg, { left: '30%', width: '40%', height: 160, backgroundColor: '#CBD5E1', borderTopWidth: 5, borderColor: '#94A3B8' }]} />
                        
                        {/* Columns */}
                        <View style={[styles.bldg, { left: '32%', width: '4%', height: 160, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '40%', width: '4%', height: 160, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '48%', width: '4%', height: 160, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '56%', width: '4%', height: 160, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '64%', width: '4%', height: 160, backgroundColor: '#E2E8F0' }]} />

                        {/* Little shrubs */}
                        <View style={[styles.tree, { left: '10%', width: '2%', height: 10, backgroundColor: '#059669', bottom: 58 }]} />
                        <View style={[styles.tree, { left: '20%', width: '2%', height: 12, backgroundColor: '#059669', bottom: 58 }]} />
                        <View style={[styles.tree, { left: '45%', width: '2.5%', height: 15, backgroundColor: '#059669', bottom: 58 }]} />
                        <View style={[styles.tree, { left: '68%', width: '2%', height: 12, backgroundColor: '#059669', bottom: 58 }]} />
                        <View style={[styles.tree, { left: '85%', width: '2.5%', height: 14, backgroundColor: '#059669', bottom: 58 }]} />

                        {/* Front Grass */}
                        <View style={[styles.bldg, { left: '0%', width: '100%', height: 60, backgroundColor: '#22C55E', borderTopWidth: 3, borderLeftWidth: 0, borderRightWidth: 0 }]} />

                        {/* Flag Pole (like in photo) */}
                        <View style={[styles.bldg, { left: '45%', width: 4, height: 180, backgroundColor: '#CBD5E1', bottom: 30, borderWidth: 1 }]} />
                        <View style={[styles.bldg, { left: '44%', width: 10, height: 8, backgroundColor: '#94A3B8', bottom: 28, borderRadius: 2 }]} />

                        {/* Pentagon Sign with text */}
                        {/* Use pixels for 'right' and 'width' to ensure they stay perfectly centered under each other */}
                        <View style={[styles.pentagonSignBase, { right: 26, bottom: 20, width: 100, height: 14 }]} />
                        <View style={[styles.pentagonSign, { right: 16, bottom: 30, width: 120, height: 75, alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{color: '#94A3B8', fontSize: 8, fontWeight: 'bold', letterSpacing: 1}}>UNITED STATES</Text>
                            <Text style={{color: '#E2E8F0', fontSize: 16, fontWeight: 'bold', marginVertical: 2, letterSpacing: 1}}>PENTAGON</Text>
                            <Text style={{color: '#94A3B8', fontSize: 6, marginTop: 4}}>Parking in Rear</Text>
                        </View>
                    </View>
                </View>
            ) : (
                <>
                    {/* Decorative Clouds */}
                    <View style={styles.cloudsWrapper} pointerEvents="none">
                        <Ionicons name="cloud" size={48} color="white" style={{ marginTop: 16, opacity: 0.6 }} />
                        <Ionicons name="cloud" size={36} color="white" style={{ marginTop: 48, opacity: 0.6 }} />
                        <Ionicons name="cloud" size={44} color="white" style={{ marginTop: 24, marginLeft: '30%', opacity: 0.5 }} />
                    </View>

                    {/* Pixel Cityscape Background */}
                    <View style={styles.cityscape} pointerEvents="none">
                        {/* Back layer */}
                        <View style={[styles.bldg, { left: '5%', width: '15%', height: 160, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '25%', width: '20%', height: 190, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '50%', width: '15%', height: 150, backgroundColor: '#E2E8F0' }]} />
                        <View style={[styles.bldg, { left: '75%', width: '18%', height: 170, backgroundColor: '#E2E8F0' }]} />
                        
                        {/* Mid layer */}
                        <View style={[styles.bldg, { left: 0, width: '12%', height: 120, backgroundColor: '#CBD5E1' }]} />
                        <View style={[styles.bldg, { left: '15%', width: '18%', height: 140, backgroundColor: '#CBD5E1' }]} />
                        <View style={[styles.bldg, { left: '35%', width: '16%', height: 100, backgroundColor: '#CBD5E1' }]} />
                        <View style={[styles.bldg, { left: '55%', width: '22%', height: 130, backgroundColor: '#CBD5E1' }]} />
                        <View style={[styles.bldg, { left: '80%', width: '25%', height: 110, backgroundColor: '#CBD5E1' }]} />
                        
                        {/* Front layer */}
                        <View style={[styles.bldg, { left: '10%', width: '25%', height: 80, backgroundColor: '#94A3B8' }]} />
                        <View style={[styles.bldg, { left: '45%', width: '20%', height: 95, backgroundColor: '#94A3B8' }]} />
                        <View style={[styles.bldg, { left: '70%', width: '25%', height: 75, backgroundColor: '#94A3B8' }]} />
                    </View>
                </>
            )}

            <Animated.View style={[styles.chibiWrapper, animatedStyle]}>
                {/* 3. Swap the static require for our dynamic function */}
                <Image
                    source={getAvatarImage(avatarLevel)}
                    style={styles.chibiImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Platform */}
            <View style={[
                styles.platformOuter, 
                isOmniMan && { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' },
                isAtomEve && { backgroundColor: '#4ADE80', borderColor: '#166534' },
                isInvincible && { backgroundColor: '#CBD5E1', borderColor: '#94A3B8' }
            ]}>
                <View style={[
                    styles.platformInnerPattern, 
                    isOmniMan && { backgroundColor: '#E5E7EB' },
                    isAtomEve && { backgroundColor: '#14532D', opacity: 0.15 },
                    isInvincible && { backgroundColor: '#64748B', opacity: 0.15 }
                ]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 250,
        width: '100%',
        backgroundColor: '#C6E8F8', // Added per advice to contain the scene
        borderWidth: 3,
        borderColor: AuthColors.navy,
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
    },
    cloudsWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    cityscape: {
        position: 'absolute',
        bottom: 48, 
        left: 0,
        right: 0,
        height: 200,
        zIndex: 2,
        overflow: 'hidden',
    },
    bldg: {
        position: 'absolute',
        bottom: 0,
        borderWidth: 3,
        borderBottomWidth: 0,
        borderColor: AuthColors.navy,
    },
    chibiWrapper: {
        zIndex: 10,
        marginBottom: 16,
    },
    chibiImage: {
        width: 128,
        height: 128,
    },
    platformOuter: {
        width: '100%',
        height: 48,
        backgroundColor: AuthColors.tealLink,
        borderTopWidth: 3,
        borderColor: AuthColors.navy,
        zIndex: 1,
        overflow: 'hidden',
        position: 'absolute',
        bottom: 0,
    },
    platformInnerPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.2,
        backgroundColor: '#004d46',
    },
    pixelStar: {
        position: 'absolute',
        backgroundColor: 'white',
    },
    pixelPlanet: {
        position: 'absolute',
        top: '15%',
        right: '15%',
        width: 80,
        height: 80,
        backgroundColor: '#9D174D',
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#000000',
        overflow: 'hidden',
    },
    crater: {
        position: 'absolute',
        backgroundColor: '#831843',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#000000',
    },
    tree: {
        position: 'absolute',
        bottom: 0,
        borderWidth: 3,
        borderBottomWidth: 0,
        borderColor: AuthColors.navy,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    pentagonSign: {
        position: 'absolute',
        backgroundColor: '#1E3A8A',
        borderWidth: 3,
        borderColor: '#0F172A',
        borderRadius: 4,
    },
    pentagonSignBase: {
        position: 'absolute',
        backgroundColor: '#78716C',
        borderWidth: 3,
        borderColor: '#292524',
    },
});