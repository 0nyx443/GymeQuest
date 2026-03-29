/**
 * app/index.tsx — Home / Dashboard route
 *
 * Wraps DashboardScreen inside a persistent bottom navigation bar
 * so players can access the Quest Map, Stats, and Profile tabs.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from '@/screens/DashboardScreen';
import QuestScreen from '@/screens/QuestScreen';
import StatsScreen from '@/screens/StatsScreen';
import AuthScreen from '@/screens/AuthScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import TutorialScreen from '@/screens/TutorialScreen';
import { AuthColors, Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';
import { useGameStore } from '@/store/gameStore';

type Tab = 'home' | 'quests' | 'stats' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',    label: 'Home',    icon: '⚔' },
  { id: 'quests',  label: 'Quests',  icon: '🗺' },
  { id: 'stats',   label: 'Stats',   icon: '📊' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function HomeRoute() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const loadProfile = useGameStore((state) => state.loadProfile);
  const profileNeedsName = useGameStore((state) => state.profileNeedsName);
  const showTutorial = useGameStore((state) => state.showTutorial);
  const isProfileLoaded = useGameStore((state) => state.isProfileLoaded);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        useGameStore.setState({ isProfileLoaded: false });
        loadProfile();
      } else {
        useGameStore.setState({ isProfileLoaded: false, profileNeedsName: false, showTutorial: false });
        useGameStore.getState().resetAvatar();
      }
    });
  }, []);

  if (!session) {
    return <AuthScreen />;
  }

  if (!isProfileLoaded) {
    return <View style={{ flex: 1, backgroundColor: AuthColors.bg }} />;
  }

  if (profileNeedsName) {
    return <RegisterScreen onBack={() => { supabase.auth.signOut(); }} />;
  }

  if (showTutorial) {
    return <TutorialScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <Text style={styles.topAppText}>GYME GUEST</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' && <DashboardScreen />}
        {activeTab === 'quests' && <QuestScreen />}
        {activeTab === 'stats' && <StatsScreen />}
        {activeTab === 'profile' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: Fonts.pixel, color: AuthColors.navy }}>PROFILE (COMING SOON)</Text>
          </View>
        )}
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.navIcon,
                  isActive ? { color: AuthColors.crimson } : { color: '#94A3B8' },
                ]}
              >
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.navLabel,
                  isActive ? { color: AuthColors.crimson } : { color: '#94A3B8' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  topAppBar: {
    height: 48,
    backgroundColor: AuthColors.bg,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Android simulated drop shadow via wrapper isn't set up, we just use elevation
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    zIndex: 10,
  },
  topAppText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.crimson,
    textAlign: 'center',
    width: '100%', // ensures it centers properly
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    height: 88,
    backgroundColor: AuthColors.white,
    borderTopWidth: 3,
    borderColor: AuthColors.navy,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,

    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10, // positive elevation creates upwards shadow on Android
    zIndex: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  navLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    textTransform: 'uppercase',
  },
});
