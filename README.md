# GYME Quest 🗡️

> *Gamified fitness through real-time pose estimation. Every rep is a sword strike.*

A React Native Expo application (Android-exclusive) that transforms bodyweight exercise into an immersive RPG combat experience. The device camera tracks your form via MediaPipe Pose and validates every repetition — no real effort, no in-game reward.

---

## Project Structure

```
GYMEQuest/
├── app/                        # Expo Router file-based navigation
│   ├── _layout.tsx             # Root layout: fonts, gesture handler, safe area
│   ├── index.tsx               # Home route → DashboardScreen + bottom nav
│   ├── combat.tsx              # Combat route → CombatScreen
│   └── post-battle.tsx         # Results route → PostBattleScreen
│
├── screens/                    # Full-page screen components
│   ├── DashboardScreen.tsx     # Avatar, stats, XP bar, Quest Map
│   ├── CombatScreen.tsx        # Live camera + pose overlay + game HUD
│   └── PostBattleScreen.tsx    # Victory / defeat results + XP animation
│
├── components/
│   ├── avatar/
│   │   └── AvatarDisplay.tsx   # SVG avatar that evolves with level
│   ├── combat/
│   │   ├── PoseWireframe.tsx   # SVG skeleton overlay on camera feed
│   │   ├── RepCounter.tsx      # Animated rep ring counter
│   │   └── CombatTimer.tsx     # Countdown timer with danger pulse
│   └── ui/
│       └── StatBar.tsx         # HP bars, XP bar, stat bars
│
├── hooks/
│   └── usePoseEngine.ts        # MediaPipe pose estimation + rep state machine
│
├── store/
│   └── gameStore.ts            # Zustand global state: avatar, battle, XP
│
├── constants/
│   ├── theme.ts                # Colors, fonts, spacing, radius tokens
│   └── game.ts                 # Enemies, exercises, landmark indices, XP table
│
└── utils/
    └── format.ts               # Time, angle, XP formatters
```

---

## Quick Start

### 1. Install dependencies

```bash
cd GYMEQuest
npm install

# Google Fonts (for Cinzel, Rajdhani, Share Tech Mono)
npx expo install \
  @expo-google-fonts/cinzel \
  @expo-google-fonts/rajdhani \
  @expo-google-fonts/share-tech-mono \
  expo-font
```

### 2. Run on Android

```bash
# Physical device (recommended — camera required)
npx expo start --android

# Or with Expo Go
npx expo start
# Scan the QR code with the Expo Go app on your Android device
```

### 3. Development build (for full MediaPipe WASM support)

```bash
npx expo prebuild --platform android
npx expo run:android
```

---

## Architecture

### Pose Estimation Pipeline

```
Android Camera (expo-camera)
        │
        │  base64 JPEG frames @ 20fps
        ▼
Hidden WebView
  └─ MediaPipe Pose WASM (pose_landmarker_lite.task)
        │
        │  postMessage({ landmarks: [...33 points] })
        ▼
usePoseEngine hook
  ├─ calcJointAngle() — law of cosines on 2D projections
  ├─ Rep state machine: UP → DOWN → UP = 1 validated rep
  └─ formScore: visibility-weighted quality rating (0–100)
        │
        ▼
Zustand gameStore
  ├─ registerRep() — updates battle state
  ├─ tickTimer()   — 1Hz countdown
  └─ resolveBattle() — victory / defeat → XP + stat boosts
```

**Why on-device?** All landmark inference runs inside the WebView's WASM sandbox. No camera data is transmitted anywhere. The `pose_landmarker_lite.task` model (~5MB) loads from CDN on first launch and caches locally.

### Rep Validation Logic

Each exercise defines:
- **Joint triplets** — which landmark indices form the angle to measure
- **Down threshold** — angle indicating the contracted/bottom position
- **Up threshold** — angle indicating the extended/top position

A rep is counted only when the angle fully crosses both thresholds in sequence (UP → DOWN → UP), preventing partial or momentum-cheated reps.

| Exercise | Key Joints | Down Angle | Up Angle |
|----------|-----------|------------|----------|
| Push-Up | Shoulder–Elbow–Wrist | ≤ 90° | ≥ 160° |
| Squat | Hip–Knee–Ankle | ≤ 100° | ≥ 165° |
| Sit-Up | Shoulder–Hip–Knee | ≤ 55° | ≥ 145° |
| Pull-Up | Shoulder–Elbow–Wrist | ≤ 80° | ≥ 165° |

### RPG Progression

