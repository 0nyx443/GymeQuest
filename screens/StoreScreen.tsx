import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  item_type: string;
  icon_name: string;
}

export default function StoreScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [storeRes, profileRes] = await Promise.all([
        supabase.from('store_items').select('*'),
        supabase.from('profiles').select('coins').eq('id', session.user.id).single()
      ]);

      if (storeRes.error) {
        console.error('Store items error:', storeRes.error);
        alert(`Error loading store items: ${storeRes.error.message}`);
      }
      
      if (profileRes.error) {
        console.error('Profile coins error:', profileRes.error);
        // Do not alert for coins, it might fail if coins is not set up
      }

      if (storeRes.data) setItems(storeRes.data);
      if (profileRes.data) setCoins(profileRes.data.coins || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: StoreItem) => {
    if (coins < item.price) {
      alert("Not enough coins!");
      return;
    }
    // Simulate purchase for now since it's just the UI step requested
    alert(`Purchased ${item.name}!`);
  };

  const renderItem = ({ item }: { item: StoreItem }) => (
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
        style={[styles.buyButton, coins < item.price && styles.buyButtonDisabled]} 
        onPress={() => handlePurchase(item)}
      >
        <Text style={styles.buyText}>BUY</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={AuthColors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>SHOP</Text>
        <View style={styles.coinContainer}>
          <Ionicons name="logo-bitcoin" size={20} color="#DAB65E" />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={AuthColors.navy} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: AuthColors.navy,
  },
  backButton: { padding: 8 },
  title: { fontFamily: Fonts.pixel, fontSize: 24, color: AuthColors.navy },
  coinContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinText: { fontFamily: Fonts.vt323, fontSize: 20, color: AuthColors.navy, fontWeight: 'bold' },
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
