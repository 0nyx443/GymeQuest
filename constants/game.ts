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
  hp: number;
  exercise: ExerciseType;
  repsRequired: number;
  timeLimit: number;        // seconds
  xpReward: number;
  coinReward: number;       // Gold coins rewarded on victory
  statBoosts: Partial<Record<StatKey, number>>;
  difficulty: Difficulty;
  lore: string;
  color: string;
  image?: any;              // Added to support dynamic images
  isEndurance?: boolean;    // NEW: Endurance mode flag
  phases?: { exercise: ExerciseType; reps: number }[]; // Ordered sequence of exercises for boss fights
}

export const ENEMIES: Enemy[] = [
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    title: 'Forest Ambusher',
    hp: 100,
    exercise: 'push_up',
    repsRequired: 5,
    timeLimit: 60,
    xpReward: 120,
    coinReward: 50,
    statBoosts: { strength: 2 },
    difficulty: 1,
    lore: 'A wiry creature haunting the Thornwood. Swift but fragile.',
    color: '#3D7A30',
    image: require('@/assets/images/goblin_scout.png'),
  },
  {
    id: 'iron_sentinel',
    name: 'Iron Sentinel',
    title: 'Gate Warden',
    hp: 250,
    exercise: 'squat',
    repsRequired: 15,
    timeLimit: 90,
    xpReward: 280,
    coinReward: 120,
    statBoosts: { stamina: 3, strength: 1 },
    difficulty: 2,
    lore: 'An ancient automaton guarding the Mountain Pass. Immovable and relentless.',
    color: '#7A7A8A',
    image: require('@/assets/images/iron_sentinel.png'),
  },
  {
    id: 'shadow_monk',
    name: 'Shadow Monk',
    title: 'Void Disciple',
    hp: 400,
    exercise: 'sit_up',
    repsRequired: 20,
    timeLimit: 120,
    xpReward: 450,
    coinReward: 200,
    statBoosts: { agility: 4, stamina: 2 },
    difficulty: 3,
    lore: 'A former warrior consumed by darkness. Deadly fast.',
    color: '#5533AA',
    image: require('@/assets/images/shadow_monk.png'),
  },
  {
    id: 'dragon_wyrmling',
    name: 'Dragon Wyrmling',
    title: 'Sky Sovereign',
    hp: 600,
    exercise: 'pull_up',
    repsRequired: 5,
    timeLimit: 120,
    xpReward: 700,
    coinReward: 350,
    statBoosts: { strength: 5, agility: 2 },
    difficulty: 4,
    lore: 'Young but catastrophically powerful. Its breath melts stone.',
    color: '#C0282A',
    image: require('@/assets/images/dragon_wyrmling.png'),
  },
  {
    id: 'ancient_colossus',
    name: 'Ancient Colossus',
    title: 'World Ender',
    hp: 1000,
    exercise: 'push_up',
    repsRequired: 30,
    timeLimit: 150,
    xpReward: 1200,
    coinReward: 600,
    statBoosts: { strength: 6, stamina: 5, agility: 3 },
    difficulty: 5,
    lore: 'A primordial titan. The mountains tremble at its footsteps.',
    color: '#8B5E00',
    image: require('@/assets/images/ancient_colossus.png'),
  },
];

// ── ENDURANCE BOSSES ──
export const BOSSES: Enemy[] = [
  {
    id: 'titan_overlord',
    name: 'Titan Overlord',
    title: 'The Unending Trial',
    hp: 9999,
    exercise: 'squat', // Fallback, uses phases mostly
    repsRequired: 9999, // limitless
    timeLimit: 300, // 5 minutes timer
    xpReward: 0,
    coinReward: 0,
    statBoosts: { strength: 10, stamina: 10 },
    difficulty: 5,
    lore: 'Endurance Boss. The more reps you complete before time runs out, the greater the rewards. If you stop moving, you lose!',
    color: '#2D1B4E',
    isEndurance: true,
    phases: [
      { exercise: 'push_up', reps: 10 },
      { exercise: 'squat', reps: 10 },
      { exercise: 'sit_up', reps: 10 },
      // { exercise: 'pull_up', reps: 10 }, // Assuming we want them looping
    ] // In combat screen, we will loop these phases
  },
];

// ── NEW: Level Cap increased from 10 to 50 ──
export const MAX_LEVEL = 50;

// ── NEW: Dynamic XP Table Generator ──
// Generates an array of XP requirements for all 50 levels
export const XP_TABLE = Array.from({ length: MAX_LEVEL + 1 }, (_, level) => {
  // Levels 0 and 1 require 0 XP
  if (level <= 1) return 0;
  
  // The original hand-crafted curve for the first 10 levels
  const earlyLevels = [0, 0, 150, 400, 750, 1200, 1800, 2600, 3600, 5000, 7000];
  if (level <= 10) return earlyLevels[level];

  // For levels 11 through 50, scale the XP requirement automatically using a 15% increase per level
  return Math.floor(7000 * Math.pow(1.15, level - 10)); 
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