import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Modal, Image, ScrollView } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';
import { CatalogItem, getItemImage } from '@/utils/inventory';
import { PASSIVE_SKILLS } from '@/utils/skills';

export default function StoreScreen() {
  const coins = useGameStore((s) => s.avatar?.coins ?? 0);
  const catalog = useGameStore((s) => s.catalog);
  const purchasedSkins = useGameStore((s) => s.avatar.purchasedSkins || []);
  const purchasedSkills = useGameStore((s) => s.avatar.purchasedSkills || []);
  const purchaseItem = useGameStore((s) => s.purchaseItem);
  const purchaseSkill = useGameStore((s) => s.purchaseSkill);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);

  const [rewardAnimVisible, setRewardAnimVisible] = useState(false);
  const [purchasedItemName, setPurchasedItemName] = useState("");
  const rewardScaleAnim = useRef(new Animated.Value(0)).current;

  const handlePurchaseItem = useCallback(async (item: CatalogItem) => {
    if (coins < item.price) {
      Alert.alert("Checkout Failed", "Not enough coins!");
      return;
    }
    setPurchasingId(item.id);
    const result = await purchaseItem(item);
    setPurchasingId(null);
    
    if (result.success) {
      setPurchasedItemName(item.name);
      setRewardAnimVisible(true);
      Animated.sequence([
        Animated.spring(rewardScaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setRewardAnimVisible(false));
    } else {
      Alert.alert("Purchase failed", result.error);
    }
  }, [coins, purchaseItem, rewardScaleAnim]);

  const handlePurchaseSkill = useCallback(async (skillId: string) => {
    if (coins < PASSIVE_SKILLS[skillId as any].purchaseCost) {
      Alert.alert("Checkout Failed", "Not enough coins!");
      return;
    }
    setPurchasingId(skillId);
    const result = await purchaseSkill(skillId as any);
    setPurchasingId(null);
    
    if (result.success) {
      setPurchasedItemName(PASSIVE_SKILLS[skillId as any].name);
      setRewardAnimVisible(true);
      Animated.sequence([
        Animated.spring(rewardScaleAnim, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(rewardScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setRewardAnimVisible(false));
    } else {
      Alert.alert("Purchase failed", result.error);
    }
  }, [coins, purchaseSkill, rewardScaleAnim]);

  const renderItemCard = useCallback(({ item }: { item: CatalogItem }) => {
    const isSkin = item.item_type === 'skin';
    const isOwned = isSkin && purchasedSkins.includes(item.skin_id || '');
    
    return (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => isSkin ? setPreviewItem(item) : null}
      activeOpacity={isSkin ? 0.7 : 1}
    >
      <View style={styles.itemHeader}>
        {getItemImage(item.name) ? (
          <Image source={getItemImage(item.name)} style={{ width: 32, height: 32 }} resizeMode="contain" />
        ) : (
          <Ionicons name={item.icon_name as any || "cube"} size={32} color={AuthColors.navy} />
        )}
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} Coins</Text>
        </View>
        {isSkin && (
          <View style={styles.previewBadge}>
            <Text style={styles.previewText}>PREVIEW</Text>
          </View>
        )}
      </View>
      <Text style={styles.itemDesc}>{item.description}</Text>
      <TouchableOpacity 
        style={[
          styles.buyButton, 
          (isOwned || coins < item.price || purchasingId === item.id) && styles.buyButtonDisabled,
          isOwned && styles.buyButtonOwned
        ]} 
        onPress={() => handlePurchaseItem(item)}
        disabled={isOwned || coins < item.price || purchasingId === item.id}
      >
        {purchasingId === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buyText}>{isOwned ? 'OWNED' : 'BUY'}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  )}, [coins, purchasingId, handlePurchaseItem, purchasedSkins]);

  const renderSkillCard = useCallback(({ item }: { item: string }) => {
    const skill = PASSIVE_SKILLS[item as any];
    const isOwned = purchasedSkills.includes(item as any);
    const canAfford = coins >= skill.purchaseCost;
    
    return (
    <TouchableOpacity 
      style={styles.itemCard}
      activeOpacity={0.9}
    >
      <View style={styles.itemHeader}>
        <Text style={{ fontSize: 32, marginRight: 12 }}>{skill.icon}</Text>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName}>{skill.name}</Text>
          <Text style={styles.itemPrice}>{skill.purchaseCost} Coins</Text>
        </View>
      </View>
      <Text style={styles.itemDesc}>{skill.description}</Text>
      <TouchableOpacity 
        style={[
          styles.buyButton, 
          (isOwned || !canAfford || purchasingId === item) && styles.buyButtonDisabled,
          isOwned && styles.buyButtonOwned
        ]} 
        onPress={() => handlePurchaseSkill(item)}
        disabled={isOwned || !canAfford || purchasingId === item}
      >
        {purchasingId === item ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buyText}>{isOwned ? 'OWNED' : 'BUY'}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  )}, [coins, purchasingId, handlePurchaseSkill, purchasedSkills]);

  const renderPreviewModal = () => {
    if (!previewItem) return null;
    const isOwned = purchasedSkins.includes(previewItem.skin_id || '');

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
        return {
            profile: require('@/assets/images/m_avatar.png'),
            idle: require('@/assets/images/m_battle.png'),
            victory: require('@/assets/images/m_victory.png'),
            defeat: require('@/assets/images/m_defeated.png')
        };
    };
    
    const pImages = getPreviewImages(previewItem.skin_id || '');

    return (
      <Modal visible={!!previewItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{previewItem.name} Preview</Text>
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

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.buyButton, { height: 48, justifyContent: 'center' }, (isOwned || coins < previewItem.price) && styles.buyButtonDisabled]} 
                onPress={() => {
                  handlePurchaseItem(previewItem);
                  setPreviewItem(null);
                }}
                disabled={isOwned || coins < previewItem.price}
              >
                <Text style={[styles.buyText, { fontSize: 16 }]}>{isOwned ? 'OWNED' : `BUY - ${previewItem.price} COINS`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const potions = catalog.filter(c => c.item_type === 'potion');
  const cosmetics = catalog.filter(c => c.item_type === 'skin');
  const skillIds = Object.keys(PASSIVE_SKILLS);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 SHOP</Text>
        <View style={styles.coinBadge}>
          <MaterialCommunityIcons name="star-four-points" size={12} color="#FDE047" />
          <Text style={styles.coinBadgeNum}>{coins}</Text>
          <Text style={styles.coinBadgeLbl}>COINS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* POTIONS SECTION */}
        {potions.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🧪 POTIONS</Text>
            </View>
            {potions.map(item => (
              <View key={item.id}>
                {renderItemCard({ item })}
              </View>
            ))}
          </View>
        )}

        {/* SKILLS SECTION */}
        {skillIds.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚡ PASSIVE SKILLS</Text>
            </View>
            {skillIds.map(skillId => (
              <View key={skillId}>
                {renderSkillCard({ item: skillId })}
              </View>
            ))}
          </View>
        )}

        {/* COSMETICS SECTION */}
        {cosmetics.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👕 COSMETICS</Text>
            </View>
            {cosmetics.map(item => (
              <View key={item.id}>
                {renderItemCard({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderPreviewModal()}

      {/* ── Purchase Success Animation Overlay ── */}
      {rewardAnimVisible && (
        <View style={[styles.rewardAnimOverlay, { zIndex: 100, elevation: 100 }]}>
          <Animated.View style={[styles.rewardAnimBox, { transform: [{ scale: rewardScaleAnim }] }]}>
            <MaterialCommunityIcons name="shopping-outline" size={48} color="#FFD700" />
            <Text style={styles.rewardAnimText}>Purchase Successful</Text>
            <Text style={styles.rewardAnimSubtext}>{purchasedItemName} added!</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AuthColors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: AuthColors.navy,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.navy,
    letterSpacing: 2,
    marginTop: 4,
  },
  coinBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#EAB308',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  coinBadgeNum: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#FEF08A',
    marginTop: 3,
  },
  coinBadgeLbl: {
    fontFamily: Fonts.vt323,
    fontSize: 13,
    color: '#FDE047',
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: AuthColors.navy,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    letterSpacing: 2,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    marginBottom: 12,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  itemTitleContainer: { flex: 1 },
  itemName: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy },
  itemPrice: { fontFamily: Fonts.vt323, fontSize: 18, color: '#DAB65E', fontWeight: 'bold' },
  itemDesc: { fontFamily: Fonts.vt323, fontSize: 16, color: AuthColors.labelMuted, marginBottom: 12 },
  buyButton: {
    backgroundColor: AuthColors.navy,
    padding: 10,
    alignItems: 'center',
  },
  buyButtonDisabled: { opacity: 0.5 },
  buyButtonOwned: { backgroundColor: '#475569' },
  buyText: { fontFamily: Fonts.pixel, fontSize: 14, color: '#FFFFFF' },

  previewBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  previewText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#fff',
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
    borderBottomWidth: 0,
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
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 3,
    borderColor: AuthColors.navy,
    backgroundColor: '#fff',
  },

  // Reward Anim
  rewardAnimOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  rewardAnimBox: {
    backgroundColor: "#1E293B",
    borderWidth: 4,
    borderColor: "#FFD700",
    borderRadius: 12,
    alignItems: "center",
    padding: 20,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    width: '80%',
    maxWidth: 300,
  },
  rewardAnimText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: "#FFD700",
    marginTop: 12,
    textAlign: 'center',
  },
  rewardAnimSubtext: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: "#FFF",
    marginTop: 4,
    textAlign: 'center',
  },
});
