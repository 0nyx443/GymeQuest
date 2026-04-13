/**
 * InventoryScreen.tsx — player's item inventory and skill equipment.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { PASSIVE_SKILLS, getAvailableSkills } from '@/utils/skills';
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

  const avatarLevel = useGameStore((s) => s.avatar.level);
  const availableSkills = getAvailableSkills(avatarLevel);
  const equippedSkills = useGameStore((s) => s.avatar.equippedSkills) || [];
    const validEquippedSkills = Array.from(new Set(equippedSkills)).filter(id => availableSkills.includes(id as any));
  const toggleSkillEquip = useGameStore((s) => s.toggleSkillEquip);

  const [usingId, setUsingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);
  
  // Add modal state for details
  const [detailModal, setDetailModal] = useState<{ kind: 'consumable', item: CatalogItem, qty: number } | { kind: 'skill', skillId: string, skill: any } | null>(null);

  const handleUseItem = async (item: CatalogItem) => {
    if (usingId) return;
    setUsingId(item.id);
    const result = await useItemFromInventory(item);
    setUsingId(null);
    if (result.success) {
      Alert.alert('Item Used!', `${item.name} has been applied.`);
      if (detailModal && detailModal.kind === 'consumable') {
        const newQty = detailModal.qty - 1;
        if (newQty <= 0) {
           setDetailModal(null);
        } else {
           setDetailModal({ ...detailModal, qty: newQty });
        }
      }
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

    const maxSkills = avatarLevel >= 20 ? 3 : (avatarLevel >= 10 ? 2 : 1);

  const handleToggleSkill = (skillId: string) => {
    const isEquipped = equippedSkills.includes(skillId as any);
    if (isEquipped) {
      toggleSkillEquip(skillId as any);
    } else {
      if (validEquippedSkills.length >= maxSkills) {
        Alert.alert("Max Skills Equipped", `You can only equip ${maxSkills} skill${maxSkills > 1 ? 's' : ''} at your current level.`);
        return;
      }
      toggleSkillEquip(skillId as any);
    }
  };

  const consumables = inventory.filter(r => r.quantity > 0).map(r => {
     return { ...r, catalogItem: catalog.find(c => c.id === r.item_id) };
  }).filter(r => r.catalogItem && r.catalogItem.item_type !== 'skin');

  const skins = catalog
    .filter(c => c.item_type === 'skin' && c.skin_id && purchasedSkins.includes(c.skin_id));

  const isEmpty = consumables.length === 0 && skins.length === 0 && availableSkills.length === 0;

  const renderCosmeticCard = useCallback((item: CatalogItem, index: number) => {
    return (
      <View style={styles.listCard} key={`skin_${item.id}_${index}`}>
        <View style={styles.itemHeader}>
          <View style={styles.iconBox}>
             <Image source={getSkinPreviewImages(item.skin_id || '').profile as any} style={{ width: 44, height: 44 }} resizeMode="contain" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
        </View>
        <Text style={styles.itemDesc}>{item.description}</Text>
        <View style={styles.rightActionBox}>
            <View style={styles.skinActionBox}>
              <TouchableOpacity 
                style={styles.previewBtn}
                onPress={() => setPreviewItem(item)}
              >
                <Text style={styles.previewBtnText}>PREVIEW</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.useBtn, equippedSkin === item.skin_id && styles.equipBtnActive]}
                onPress={() => handleToggleSkin(item.skin_id!)}
              >
                <Text style={styles.useBtnText}>
                  {equippedSkin === item.skin_id ? 'UNEQUIP' : 'EQUIP'}
                </Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
    );
  }, [equippedSkin]);

  const renderConsumableCard = useCallback((itemObj: any, index: number) => {
    const item = itemObj.catalogItem;
    return (
      <TouchableOpacity 
        style={styles.gridCard} 
        key={`consumable_${item.id}_${index}`}
        onPress={() => setDetailModal({ kind: 'consumable', item, qty: itemObj.quantity })}
        activeOpacity={0.7}
      >
        <View style={styles.gridIconBox}>
            {getItemImage(item.name) ? (
              <Image source={getItemImage(item.name) as any} style={{ width: 36, height: 36 }} resizeMode="contain" />
            ) : (
              <Ionicons name={item.icon_name as any || "cube"} size={36} color={AuthColors.navy} />
            )}
        </View>
        <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.gridQtyBadge}>
          <Text style={styles.gridQtyText}>x{itemObj.quantity}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderGridSkillCard = useCallback((skillId: string, index: number) => {
    const skill = PASSIVE_SKILLS[skillId as keyof typeof PASSIVE_SKILLS];
    const isEquipped = equippedSkills.includes(skillId as any);

    return (
      <TouchableOpacity 
        style={[styles.gridCard, isEquipped && styles.gridCardEquipped]} 
        key={`skill_${skillId}_${index}`}
        onPress={() => setDetailModal({ kind: 'skill', skillId, skill })}
        activeOpacity={0.7}
      >
        <View style={styles.gridIconBox}>
          <Text style={{ fontSize: 32 }}>{skill.icon}</Text>
        </View>
        <Text style={styles.gridName} numberOfLines={2}>{skill.name}</Text>
        {isEquipped && (
           <View style={styles.gridEquipBadge}>
             <Ionicons name="checkmark-circle" size={16} color={AuthColors.crimson} />
           </View>
        )}
      </TouchableOpacity>
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
                  <Image source={pImages.profile as any} style={styles.previewImg} resizeMode="contain" />
                </View>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Combat Idle</Text>
                  <Image source={pImages.idle as any} style={styles.previewImg} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.previewRow}>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Victory</Text>
                  <Image source={pImages.victory as any} style={styles.previewImg} resizeMode="contain" />
                </View>
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Defeated</Text>
                  <Image source={pImages.defeat as any} style={styles.previewImg} resizeMode="contain" />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDetailModal = () => {
    if (!detailModal) return null;

    if (detailModal.kind === 'consumable') {
       const { item, qty } = detailModal;
       return (
         <Modal visible={true} animationType="fade" transparent onRequestClose={() => setDetailModal(null)}>
           <View style={styles.modalBg}>
             <View style={styles.detailCard}>
               <View style={styles.detailHeader}>
                  <View style={styles.detailIconBox}>
                    {getItemImage(item.name) ? (
                      <Image source={getItemImage(item.name) as any} style={{ width: 48, height: 48 }} resizeMode="contain" />
                    ) : (
                      <Ionicons name={item.icon_name as any || "cube"} size={48} color={AuthColors.navy} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.detailTitle}>{item.name}</Text>
                     <Text style={styles.detailSub}>CONSUMABLE • x{qty} OWNED</Text>
                  </View>
               </View>
               <Text style={styles.detailDesc}>{item.description}</Text>
               <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailModal(null)}>
                     <Text style={styles.detailBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                  {(item.item_type === 'streak_restore') && (
                     <TouchableOpacity 
                        style={[styles.detailUseBtn, usingId === item.id && styles.useBtnDisabled]} 
                        disabled={usingId === item.id || qty <= 0}
                        onPress={() => handleUseItem(item)}>
                        {usingId === item.id ? (
                           <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                           <Text style={styles.detailUseBtnText}>USE ITEM</Text>
                        )}
                     </TouchableOpacity>
                  )}
               </View>
             </View>
           </View>
         </Modal>
       );
    } else {
       const { skillId, skill } = detailModal;
       const isEquipped = equippedSkills.includes(skillId as any);
       return (
         <Modal visible={true} animationType="fade" transparent onRequestClose={() => setDetailModal(null)}>
           <View style={styles.modalBg}>
             <View style={styles.detailCard}>
               <View style={styles.detailHeader}>
                  <View style={styles.detailIconBox}>
                     <Text style={{ fontSize: 36 }}>{skill.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.detailTitle}>{skill.name}</Text>
                     <Text style={styles.detailSub}>PASSIVE SKILL • LVL {skill.unlockLevel}</Text>
                  </View>
               </View>
               <Text style={styles.detailDesc}>{skill.description}</Text>
               <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailModal(null)}>
                     <Text style={styles.detailBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailUseBtn, isEquipped && styles.detailEquippedBtn]} onPress={() => handleToggleSkill(skillId)}>
                     <Text style={styles.detailUseBtnText}>{isEquipped ? 'UNEQUIP' : 'EQUIP'}</Text>
                  </TouchableOpacity>
               </View>
             </View>
           </View>
         </Modal>
       );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎒 INVENTORY</Text>
        <Text style={styles.headerSub}>YOUR ITEMS & GEAR</Text>
      </View>

      {renderPreviewModal()}
      {renderDetailModal()}

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="bag-personal-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>INVENTORY EMPTY</Text>
          <Text style={styles.emptyBody}>
            {`Items, potions, and equipment\nyou collect will appear here.`}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {consumables.length > 0 && (
             <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                   <Text style={styles.sectionTitle}>🎒 CONSUMABLES</Text>
                </View>
                <View style={styles.gridContainer}>
                   {consumables.map((item, i) => renderConsumableCard(item, i))}
                </View>
             </View>
          )}

          {availableSkills.length > 0 && (
             <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                   <View style={styles.sectionTitleRow}>
                     <Text style={styles.sectionTitle}>⚡ PASSIVE SKILLS</Text>
                     <Text style={styles.equippedCount}>{validEquippedSkills.length}/{maxSkills} Equipped</Text>
                   </View>
                </View>
                <View style={styles.gridContainer}>
                   {availableSkills.map((skillId, i) => renderGridSkillCard(skillId as string, i))}
                </View>
             </View>
          )}

          {skins.length > 0 && (
             <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                   <Text style={styles.sectionTitle}>👔 COSMETICS</Text>
                </View>
                {skins.map((item, i) => renderCosmeticCard(item, i))}
             </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AuthColors.bg },
  header: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 3, borderColor: AuthColors.navy },
  headerTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy, letterSpacing: 2 },
  headerSub: { fontFamily: Fonts.vt323, fontSize: 14, color: '#8D99AE', letterSpacing: 3, marginTop: 2 },
  
  sectionContainer: { marginTop: 8, marginBottom: 16 },
  sectionHeader: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, borderTopWidth: 2, borderTopColor: AuthColors.navy },
  sectionTitle: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.navy, letterSpacing: 2 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  equippedCount: { fontFamily: Fonts.vt323, fontSize: 12, color: '#8D99AE' },
  
  listContent: { paddingBottom: 24 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 10 },
  gridCard: {
     width: (Dimensions.get('window').width - 32) / 2 - 5,
     backgroundColor: '#FFFFFF',
     borderWidth: 3,
     borderColor: AuthColors.navy,
     padding: 12,
     alignItems: 'center',
     shadowColor: AuthColors.navy,
     shadowOffset: { width: 3, height: 3 },
     shadowOpacity: 1,
     shadowRadius: 0,
     elevation: 3,
     position: 'relative'
  },
  gridCardEquipped: {
     backgroundColor: '#F8FAFC',
     borderColor: AuthColors.crimson,
  },
  gridIconBox: { width: 48, height: 48, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gridName: { fontFamily: Fonts.pixel, fontSize: 9, color: AuthColors.navy, textAlign: 'center', minHeight: 24 },
  gridQtyBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#1E293B', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: AuthColors.navy },
  gridQtyText: { fontFamily: Fonts.pixel, fontSize: 8, color: '#FFFFFF' },
  gridEquipBadge: { position: 'absolute', top: 4, right: 4 },

  listCard: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: { width: 60, height: 60, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy },
  skillLevel: { fontFamily: Fonts.vt323, fontSize: 12, color: '#8D99AE', marginTop: 2 },
  itemDesc: { fontFamily: Fonts.vt323, fontSize: 14, color: AuthColors.labelMuted, lineHeight: 18, marginBottom: 12 },
  
  rightActionBox: { alignItems: 'flex-end' },
  skinActionBox: { flexDirection: 'row', gap: 12 },
  
  useBtn: { backgroundColor: AuthColors.crimson, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: AuthColors.navy, alignItems: 'center', justifyContent: 'center' },
  useBtnDisabled: { backgroundColor: '#94A3B8' },
  equipBtnActive: { backgroundColor: '#2563EB' },
  useBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF' },
  previewBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: AuthColors.navy, alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12, marginTop: 60 },
  emptyTitle: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.navy, letterSpacing: 3 },
  emptyBody: { fontFamily: Fonts.vt323, fontSize: 16, color: '#8D99AE', textAlign: 'center', lineHeight: 22, letterSpacing: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: AuthColors.navy, borderRadius: 8, overflow: 'hidden', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 3, borderColor: AuthColors.navy, backgroundColor: '#F8FAFC' },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy },
  previewScroll: { padding: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  previewBox: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#CBD5E1', padding: 8, alignItems: 'center' },
  previewLabel: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.navy, marginBottom: 8, textAlign: 'center' },
  previewImg: { width: 100, height: 100 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  detailCard: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: AuthColors.navy, padding: 20, shadowColor: AuthColors.navy, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  detailIconBox: { width: 64, height: 64, backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontFamily: Fonts.pixel, fontSize: 18, color: AuthColors.navy, marginBottom: 6 },
  detailSub: { fontFamily: Fonts.vt323, fontSize: 14, color: '#8D99AE' },
  detailDesc: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C', lineHeight: 24, marginBottom: 24, backgroundColor: '#F8FAFC', padding: 12, borderWidth: 2, borderColor: '#E2E8F0' },
  detailActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  detailCloseBtn: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: AuthColors.navy },
  detailBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: AuthColors.navy },
  detailUseBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: AuthColors.crimson, borderWidth: 2, borderColor: AuthColors.navy },
  detailEquippedBtn: { backgroundColor: '#2563EB' },
  detailUseBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF' }
});
