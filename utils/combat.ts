import { Enemy, StatKey } from '@/constants/game';
import { PlayerStats } from '@/store/gameStore';

/**
 * DAMAGE CALCULATION SYSTEM
 * 
 * Player damage scales with stats:
 * - Strength increases raw damage per rep
 * - Agility increases critical hit chance/damage
 * - Stamina affects fatigue (for future use, currently damage-neutral)
 * 
 * Base damage = 10 (represents a "standard" rep)
 * Every 5 points in Strength adds +1 damage
 * Every 10 points in Agility adds +0.5 damage
 */

export function calculatePlayerDamage(stats: PlayerStats): number {
  const baseDamage = 10;
  const strengthBonus = stats.strength * 0.2; // 5 strength = +1 damage
  const agilityBonus = stats.agility * 0.05;  // 20 agility = +1 damage
  
  return Math.max(baseDamage, Math.floor(baseDamage + strengthBonus + agilityBonus));
}

/**
 * ENEMY HEALTH CALCULATION
 * 
 * Health scales based on:
 * 1. Difficulty tier (base HP)
 * 2. Exercise type (some exercises harder than others)
 * 3. Player level (to prevent over-leveling trivialization)
 * 
 * Pull-ups are hardest (1.2x), Squats/Push-ups medium (1.0x), Sit-ups easiest (0.9x)
 * Every player level adds 5% more health to the enemy
 */

const DIFFICULTY_BASE_HP = {
  1: 150,    // Difficulty 1: ~15-20 reps for avg stats
  2: 300,    // Difficulty 2: ~25-30 reps
  3: 500,    // Difficulty 3: ~40-50 reps
  4: 750,    // Difficulty 4: ~60-75 reps
  5: 1200,   // Difficulty 5: ~100-120 reps
};

const EXERCISE_HP_MULTIPLIERS = {
  'push_up': 1.0,
  'squat': 1.0,
  'sit_up': 0.9,
  'pull_up': 1.2,
};

export function calculateEnemyHealth(enemy: Enemy, playerLevel: number): number {
  const baseHp = DIFFICULTY_BASE_HP[enemy.difficulty] || 300;
  const exerciseMultiplier = EXERCISE_HP_MULTIPLIERS[enemy.exercise] || 1.0;
  
  // Scale with player level: +5% per level above 1
  const levelMultiplier = 1 + (0.05 * Math.max(0, playerLevel - 1));
  
  const totalHp = Math.floor(baseHp * exerciseMultiplier * levelMultiplier);
  
  return Math.max(100, totalHp); // Never less than 100 HP
}

/**
 * XP CALCULATION
 * 
 * XP scales inversely with difficulty to prevent farming weak enemies.
 * Harder enemies reward more XP per rep, but require more reps to defeat.
 * 
 * Formula: xpPerRep = (difficulty * 50) + 25
 * - Diff 1: 75 XP/rep → 5 reps = 375 total (but can gain ~150-200 from multipliers)
 * - Diff 2: 125 XP/rep
 * - Diff 3: 175 XP/rep
 * - Diff 4: 225 XP/rep
 * - Diff 5: 275 XP/rep
 * 
 * Daily multiplier caps:
 * - 1st defeat: 1.0x
 * - 2nd+ defeats same day: 0.5x (after defeating 2 times)
 * - 3+ defeats same week: 0.25x (after defeating 3 times)
 */

const XP_PER_REP_BASE = {
  1: 25,
  2: 50,
  3: 100,
  4: 180,
  5: 300,
};

export function calculateXpReward(
  enemy: Enemy,
  repsCompleted: number,
  timesDefeatedToday: number = 0
): number {
  const baseXpPerRep = XP_PER_REP_BASE[enemy.difficulty] || 50;
  let totalXp = baseXpPerRep * repsCompleted;
  
  // Apply daily multiplier caps
  let multiplier = 1.0;
  if (timesDefeatedToday >= 2) {
    multiplier = 0.5; // 2nd+ defeat same day
  }
  if (timesDefeatedToday >= 3) {
    multiplier = 0.25; // 3rd+ defeat (weekly cap)
  }
  
  return Math.floor(totalXp * multiplier);
}

/**
 * COIN CALCULATION
 * 
 * Base coins = 25 * difficulty
 * No multipliers, coins are limited resource for skill purchases
 */

export function calculateCoinReward(enemy: Enemy): number {
  return 25 * enemy.difficulty;
}

/**
 * ESTIMATED REPS TO VICTORY
 * 
 * Used for UI display: "~X reps until victory"
 * Calculation: enemyHealth / averageDamagePerRep
 */

export function estimateRepsToVictory(stats: PlayerStats, enemy: Enemy, playerLevel: number): number {
  const damage = calculatePlayerDamage(stats);
  const health = calculateEnemyHealth(enemy, playerLevel);
  
  return Math.ceil(health / damage);
}
