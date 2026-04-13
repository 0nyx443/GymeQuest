import { supabase } from './supabase';

export interface CatalogItem {
  id: string; // Dynamic UUID
  name: string;
  description: string;
  price: number;
  item_type: 'potion' | 'streak_restore' | 'exp_boost' | 'skin' | 'skill';
  effect_value: number;
  icon_name: string;
  skin_id?: string; // e.g. 'm_series'
  skill_id?: string; // e.g. 'adrenaline_rush'
}

export function getItemImage(name: string): any {
  if (name === 'Double EXP Scroll') return require('@/assets/images/double_exp.png');
  if (name === 'Large Potion of Weakness') return require('@/assets/images/large_potion.png');
  if (name === 'Small Potion of Weakness') return require('@/assets/images/small_potion.png');
  if (name === 'Streak Saver') return require('@/assets/images/streak_saver.png');
  return null;
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
  
  let DBItems = (data as CatalogItem[])
    .filter(item => item.name !== 'Item Name')
    .map(item => {
      // Override price of DB Streak Saver
      if (item.name === 'Streak Saver') {
              return { ...item, price: 1500 };
            }
            if (item.item_type === 'potion') {
              return { ...item, description: `Instantly deals ${item.effect_value * 10} base damage to the enemy at the start of battle.` };
            }
      return item;
    })
    .sort((a, b) => a.price - b.price);

  // Inject hardcoded cosmetics locally since we can't alter RLS database from the app without migrations
  const mSeriesSkin: CatalogItem = {
    id: 'skin-001',
    name: 'Invincible',
    description: 'A stylish cosmetic skin pack featuring new battle and victory poses!',
    price: 15000,
    item_type: 'skin',
    effect_value: 0,
    icon_name: 'shirt-outline',
    skin_id: 'm_series'
  };

  const omniManSkin: CatalogItem = {
    id: 'skin-002',
    name: 'Omni-Man',
    description: 'A powerful cosmetic skin pack featuring Omni-Man poses!',
    price: 20000,
    item_type: 'skin',
    effect_value: 0,
    icon_name: 'shirt-outline',
    skin_id: 'omni_man'
  };

  const atomEveSkin: CatalogItem = {
    id: 'skin-003',
    name: 'Atom-Eve',
    description: 'A glowing cosmetic skin pack featuring Atom-Eve poses!',
    price: 15000,
    item_type: 'skin',
    effect_value: 0,
    icon_name: 'shirt-outline',
    skin_id: 'atom_eve'
  };
  return [...DBItems, mSeriesSkin, omniManSkin, atomEveSkin];
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

  // Add bypass for Local-only skins and skills (not stored in user_inventory)
  if (item.item_type === 'skin' || item.item_type === 'skill') {
    return { success: true, newCoins };
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
