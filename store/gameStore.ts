import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { Enemy, StatKey, XP_TABLE, MAX_LEVEL } from '@/constants/game';

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
  stats: PlayerStats;
  defeatedEnemies: string[];
  totalReps: number;
  totalBattles: number;
  victories: number;
}

export interface ActiveBattle {
  enemy: Enemy;
  repsCompleted: number;
  enemyHpRemaining: number;
  secondsRemaining: number;
  phase: 'idle' | 'countdown' | 'active' | 'victory' | 'defeat';
  lastRepAt: number | null;
}

interface GameStore {
  avatar: AvatarState;
  battle: ActiveBattle | null;
  profileNeedsName: boolean;

  // Avatar actions
  gainXp: (amount: number) => void;
  boostStats: (boosts: Partial<PlayerStats>) => void;
  recordBattle: (won: boolean, reps: number, enemyId: string) => void;

  // Battle actions
  startBattle: (enemy: Enemy) => void;
  setBattleActive: () => void; // <--- NEW: Unlocks the game logic!
  registerRep: () => void;
  tickTimer: () => void;
  resolveBattle: (outcome: 'victory' | 'defeat') => void;
  resetBattle: () => void;
  resetAvatar: () => void;
  setAvatar: (avatarData: Partial<AvatarState>) => void;
  loadProfile: () => Promise<boolean>;
  syncProfile: () => Promise<void>;
  setProfileNeedsName: (need: boolean) => void;
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
    stats: { strength: 10, agility: 10, stamina: 10 },
    defeatedEnemies: [],
    totalReps: 0,
    totalBattles: 0,
    victories: 0,
  },
  profileNeedsName: false,
  battle: null,

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

  recordBattle: (won, reps, enemyId) => set((state) => ({
    avatar: {
      ...state.avatar,
      totalReps: state.avatar.totalReps + reps,
      totalBattles: state.avatar.totalBattles + 1,
      victories: state.avatar.victories + (won ? 1 : 0),
      defeatedEnemies: won
        ? [...state.avatar.defeatedEnemies, enemyId]
        : state.avatar.defeatedEnemies,
    },
  })),

  startBattle: (enemy) => set({
    battle: {
      enemy,
      repsCompleted: 0,
      enemyHpRemaining: enemy.hp,
      secondsRemaining: enemy.timeLimit,
      phase: 'countdown',
      lastRepAt: null,
    },
  }),

  // ── NEW: Tells the global store the countdown is over ──
  setBattleActive: () => set((state) => {
    if (!state.battle) return state;
    return { battle: { ...state.battle, phase: 'active' } };
  }),

  registerRep: () => set((state) => {
    // If phase isn't 'active', this block previously rejected your push-ups!
    if (!state.battle || state.battle.phase !== 'active') return state; 

    const hpPerRep = state.battle.enemy.hp / state.battle.enemy.repsRequired;
    const newReps = state.battle.repsCompleted + 1;
    const newHp = Math.max(0, state.battle.enemyHpRemaining - hpPerRep);
    const now = Date.now();

    if (newReps >= state.battle.enemy.repsRequired) {
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
      return { battle: { ...state.battle, secondsRemaining: 0, phase: 'defeat' } };
    }
    return { battle: { ...state.battle, secondsRemaining: newSecs } };
  }),

  resolveBattle: (outcome) => {
    const { battle, gainXp, boostStats, recordBattle } = get();
    if (!battle) return;
    if (outcome === 'victory') {
      gainXp(battle.enemy.xpReward);
      boostStats(battle.enemy.statBoosts as Partial<PlayerStats>);
    }
    recordBattle(
      outcome === 'victory',
      battle.repsCompleted,
      battle.enemy.id,
    );
    // Persist the latest avatar stats to Supabase in the background
    get().syncProfile().catch(() => {});
  },

  resetBattle: () => set({ battle: null }),
  resetAvatar: () => set({ avatar: { name: 'Aethor', class: 'Iron Aspirant', level: 1, xp: 0, stats: { strength: 0, agility: 0, stamina: 0 }, defeatedEnemies: [], totalReps: 0, totalBattles: 0, victories: 0 } }),
  setAvatar: (avatarData) => set((state) => ({ avatar: { ...state.avatar, ...avatarData } })),
  setProfileNeedsName: (need) => set({ profileNeedsName: need }),

  loadProfile: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      set({ profileNeedsName: true });
      return true;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error || !data) {
      set({ profileNeedsName: true });
      return true;
    }
    const emailPrefix = user.email?.split('@')[0] ?? '';
    const needsName = !data.name || data.name.trim().length === 0 || data.name === emailPrefix;
    set((state) => ({
      avatar: {
        ...state.avatar,
        name: data.name ?? state.avatar.name,
        level: data.level ?? 1,
        xp: data.exp ?? 0,
        stats: {
          strength: data.str ?? 0,
          agility: data.agi ?? 0,
          stamina: data.sta ?? 0,
        },
        totalReps: data.total_reps ?? 0,
        totalBattles: data.battles ?? 0,
        victories: data.victories ?? 0,
      },
      profileNeedsName: needsName,
    }));
    return needsName;
  },

  syncProfile: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const state = get().avatar;
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