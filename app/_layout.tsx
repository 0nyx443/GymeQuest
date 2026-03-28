/**
 * app/_layout.tsx
 *
 * Root layout for Expo Router. Sets up:
 *  - Custom RPG fonts via expo-font
 *  - react-native-reanimated
 *  - react-native-gesture-handler
 *  - Safe area context
 *  - Dark status bar globally
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Cinzel_400Regular,
  Cinzel_600SemiBold,
  Cinzel_900Black,
} from '@expo-google-fonts/cinzel';
import {
  Rajdhani_300Light,
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import {
  ShareTechMono_400Regular,
} from '@expo-google-fonts/share-tech-mono';
import {
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import {
  VT323_400Regular,
} from '@expo-google-fonts/vt323';
import {
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

// Keep splash visible until fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_400Regular,
    Cinzel_600SemiBold,
    Cinzel_900Black,
    Rajdhani_300Light,
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    ShareTechMono_400Regular,
    PressStart2P_400Regular,
    VT323_400Regular,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#080810" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="combat" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="post-battle" options={{ animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
