import { supabase } from './supabase';

export interface CatalogItem {
  id: string; // Dynamic UUID
  name: string;
  description: string;
  price: number;
  item_type: 'potion' | 'streak_restore' | 'exp_boost';
  effect_value: number;
  icon_name: string;
}

export interface InventoryRow {
  item_id: string; // The UUID
  quantity: number;
}

/** Fetch live shop catalog from store_items */
export async function fetchStoreCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from('store_items').select('*');
  if (error) {
    console.error('[inventory] Error fetching store_items:', error.message);
    return [];
  }
  return data as CatalogItem[];
}

/** Fetch current inventory from user_inventory */
export async function fetchInventory(userId: string): Promise<InventoryRow[]> {
  const { data, error } = await supabase
    .from('user_inventory')
    .select('item_id, quantity')
    .eq('profile_id', userId)
    .gt('quantity', 0);
    
  if (error) {
    console.error('[inventory] fetch err:', error.message);
    return [];
  }
  return data as InventoryRow[];
}

/** Deduct coins and update quantity in user_inventory */
export async function purchaseItem(
  userId: string,
  item: CatalogItem,
  currentCoins: number,
): Promise<{ success: boolean; newCoins: number; error?: string }> {
  if (currentCoins < item.price) {
    return { success: false, newCoins: currentCoins, error: 'Not enough coins!' };
  }
  const newCoins = currentCoins - item.price;

  // 1. Deduct coins from profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ coins: newCoins })
    .eq('id', userId);
  if (profileErr) {
    return { success: false, newCoins: currentCoins, error: profileErr.message };
  }

  // 2. Fetch current quantity to increment
  const { data: invRow } = await supabase
    .from('user_inventory')
    .select('quantity')
    .eq('profile_id', userId)
    .eq('item_id', item.id)
    .single();

  const newQty = invRow ? invRow.quantity + 1 : 1;

  // 3. Upsert into user_inventory
  const { error: invErr } = await supabase
    .from('user_inventory')
    .upsert(
      { profile_id: userId, item_id: item.id, quantity: newQty },
      { onConflict: 'profile_id,item_id' }
    );

  if (invErr) {
    // Rollback
    await supabase.from('profiles').update({ coins: currentCoins }).eq('id', userId);
    return { success: false, newCoins: currentCoins, error: invErr.message };
  }

  return { success: true, newCoins };
}

/** Consume 1 quantity of an item from inventory */
export async function consumeItem(
  userId: string,
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch current
  const { data: invRow, error: fetchErr } = await supabase
    .from('user_inventory')
    .select('quantity')
    .eq('profile_id', userId)
    .eq('item_id', itemId)
    .single();

  if (fetchErr || !invRow || invRow.quantity <= 0) {
    return { success: false, error: 'Item not available' };
  }

  // 2. Decrement
  const newQty = invRow.quantity - 1;
  const { error: updateErr } = await supabase
    .from('user_inventory')
    .update({ quantity: newQty })
    .eq('profile_id', userId)
    .eq('item_id', itemId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }
  return { success: true };
}
