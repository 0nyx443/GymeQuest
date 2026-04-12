export type ExerciseType = 'push_up' | 'squat' | 'sit_up' | 'pull_up';
export type StatKey = 'strength' | 'agility' | 'stamina';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Exercise {
  id: ExerciseType;
  label: string;
  emoji: string;
  // MediaPipe joint pairs used for angle calculation
  joints: [string, string, string][];   // [landmark_a, vertex, landmark_b]
  // Rep counted when angle crosses this threshold
  repAngleThreshold: number;
  // Validation: angle must ALSO exceed this to confirm full ROM
  fullRomAngle: number;
  description: string;
}

export const EXERCISES: Record<ExerciseType, Exercise> = {
  push_up: {
    id: 'push_up',
    label: 'Push-Up',
    emoji: '💪',
    joints: [
      ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
      ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
    ],
    repAngleThreshold: 90,
    fullRomAngle: 160,
    description: 'Get into plank position. Lower your chest to the floor, then push back up.',
  },
  squat: {
    id: 'squat',
    label: 'Squat',
    emoji: '🦵',
    joints: [
      ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'],
      ['RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE'],
    ],
    repAngleThreshold: 100,
    fullRomAngle: 160,
    description: 'Feet shoulder-width apart. Lower until thighs are parallel to the floor, then rise.',
  },
  sit_up: {
    id: 'sit_up',
    label: 'Sit-Up',
    emoji: '🔥',
    joints: [
      ['LEFT_SHOULDER', 'LEFT_HIP', 'LEFT_KNEE'],
    ],
    repAngleThreshold: 60,
    fullRomAngle: 150,
    description: 'Lie flat, hands behind head. Curl up until your elbows touch your knees.',
  },
  pull_up: {
    id: 'pull_up',
    label: 'Pull-Up',
    emoji: '⬆️',
    joints: [
      ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
      ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
    ],
    repAngleThreshold: 80,
    fullRomAngle: 165,
    description: 'Grip bar overhead. Pull your chin above the bar, then lower slowly.',
  },
};

export interface Enemy {
  id: string;
  name: string;
  title: string;
  hp: number;               // Legacy field, kept for reference
  health: number;           // NEW: Actual health in damage units
  exercise: ExerciseType;
  repsRequired: number;
  timeLimit: number;        // seconds
  xpReward: number;
  coinReward: number;       // Gold coins rewarded on victory
  statBoosts: Partial<Record<StatKey, number>>;
  difficulty: Difficulty;
  unlockLevel: number;      // Add this new required property
  lore: string;
  color: string;
  image?: any;              // Added to support dynamic images
  isEndurance?: boolean;    // NEW: Endurance mode flag
  phases?: { exercise: ExerciseType; reps: number }[]; // Ordered sequence of exercises for boss fights
}

// Health calculation formula: base health scales with difficulty
function calculateHealth(difficulty: Difficulty): number {
  const baseHealth = 150; // Base HP for difficulty 1
  return Math.round(baseHealth * Math.pow(difficulty, 1.5));
}

export const ENEMIES: Enemy[] = [
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    title: 'Forest Ambusher',
    hp: 100,
    health: 130,
    exercise: 'push_up',
    repsRequired: 5,
    timeLimit: 60,
    xpReward: 120,
    coinReward: 50,
    statBoosts: { strength: 2 },
    difficulty: 1,
    unlockLevel: 1,
    lore: 'A wiry creature haunting the Thornwood. Swift but fragile.',
    color: '#3D7A30',
    image: require('@/assets/images/goblin_scout.png'),
  },
  {
    id: 'iron_sentinel',
    name: 'Iron Sentinel',
    title: 'Gate Warden',
    hp: 250,
    health: 390,
    exercise: 'squat',
    repsRequired: 15,
    timeLimit: 90,
    xpReward: 280,
    coinReward: 120,
    statBoosts: { stamina: 3, strength: 1 },
    difficulty: 2,
    unlockLevel: 10,
    lore: 'An ancient automaton guarding the Mountain Pass. Immovable and relentless.',
    color: '#7A7A8A',
    image: require('@/assets/images/iron_sentinel.png'),
  },
  {
    id: 'shadow_monk',
    name: 'Shadow Monk',
    title: 'Void Disciple',
    hp: 400,
    health: 650,
    exercise: 'sit_up',
    repsRequired: 20,
    timeLimit: 120,
    xpReward: 450,
    coinReward: 200,
    statBoosts: { agility: 4, stamina: 2 },
    difficulty: 3,
    unlockLevel: 20,
    lore: 'A former warrior consumed by darkness. Deadly fast.',
    color: '#5533AA',
    image: require('@/assets/images/shadow_monk.png'),
  },
  {
    id: 'dragon_wyrmling',
    name: 'Dragon Wyrmling',
    title: 'Sky Sovereign',
    hp: 600,
    health: 910,
    exercise: 'pull_up',
    repsRequired: 5,
    timeLimit: 120,
    xpReward: 700,
    coinReward: 350,
    statBoosts: { strength: 5, agility: 2 },
    difficulty: 4,
    unlockLevel: 30,
    lore: 'Young but catastrophically powerful. Its breath melts stone.',
    color: '#C0282A',
    image: require('@/assets/images/dragon_wyrmling.png'),
  },
  {
    id: 'ancient_colossus',
    name: 'Ancient Colossus',
    title: 'World Ender',
    hp: 1000,
    health: 1170,
    exercise: 'push_up',
    repsRequired: 30,
    timeLimit: 150,
    xpReward: 1200,
    coinReward: 600,
    statBoosts: { strength: 6, stamina: 5, agility: 3 },
    difficulty: 5,
    unlockLevel: 40,
    lore: 'A primordial titan. The mountains tremble at its footsteps.',
    color: '#8B5E00',
    image: require('@/assets/images/ancient_colossus.png'),
  },
];

