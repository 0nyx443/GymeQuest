import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BattleHubScreen from '@/screens/BattleHubScreen';
import StoreScreen from '@/screens/StoreScreen';
import InventoryScreen from '@/screens/InventoryScreen';
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

import { BottomNav, Tab } from '@/components/hub/BottomNav';

export default function HomeRoute() {
  const router = useRouter();
  const [session, setSession]               = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [activeTab, setActiveTab]           = useState<Tab>('battle');
  // When the Battle Hub's "Quests" button is pressed, switch to the quests sub-view
  const [showQuestsInHub, setShowQuestsInHub] = useState(false);

  const loadProfile      = useGameStore((state) => state.loadProfile);
  const profileNeedsName = useGameStore((state) => state.profileNeedsName);
  const showTutorial     = useGameStore((state) => state.showTutorial);
  const isProfileLoaded  = useGameStore((state) => state.isProfileLoaded);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
      if (session) {
        useGameStore.setState({ isProfileLoaded: false });
        loadProfile();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setIsSessionLoading(false);
      if (session && event === 'SIGNED_IN') {
        setActiveTab('battle');
        useGameStore.setState({ isProfileLoaded: false });
        loadProfile();
      } else if (!session) {
        useGameStore.setState({ isProfileLoaded: false, profileNeedsName: false, showTutorial: false });
        useGameStore.getState().resetAvatar();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabPress = (tab: Tab) => {
    setActiveTab(tab);
    setShowQuestsInHub(false); // reset quest sub-view when switching tabs
  };

  // Loading / auth / onboarding guards
  if (isSessionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AuthColors.navy} />
      </View>
    );
  }
  if (!session)          return <AuthScreen />;
  if (!isProfileLoaded)  return <View style={{ flex: 1, backgroundColor: AuthColors.bg }} />;
  if (profileNeedsName)  return <RegisterScreen onBack={() => { supabase.auth.signOut(); }} />;
  if (showTutorial)      return <TutorialScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <View style={styles.content}>
        {/* ── Battle Hub (centre tab) ── */}
        {activeTab === 'battle' && !showQuestsInHub && (
          <BattleHubScreen
            onQuestsPress={() => setShowQuestsInHub(true)}
          />
        )}
        {/* Quest list — triggered from BattleHub's "QUESTS" button */}
        {activeTab === 'battle' && showQuestsInHub && (
          <QuestScreen onBack={() => setShowQuestsInHub(false)} />
        )}

        {activeTab === 'store'     && <StoreScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'guild'     && <GuildScreen />}
        {activeTab === 'profile'   && <ProfileScreen />}
      </View>

      <BottomNav
        activeTab={activeTab}
        onTabPress={handleTabPress}
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
    paddingBottom: 64,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: AuthColors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});