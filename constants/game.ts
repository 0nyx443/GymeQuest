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
  statBoosts: Partial<Record<StatKey, number>>;
  difficulty: Difficulty;
  lore: string;
  color: string;
}

export const ENEMIES: Enemy[] = [
  {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    title: 'Forest Ambusher',
    hp: 100,
    exercise: 'push_up',
    repsRequired: 10,
    timeLimit: 90,
    xpReward: 120,
    statBoosts: { strength: 2 },
    difficulty: 1,
    lore: 'A wiry creature haunting the Thornwood. Swift but fragile.',
    color: '#3D7A30',
  },
  {
    id: 'iron_sentinel',
    name: 'Iron Sentinel',
    title: 'Gate Warden',
    hp: 250,
    exercise: 'squat',
    repsRequired: 20,
    timeLimit: 120,
    xpReward: 280,
    statBoosts: { stamina: 3, strength: 1 },
    difficulty: 2,
    lore: 'An ancient automaton guarding the Mountain Pass. Immovable and relentless.',
    color: '#7A7A8A',
  },
  {
    id: 'shadow_monk',
    name: 'Shadow Monk',
    title: 'Void Disciple',
    hp: 400,
    exercise: 'sit_up',
    repsRequired: 25,
    timeLimit: 150,
    xpReward: 450,
    statBoosts: { agility: 4, stamina: 2 },
    difficulty: 3,
    lore: 'A former warrior consumed by darkness. Deadly fast.',
    color: '#5533AA',
  },
  {
    id: 'dragon_wyrmling',
    name: 'Dragon Wyrmling',
    title: 'Sky Sovereign',
    hp: 600,
    exercise: 'pull_up',
    repsRequired: 15,
    timeLimit: 180,
    xpReward: 700,
    statBoosts: { strength: 5, agility: 2 },
    difficulty: 4,
    lore: 'Young but catastrophically powerful. Its breath melts stone.',
    color: '#C0282A',
  },
  {
    id: 'ancient_colossus',
    name: 'Ancient Colossus',
    title: 'World Ender',
    hp: 1000,
    exercise: 'push_up',
    repsRequired: 40,
    timeLimit: 240,
    xpReward: 1200,
    statBoosts: { strength: 6, stamina: 5, agility: 3 },
    difficulty: 5,
    lore: 'A primordial titan. The mountains tremble at its footsteps.',
    color: '#8B5E00',
  },
];

// XP required to reach each level (index = level)
export const XP_TABLE = [
  0, 0, 150, 400, 750, 1200, 1800, 2600, 3600, 5000, 7000
];

export const MAX_LEVEL = 10;

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;
