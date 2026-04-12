/**
 * Shared skin asset helper used by both StoreScreen and InventoryScreen.
 */

export interface SkinPreviewImages {
  profile: ReturnType<typeof require>;
  idle: ReturnType<typeof require>;
  victory: ReturnType<typeof require>;
  defeat: ReturnType<typeof require>;
}

export function getSkinPreviewImages(skinId: string): SkinPreviewImages {
  if (skinId === 'omni_man') {
    return {
      profile: require('@/assets/images/Omni-Man_profile.png'),
      idle: require('@/assets/images/Omni-Man_combat_idle.png'),
      victory: require('@/assets/images/Omni-Man_victory.png'),
      defeat: require('@/assets/images/Omni-Man_defeated.png'),
    };
  }
  if (skinId === 'atom_eve') {
    return {
      profile: require('@/assets/images/Atom-Eve_profile.png'),
      idle: require('@/assets/images/Atom-Eve_combat_idle.png'),
      victory: require('@/assets/images/Atom-Eve_victory.png'),
      defeat: require('@/assets/images/Atom-Eve_defeated.png'),
    };
  }
  // Default m_series
  return {
    profile: require('@/assets/images/m_avatar.png'),
    idle: require('@/assets/images/m_battle.png'),
    victory: require('@/assets/images/m_victory.png'),
    defeat: require('@/assets/images/m_defeated.png'),
  };
}
