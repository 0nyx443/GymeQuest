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
  coins: number;           // Earned by defeating enemies
  currentStreak: number;   // Current daily workout streak
  lastActiveDate: string | null; // The ISO string date of last workout
  lastEnduranceDate: string | null; // The ISO string date of last endurance boss battle
  lastDailyBountyDate: string | null; // Daily Bounty cooldown tracker
  claimedLevelRewards: number[]; // Levels for which rewards have been claimed
  stats: PlayerStats;
  defeatedEnemies: string[];
  purchasedSkins: string[];
  equippedSkin: string | null;
  purchasedSkills: string[];
  equippedSkills: string[];
  dailyPurchases: { date: string; counts: Record<string, number> };
  weeklyPurchases: { weekStart: string; counts: Record<string, number> };
  totalReps: number;
  totalRepsByExercise: { push_up: number; squat: number; sit_up: number; pull_up: number };
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
  totalDamageDealt: number;  // Total damage dealt instead of reps
  damagePerRep: number;       // Damage multiplier based on stats
  enemyHpRemaining: number;
  secondsRemaining: number;
  phase: 'idle' | 'countdown' | 'active' | 'victory' | 'defeat';
  lastRepAt: number | null;
  // item effects active in this battle
  effectiveReps: number;        // may be lower than enemy.repsRequired (Elixir)
  activeEffect: CatalogItem | null;  // for display & XP multiplier
  triggeredSkills: string[];    // Skills triggered this battle
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
  recordBattle: (won: boolean, reps: number, enemy: Enemy, shieldActive?: boolean) => AvatarState;

  // Item actions
  loadInventory: () => Promise<void>;
  purchaseItem: (item: CatalogItem, quantity?: number) => Promise<{ success: boolean; error?: string }>;
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
  resolveBattle: (outcome: 'victory' | 'defeat') => Promise<void>;
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
function calculateDamagePerRep(stats?: PlayerStats): number {
  if (!stats) return 10;
  const statSum = Number(stats.strength || 0) + Number(stats.agility || 0) + Number(stats.stamina || 0);
  return 10 * (1 + statSum / 100);
}

