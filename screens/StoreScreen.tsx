import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Animated, Modal, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { CatalogItem, getItemImage } from '@/utils/inventory';
import { getSkinPreviewImages } from '@/utils/skins';

export default function StoreScreen() {
  const coins = useGameStore((s) => s.avatar.coins);
  const catalog = useGameStore((s) => s.catalog.filter(i => i.item_type !== 'skill'));
  const purchaseItem = useGameStore((s) => s.purchaseItem);
  const purchasedSkins = useGameStore((s) => s.avatar.purchasedSkins) || [];
  
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [rewardAnimVisible, setRewardAnimVisible] = useState(false);
  const [purchasedItemName, setPurchasedItemName] = useState('');
  
  const [previewItem, setPreviewItem] = useState<CatalogItem | null>(null);

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
          <View style={styles.iconBox}>
            {isSkin ? (
              <Image source={getSkinPreviewImages(item.skin_id || '').profile as any} style={{ width: 44, height: 44 }} resizeMode="contain" />
            ) : getItemImage(item.name) ? (
              <Image source={getItemImage(item.name) as any} style={{ width: 36, height: 36 }} resizeMode="contain" />
            ) : (
              <Ionicons name={item.icon_name as any || "cube"} size={36} color={AuthColors.navy} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.priceTag}>
              <MaterialCommunityIcons name="circle-multiple-outline" size={12} color="#FBBF24" />
              <Text style={styles.priceText}>{item.price.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.itemDesc}>{item.description}</Text>

        <View style={styles.actionRow}>
          {isSkin && (
            <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewItem(item)}>
              <Text style={styles.previewText}>PREVIEW</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.buyButton, 
              (isOwned || coins < item.price || purchasingId === item.id) && styles.buyButtonDisabled
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
        </View>
      </TouchableOpacity>
    );
  }, [coins, purchasingId, handlePurchaseItem, purchasedSkins]);

  const renderPreviewModal = () => {
    if (!previewItem) return null;
    const isOwned = purchasedSkins.includes(previewItem.skin_id || '');
    
    const pImages = getSkinPreviewImages(previewItem.skin_id || '');

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

  const skinItems = catalog.filter(c => c.item_type === 'skin');
  const consumableItems = catalog.filter(c => c.item_type !== 'skin');

  return (
    <View style={styles.screen}>
      {renderPreviewModal()}
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GYME STORE</Text>
        </View>
        <View style={styles.coinBadge}>
          <MaterialCommunityIcons name="circle-multiple-outline" size={20} color="#FBBF24" />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Consumables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎒 CONSUMABLES</Text>
          <FlatList
            data={consumableItems}
            keyExtractor={(i) => i.id}
            renderItem={renderItemCard}
            scrollEnabled={false}
          />
        </View>

        {/* Cosmetics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👔 COSMETICS</Text>
          <FlatList
            data={skinItems}
            keyExtractor={(i) => i.id}
            renderItem={renderItemCard}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* Cool Reward Animation Overlay */}
      {rewardAnimVisible && (
        <View style={styles.rewardOverlay} pointerEvents="none">
          <Animated.View style={[styles.rewardBox, { transform: [{ scale: rewardScaleAnim }] }]}>
            <MaterialCommunityIcons name="party-popper" size={48} color="#FFD700" />
            <Text style={styles.rewardTitle}>SUCCESS!</Text>
            <Text style={styles.rewardSub}>BOUGHT {purchasedItemName.toUpperCase()}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AuthColors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderColor: AuthColors.navy,
  },
  headerTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy, letterSpacing: 2 },
  headerSub: { fontFamily: Fonts.vt323, fontSize: 14, color: '#8D99AE', letterSpacing: 3, marginTop: 2 },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    gap: 6
  },
  coinText: { fontFamily: Fonts.pixel, fontSize: 14, color: '#FBBF24' },
  
  listContent: { paddingBottom: 24, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
    marginLeft: 16,
    marginBottom: 12,
    letterSpacing: 2
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
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
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
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.navy, marginBottom: 8 },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D97706',
    gap: 4
  },
  priceText: { fontFamily: Fonts.vt323, fontSize: 14, color: '#92400E' },
  itemDesc: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.labelMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12
  },
  previewButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  previewText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
  buyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: AuthColors.navy,
    alignItems: 'center',
    minWidth: 100,
  },
  buyButtonDisabled: { backgroundColor: '#94A3B8' },
  buyText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },

  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  rewardBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: AuthColors.navy,
    padding: 32,
    alignItems: 'center',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  rewardTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    color: '#10B981',
    marginVertical: 16,
    textAlign: 'center'
  },
  rewardSub: { fontFamily: Fonts.vt323, fontSize: 18, color: AuthColors.navy, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: AuthColors.navy, borderRadius: 8, overflow: 'hidden', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 3, borderColor: AuthColors.navy, backgroundColor: '#F8FAFC' },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 16, color: AuthColors.navy },
  previewScroll: { padding: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 16 },
  previewBox: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#CBD5E1', padding: 8, alignItems: 'center' },
  previewLabel: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.navy, marginBottom: 8, textAlign: 'center' },
  previewImg: { width: 100, height: 100 },
  modalFooter: { padding: 16, borderTopWidth: 3, borderColor: AuthColors.navy, backgroundColor: '#F8FAFC' }
});

