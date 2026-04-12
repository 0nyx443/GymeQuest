import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { InventoryRow, CatalogItem } from '@/utils/inventory';
import { PASSIVE_SKILLS, SkillId } from '@/utils/skills';

export default function InventoryScreen() {
  const inventory = useGameStore((s) => s.inventory);
  const catalog = useGameStore((s) => s.catalog);
  const useItemFromInventory = useGameStore((s) => s.useItemFromInventory);
  const purchasedSkills = useGameStore((s) => s.avatar?.purchasedSkills ?? []);
  const equippedSkills = useGameStore((s) => s.avatar?.equippedSkills ?? []);
  const toggleSkillEquip = useGameStore((s) => s.toggleSkillEquip);
  
  const [usingId, setUsingId] = useState<string | null>(null);

  const handleUseItem = async (item: CatalogItem) => {
    if (usingId) return;
    setUsingId(item.id);
    const result = await useItemFromInventory(item);
    setUsingId(null);
    if (result.success) {
      Alert.alert('Item Used!', `${item.name} has been applied.`);
    } else {
      Alert.alert('Cannot Use Item', result.error);
    }
  };

  const handleToggleSkillEquip = (skillId: SkillId) => {
    if (equippedSkills.length >= 3 && !equippedSkills.includes(skillId)) {
      Alert.alert('Slot Limit', 'Maximum 3 skills can be equipped at once');
      return;
    }
    toggleSkillEquip(skillId);
  };

  const renderItem = useCallback(({ item }: { item: InventoryRow }) => {
    const catalogItem = catalog.find((c) => c.id === item.item_id);
    if (!catalogItem) return null;

    // Show "USE" button mainly for items like streak savers
    const canUseFromInventory = catalogItem.item_type === 'streak_restore';

    return (
      <View style={styles.itemCard}>
        <View style={styles.iconBox}>
          <Ionicons name={catalogItem.icon_name as any} size={36} color={AuthColors.navy} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{catalogItem.name}</Text>
          <Text style={styles.itemDesc}>{catalogItem.description}</Text>
        </View>
        <View style={styles.rightActionBox}>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>x{item.quantity}</Text>
          </View>
          {canUseFromInventory && (
            <TouchableOpacity 
              style={[styles.useBtn, usingId === catalogItem.id && styles.useBtnDisabled]}
              disabled={usingId === catalogItem.id}
              onPress={() => handleUseItem(catalogItem)}
            >
              {usingId === catalogItem.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.useBtnText}>USE</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [catalog, handleUseItem, usingId]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎒 INVENTORY</Text>
        <Text style={styles.headerSub}>YOUR ITEMS & GEAR</Text>
      </View>

      {inventory.length === 0 && purchasedSkills.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bag-personal-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>INVENTORY EMPTY</Text>
          <Text style={styles.emptyBody}>
            Items, potions, and equipment{'\n'}you collect will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          renderItem={renderItem}
          keyExtractor={(item) => `item-${item.item_id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            purchasedSkills.length > 0 ? (
              <View>
                <Text style={styles.sectionHeader}>⚡ PASSIVE SKILLS</Text>
                <View style={{ gap: 12 }}>
                  {purchasedSkills.map((skillId) => {
                    const skill = PASSIVE_SKILLS[skillId];
                    const isEquipped = equippedSkills.includes(skillId);
                    return (
                      <View key={skillId} style={styles.skillCard}>
                        <View style={styles.skillIconBox}>
                          <Text style={styles.skillIconLarge}>{skill.icon}</Text>
                        </View>
                        <View style={styles.skillInfo}>
                          <Text style={styles.skillName}>{skill.name}</Text>
                          <Text style={styles.skillDesc}>{skill.description}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.equipBtn, isEquipped && styles.equipBtnActive]}
                          onPress={() => handleToggleSkillEquip(skillId)}
                        >
                          <MaterialCommunityIcons
                            name={isEquipped ? 'check-circle' : 'circle-outline'}
                            size={20}
                            color={isEquipped ? '#10B981' : '#64748B'}
                          />
                          <Text style={[styles.equipBtnText, isEquipped && styles.equipBtnTextActive]}>
                            {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                {inventory.length > 0 && <Text style={styles.itemsSectionHeader}>💊 POTIONS & ITEMS</Text>}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AuthColors.bg },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
  },
  headerTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#8D99AE',
    letterSpacing: 3,
    marginTop: 2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    letterSpacing: 3,
  },
  emptyBody: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: '#8D99AE',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 1,
  },
  emptyBadge: {
    backgroundColor: '#8B5CF6',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginTop: 8,
  },
  emptyBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  itemsSectionHeader: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 8,
    paddingLeft: 4,
  },
  // ITEMS
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  iconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  itemDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.labelMuted,
    lineHeight: 16,
  },
  rightActionBox: {
    alignItems: 'flex-end',
    gap: 8,
  },
  qtyBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  qtyText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FFFFFF',
  },
  useBtn: {
    backgroundColor: AuthColors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  useBtnDisabled: {
    opacity: 0.5,
  },
  useBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  // SKILLS
  skillCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  skillIconBox: {
    width: 60,
    height: 60,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  skillIconLarge: {
    fontSize: 32,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginBottom: 4,
  },
  skillDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: AuthColors.labelMuted,
    lineHeight: 16,
  },
  equipBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  equipBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  equipBtnTextActive: {
    color: '#10B981',
  },
});