// ── ENDURANCE BOSSES ──
export const BOSSES: Enemy[] = [
  {
    id: 'endurance_goblin_swarm',
    name: 'Goblin Swarm',
    title: '30 Second Challenge',
    hp: 9999,
    health: 50000,
    exercise: 'squat',
    repsRequired: 9999,
    timeLimit: 30, // 30 seconds
    xpReward: 0,
    coinReward: 0,
    statBoosts: { strength: 2, stamina: 2 },
    difficulty: 1,
    unlockLevel: 1,
    lore: 'An endless swarm of minor goblins. Survive for 30 seconds.',
    color: '#3A5A40',
    isEndurance: true,
    image: require('@/assets/images/goblin_scout.png'),
  },
  {
    id: 'endurance_orc_vanguard',
    name: 'Orc Vanguard',
    title: '1 Minute Gauntlet',
    hp: 9999,
    health: 100000,
    exercise: 'squat',
    repsRequired: 9999,
    timeLimit: 60, // 60 seconds
    xpReward: 0,
    coinReward: 0,
    statBoosts: { strength: 5, stamina: 5 },
    difficulty: 3,
    unlockLevel: 1,
    lore: 'A heavily armored line of Orc warriors. Hold out for 1 minute.',
    color: '#8B4513',
    isEndurance: true,
    image: require('@/assets/images/iron_sentinel.png'),
  },
  {
    id: 'endurance_titan_overlord',
    name: 'Titan Overlord',
    title: '2 Minute Trial',
    hp: 9999,
    health: 200000,
    exercise: 'squat', // Fallback, uses phases mostly
    repsRequired: 9999, // limitless
    timeLimit: 120, // 2 minutes timer
    xpReward: 0,
    coinReward: 0,
    statBoosts: { strength: 10, stamina: 10 },
    difficulty: 5,
    unlockLevel: 1,
    lore: 'The legendary Titan. Stand your ground for 2 agonizing minutes.',
    color: '#2D1B4E',
    isEndurance: true,
    image: require('@/assets/images/ancient_colossus.png'),
  },
];

// ── NEW: Level Cap increased from 10 to 50 ──
export const MAX_LEVEL = 50;

// ── NEW: Dynamic XP Table Generator ──
// Generates an array of XP requirements for all 50 levels
export const XP_TABLE = Array.from({ length: MAX_LEVEL + 1 }, (_, level) => {
  // Levels 0 and 1 require 0 XP
  if (level <= 1) return 0;
  
  let totalXp = 0;
  let currentReq = 300; // Base requirement
  
  for (let i = 2; i <= level; i++) {
    if (i > 2) {
      if (i <= 5) {
        currentReq += 200;
      } else if (i <= 10) {
        currentReq += 200;
      } else if (i <= 20) {
        currentReq += 500;
      } else if (i <= 30) {
        currentReq += 1000;
      } else if (i <= 40) {
        currentReq += 1500;
      } else {
        currentReq += 2000;
      }
    }
    totalXp += currentReq;
  }
  
  // Snap the final total so it's ALWAYS a clean number ending in 000 or 500
  let roundedXp = Math.ceil(totalXp / 500) * 500;
  
  return roundedXp;
});

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;