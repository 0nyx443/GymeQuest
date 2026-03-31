import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DashboardScreen from '@/screens/DashboardScreen';
import QuestScreen from '@/screens/QuestScreen';
import GuildScreen from '@/screens/GuildScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import AuthScreen from '@/screens/AuthScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import TutorialScreen from '@/screens/TutorialScreen';
import { AuthColors } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';
import { useGameStore } from '@/store/gameStore';
import { ENEMIES } from '@/constants/game';

import { BottomNav } from '@/components/hub/BottomNav';

type Tab = 'home' | 'quests' | 'guild' | 'profile';

export default function HomeRoute() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const loadProfile = useGameStore((state) => state.loadProfile);
  const profileNeedsName = useGameStore((state) => state.profileNeedsName);
  const showTutorial = useGameStore((state) => state.showTutorial);
  const isProfileLoaded = useGameStore((state) => state.isProfileLoaded);
  const startBattle = useGameStore((s) => s.startBattle);

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

  const handleBattlePress = () => {
    if (ENEMIES.length > 0) {
      startBattle(ENEMIES[0]);
      router.push('/combat');
    }
  };

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
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>


      <View style={styles.content}>
        {activeTab === 'home' && <DashboardScreen />}
        {activeTab === 'quests' && <QuestScreen />}
        {activeTab === 'guild' && <GuildScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      <BottomNav
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onBattlePress={handleBattlePress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.bg,
  },
  content: {
    flex: 1,
    paddingBottom: 64, // Leave space so content isn't under the BottomNav
  },
});