```
Battle Win
  └─ gainXp(enemy.xpReward)      → level up when xp ≥ XP_TABLE[level+1]
  └─ boostStats(enemy.statBoosts) → STR / AGI / STA increase permanently
  └─ avatar.defeatedEnemies[]    → unlocks lore + marks quest complete

XP Table (cumulative):
  Lv 1→2:  150 XP  |  Lv 5→6: 1,800 XP
  Lv 2→3:  400 XP  |  Lv 6→7: 2,600 XP
  Lv 3→4:  750 XP  |  Lv 7→8: 3,600 XP
  Lv 4→5: 1,200 XP |  Lv 8→9: 5,000 XP  |  Lv 9→10: 7,000 XP
```

---

## Screens

### Dashboard (Home)
- Procedural SVG avatar that gains armour tiers at levels 3, 5, 8
- Animated XP progress bar
- STR / AGI / STA stat bars
- Quest Map — 5 enemies from Goblin Scout (Lv1) to Ancient Colossus (Lv5+)
- Battle/victory/total-rep lifetime counters

### Active Combat
- Full-screen front camera feed
- Real-time MediaPipe skeleton wireframe (teal joints = good form, red = poor)
- Enemy HP bar depleted per validated rep
- Countdown timer with danger pulse animation when < 10s
- Rep counter ring with gold flash + haptic on each rep
- 3-second exercise tutorial countdown before battle starts

### Post-Battle
- Victory: animated XP bar fill, stat boost display, enemy lore unlock
- Defeat: encouraging message, reps-completed vs reps-needed, training tip
- Retry or return to Quest Map

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `expo-camera` | Camera feed (front-facing) |
| `expo-haptics` | Haptic feedback on reps + outcomes |
| `expo-linear-gradient` | UI gradient overlays |
| `expo-router` | File-based navigation |
| `react-native-reanimated` | Performant JS-thread animations |
| `react-native-gesture-handler` | Swipe/tap gesture support |
| `react-native-svg` | Pose wireframe + avatar rendering |
| `zustand` | Lightweight global state (avatar + battle) |
| `@expo-google-fonts/*` | Cinzel, Rajdhani, Share Tech Mono |

### MediaPipe Integration
MediaPipe Pose runs inside a hidden `WebView` component. The WASM model is loaded from the MediaPipe CDN on first launch. In a production release, bundle `pose_landmarker_lite.task` as a local asset to enable fully offline operation.

---

## Extending the Game

### Adding a new exercise
1. Add the type to `ExerciseType` in `constants/game.ts`
2. Define joint triplets + thresholds in `EXERCISES` and `EXERCISE_TRIPLETS` / `EXERCISE_THRESHOLDS` in `hooks/usePoseEngine.ts`
3. Create an `Enemy` entry in `ENEMIES` using the new exercise

### Adding a new enemy
Add an object to the `ENEMIES` array in `constants/game.ts`:
```ts
{
  id: 'your_enemy_id',
  name: 'Enemy Name',
  title: 'Subtitle',
  hp: 500,
  exercise: 'squat',
  repsRequired: 30,
  timeLimit: 180,       // seconds
  xpReward: 600,
  statBoosts: { agility: 3 },
  difficulty: 3,        // 1–5 (gates unlock level)
  lore: 'Backstory shown on victory screen.',
  color: '#AA4422',     // accent colour in quest list
}
```

### Persistence
The current implementation uses Zustand in-memory state (resets on app restart). To add persistence, wrap the store with `zustand/middleware/persist` and the `AsyncStorage` adapter from `@react-native-async-storage/async-storage`.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set, get) => ({ /* store */ }),
    {
      name: 'gymequest-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Design System

All visual tokens live in `constants/theme.ts`:

| Token | Value | Usage |
|-------|-------|-------|
| `Colors.bgVoid` | `#080810` | Deepest background |
| `Colors.gold` | `#C8922A` | Primary brand / XP |
| `Colors.teal` | `#1DB8A0` | Form quality / class label |
| `Colors.crimson` | `#C0282A` | Danger / enemy / defeat |
| `Colors.violet` | `#7C4DFF` | Aura glow (low level) |
| `Fonts.display` | Cinzel 700 | Headers / numbers |
| `Fonts.ui` | Rajdhani 500 | Body / labels |
| `Fonts.mono` | Share Tech Mono | Stats / counters / codes |

---

## Android Permissions (app.json)

```json
"permissions": [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.VIBRATE",
  "android.permission.BODY_SENSORS"
]
```

Camera is requested at runtime on the Combat screen via `useCameraPermissions()`.

---

## Roadmap

- [ ] AsyncStorage persistence for avatar progress
- [ ] Multiplayer challenges (share battle codes)
- [ ] Boss battle music via `expo-av`
- [ ] Full offline MediaPipe WASM bundle as local asset
- [ ] Leaderboard screen
- [ ] Custom avatar cosmetics unlocked by achievements
- [ ] Weekly quest system
- [ ] Apple Watch / Wear OS rep confirmation integration
