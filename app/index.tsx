/**
 * app/index.tsx — Home / Dashboard route
 *
 * Wraps DashboardScreen inside a persistent bottom navigation bar
 * so players can access the Quest Map, Stats, and Profile tabs.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardScreen from '@/screens/DashboardScreen';
import AuthScreen from '@/screens/AuthScreen';
import { Colors, Fonts, Radius } from '@/constants/theme';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile();
      }
    });
  }, []);

  if (!session) {
    return <AuthScreen />;
  }

  if (profileNeedsName) {
    return <AuthScreen forceNameStep />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        {/* Only dashboard is fully implemented in this prototype */}
        <DashboardScreen />
      </View>

      {/* Bottom nav */}
      <View style={styles.navBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.navActiveIndicator} />}
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label.toUpperCase()}
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
    backgroundColor: Colors.bgDeep,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgPanel,
    borderTopWidth: 1,
    borderTopColor: Colors.borderFaint,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    position: 'relative',
  },
  navActiveIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.4,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontFamily: Fonts.mono,
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  navLabelActive: {
    color: Colors.gold,
  },
});
