import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { Enemy, ExerciseType, StatKey, XP_TABLE, MAX_LEVEL } from '@/constants/game';
import {
  InventoryRow, CatalogItem, fetchStoreCatalog,
  fetchInventory, purchaseItem as dbPurchaseItem, consumeItem,
} from '@/utils/inventory';

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
  enemyHpRemaining: number;
  secondsRemaining: number;
  phase: 'idle' | 'countdown' | 'active' | 'victory' | 'defeat';
  lastRepAt: number | null;
  // item effects active in this battle
  effectiveReps: number;        // may be lower than enemy.repsRequired (Elixir)
  activeEffect: CatalogItem | null;  // for display & XP multiplier
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
  equipSkin: (skinId: string | null) => void;
  queueItemEffect: (effect: CatalogItem) => void;
  clearPendingEffect: () => void;
  consumeQueuedItem: (itemId: string) => Promise<void>;
  useItemFromInventory: (item: CatalogItem) => Promise<{ success: boolean; error?: string }>;

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
    await AsyncStorage.setItem(`claimedLevelRewards_${userId}`, JSON.stringify(newState));
    
    get().syncProfile().catch(() => {});
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
    
    newTodayReps[enemy.exercise] = (newTodayReps[enemy.exercise] ?? 0) + reps;

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

  equipSkin: (skinId) => {
    set((state) => ({
      avatar: { ...state.avatar, equippedSkin: skinId }
    }));
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
    
    // STARTING PASSIVE BUFFS:
    // 1. STR (Strength) = -1 Rep Required for every 10 points (to a minimum of 1 rep)
    const strengthBonusReps = Math.floor(state.avatar.stats.strength / 10);
    let effectiveReps = Math.max(1, enemy.repsRequired - strengthBonusReps);
    
    // 2. STA (Stamina) = +1 Second to the timer per point in Stamina
    let extraSeconds  = state.avatar.stats.stamina;

    if (pendingEffect) {
      if (pendingEffect.item_type === 'potion') {
        // Potions reduce required reps by their effect_value
        effectiveReps = Math.max(1, effectiveReps - pendingEffect.effect_value);
      }
      // Note: 'exp_boost' and 'streak_restore' are handled elsewhere.
    }

    set({
      battle: {
        enemy,
        repsCompleted: 0,
        enemyHpRemaining: enemy.hp,
        secondsRemaining: enemy.timeLimit + extraSeconds,
        phase: 'countdown',
        lastRepAt: null,
        effectiveReps,
        activeEffect: pendingEffect,
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

    const repsNeeded = state.battle.effectiveReps;
    const hpPerRep = state.battle.enemy.hp / repsNeeded;
    const newReps = state.battle.repsCompleted + 1;
    const newHp = Math.max(0, state.battle.enemyHpRemaining - hpPerRep);
    const now = Date.now();

    if (newReps >= repsNeeded) {
      return {
        battle: {
          ...state.battle,
          repsCompleted: newReps,
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

    if (data.last_active_date !== todayStr) {
      loadedDefeatedEnemies = [];
    }

    const storedClaimedLevelsStr = await AsyncStorage.getItem(`claimedLevelRewards_${user.id}`);
    const loadedClaimedLevels = storedClaimedLevelsStr ? JSON.parse(storedClaimedLevelsStr) : [];

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
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const state = get().avatar;
    
    // Save daily progression state locally
    await AsyncStorage.setItem(`defeatedEnemies_${user.id}`, JSON.stringify(state.defeatedEnemies));
    await AsyncStorage.setItem(`purchasedSkins_${user.id}`, JSON.stringify(state.purchasedSkins));
    await AsyncStorage.setItem(`todayReps_${user.id}`, JSON.stringify(state.todayReps || { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 }));
    
    if (state.equippedSkin) {
      await AsyncStorage.setItem(`equippedSkin_${user.id}`, state.equippedSkin);
    } else {
      await AsyncStorage.removeItem(`equippedSkin_${user.id}`);
    }

    if (state.lastEnduranceDate) {
      await AsyncStorage.setItem(`lastEnduranceDate_${user.id}`, state.lastEnduranceDate);
    }
    
    // Sync to user_metadata
    await supabase.auth.updateUser({
      data: {
        purchasedSkins: state.purchasedSkins,
        equippedSkin: state.equippedSkin || null
      }
    });

    await supabase.from('profiles').upsert({
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
      birthday: state.birthday,
      sex: state.sex,
      height_cm: state.height_cm,
      weight_kg: state.weight_kg,
    });
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