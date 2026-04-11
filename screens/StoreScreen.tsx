import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from '@/store/gameStore';
import { CatalogItem } from '@/utils/inventory';

export default function StoreScreen() {
  const coins = useGameStore((s) => s.avatar?.coins ?? 0);
  const catalog = useGameStore((s) => s.catalog);
  const purchaseItem = useGameStore((s) => s.purchaseItem);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = useCallback(async (item: CatalogItem) => {
    if (coins < item.price) {
      alert("Not enough coins!");
      return;
    }
    setPurchasingId(item.id);
    const result = await purchaseItem(item);
    setPurchasingId(null);
    
    if (result.success) {
      alert(`Purchased ${item.name}!`);
    } else {
      alert(`Purchase failed: ${result.error}`);
    }
  }, [coins, purchaseItem]);

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
        onPress={() => handlePurchase(item)}
        disabled={coins < item.price || purchasingId === item.id}
      >
        {purchasingId === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buyText}>BUY</Text>
        )}
      </TouchableOpacity>
    </View>
  ), [coins, purchasingId, handlePurchase]);

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

      <FlatList
        data={catalog}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
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
  list: { padding: 16, gap: 16 },
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
  buyText: { fontFamily: Fonts.pixel, fontSize: 14, color: '#FFFFFF' },
});
