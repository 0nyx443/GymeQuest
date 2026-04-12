/**
 * InventoryScreen.tsx — placeholder for player's item inventory.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

import { InventoryRow, CatalogItem, getItemImage } from '@/utils/inventory';

export default function InventoryScreen() {
  const inventory = useGameStore((s) => s.inventory);
  const catalog = useGameStore((s) => s.catalog);
  const useItemFromInventory = useGameStore((s) => s.useItemFromInventory);
  
  const purchasedSkins = useGameStore((s) => s.avatar.purchasedSkins);
  const equippedSkin = useGameStore((s) => s.avatar.equippedSkin);
  const equipSkin = useGameStore((s) => s.equipSkin);

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

  // Combine consumable inventory with purchased skins for display
  const consumableList = inventory.filter(r => r.quantity > 0);
  const skinList = catalog
        .filter(c => c.item_type === 'skin' && c.skin_id && purchasedSkins.includes(c.skin_id))
        .map(c => ({ item_id: c.id, quantity: 1 }));
  
  const combinedList = [...consumableList, ...skinList];

  const renderConsumable = (item: InventoryRow, index: number) => {
    const catalogItem = catalog.find((c) => c.id === item.item_id);
    if (!catalogItem) return null;

    const canUseFromInventory = catalogItem.item_type === 'streak_restore';

    return (
      <TouchableOpacity 
        key={item.item_id + index} 
        style={styles.gridItemCard} 
        onPress={() => setPreviewItem(catalogItem)}
        activeOpacity={0.7}
      >
        <View style={styles.gridIconBox}>
          {getItemImage(catalogItem.name) ? (
            <Image source={getItemImage(catalogItem.name)} style={{ width: 36, height: 36 }} resizeMode="contain" />
          ) : (
            <Ionicons name={catalogItem.icon_name as any || "cube"} size={36} color={AuthColors.navy} />
          )}
        </View>
        <Text style={styles.gridItemName} numberOfLines={2}>{catalogItem.name}</Text>
        
        <View style={{ flex: 1 }} />

        <View style={styles.gridActionBox}>
          <View style={styles.qtyBadgeGrid}>
            <Text style={styles.qtyTextSmall}>x{item.quantity}</Text>
          </View>
          {canUseFromInventory && (
            <TouchableOpacity 
              style={[styles.useBtnSmall, usingId === catalogItem.id && styles.useBtnDisabled]}
              disabled={usingId === catalogItem.id}
              onPress={() => handleUseItem(catalogItem)}
              activeOpacity={0.7}
            >
              {usingId === catalogItem.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.useBtnTextSmall}>USE</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkin = (item: InventoryRow, index: number) => {
    const catalogItem = catalog.find((c) => c.id === item.item_id);
    if (!catalogItem) return null;

    return (
      <View key={item.item_id + index} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.iconBox}>
            {getItemImage(catalogItem.name) ? (
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎒 INVENTORY</Text>
        <Text style={styles.headerSub}>YOUR ITEMS & GEAR</Text>
      </View>

{previewItem && (() => {
          if (previewItem.item_type === 'skin') {
            const getPreviewImages = (skinId: string) => {
              if (skinId === 'omni_man') {
                  return {
                      profile: require('@/assets/images/Omni-Man_profile.png'),
                      idle: require('@/assets/images/Omni-Man_combat_idle.png'),
                      victory: require('@/assets/images/Omni-Man_victory.png'),
                      defeat: require('@/assets/images/Omni-Man_defeated.png')
                  };
              }
              if (skinId === 'atom_eve') {
                  return {
                      profile: require('@/assets/images/Atom-Eve_profile.png'),
                      idle: require('@/assets/images/Atom-Eve_combat_idle.png'),
                      victory: require('@/assets/images/Atom-Eve_victory.png'),
                      defeat: require('@/assets/images/Atom-Eve_defeated.png')
                  };
              }
              // Default m_series
              return {
                  profile: require('@/assets/images/m_avatar.png'),
                  idle: require('@/assets/images/m_battle.png'),
                  victory: require('@/assets/images/m_victory.png'),
                  defeat: require('@/assets/images/m_defeated.png')
              };
            };
            const pImages = getPreviewImages(previewItem.skin_id || '');
            
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
          } else {
            // General Item Preview Modal
            const inventoryRow = inventory.find(r => r.item_id === previewItem.id);
            const qty = inventoryRow ? inventoryRow.quantity : 0;
            const canUseFromInventory = previewItem.item_type === 'streak_restore';
            
            return (
              <Modal visible={true} animationType="fade" transparent>
                <View style={styles.modalOverlayItem}>
                  <View style={styles.modalContentItem}>
                    <View style={styles.modalHeaderItem}>
                      <View style={styles.modalIconBoxItem}>
                        {getItemImage(previewItem.name) ? (
                          <Image source={getItemImage(previewItem.name)} style={{ width: 64, height: 64 }} resizeMode="contain" />
                        ) : (
                          <Ionicons name={previewItem.icon_name as any || "cube"} size={64} color={AuthColors.navy} />
                        )}
                        <View style={styles.modalQtyBadgeItem}>
                          <Text style={styles.modalQtyTextItem}>x{qty}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setPreviewItem(null)} style={{ position: 'absolute', top: 0, right: 0 }}>
                        <Ionicons name="close-circle" size={32} color={AuthColors.navy} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.modalTitleItem}>{previewItem.name}</Text>
                    <Text style={styles.modalDescItem}>{previewItem.description}</Text>
                    
                    <View style={styles.modalActionRowItem}>
                      {canUseFromInventory && (
                        <TouchableOpacity 
                          style={[styles.useBtn, usingId === previewItem.id && styles.useBtnDisabled, { alignSelf: 'center', width: '100%', paddingVertical: 12, alignItems: 'center' }]}
                          disabled={usingId === previewItem.id}
                          onPress={() => handleUseItem(previewItem)}
                        >
                          {usingId === previewItem.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={[styles.useBtnText, { fontSize: 16 }]}>USE</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </Modal>
            );
          }
        })()}

      {combinedList.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bag-personal-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>INVENTORY EMPTY</Text>
          <Text style={styles.emptyBody}>
            Items, potions, and equipment{'\n'}you collect will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {consumableList.length > 0 && (
            <View style={styles.gridContainer}>
              {consumableList.map((item, index) => renderConsumable(item, index))}
            </View>
          )}
          {skinList.length > 0 && (
            <View style={styles.listContainer}>
              {skinList.map((item, index) => renderSkin(item, index))}
            </View>
          )}
        </ScrollView>
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  listContainer: {
    gap: 12,
    marginTop: 12,
  },
  gridItemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 12,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    alignItems: 'center',
    marginBottom: 8,
  },
  gridIconBox: {
    width: 50,
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridItemName: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: AuthColors.navy,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 4,
    height: 30, // Force consistent height for 2 lines
  },
  gridActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
    marginTop: 8,
  },
  qtyBadgeGrid: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  useBtnSmall: {
    backgroundColor: AuthColors.crimson,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    flex: 1,
    alignItems: 'center',
  },
  useBtnTextSmall: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFFFFF',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
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
  itemDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
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
  modalOverlayItem: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentItem: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: AuthColors.navy,
    padding: 24,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  modalHeaderItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  modalIconBoxItem: {
    width: 90,
    height: 90,
    backgroundColor: '#F8FAFC',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalQtyBadgeItem: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: AuthColors.crimson,
  },
  modalQtyTextItem: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalTitleItem: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.crimson,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescItem: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalActionRowItem: {
    width: '100%',
  }
});
