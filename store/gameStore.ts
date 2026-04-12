import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { Enemy, ExerciseType, StatKey, XP_TABLE, MAX_LEVEL } from '@/constants/game';
import {
  InventoryRow, CatalogItem, fetchStoreCatalog,
  fetchInventory, purchaseItem as dbPurchaseItem, consumeItem,
} from '@/utils/inventory';
import { PASSIVE_SKILLS } from '@/utils/skills';

export interface PlayerStats {
  strength: number;
  agility: number;
  stamina: number;
}

export interface AvatarState {
  name: string;
  class: string;
  level: number;
  xp: number;
  coins: number;           // NEW: Earned by defeating enemies
  currentStreak: number;   // NEW: Current daily workout streak
  lastActiveDate: string | null; // NEW: The ISO string date of last workout
  lastEnduranceDate: string | null; // NEW: The ISO string date of last endurance boss battle
  claimedLevelRewards: number[]; // NEW: Levels for which rewards have been claimed
  stats: PlayerStats;
  defeatedEnemies: string[];
  purchasedSkins: string[];
  equippedSkin: string | null;
  purchasedSkills: string[];
  equippedSkills: string[];
  totalReps: number;
  todayReps: { date: string } & Record<ExerciseType, number>; // For Today's reps
  totalBattles: number;
  victories: number;
  birthday?: string;
  sex?: string;
  height_cm?: number;
  weight_kg?: number;
}

export interface ActiveBattle {
  enemy: Enemy;
  repsCompleted: number;
  totalDamageDealt: number;  // NEW: Total damage dealt instead of reps
  damagePerRep: number;       // NEW: Damage multiplier based on stats
  enemyHpRemaining: number;
  secondsRemaining: number;
  phase: 'idle' | 'countdown' | 'active' | 'victory' | 'defeat';
  lastRepAt: number | null;
  // item effects active in this battle
  effectiveReps: number;        // may be lower than enemy.repsRequired (Elixir)
  activeEffect: CatalogItem | null;  // for display & XP multiplier
  triggeredSkills: string[];    // NEW: Skills triggered this battle
}

interface GameStore {
  avatar: AvatarState;
  battle: ActiveBattle | null;
  catalog: CatalogItem[];
  inventory: InventoryRow[];
  pendingItemEffect: CatalogItem | null;   // queued before battle starts
  profileNeedsName: boolean;
  showTutorial: boolean;
  isProfileLoaded: boolean;
  showDailyLoginReward: boolean;
  dailyRewardCoins: number;

  claimDailyReward: () => Promise<void>;
  claimLevelReward: (level: number) => Promise<void>;

  // Avatar actions
  gainXp: (amount: number) => void;
  boostStats: (boosts: Partial<PlayerStats>) => void;
  recordBattle: (won: boolean, reps: number, enemy: Enemy, shieldActive?: boolean) => void;

  // Item actions
  loadInventory: () => Promise<void>;
  purchaseItem: (item: CatalogItem) => Promise<{ success: boolean; error?: string }>;
  purchaseSkill: (skillId: string) => Promise<{ success: boolean; error?: string }>;
  equipSkin: (skinId: string | null) => void;
  queueItemEffect: (effect: CatalogItem) => void;
  clearPendingEffect: () => void;
  consumeQueuedItem: (itemId: string) => Promise<void>;
  useItemFromInventory: (item: CatalogItem) => Promise<{ success: boolean; error?: string }>;
  toggleSkillEquip: (skillId: string) => void;

  // Battle actions
  startBattle: (enemy: Enemy) => void;
  applyItemToCurrentBattle: (effect: CatalogItem) => void;
  setBattleActive: () => void;
  registerRep: () => void;
  tickTimer: () => void;
  resolveBattle: (outcome: 'victory' | 'defeat') => void;
  resetBattle: () => void;
  resetAvatar: () => void;
  setAvatar: (avatarData: Partial<AvatarState>) => void;
  loadProfile: () => Promise<boolean>;
  syncProfile: () => Promise<void>;
  setProfileNeedsName: (need: boolean) => void;
  setShowTutorial: (show: boolean) => void;
}

