import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Animated, ScrollView } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';
import { CatalogItem } from '@/utils/inventory';
import { PASSIVE_SKILLS, SkillId, getAvailableSkills } from '@/utils/skills';

export default function StoreScreen() {
  const playerLevel = useGameStore((s) => s.avatar?.level ?? 1);
  const coins = useGameStore((s) => s.avatar?.coins ?? 0);
  const purchasedSkills = useGameStore((s) => s.avatar?.purchasedSkills ?? []);
  const catalog = useGameStore((s) => s.catalog);
  const purchaseItem = useGameStore((s) => s.purchaseItem);
  const purchaseSkill = useGameStore((s) => s.purchaseSkill);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const [rewardAnimVisible, setRewardAnimVisible] = useState(false);
  const [purchasedItemName, setPurchasedItemName] = useState("");
  const [rewardType, setRewardType] = useState<'item' | 'skill'>('item');
  const rewardScaleAnim = useRef(new Animated.Value(0)).current;

  const availableSkills = getAvailableSkills(playerLevel);
  const allSkillIds = Object.keys(PASSIVE_SKILLS) as SkillId[];

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
      setRewardType('item');
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

  const handlePurchaseSkill = useCallback(async (skillId: SkillId) => {
    const skill = PASSIVE_SKILLS[skillId];
    if (coins < skill.purchaseCost) {
      Alert.alert("Checkout Failed", `You need ${skill.purchaseCost} coins!`);
      return;
    }
    setPurchasingId(skillId);
    const result = await purchaseSkill(skillId);
    setPurchasingId(null);
    
    if (result.success) {
      setPurchasedItemName(skill.name);
      setRewardType('skill');
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

  const renderItem = useCallback(({ item }: { item: CatalogItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Ionicons name={item.icon_name as any || "cube"} size={32} color={AuthColors.navy} />
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} Coins</Text>
        </View>
      </View>
      <Text style={styles.itemDesc}>{item.description}</Text>
      <TouchableOpacity 
        style={[
          styles.buyButton, 
          (coins < item.price || purchasingId === item.id) && styles.buyButtonDisabled
        ]} 
        onPress={() => handlePurchaseItem(item)}
        disabled={coins < item.price || purchasingId === item.id}
      >
        {purchasingId === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buyText}>BUY</Text>
        )}
      </TouchableOpacity>
    </View>
  ), [coins, purchasingId, handlePurchaseItem]);

  const renderSkillCard = useCallback(({ item: skillId }: { item: SkillId }) => {
    const skill = PASSIVE_SKILLS[skillId];
    const isAvailable = availableSkills.includes(skillId);
    const isPurchased = purchasedSkills.includes(skillId);
    const canAfford = coins >= skill.purchaseCost;

    return (
      <View style={[styles.itemCard, !isAvailable && styles.lockedCard]}>
        {!isAvailable && (
          <View style={styles.lockBadge}>
            <MaterialCommunityIcons name="lock" size={14} color="#FFF" />
            <Text style={styles.lockBadgeText}>LVL {skill.unlockLevel}</Text>
          </View>
        )}
        <View style={styles.itemHeader}>
          <Text style={styles.skillIcon}>{skill.icon}</Text>
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemName}>{skill.name}</Text>
            <Text style={styles.itemPrice}>{skill.purchaseCost} Coins</Text>
          </View>
        </View>
        <Text style={styles.itemDesc}>{skill.description}</Text>
        {isPurchased ? (
          <View style={styles.purchasedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.purchasedBadgeText}>OWNED</Text>
          </View>
        ) : isAvailable ? (
          <TouchableOpacity 
            style={[
              styles.buyButton, 
              (!canAfford || purchasingId === skillId) && styles.buyButtonDisabled
            ]} 
            onPress={() => handlePurchaseSkill(skillId)}
            disabled={!canAfford || purchasingId === skillId}
          >
            {purchasingId === skillId ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buyText}>BUY</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedButton}>
            <Text style={styles.lockedButtonText}>LOCKED</Text>
          </View>
        )}
      </View>
    );
  }, [coins, purchasingId, availableSkills, purchasedSkills, handlePurchaseSkill]);

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* POTIONS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>💊 POTIONS</Text>
          {catalog.length === 0 ? (
            <Text style={styles.emptyText}>No potions available</Text>
          ) : (
            <View style={styles.itemsList}>
              {catalog.map((item) => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
            </View>
          )}
        </View>

        {/* SKILLS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>⚡ PASSIVE SKILLS</Text>
          <View style={styles.itemsList}>
            {allSkillIds.map((skillId) => (
              <View key={skillId}>{renderSkillCard({ item: skillId })}</View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Purchase Success Animation Overlay ── */}
      {rewardAnimVisible && (
        <View style={[styles.rewardAnimOverlay, { zIndex: 100, elevation: 100 }]}>
          <Animated.View style={[styles.rewardAnimBox, { transform: [{ scale: rewardScaleAnim }] }]}>
            {rewardType === 'item' ? (
              <MaterialCommunityIcons name="potion-outline" size={48} color="#FFD700" />
            ) : (
              <MaterialCommunityIcons name="star-four-points" size={48} color="#FFD700" />
            )}
            <Text style={styles.rewardAnimText}>Purchase Successful</Text>
            <Text style={styles.rewardAnimSubtext}>{purchasedItemName} acquired!</Text>
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
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 24 },
  section: { gap: 12 },
  sectionHeader: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: AuthColors.navy,
    letterSpacing: 1.5,
    marginBottom: 4,
    paddingLeft: 4,
  },
  itemsList: { gap: 12 },
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
  lockedCard: { opacity: 0.7 },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#64748B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 10,
  },
  lockBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 9,
    color: '#FFF',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  itemTitleContainer: { flex: 1 },
  itemName: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy },
  itemPrice: { fontFamily: Fonts.vt323, fontSize: 18, color: '#DAB65E', fontWeight: 'bold' },
  skillIcon: { fontSize: 32 },
  itemDesc: { fontFamily: Fonts.vt323, fontSize: 14, color: AuthColors.labelMuted, marginBottom: 12, lineHeight: 18 },
  buyButton: {
    backgroundColor: AuthColors.navy,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  buyButtonDisabled: { opacity: 0.5 },
  buyText: { fontFamily: Fonts.pixel, fontSize: 14, color: '#FFFFFF' },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
  },
  purchasedBadgeText: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    color: '#10B981',
    fontWeight: 'bold',
  },
  lockedButton: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  lockedButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: '#64748B',
  },
  emptyText: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.labelMuted,
    textAlign: 'center',
    paddingVertical: 16,
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
