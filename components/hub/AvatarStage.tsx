import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { AuthColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function AvatarStage() {
    const translateY = useSharedValue(0);

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

    return (
        <View style={styles.container}>
            {/* Decorative Clouds */}
            <View style={styles.cloudsWrapper}>
                <Ionicons name="cloud" size={48} color="white" style={{ marginTop: 16, opacity: 0.4 }} />
                <Ionicons name="cloud" size={36} color="white" style={{ marginTop: 48, opacity: 0.4 }} />
            </View>

            <Animated.View style={[styles.chibiWrapper, animatedStyle]}>
                <Image
                    source={require('@/assets/images/chibi.png')}
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
