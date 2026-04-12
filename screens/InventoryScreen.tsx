/**
 * InventoryScreen.tsx — player's item inventory and skill equipment.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { PASSIVE_SKILLS } from '@/utils/skills';
import { InventoryRow, CatalogItem, getItemImage } from '@/utils/inventory';
import { getSkinPreviewImages } from '@/utils/skins';

type SectionRowData =
  | { kind: 'item'; item: InventoryRow }
  | { kind: 'skill'; skillId: string };

export default function InventoryScreen() {
  const inventory = useGameStore((s) => s.inventory);
  const catalog = useGameStore((s) => s.catalog);
  const useItemFromInventory = useGameStore((s) => s.useItemFromInventory);
  
  const purchasedSkins = useGameStore((s) => s.avatar.purchasedSkins) || [];
  const equippedSkin = useGameStore((s) => s.avatar.equippedSkin);
  const equipSkin = useGameStore((s) => s.equipSkin);

  const purchasedSkills = useGameStore((s) => s.avatar.purchasedSkills) || [];
  const equippedSkills = useGameStore((s) => s.avatar.equippedSkills) || [];
  const toggleSkillEquip = useGameStore((s) => s.toggleSkillEquip);

  const [usingId, setUsingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);

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

  const handleToggleSkin = (skinId: string) => {
    if (equippedSkin === skinId) {
      equipSkin(null);
    } else {
      equipSkin(skinId);
    }
  };

  const handleToggleSkill = (skillId: string) => {
    const isEquipped = equippedSkills.includes(skillId as any);
    if (isEquipped) {
      toggleSkillEquip(skillId as any);
    } else {
      if (equippedSkills.length >= 3) {
        Alert.alert("Max Skills Equipped", "You can only equip 3 skills at a time.");
        return;
      }
      toggleSkillEquip(skillId as any);
    }
  };

  // Combine consumable inventory with purchased skins
  const combinedList: InventoryRow[] = [
    ...inventory.filter(r => r.quantity > 0),
    ...catalog
        .filter(c => c.item_type === 'skin' && c.skin_id && purchasedSkins.includes(c.skin_id))
        .map(c => ({ item_id: c.id, quantity: 1 })),
  ];

  const sections: { title: string; data: SectionRowData[] }[] = [];
  if (combinedList.length > 0) {
    sections.push({
      title: 'ITEMS',
      data: combinedList.map(item => ({ kind: 'item' as const, item })),
    });
  }
  if (purchasedSkills.length > 0) {
    sections.push({
      title: 'PASSIVE SKILLS',
      data: purchasedSkills.map(skillId => ({ kind: 'skill' as const, skillId: skillId as string })),
    });
  }

  const renderItemCard = useCallback(({ item }: { item: InventoryRow }) => {
    const catalogItem = catalog.find((c) => c.id === item.item_id);
    if (!catalogItem) return null;

    const isSkin = catalogItem.item_type === 'skin';
    const canUseFromInventory = catalogItem.item_type === 'streak_restore';

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.iconBox}>
            {isSkin ? (
              <Image source={getSkinPreviewImages(catalogItem.skin_id || '').profile} style={{ width: 44, height: 44 }} resizeMode="contain" />
            ) : getItemImage(catalogItem.name) ? (
              <Image source={getItemImage(catalogItem.name)} style={{ width: 36, height: 36 }} resizeMode="contain" />
            ) : (
              <Ionicons name={catalogItem.icon_name as any || "cube"} size={36} color={AuthColors.navy} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{catalogItem.name}</Text>
          </View>
        </View>
        <Text style={styles.itemDesc}>{catalogItem.description}</Text>
        <View style={styles.rightActionBox}>
          {!isSkin && (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>x{item.quantity}</Text>
            </View>
          )}
          {isSkin && (
            <View style={styles.skinActionBox}>
              <TouchableOpacity 
                style={styles.previewBtn}
                onPress={() => setPreviewItem(catalogItem)}
              >
                <Text style={styles.previewBtnText}>PREVIEW</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.useBtn, equippedSkin === catalogItem.skin_id && styles.equipBtnActive]}
                onPress={() => handleToggleSkin(catalogItem.skin_id!)}
              >
                <Text style={styles.useBtnText}>
                  {equippedSkin === catalogItem.skin_id ? 'UNEQUIP' : 'EQUIP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  }, [catalog, equippedSkin, usingId]);

  const renderSkillCard = useCallback(({ item }: { item: string }) => {
    const skill = PASSIVE_SKILLS[item as any];
    const isEquipped = equippedSkills.includes(item as any);

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 32 }}>{skill.icon}</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{skill.name}</Text>
            <Text style={styles.skillLevel}>Level {skill.unlockLevel}</Text>
          </View>
        </View>
        <Text style={styles.itemDesc}>{skill.description}</Text>
        <View style={styles.rightActionBox}>
          <TouchableOpacity 
            style={[styles.useBtn, isEquipped && styles.equipBtnActive]}
            onPress={() => handleToggleSkill(item)}
          >
            <Text style={styles.useBtnText}>
              {isEquipped ? 'UNEQUIP' : 'EQUIP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [equippedSkills]);

  const renderPreviewModal = () => {
    if (!previewItem) return null;
    const pImages = getSkinPreviewImages(previewItem.skin_id || '');

    return (
      <Modal visible={true} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{previewItem.name}</Text>
              <TouchableOpacity onPress={() => setPreviewItem(null)}>
                <Ionicons name="close-circle" size={32} color={AuthColors.navy} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.previewScroll}>
              <View style={styles.previewRow}>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Profile / Avatar</Text>
                  <Image source={pImages.profile} style={styles.previewImg} resizeMode="contain" />
                </View>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Combat Idle</Text>
                  <Image source={pImages.idle} style={styles.previewImg} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.previewRow}>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Victory</Text>
                  <Image source={pImages.victory} style={styles.previewImg} resizeMode="contain" />
                </View>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Defeated</Text>
                  <Image source={pImages.defeat} style={styles.previewImg} resizeMode="contain" />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎒 INVENTORY</Text>
        <Text style={styles.headerSub}>YOUR ITEMS & GEAR</Text>
      </View>

      {previewItem && renderPreviewModal()}

      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bag-personal-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>INVENTORY EMPTY</Text>
          <Text style={styles.emptyBody}>
            Items, potions, and equipment{'\n'}you collect will appear here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) =>
            item.kind === 'item'
              ? `item_${item.item.item_id}_${index}`
              : `skill_${item.skillId}`
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.title === 'PASSIVE SKILLS' ? (
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>⚡ {section.title}</Text>
                  <Text style={styles.equippedCount}>{equippedSkills.length}/3 Equipped</Text>
                </View>
              ) : (
                <Text style={styles.sectionTitle}>🎒 {section.title}</Text>
              )}
            </View>
          )}
          renderItem={({ item }) => {
            if (item.kind === 'item') {
              return renderItemCard({ item: item.item });
            }
            return renderSkillCard({ item: item.skillId });
          }}
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
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: AuthColors.navy,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equippedCount: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#8D99AE',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
    marginTop: 60,
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
    paddingBottom: 24,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  itemTitleContainer: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
  },
  skillLevel: {
    fontFamily: Fonts.vt323,
    fontSize: 12,
    color: '#8D99AE',
    marginTop: 2,
  },
  itemDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.labelMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  rightActionBox: {
    alignItems: 'flex-end',
  },
  actionRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  qtyBadgeSmall: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  qtyTextSmall: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: '#FFFFFF',
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
  equipBtnActive: {
    backgroundColor: '#1E293B',
  },
  useBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  skinActionBox: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  previewBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',   
  },
  modalContent: {
    flex: 0.8,
    backgroundColor: AuthColors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    borderWidth: 4,
    borderColor: AuthColors.navy,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
  },
  modalTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.navy,
  },
  previewScroll: {
    padding: 20,
    gap: 20,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  previewBox: {
    flex: 1,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
    aspectRatio: 1,
  },
  previewImg: {
    flex: 1,
    width: '100%',
  },
  previewLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: AuthColors.navy,
    marginBottom: 8,
  },
});
