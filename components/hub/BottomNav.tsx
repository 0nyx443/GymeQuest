/**
 * BottomNav.tsx
 *
 * Layout: Store | Guild | [⚔ BATTLE HUB (floating)] | Inventory | Profile
 *
 * The center button opens the BattleHub tab (not a direct battle start).
 * Battle + Quest CTA buttons live inside BattleHubScreen.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';

export type Tab = 'battle' | 'store' | 'inventory' | 'guild' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

const NAV_ITEMS: {
  tab: Tab;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
}[] = [
  { tab: 'store',     icon: 'store-outline',      label: 'Store'     },
  { tab: 'guild',     icon: 'shield-half-full',    label: 'Guild'     },
  // center slot occupied by floating battle button
  { tab: 'inventory', icon: 'bag-personal-outline', label: 'Inventory' },
  { tab: 'profile',   icon: 'account',             label: 'Profile'   },
];

export function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const avatar = useGameStore((s) => s.avatar);
  
  // Check if there are unclaimed level rewards
  let hasLevelReward = false;
  for (let i = 2; i <= avatar.level; i++) {
      if (!avatar.claimedLevelRewards?.includes(i)) {
          hasLevelReward = true;
          break;
      }
  }

  return (
    <View style={styles.container}>

      {/* Left two tabs: Store, Guild */}
      {NAV_ITEMS.slice(0, 2).map(({ tab, icon, label }) => (
        <NavItem
          key={tab}
          icon={icon}
          label={label}
          active={activeTab === tab}
          onPress={() => onTabPress(tab)}
        />
      ))}

      {/* ── Centre Battle tab (same style as siblings) ── */}
      <NavItem
        icon="sword-cross"
        label="Battle"
        active={activeTab === 'battle'}
        onPress={() => onTabPress('battle')}
      />

      {/* Right two tabs: Inventory, Profile */}
      {NAV_ITEMS.slice(2).map(({ tab, icon, label }) => (
        <NavItem
          key={tab}
          icon={icon}
          label={label}
          active={activeTab === tab}
          onPress={() => onTabPress(tab)}
        />
      ))}
    </View>
  );
}

// ── Reusable nav item ──────────────────────────────────────────────
function NavItem({
  icon, label, active, onPress, hasBadge
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
  hasBadge?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={active ? AuthColors.crimson : '#8D99AE'}
      />
      {hasBadge && <View style={styles.navBadge} />}
      <Text style={[styles.navLabel, { color: active ? AuthColors.crimson : '#8D99AE' }]}>
        {label}
      </Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
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
    fontSize: 11,
    textTransform: 'uppercase',
    marginTop: 2,
    lineHeight: 12,
  },
  activeDot: {
    width: 4,
    height: 4,
    backgroundColor: AuthColors.crimson,
    borderRadius: 2,
    position: 'absolute',
    bottom: -2,
  },
  navBadge: {
    width: 10,
    height: 10,
    backgroundColor: AuthColors.gold,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    top: 4,
    right: '35%',
  },
});
