import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ImageBackground } from 'react-native';
import { AuthColors } from '@/constants/theme';
import { ProfileLicense } from '@/components/profile/ProfileLicense';
import { ProfileInventory } from '@/components/profile/ProfileInventory';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF1E6" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileLicense />



        <ProfileSettings />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3FAFF', // Lighter blue for the overall theme matching cloud header context
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  divider: {
    height: 3,
    backgroundColor: AuthColors.navy,
    marginVertical: 40,
    opacity: 0.1,
  }
});
