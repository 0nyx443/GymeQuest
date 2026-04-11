/**
 * InventoryScreen.tsx — placeholder for player's item inventory.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

import { InventoryRow } from '@/utils/inventory';

export default function InventoryScreen() {
  const inventory = useGameStore((s) => s.inventory);
  const catalog = useGameStore((s) => s.catalog);

  const renderItem = useCallback(({ item }: { item: InventoryRow }) => {
    const catalogItem = catalog.find((c) => c.id === item.item_id);
    if (!catalogItem) return null;

    return (
      <View style={styles.itemCard}>
        <View style={styles.iconBox}>
          <Ionicons name={catalogItem.icon_name as any} size={36} color={AuthColors.navy} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{catalogItem.name}</Text>
          <Text style={styles.itemDesc}>{catalogItem.description}</Text>
        </View>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>x{item.quantity}</Text>
        </View>
      </View>
    );
  }, [catalog]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={AuthColors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎒 INVENTORY</Text>
        <Text style={styles.headerSub}>YOUR ITEMS & GEAR</Text>
      </View>

      {inventory.length === 0 ? (
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
          keyExtractor={(item) => item.item_id}
          contentContainerStyle={styles.listContent}
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
  qtyBadge: {
    backgroundColor: '#1E293B', // Dark grey/navy badge
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: AuthColors.navy,
  },
  qtyText: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
