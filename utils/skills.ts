/**
 * Passive Skill System
 * Skills become available at certain levels, purchased with coins, and equipped for battles.
 */

export type SkillCategory = 'combat' | 'scaling' | 'utility' | 'economy';
export type SkillId = 
  | 'adrenaline_rush'
  | 'heavy_strike'
  | 'second_wind'
  | 'form_mastery'
  | 'loot_scavenger'
  | 'iron_lungs';

export interface PassiveSkill {
  id: SkillId;
  name: string;
  description: string;
  category: SkillCategory;
  icon: string;
  unlockLevel: number;
  purchaseCost: number;
  mechanics: SkillMechanics;
}

export interface SkillMechanics {
  // Adrenaline Rush
  adrenalineRushWindow?: number; // milliseconds (15s)
  adrenalineRushReps?: number; // 5 reps
  adrenalineRushMultiplier?: number; // 1.5x

  // Heavy Strike
  heavyStrikeCadence?: number; // every 5th rep

  // Second Wind
  secondWindTimeThreshold?: number; // <5 seconds
  secondWindBonus?: number; // +10 seconds

  // Form Mastery
  formMasteryDuration?: number; // >2 seconds per rep
  formMasteryMultiplier?: number; // 1.5x XP

  // Loot Scavenger
  lootScavengerChance?: number; // 0.2 (20%)
  lootScavengerMultiplier?: number; // 2x

  // Iron Lungs
  ironLungsInactivityBase?: number; // default 7 seconds
  ironLungsInactivityExtended?: number; // 10 seconds
}

/**
 * Runtime state of active skills during a battle
 */
export interface SkillState {
  equippedSkills: SkillId[];
  
  // Adrenaline Rush tracking
  adrenalineActive: boolean;
  lastRepTimestamp: number | null;
  repsInWindow: number;
  windowStartTime: number | null;
  
  // Heavy Strike tracking
  consecutiveReps: number;
  
  // Second Wind tracking
  secondWindUsed: boolean;
  
  // Form Mastery tracking
  lastRepDuration: number | null;
  formMasteryActive: boolean;
  
  // Iron Lungs tracking
  inactivityTimer: number;
}

/**
 * Complete skill catalog with mechanics
 */
export const PASSIVE_SKILLS: Record<SkillId, PassiveSkill> = {
  adrenaline_rush: {
    id: 'adrenaline_rush',
    name: 'Adrenaline Rush',
    description: 'Complete 5 reps in under 15 seconds to gain a momentum buff: 1.5x XP multiplier for the rest of the battle.',
    category: 'combat',
    icon: '⚡',
    unlockLevel: 5,
    purchaseCost: 200,
    mechanics: {
      adrenalineRushWindow: 15000,
      adrenalineRushReps: 5,
      adrenalineRushMultiplier: 1.5,
    },
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description: 'Every 5th consecutive rep counts as a Critical Hit, dealing double damage to the enemy\'s HP.',
    category: 'combat',
    icon: '💥',
    unlockLevel: 10,
    purchaseCost: 300,
    mechanics: {
      heavyStrikeCadence: 5,
    },
  },
  second_wind: {
    id: 'second_wind',
    name: 'Second Wind',
    description: 'Once per battle, if the timer drops below 5 seconds and the enemy is not defeated, automatically add 10 seconds to the clock.',
    category: 'scaling',
    icon: '💨',
    unlockLevel: 15,
    purchaseCost: 400,
    mechanics: {
      secondWindTimeThreshold: 5,
      secondWindBonus: 10,
    },
  },
  form_mastery: {
    id: 'form_mastery',
    name: 'Form Mastery',
    description: 'Reps performed with slow, controlled cadence (>2 seconds) award a 1.5x XP bonus.',
    category: 'utility',
    icon: '🎯',
    unlockLevel: 8,
    purchaseCost: 250,
    mechanics: {
      formMasteryDuration: 2000,
      formMasteryMultiplier: 1.5,
    },
  },
  loot_scavenger: {
    id: 'loot_scavenger',
    name: 'Loot Scavenger',
    description: 'Grants a 20% chance to double the coin reward upon defeating an enemy.',
    category: 'economy',
    icon: '💰',
    unlockLevel: 12,
    purchaseCost: 350,
    mechanics: {
      lootScavengerChance: 0.2,
      lootScavengerMultiplier: 2,
    },
  },
  iron_lungs: {
    id: 'iron_lungs',
    name: 'Iron Lungs',
    description: 'Increases the inactivity failure timer during Endurance Boss battles from 7 to 10 seconds.',
    category: 'utility',
    icon: '🫁',
    unlockLevel: 20,
    purchaseCost: 500,
    mechanics: {
      ironLungsInactivityBase: 7,
      ironLungsInactivityExtended: 10,
    },
  },
};

/**
 * Helper to get all skills, filtered by availability
 */
export function getAvailableSkills(playerLevel: number): SkillId[] {
  return Object.keys(PASSIVE_SKILLS)
    .filter((skillId) => {
      const skill = PASSIVE_SKILLS[skillId as SkillId];
      return skill.unlockLevel <= playerLevel;
    })
    .map((skillId) => skillId as SkillId);
}

/**
 * Helper to get skill detail
 */
export function getSkill(skillId: SkillId): PassiveSkill {
  return PASSIVE_SKILLS[skillId];
}
