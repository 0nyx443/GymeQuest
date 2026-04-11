import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { AuthColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';

export function AvatarStage() {
    const translateY = useSharedValue(0);
    
    // 1. Fetch the player's current level from the store
    const avatarLevel = useGameStore((state) => state.avatar.level);

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
        // IMPORTANT: Change these filenames to match exactly what is in your screenshot!
        if (level >= 50) return require('@/assets/images/legend.png');
        if (level >= 25) return require('@/assets/images/champion.png');
        if (level >= 10) return require('@/assets/images/challenger.png');
        return require('@/assets/images/rookie.png');
    };

    return (
        <View style={styles.container}>
            {/* Decorative Clouds */}
            <View style={styles.cloudsWrapper}>
                <Ionicons name="cloud" size={48} color="white" style={{ marginTop: 16, opacity: 0.6 }} />
                <Ionicons name="cloud" size={36} color="white" style={{ marginTop: 48, opacity: 0.6 }} />
                <Ionicons name="cloud" size={44} color="white" style={{ marginTop: 24, marginLeft: '30%', opacity: 0.5 }} />
            </View>

            {/* Pixel Cityscape Background */}
            <View style={styles.cityscape}>
                {/* Back layer */}
                <View style={[styles.bldg, { left: '5%', width: '15%', height: 160, backgroundColor: '#E2E8F0' }]} />
                <View style={[styles.bldg, { left: '25%', width: '20%', height: 190, backgroundColor: '#E2E8F0' }]} />
                <View style={[styles.bldg, { left: '50%', width: '15%', height: 150, backgroundColor: '#E2E8F0' }]} />
                <View style={[styles.bldg, { left: '75%', width: '18%', height: 170, backgroundColor: '#E2E8F0' }]} />
                
                {/* Mid layer */}
                <View style={[styles.bldg, { left: '-2%', width: '12%', height: 120, backgroundColor: '#CBD5E1' }]} />
                <View style={[styles.bldg, { left: '15%', width: '18%', height: 140, backgroundColor: '#CBD5E1' }]} />
                <View style={[styles.bldg, { left: '35%', width: '16%', height: 100, backgroundColor: '#CBD5E1' }]} />
                <View style={[styles.bldg, { left: '55%', width: '22%', height: 130, backgroundColor: '#CBD5E1' }]} />
                <View style={[styles.bldg, { left: '80%', width: '25%', height: 110, backgroundColor: '#CBD5E1' }]} />
                
                {/* Front layer */}
                <View style={[styles.bldg, { left: '10%', width: '25%', height: 80, backgroundColor: '#94A3B8' }]} />
                <View style={[styles.bldg, { left: '45%', width: '20%', height: 95, backgroundColor: '#94A3B8' }]} />
                <View style={[styles.bldg, { left: '70%', width: '25%', height: 75, backgroundColor: '#94A3B8' }]} />
            </View>

            <Animated.View style={[styles.chibiWrapper, animatedStyle]}>
                {/* 3. Swap the static require for our dynamic function */}
                <Image
                    source={getAvatarImage(avatarLevel)}
                    style={styles.chibiImage}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Platform */}
            <View style={styles.platformOuter}>
                <View style={styles.platformInnerPattern} />
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
        pointerEvents: 'none',
    },
    cityscape: {
        position: 'absolute',
        bottom: 48, 
        left: 0,
        right: 0,
        height: 200,
        zIndex: 2,
        pointerEvents: 'none',
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
});