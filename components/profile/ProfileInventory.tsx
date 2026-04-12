import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { getItemImage } from '@/utils/inventory';

interface InventoryItem {
  id: string;
  quantity: number;
  store_items: {
    name: string;
    description: string;
    icon_name: string;
  };
}

export function ProfileInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          quantity,
          store_items (
            name,
            description,
            icon_name
          )
        `)
        .eq('profile_id', session.user.id);

      if (data) {
        setInventory(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} color={AuthColors.navy} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>INVENTORY</Text>

      {inventory.length === 0 ? (
        <Text style={styles.emptyText}>Your inventory is empty. Complete quests to earn coins and visit the shop!</Text>
      ) : (
        <View style={styles.grid}>
          {inventory.map((item) => (
            <View key={item.id} style={styles.itemBox}>
              <View style={styles.iconContainer}>
                {getItemImage(item.store_items?.name) ? (
                  <Image
                    source={getItemImage(item.store_items?.name)}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons 
                      name={(item.store_items?.icon_name as any) || "cube"} 
                      size={32} 
                      color={AuthColors.navy} 
                  />
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>{item.store_items?.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: 20,
    color: AuthColors.navy,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: Fonts.vt323,
    fontSize: 16,
    color: AuthColors.labelMuted,
    textAlign: 'center',
    marginVertical: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  itemBox: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: AuthColors.navy,
    padding: 12,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#DAB65E',
    borderWidth: 2,
    borderColor: AuthColors.navy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: AuthColors.navy,
    fontWeight: 'bold',
  },
  itemName: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: AuthColors.navy,
    textAlign: 'center',
  },
});