function calculateStatGains(totalRepsByExercise: { push_up: number; squat: number; sit_up: number; pull_up: number }, victories: number, level: number): PlayerStats {
  const pushUpReps = Number(totalRepsByExercise.push_up) || 0;
  const pullUpReps = Number(totalRepsByExercise.pull_up) || 0;
  const squatReps = Number(totalRepsByExercise.squat) || 0;
  const sitUpReps = Number(totalRepsByExercise.sit_up) || 0;

  const milestones = [10, 25, 50, 100, 150, 200, 250, 300];
  const milestoneBonus = (n: number) => 2 * milestones.filter(m => m <= n).length;

  const str = 10 + Math.floor(level / 5) + Math.floor((pushUpReps + pullUpReps) / 10) + milestoneBonus(pushUpReps + pullUpReps);
  const agi = 10 + Math.floor(level / 5) + Math.floor(squatReps / 10) + milestoneBonus(squatReps);
  const sta = 10 + Math.floor(level / 5) + Math.floor(sitUpReps / 10) + victories + milestoneBonus(sitUpReps);

  return { strength: str, agility: agi, stamina: sta };
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
    lastDailyBountyDate: null,
    claimedLevelRewards: [],
    stats: { strength: 10, agility: 10, stamina: 10 },
    defeatedEnemies: [],
    purchasedSkins: [],
    equippedSkin: null,
    purchasedSkills: [],
    equippedSkills: [],
    dailyPurchases: { date: '', counts: {} },
    weeklyPurchases: { weekStart: '', counts: {} },
    totalReps: 0,
    totalRepsByExercise: { push_up: 0, squat: 0, sit_up: 0, pull_up: 0 },
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

  recordBattle: (won, reps, enemy, shieldActive) => {
    const state = get();
    let { currentStreak, coins, lastActiveDate, stats } = state.avatar;
    let newDefeatedEnemies = state.avatar.defeatedEnemies;
    const didExercise = reps > 0;
    
    // Add coins (base enemy reward + 1 per rep if won, else just partial reps)
    let coinDrop = 0;
    if (didExercise) {
      coinDrop = won
        ? Math.round((enemy.coinReward + reps) * (1 + state.avatar.level * 0.08))
        : Math.floor(reps / 2);
    }
    coins += coinDrop;
    
    // Manage Streak
    const todayStr = new Date().toISOString().split('T')[0];
    if (didExercise && lastActiveDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActiveDate === yesterdayStr || shieldActive) {
        currentStreak += 1;
      } else if (!lastActiveDate) {
        currentStreak = 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }
      lastActiveDate = todayStr;
      
      // Clear defeated enemies for the new day so the Daily Bounty resets
      newDefeatedEnemies = [];
    }

    let lastEnduranceDate = state.avatar.lastEnduranceDate;
    if (enemy.isEndurance && won && didExercise) {
      lastEnduranceDate = todayStr;
    }

    const prevTodayReps = state.avatar.todayReps || { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    let newTodayReps = { ...prevTodayReps };
    if (newTodayReps.date !== todayStr) {
      newTodayReps = { date: todayStr, push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    }
    
    if (didExercise) {
      newTodayReps[enemy.exercise] += reps;
    }

    const newTotalRepsByEx = { ...state.avatar.totalRepsByExercise };
    if (didExercise) {
      newTotalRepsByEx[enemy.exercise] = (newTotalRepsByEx[enemy.exercise] || 0) + reps;
    }

    // Use a background async call to save it to AsyncStorage
    supabase.auth.getUser().then(({ data: userData }) => {
      const uId = userData?.user?.id || 'guest';
      AsyncStorage.setItem(`totalRepsByExercise_${uId}`, JSON.stringify(newTotalRepsByEx)).catch(() => {});
    });

    return {
        ...state.avatar,
        coins,
        currentStreak,
        lastActiveDate,
        lastEnduranceDate,
        lastDailyBountyDate: (won && didExercise && enemy.id.startsWith('daily_bounty_'))
          ? todayStr
          : state.avatar.lastDailyBountyDate,
        totalReps: state.avatar.totalReps + (didExercise ? reps : 0),
        totalRepsByExercise: newTotalRepsByEx,
        todayReps: newTodayReps,
        totalBattles: state.avatar.totalBattles + 1,
        victories: state.avatar.victories + (won && didExercise ? 1 : 0),
        defeatedEnemies: won && didExercise && !newDefeatedEnemies.includes(enemy.id)
          ? [...newDefeatedEnemies, enemy.id]
          : newDefeatedEnemies,
    };
  },

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

  purchaseItem: async (item, quantity = 1) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not logged in' };
    const currentCoins = get().avatar.coins;
    
    // Check limits
    const todayStr = new Date().toISOString().split('T')[0];
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay());
    const weekStartStr = d.toISOString().split('T')[0];
    const stateDaily = get().avatar.dailyPurchases;
    const stateWeekly = get().avatar.weeklyPurchases;
    
    let dailyKey = stateDaily.date === todayStr ? stateDaily : { date: todayStr, counts: {} };
    let weeklyKey = stateWeekly.weekStart === weekStartStr ? stateWeekly : { weekStart: weekStartStr, counts: {} };

    const dailyCount = dailyKey.counts[item.id] || 0;
    const weeklyCount = weeklyKey.counts[item.id] || 0;
    const itemName = item.name.toLowerCase();

    if (itemName.includes('small potion') && dailyCount + quantity > 5) {
      return { success: false, error: `Daily limit reached (5/5). You can't buy ${quantity} more.` };
    }
    if (itemName.includes('double exp') && dailyCount + quantity > 2) {
      return { success: false, error: `Daily limit reached (2/2). You can't buy ${quantity} more.` };
    }
    if (itemName.includes('large potion') && dailyCount + quantity > 3) {
      return { success: false, error: `Daily limit reached (3/3). You can't buy ${quantity} more.` };
    }
    if (itemName.includes('streak saver') && weeklyCount + quantity > 1) {
      return { success: false, error: `Weekly limit reached (1/1). You can't buy ${quantity} more.` };
    }

    const result = await dbPurchaseItem(userData.user.id, item, currentCoins, quantity);
    if (result.success) {
      const newDailyCounts = { ...dailyKey.counts, [item.id]: dailyCount + quantity };
      const newWeeklyCounts = { ...weeklyKey.counts, [item.id]: weeklyCount + quantity };

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
          avatar: { 
            ...state.avatar, 
            coins: result.newCoins,
            dailyPurchases: { date: todayStr, counts: newDailyCounts },
            weeklyPurchases: { weekStart: weekStartStr, counts: newWeeklyCounts }
          },
          inventory: (() => {
            const existing = state.inventory.find((r) => r.item_id === item.id);
            if (existing) {
              return state.inventory.map((r) =>
                r.item_id === item.id ? { ...r, quantity: r.quantity + quantity } : r
              );
            }
            return [...state.inventory, { item_id: item.id, quantity }];
          })(),
        }));
        get().syncProfile();
      }
    }
    return { success: result.success, error: result.error };
  },

  purchaseSkill: async (skillId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not logged in' };
    
    const skill = PASSIVE_SKILLS[skillId as keyof typeof PASSIVE_SKILLS];
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
    let effectiveReps = enemy.repsRequired;
    
    // 2. STA (Stamina) = +1 Second to the timer per point in Stamina
    let extraSeconds = 0;
    
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
    
    let { totalDamageDealt, secondsRemaining, enemyHpRemaining } = state.battle;
    if (effect.item_type === 'potion') {
      // Potions deal direct damage (effect_value * 10 damage)
      const damage = effect.effect_value * 10;
      totalDamageDealt += damage;
      // Leave at least 1 HP so the player has to do at least 1 rep to win
      enemyHpRemaining = Math.max(1, state.battle.enemy.health - totalDamageDealt);
    }
    
    return {
      battle: {
        ...state.battle,
        totalDamageDealt,
        enemyHpRemaining,
        secondsRemaining,
        activeEffect: effect,
      }
    };
  }),

  // ──: Tells the global store the countdown is over ──
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

    resolveBattle: async (outcome) => {
    const { battle } = get();
    if (!battle) return;

    // Step 1: set phase immediately for UI
    set((state) => ({
      battle: state.battle ? { ...state.battle, phase: outcome } : null
    }));

    // Step 2: compute all derived values from the current snapshot
    const currentAvatar = get().avatar;
    const shieldActive = battle.activeEffect?.item_type === 'streak_restore';
    const didExercise = battle.repsCompleted > 0;
    const eligibleVictory = outcome === 'victory' && didExercise;

    // Step 3: run recordBattle to get the new avatar base (streak, coins, reps, defeatedEnemies)
    const newAvatarState = get().recordBattle(
      eligibleVictory,
      battle.repsCompleted,
      battle.enemy,
      shieldActive
    );

    // Step 4: compute XP gain on top
    let finalXp = 0;
    if (eligibleVictory) {
      finalXp = battle.enemy.isEndurance
        ? Math.round(battle.repsCompleted * (20 + currentAvatar.level * 1.5))
        : battle.enemy.xpReward;

      if (battle.activeEffect?.item_type === 'exp_boost') {
        finalXp = Math.round(finalXp * battle.activeEffect.effect_value);
      }

      const equippedSkills = currentAvatar.equippedSkills;
      if (equippedSkills.includes('adrenaline_rush')) {
        const battleDuration = battle.enemy.timeLimit - battle.secondsRemaining;
        if (battle.repsCompleted >= 5 && battleDuration < 15) {
          finalXp = Math.round(finalXp * 1.5);
        }
      }
    }

    // Step 5: compute new XP + level from the newAvatarState base (not currentAvatar)
    let newXp = newAvatarState.xp + finalXp;
    let newLevel = newAvatarState.level;
    while (newLevel < MAX_LEVEL && newXp >= XP_TABLE[newLevel + 1]) {
      newLevel += 1;
    }

    // Step 6: recalculate stats based on final level and reps
    const newStats = eligibleVictory
      ? calculateStatGains(newAvatarState.totalRepsByExercise, newAvatarState.victories, newLevel)
      : newAvatarState.stats;

    // Step 7: single atomic set — no overwrites
    set({
      avatar: {
        ...newAvatarState,
        xp: newXp,
        level: newLevel,
        stats: newStats,
      }
    });

    // Step 8: flush then sync
    await new Promise(resolve => setTimeout(resolve, 0));
    await get().syncProfile().catch(() => {});
  },

  resetBattle: () => set({ battle: null }),
  resetAvatar: () => set({ avatar: { name: 'Aethor', class: 'Iron Aspirant', level: 1, xp: 0, coins: 0, currentStreak: 0, lastActiveDate: null, lastEnduranceDate: null, lastDailyBountyDate: null, claimedLevelRewards: [], stats: { strength: 0, agility: 0, stamina: 0 }, defeatedEnemies: [], totalReps: 0, totalRepsByExercise: { push_up: 0, squat: 0, sit_up: 0, pull_up: 0 }, todayReps: { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 }, totalBattles: 0, victories: 0, purchasedSkins: [], equippedSkin: null, equippedSkills: [], purchasedSkills: [], dailyPurchases: { date: '', counts: {} }, weeklyPurchases: { weekStart: '', counts: {} } } }),
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
        // Base 75 for guests since they have no streak state tracked locally yet
        rewardAmount = 75;
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

    const storedDailyBounty = await AsyncStorage.getItem(`lastDailyBountyDate_${user.id}`);
    let loadedDailyBounty = data.last_daily_bounty_date ?? storedDailyBounty ?? null;

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
    let loadedEquippedSkills = Array.from(new Set(meta.equippedSkills as string[]));
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

    const storedDailyPurchasesStr = await AsyncStorage.getItem(`dailyPurchases_${user.id}`);
    let loadedDailyPurchases = storedDailyPurchasesStr ? JSON.parse(storedDailyPurchasesStr) : { date: todayStr, counts: {} };
    if (loadedDailyPurchases.date !== todayStr) {
      loadedDailyPurchases = { date: todayStr, counts: {} };
    }

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // Sunday start
    const weekStartStr = d.toISOString().split('T')[0];

    const storedWeeklyPurchasesStr = await AsyncStorage.getItem(`weeklyPurchases_${user.id}`);
    let loadedWeeklyPurchases = storedWeeklyPurchasesStr ? JSON.parse(storedWeeklyPurchasesStr) : { weekStart: weekStartStr, counts: {} };
    if (loadedWeeklyPurchases.weekStart !== weekStartStr) {
      loadedWeeklyPurchases = { weekStart: weekStartStr, counts: {} };
    }

    const storedTodayRepsStr = await AsyncStorage.getItem(`todayReps_${user.id}`);
    let loadedTodayReps = storedTodayRepsStr ? JSON.parse(storedTodayRepsStr) : { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    if (loadedTodayReps.date !== todayStr) {
      loadedTodayReps = { date: todayStr, push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };
    }

    const storedTotalRepsByExerciseStr = await AsyncStorage.getItem(`totalRepsByExercise_${user.id}`);
    let loadedTotalRepsByEx = storedTotalRepsByExerciseStr ? JSON.parse(storedTotalRepsByExerciseStr) : { push_up: 0, squat: 0, sit_up: 0, pull_up: 0 };

    // Daily Login Reward Check
    const lastLoginReward = await AsyncStorage.getItem(`lastLoginReward_${user.id}`);
    let showReward = false;
    let rewardAmount = 0;
    if (lastLoginReward !== todayStr) {
      showReward = true;
      // Base 75 + 15 for every day in streak, capped at 500
      rewardAmount = Math.min(500, 75 + ((data.current_streak ?? 0) * 15));
    }

    // Auto-correct level based on loaded XP
    let loadedXp = data.exp ?? 0;
    let actualLevel = data.level ?? 1;
    let needsSync = false;
    while (actualLevel < MAX_LEVEL && loadedXp >= XP_TABLE[actualLevel + 1]) {
      actualLevel += 1;
      needsSync = true;
    }

    // Recompute stats
    const recomputedStats = calculateStatGains(loadedTotalRepsByEx, data.victories ?? 0, actualLevel);

    set((state) => ({
      avatar: {
        ...state.avatar,
        name: data.name ?? state.avatar.name,
        level: actualLevel,
        xp: loadedXp,
        stats: recomputedStats,
        totalReps: data.total_reps ?? 0,
        totalRepsByExercise: loadedTotalRepsByEx,
        todayReps: loadedTodayReps,
        totalBattles: data.battles ?? 0,
        victories: data.victories ?? 0,
        coins: data.coins ?? 0,
        currentStreak: data.current_streak ?? 0,
        lastActiveDate: data.last_active_date ?? null,
        lastEnduranceDate: loadedEnduranceDate,
        lastDailyBountyDate: loadedDailyBounty,
        claimedLevelRewards: loadedClaimedLevels,
        defeatedEnemies: loadedDefeatedEnemies,
        purchasedSkins: loadedSkins,
        equippedSkin: loadedEquippedSkin,
        purchasedSkills: loadedSkills,
        equippedSkills: loadedEquippedSkills,
        dailyPurchases: loadedDailyPurchases,
        weeklyPurchases: loadedWeeklyPurchases,
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
        AsyncStorage.setItem(`dailyPurchases_${user.id}`, JSON.stringify(state.dailyPurchases)),
        AsyncStorage.setItem(`weeklyPurchases_${user.id}`, JSON.stringify(state.weeklyPurchases)),
        AsyncStorage.setItem(`todayReps_${user.id}`, JSON.stringify(state.todayReps || { date: '', push_up: 0, squat: 0, sit_up: 0, pull_up: 0 })),
        state.equippedSkin 
          ? AsyncStorage.setItem(`equippedSkin_${user.id}`, state.equippedSkin)
          : AsyncStorage.removeItem(`equippedSkin_${user.id}`),
        state.lastEnduranceDate
          ? AsyncStorage.setItem(`lastEnduranceDate_${user.id}`, state.lastEnduranceDate)
          : Promise.resolve(),
        state.lastDailyBountyDate
          ? AsyncStorage.setItem(`lastDailyBountyDate_${user.id}`, state.lastDailyBountyDate)
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
        last_daily_bounty_date: state.lastDailyBountyDate,
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