function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return XP_TABLE[level + 1] - XP_TABLE[level];
}

function xpProgress(xp: number, level: number): number {
  const base = XP_TABLE[level];
  const next = XP_TABLE[level + 1] ?? Infinity;
  return Math.min((xp - base) / (next - base), 1);
}

/**
 * Calculate damage per rep based on player stats
 * Formula: 10 * (1 + (strength + agility + stamina) / 100)
 */
function calculateDamagePerRep(stats: PlayerStats): number {
  const statSum = stats.strength + stats.agility + stats.stamina;
  return 10 * (1 + statSum / 100);
}

export const useGameStore = create<GameStore>((set, get) => ({
  avatar: {
    name: 'Aethor',
    class: 'Iron Aspirant',
    level: 1,
    xp: 0,
    coins: 0,
    currentStreak: 0,
    lastActiveDate: null,
    lastEnduranceDate: null,
    claimedLevelRewards: [],
    stats: { strength: 10, agility: 10, stamina: 10 },
    defeatedEnemies: [],
    purchasedSkins: [],
    equippedSkin: null,
    purchasedSkills: [],
    equippedSkills: [],
    totalReps: 0,
    todayReps: { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 },
    totalBattles: 0,
    victories: 0,
  },
  profileNeedsName: false,
  showTutorial: false,
  isProfileLoaded: false,
  showDailyLoginReward: false,
  dailyRewardCoins: 0,
  battle: null,
  catalog: [],
  inventory: [],
  pendingItemEffect: null,

  claimDailyReward: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || 'guest';
    
    // Give base coins + slight bonus based on current streak
    const reward = Math.max(50, get().dailyRewardCoins);
    set((state) => ({ 
      avatar: { ...state.avatar, coins: state.avatar.coins + reward },
      showDailyLoginReward: false
    }));
    
    const todayStr = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(`lastLoginReward_${userId}`, todayStr);
    
    get().syncProfile().catch(() => {});
  },

  claimLevelReward: async (level: number) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || 'guest';
    
    // Reward scales with level: base 50 + 50 per level
    const rewardCoins = level * 50;
    
    set((state) => {
      const newClaimed = [...state.avatar.claimedLevelRewards, level];
      return { 
        avatar: { 
          ...state.avatar, 
          coins: state.avatar.coins + rewardCoins,
          claimedLevelRewards: newClaimed
        }
      };
    });
    
    const newState = get().avatar.claimedLevelRewards;
    // Save to both AsyncStorage and sync to Supabase
    await AsyncStorage.setItem(`claimedLevelRewards_${userId}`, JSON.stringify(newState));
    
    await get().syncProfile().catch(() => {});
  },

  gainXp: (amount) => set((state) => {
    let { xp, level } = state.avatar;
    xp += amount;
    while (level < MAX_LEVEL && xp >= XP_TABLE[level + 1]) {
      level += 1;
    }
    return { avatar: { ...state.avatar, xp, level } };
  }),

  boostStats: (boosts) => set((state) => ({
    avatar: {
      ...state.avatar,
      stats: {
        strength: state.avatar.stats.strength + (boosts.strength ?? 0),
        agility: state.avatar.stats.agility + (boosts.agility ?? 0),
        stamina: state.avatar.stats.stamina + (boosts.stamina ?? 0),
      },
    },
  })),

  recordBattle: (won, reps, enemy, shieldActive) => set((state) => {
    let { currentStreak, coins, lastActiveDate, stats } = state.avatar;
    let newDefeatedEnemies = state.avatar.defeatedEnemies;
    
    // Add coins (base enemy reward + 1 per rep if won, else just partial reps)
    // 3. AGI (Agility) = Small percent boost to total coin reward (1% increase per point of AGI)
    let coinDrop = won ? (enemy.coinReward + reps) : Math.floor(reps / 2);
    let agilityBonus = Math.floor(coinDrop * (stats.agility * 0.01));
    coins += coinDrop + agilityBonus;
    
    // Manage Streak
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastActiveDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActiveDate === yesterdayStr) {
        currentStreak += 1;
      } else if (!lastActiveDate) {
        currentStreak = 1;
      } else {
        // Streak broken
        // NEW: Streak Saver Logic!
        if (shieldActive) {
          // If they missed days but used a shield, they keep their old streak and add 1 for today!
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      }
      lastActiveDate = todayStr;
      
      // Clear defeated enemies for the new day so the Daily Bounty resets
      newDefeatedEnemies = [];
    }

    let lastEnduranceDate = state.avatar.lastEnduranceDate;
    if (enemy.isEndurance && won) {
      lastEnduranceDate = todayStr;
    }

    const prevTodayReps = state.avatar.todayReps || { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    let newTodayReps = { ...prevTodayReps };
    if (newTodayReps.date !== todayStr) {
      newTodayReps = { date: todayStr, push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    }
    
    newTodayReps[enemy.exercise] += reps;

    return {
      avatar: {
        ...state.avatar,
        coins,
        currentStreak,
        lastActiveDate,
        lastEnduranceDate,
        totalReps: state.avatar.totalReps + reps,
        todayReps: newTodayReps,
        totalBattles: state.avatar.totalBattles + 1,
        victories: state.avatar.victories + (won ? 1 : 0),
        defeatedEnemies: won && !newDefeatedEnemies.includes(enemy.id)
          ? [...newDefeatedEnemies, enemy.id]
          : newDefeatedEnemies,
      }
    };
  }),

  // ── Item actions ─────────────────────────────────────────────────────────
  loadInventory: async () => {
    // 1. Load catalog from store_items
    const catalogData = await fetchStoreCatalog();
    set({ catalog: catalogData });

    // 2. Load user's actual inventory
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    const rows = await fetchInventory(userData.user.id);
    set({ inventory: rows });
  },

  purchaseItem: async (item) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not logged in' };
    const currentCoins = get().avatar.coins;
    const result = await dbPurchaseItem(userData.user.id, item, currentCoins);
    if (result.success) {
      // Update local coins immediately so UI reflects without refetch
      if (item.item_type === 'skin' && item.skin_id) {
        set((state) => ({
          avatar: { 
            ...state.avatar, 
            coins: result.newCoins,
            purchasedSkins: [...state.avatar.purchasedSkins, item.skin_id as string]
          },
        }));
        get().syncProfile(); // Sync to AsyncStorage securely
      } else if (item.item_type === 'skill' && item.skill_id) {
        set((state) => ({
          avatar: { 
            ...state.avatar, 
            coins: result.newCoins,
            purchasedSkills: [...state.avatar.purchasedSkills, item.skill_id as string]
          },
        }));
        get().syncProfile();
      } else {
        set((state) => ({
          avatar: { ...state.avatar, coins: result.newCoins },
          inventory: (() => {
            const existing = state.inventory.find((r) => r.item_id === item.id);
            if (existing) {
              return state.inventory.map((r) =>
                r.item_id === item.id ? { ...r, quantity: r.quantity + 1 } : r
              );
            }
            return [...state.inventory, { item_id: item.id, quantity: 1 }];
          })(),
        }));
      }
    }
    return { success: result.success, error: result.error };
  },

  purchaseSkill: async (skillId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not logged in' };
    
    const skill = PASSIVE_SKILLS[skillId as any];
    if (!skill) return { success: false, error: 'Skill not found' };
    
    const currentCoins = get().avatar.coins;
    const purchasedSkills = get().avatar.purchasedSkills;
    
    // Check if already purchased
    if (purchasedSkills.includes(skillId)) {
      return { success: false, error: 'Skill already purchased' };
    }
    
    // Check if enough coins
    if (currentCoins < skill.purchaseCost) {
      return { success: false, error: 'Not enough coins!' };
    }
    
    const newCoins = currentCoins - skill.purchaseCost;
    
    // Deduct coins from profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ coins: newCoins })
      .eq('id', userData.user.id);
    
    if (profileErr) {
      return { success: false, error: profileErr.message };
    }
    
    // Update local state
    set((state) => ({
      avatar: {
        ...state.avatar,
        coins: newCoins,
        purchasedSkills: [...state.avatar.purchasedSkills, skillId]
      }
    }));
    
    try {
      await get().syncProfile();
    } catch (err: any) {
      console.error('Error syncing profile after skill purchase:', err);
    }
    return { success: true };
  },

  equipSkin: (skinId) => {
    set((state) => ({
      avatar: { ...state.avatar, equippedSkin: skinId }
    }));
    get().syncProfile();
  },

  toggleSkillEquip: (skillId) => {
    set((state) => {
      const equipped = state.avatar.equippedSkills.includes(skillId);
      const newEquipped = equipped 
        ? state.avatar.equippedSkills.filter(s => s !== skillId)
        : [...state.avatar.equippedSkills, skillId];
      return {
        avatar: { ...state.avatar, equippedSkills: newEquipped }
      };
    });
    get().syncProfile();
  },

  queueItemEffect: (effect) => set({ pendingItemEffect: effect }),
  clearPendingEffect: () => set({ pendingItemEffect: null }),

    consumeQueuedItem: async (itemId) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    await consumeItem(userData.user.id, itemId);
    set((state) => ({
      inventory: state.inventory.map((r) =>
        r.item_id === itemId ? { ...r, quantity: Math.max(0, r.quantity - 1) } : r
      ).filter((r) => r.quantity > 0),
    }));
  },

  useItemFromInventory: async (item) => {
    const state = get();
    // Only handle streak_restore directly from inventory for now
    if (item.item_type !== 'streak_restore') {
      return { success: false, error: 'This item can only be used before a battle!' };
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Must be logged in to use items.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If they already worked out today or yesterday, streak is not broken
    if (state.avatar.lastActiveDate === todayStr || state.avatar.lastActiveDate === yesterdayStr) {
      return { success: false, error: 'Your streak is already active! No need to use this yet.' };
    }

    // Determine current quantity
    const invRow = state.inventory.find(i => i.item_id === item.id);
    if (!invRow || invRow.quantity < 1) {
      return { success: false, error: 'You do not own this item.' };
    }

    // Consume the item
    const consumeRes = await consumeItem(userData.user.id, item.id);
    if (!consumeRes.success) {
      return { success: false, error: consumeRes.error };
    }

    // Apply effect: Fast-forward their last active date to yesterday so today's workout continues the streak!
    set((s) => ({
      avatar: {
        ...s.avatar,
        lastActiveDate: yesterdayStr
      },
      inventory: s.inventory.map((r) =>
        r.item_id === item.id ? { ...r, quantity: Math.max(0, r.quantity - 1) } : r
      ).filter((r) => r.quantity > 0),
    }));
    
    // Save to DB
    get().syncProfile().catch(() => {});

    return { success: true };
  },

  // ── startBattle — apply pending item effects & passive stats ──────────────
  startBattle: (enemy) => {
    const state = get();
    const pendingEffect = state.pendingItemEffect;
    let damagePerRep = calculateDamagePerRep(state.avatar.stats);
    
    // Apply Double Damage skill if equipped
    if (state.avatar.equippedSkills.includes('double_damage')) {
      damagePerRep *= 2;
    }
    
    // STARTING PASSIVE BUFFS:
    // 1. STR (Strength) = -1 Rep Required for every 10 points (to a minimum of 1 rep)
    const strengthBonusReps = Math.floor(state.avatar.stats.strength / 10);
    let effectiveReps = Math.max(1, enemy.repsRequired - strengthBonusReps);
    
    // 2. STA (Stamina) = +1 Second to the timer per point in Stamina
    let extraSeconds  = state.avatar.stats.stamina;
    
    // POTIONS: Deal direct damage to enemy at battle start
    let initialDamage = 0;
    if (pendingEffect?.item_type === 'potion') {
      // Potions deal direct damage (effect_value * 10 damage)
      initialDamage = pendingEffect.effect_value * 10;
    }

    set({
      battle: {
        enemy,
        repsCompleted: 0,
        totalDamageDealt: initialDamage,
        damagePerRep,
        enemyHpRemaining: Math.max(1, enemy.health - initialDamage),
        secondsRemaining: enemy.timeLimit + extraSeconds,
        phase: 'countdown',
        lastRepAt: null,
        effectiveReps,
        activeEffect: pendingEffect,
        triggeredSkills: [],
      },
    });
  },

  applyItemToCurrentBattle: (effect: CatalogItem) => set((state) => {
    if (!state.battle) return state;
    
    let { effectiveReps, secondsRemaining } = state.battle;
    if (effect.item_type === 'potion') {
      // Potions deal direct damage (reduce reps)
      effectiveReps = Math.max(1, effectiveReps - effect.effect_value);
    }
    
    return {
      battle: {
        ...state.battle,
        effectiveReps,
        secondsRemaining,
        activeEffect: effect,
      }
    };
  }),

  // ── NEW: Tells the global store the countdown is over ──
  setBattleActive: () => set((state) => {
    if (!state.battle) return state;
    return { battle: { ...state.battle, phase: 'active' } };
  }),

  registerRep: () => set((state) => {
    if (!state.battle || state.battle.phase !== 'active') return state;

    const newReps = state.battle.repsCompleted + 1;
    const now = Date.now();
    let damageThisRep = state.battle.damagePerRep;
    const equippedSkills = state.avatar.equippedSkills;
    
    // ── HEAVY STRIKE: Every 5th rep deals 2x damage (critical hit) ──
    if (equippedSkills.includes('heavy_strike') && newReps % 5 === 0) {
      damageThisRep *= 2;
    }
    
    const totalDamage = state.battle.totalDamageDealt + damageThisRep;
    const enemyHealth = state.battle.enemy.health;
    const newHp = Math.max(0, enemyHealth - totalDamage);

    // Check if enemy is defeated
    if (totalDamage >= enemyHealth) {
      return {
        battle: {
          ...state.battle,
          repsCompleted: newReps,
          totalDamageDealt: totalDamage,
          enemyHpRemaining: 0,
          phase: 'victory',
          lastRepAt: now,
        },
      };
    }

    return {
      battle: {
        ...state.battle,
        repsCompleted: newReps,
        totalDamageDealt: totalDamage,
        enemyHpRemaining: newHp,
        lastRepAt: now,
      },
    };
  }),

  tickTimer: () => set((state) => {
    if (!state.battle || state.battle.phase !== 'active') return state;
    const newSecs = state.battle.secondsRemaining - 1;
    if (newSecs <= 0) {
      // In endurance mode, running out of time is the *intended* victory condition.
      const timeUpOutcome = state.battle.enemy.isEndurance ? 'victory' : 'defeat';
      return { battle: { ...state.battle, secondsRemaining: 0, phase: timeUpOutcome } };
    }
    return { battle: { ...state.battle, secondsRemaining: newSecs } };
  }),

  resolveBattle: (outcome) => {
    const { battle, gainXp, boostStats, recordBattle } = get();
    if (!battle) return;
    
    // Set the battle phase so PostBattleScreen can determine victory/defeat UI
    set((state) => ({
      battle: state.battle ? { ...state.battle, phase: outcome } : null
    }));
    
    if (outcome === 'victory') {
      let finalXp = battle.enemy.xpReward;
      
      // Dynamic logic for Endurance Bosses
      if (battle.enemy.isEndurance) {
        // Base XP on number of reps completed in the timeframe
        finalXp = battle.repsCompleted * 30; 
      }

      if (battle.activeEffect?.item_type === 'exp_boost') {
        finalXp *= battle.activeEffect.effect_value;
      }
      
      // ── ADRENALINE RUSH: 1.5x XP if 5 reps completed in under 15 seconds ──
      const equippedSkills = get().avatar.equippedSkills;
      if (equippedSkills.includes('adrenaline_rush')) {
        // Check if any 5 reps were completed within 15 seconds
        // We'll use a simple heuristic: if battle time < 15 seconds and reps >= 5
        const battleDuration = battle.enemy.timeLimit - battle.secondsRemaining;
        if (battle.repsCompleted >= 5 && battleDuration < 15) {
          finalXp *= 1.5;
        }
      }
      
      gainXp(finalXp);
      boostStats(battle.enemy.statBoosts as Partial<PlayerStats>);
    }
    const shieldActive = battle.activeEffect?.item_type === 'streak_restore';
    recordBattle(
      outcome === 'victory',
      battle.repsCompleted,
      battle.enemy,
      shieldActive
    );
    // Persist the latest avatar stats to Supabase in the background
    get().syncProfile().catch(() => {});
  },

  resetBattle: () => set({ battle: null }),
  resetAvatar: () => set({ avatar: { name: 'Aethor', class: 'Iron Aspirant', level: 1, xp: 0, coins: 0, currentStreak: 0, lastActiveDate: null, lastEnduranceDate: null, claimedLevelRewards: [], stats: { strength: 0, agility: 0, stamina: 0 }, defeatedEnemies: [], totalReps: 0, todayReps: { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 }, totalBattles: 0, victories: 0, purchasedSkins: [], equippedSkin: null } }),
  setAvatar: (avatarData) => set((state) => ({ avatar: { ...state.avatar, ...avatarData } })),
  setProfileNeedsName: (need) => set({ profileNeedsName: need }),
  setShowTutorial: (show) => set({ showTutorial: show }),

  loadProfile: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const todayStr = new Date().toISOString().split('T')[0];

    // Guest user flow
    if (!user) {
      const lastLoginReward = await AsyncStorage.getItem('lastLoginReward_guest');
      let showReward = false;
      let rewardAmount = 0;
      if (lastLoginReward !== todayStr) {
        showReward = true;
        // Base 50 for guests since they have no streak state tracked locally yet
        rewardAmount = 50;
      }
      
      const storedClaimedLevelsGuestStr = await AsyncStorage.getItem('claimedLevelRewards_guest');
      const storedClaimedLevelsGuest = storedClaimedLevelsGuestStr ? JSON.parse(storedClaimedLevelsGuestStr) : [];
      
      set((state) => ({ 
        avatar: { ...state.avatar, claimedLevelRewards: storedClaimedLevelsGuest },
        profileNeedsName: true, 
        isProfileLoaded: true,
        showDailyLoginReward: showReward,
        dailyRewardCoins: rewardAmount
      }));
      return true;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error || !data) {
      set({ profileNeedsName: true, isProfileLoaded: true });
      return true;
    }
    const emailPrefix = user.email?.split('@')[0] ?? '';
    const needsName = !data.name || data.name.trim().length === 0 || data.name === emailPrefix;
    
    // Load local daily progression state
    const storedDefeatedStr = await AsyncStorage.getItem(`defeatedEnemies_${user.id}`);
    let loadedDefeatedEnemies = storedDefeatedStr ? JSON.parse(storedDefeatedStr) : [];

    const storedEnduranceStr = await AsyncStorage.getItem(`lastEnduranceDate_${user.id}`);
    let loadedEnduranceDate = storedEnduranceStr ?? null;

    const meta = user.user_metadata || {};
    let loadedSkins = meta.purchasedSkins;
    let needsSkinsMigration = false;
    if (!loadedSkins) {
      const storedSkinsStr = await AsyncStorage.getItem(`purchasedSkins_${user.id}`);
      loadedSkins = storedSkinsStr ? JSON.parse(storedSkinsStr) : [];
      if (loadedSkins.length > 0) needsSkinsMigration = true;
    }

    let loadedEquippedSkin = meta.equippedSkin !== undefined ? meta.equippedSkin : null;
    if (loadedEquippedSkin === null || loadedEquippedSkin === undefined) {
      loadedEquippedSkin = await AsyncStorage.getItem(`equippedSkin_${user.id}`);
      if (loadedEquippedSkin) needsSkinsMigration = true;
    }

    // Load skills from metadata or AsyncStorage
    let loadedSkills = meta.purchasedSkills;
    let loadedEquippedSkills = meta.equippedSkills;
    if (!loadedSkills) {
      const storedSkillsStr = await AsyncStorage.getItem(`purchasedSkills_${user.id}`);
      loadedSkills = storedSkillsStr ? JSON.parse(storedSkillsStr) : [];
      if (loadedSkills.length > 0) needsSkinsMigration = true;
    }
    if (!loadedEquippedSkills) {
      const storedEquippedStr = await AsyncStorage.getItem(`equippedSkills_${user.id}`);
      loadedEquippedSkills = storedEquippedStr ? JSON.parse(storedEquippedStr) : [];
      if (loadedEquippedSkills.length > 0) needsSkinsMigration = true;
    }

    if (data.last_active_date !== todayStr) {
      loadedDefeatedEnemies = [];
    }

    // Load claimed level rewards from metadata first, fallback to AsyncStorage
    let loadedClaimedLevels = meta.claimed_level_rewards;
    if (!loadedClaimedLevels) {
      const storedClaimedLevelsStr = await AsyncStorage.getItem(`claimedLevelRewards_${user.id}`);
      loadedClaimedLevels = storedClaimedLevelsStr ? JSON.parse(storedClaimedLevelsStr) : [];
      if (loadedClaimedLevels.length > 0) needsSkinsMigration = true; // trigger sync
    }

    const storedTodayRepsStr = await AsyncStorage.getItem(`todayReps_${user.id}`);
    let loadedTodayReps = storedTodayRepsStr ? JSON.parse(storedTodayRepsStr) : { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    if (loadedTodayReps.date !== todayStr) {
      loadedTodayReps = { date: todayStr, push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    }

    // Daily Login Reward Check
    const lastLoginReward = await AsyncStorage.getItem(`lastLoginReward_${user.id}`);
    let showReward = false;
    let rewardAmount = 0;
    if (lastLoginReward !== todayStr) {
      showReward = true;
      // Base 50 + 10 for every day in streak
      rewardAmount = 50 + ((data.current_streak ?? 0) * 10);
    }

    // Auto-correct level based on loaded XP
    let loadedXp = data.exp ?? 0;
    let actualLevel = data.level ?? 1;
    let needsSync = false;
    while (actualLevel < MAX_LEVEL && loadedXp >= XP_TABLE[actualLevel + 1]) {
      actualLevel += 1;
      needsSync = true;
    }

    set((state) => ({
      avatar: {
        ...state.avatar,
        name: data.name ?? state.avatar.name,
        level: actualLevel,
        xp: loadedXp,
        stats: {
          strength: data.str ?? 0,
          agility: data.agi ?? 0,
          stamina: data.sta ?? 0,
        },
        totalReps: data.total_reps ?? 0,
        todayReps: loadedTodayReps,
        totalBattles: data.battles ?? 0,
        victories: data.victories ?? 0,
        coins: data.coins ?? 0,
        currentStreak: data.current_streak ?? 0,
        lastActiveDate: data.last_active_date ?? null,
        lastEnduranceDate: loadedEnduranceDate,
        claimedLevelRewards: loadedClaimedLevels,
        defeatedEnemies: loadedDefeatedEnemies,
        purchasedSkins: loadedSkins,
        equippedSkin: loadedEquippedSkin,
        purchasedSkills: loadedSkills,
        equippedSkills: loadedEquippedSkills,
        birthday: data.birthday,
        sex: data.sex,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
      },
      profileNeedsName: needsName,
      showDailyLoginReward: showReward,
      dailyRewardCoins: rewardAmount,
    }));
    
    // Load inventory since the profile is now loaded
    await get().loadInventory().catch(() => {});
    
    // Mark as completely loaded after inventory fetches
    set({ isProfileLoaded: true });

    if (needsSync || needsSkinsMigration) {
      get().syncProfile().catch(() => {});
    }
    
    return needsName;
  },

  syncProfile: async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const state = get().avatar;
      
      // Save daily progression state locally - use Promise.all for parallelization
      await Promise.all([
        AsyncStorage.setItem(`defeatedEnemies_${user.id}`, JSON.stringify(state.defeatedEnemies)),
        AsyncStorage.setItem(`purchasedSkins_${user.id}`, JSON.stringify(state.purchasedSkins)),
        AsyncStorage.setItem(`purchasedSkills_${user.id}`, JSON.stringify(state.purchasedSkills)),
        AsyncStorage.setItem(`equippedSkills_${user.id}`, JSON.stringify(state.equippedSkills)),
        AsyncStorage.setItem(`todayReps_${user.id}`, JSON.stringify(state.todayReps || { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 })),
        state.equippedSkin 
          ? AsyncStorage.setItem(`equippedSkin_${user.id}`, state.equippedSkin)
          : AsyncStorage.removeItem(`equippedSkin_${user.id}`),
        state.lastEnduranceDate
          ? AsyncStorage.setItem(`lastEnduranceDate_${user.id}`, state.lastEnduranceDate)
          : Promise.resolve()
      ]);
      
      // Sync to user_metadata (with timeout)
      const updateUserPromise = supabase.auth.updateUser({
        data: {
          purchasedSkins: state.purchasedSkins,
          equippedSkin: state.equippedSkin || null,
          purchasedSkills: state.purchasedSkills,
          equippedSkills: state.equippedSkills,
          claimed_level_rewards: state.claimedLevelRewards
        }
      });
      
      // Set timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase auth update timeout')), 10000)
      );
      
      try {
        await Promise.race([updateUserPromise, timeoutPromise]);
      } catch (authErr) {
        console.warn('Auth metadata sync warning:', authErr);
        // Don't fail the whole sync just because metadata update failed
      }

      // Sync to profiles table
      const profilesPromise = supabase.from('profiles').upsert({
        id: user.id,
        name: state.name,
        level: state.level,
        exp: state.xp,
        str: state.stats.strength,
        agi: state.stats.agility,
        sta: state.stats.stamina,
        battles: state.totalBattles,
        victories: state.victories,
        total_reps: state.totalReps,
        coins: state.coins,
        current_streak: state.currentStreak,
        last_active_date: state.lastActiveDate,
        claimed_level_rewards: state.claimedLevelRewards,
        birthday: state.birthday,
        sex: state.sex,
        height_cm: state.height_cm,
        weight_kg: state.weight_kg,
      });
      
      const profileTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase profiles update timeout')), 10000)
      );
      
      try {
        await Promise.race([profilesPromise, profileTimeoutPromise]);
      } catch (profileErr) {
        console.warn('Profile sync warning:', profileErr);
      }
    } catch (err) {
      console.error('syncProfile error:', err);
    }
  },
}));

export const selectXpProgress = (state: GameStore) => {
  const { xp, level } = state.avatar;
  if (level >= MAX_LEVEL) return 1;
  const base = XP_TABLE[level];
  const next = XP_TABLE[level + 1];
  return (xp - base) / (next - base);
};

export const selectHpPercent = (state: GameStore) => {
  if (!state.battle) return 1;
  return state.battle.enemyHpRemaining / state.battle.enemy.hp;
};