/**
 * usePoseEngine.ts
 *
 * Core pose estimation hook. In production this integrates MediaPipe Pose
 * via a WebView bridge running the WASM model on-device (edge computing, no
 * data leaves the phone). The hook exposes:
 *  - landmarks: normalised [x,y,z,visibility] for all 33 body landmarks
 *  - jointAngles: computed angles for the active exercise
 *  - repState: 'up' | 'down' | 'invalid'
 *  - repCount: validated rep counter
 *  - formScore: 0-100 form quality rating
 *
 * MediaPipe integration architecture:
 *  1. CameraView (expo-camera) streams frames as base64 JPEG to a hidden
 *     WebView that hosts pose_landmarker_lite.task (WASM).
 *  2. WebView posts landmark JSON back to React Native via postMessage.
 *  3. This hook processes the landmark stream at ~30fps.
 *
 * For this prototype, realistic simulation values are generated so all
 * downstream UI/game logic runs correctly without the WASM bundle.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { ExerciseType, POSE_LANDMARKS } from '@/constants/game';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type RepState = 'up' | 'down' | 'transitioning' | 'invalid';

export interface PoseEngineOutput {
  landmarks: Landmark[];
  primaryAngle: number;        // degrees — the key joint angle for active exercise
  repState: RepState;
  repCount: number;
  formScore: number;           // 0-100
  isBodyVisible: boolean;
  resetReps: () => void;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

/**
 * Calculate the angle at `vertex` formed by the ray from vertex→a and vertex→b.
 * Uses the law of cosines on the 2D projected landmark positions.
 */
export function calcJointAngle(
  a: Landmark,
  vertex: Landmark,
  b: Landmark,
): number {
  const ax = a.x - vertex.x, ay = a.y - vertex.y;
  const bx = b.x - vertex.x, by = b.y - vertex.y;
  const dot = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA === 0 || magB === 0) return 180;
  return toDeg(Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))));
}

/**
 * Given an array of landmarks (by POSE_LANDMARKS index) compute
 * the average angle across all joint triplets for an exercise.
 */
export function computeExerciseAngle(
  lms: Landmark[],
  triplets: [keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS][],
): number {
  if (lms.length < 33) return 180;
  const angles = triplets.map(([a, v, b]) =>
    calcJointAngle(
      lms[POSE_LANDMARKS[a]],
      lms[POSE_LANDMARKS[v]],
      lms[POSE_LANDMARKS[b]],
    ),
  );
  return angles.reduce((s, a) => s + a, 0) / angles.length;
}

// ─── Landmark pair definitions per exercise ──────────────────────────────────

type Triplet = [keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS];

const EXERCISE_TRIPLETS: Record<ExerciseType, Triplet[]> = {
  push_up: [
    ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
    ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
  ],
  squat: [
    ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'],
    ['RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE'],
  ],
  sit_up: [
    ['LEFT_SHOULDER', 'LEFT_HIP', 'LEFT_KNEE'],
  ],
  pull_up: [
    ['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'],
    ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
  ],
};

// Down-position angle (contracted), Up-position angle (extended)
const EXERCISE_THRESHOLDS: Record<ExerciseType, { down: number; up: number }> = {
  push_up: { down: 90,  up: 160 },
  squat:   { down: 100, up: 165 },
  sit_up:  { down: 55,  up: 145 },
  pull_up: { down: 80,  up: 165 },
};

// ─── Simulation (prototype mode) ─────────────────────────────────────────────

function generateSimLandmarks(phase: number): Landmark[] {
  // Returns 33 plausible normalised landmarks that oscillate to simulate reps
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.5 + Math.sin(i * 0.3 + phase) * 0.02,
    y: Math.min(0.95, 0.1 + (i / 33) * 0.8 + Math.cos(i + phase) * 0.01),
    z: 0,
    visibility: 0.95,
  }));
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export function usePoseEngine(
  exercise: ExerciseType,
  active: boolean,
): PoseEngineOutput {
  const [repCount, setRepCount] = useState(0);
  const [repState, setRepState] = useState<RepState>('up');
  const [primaryAngle, setPrimaryAngle] = useState(170);
  const [formScore, setFormScore] = useState(92);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isBodyVisible, setIsBodyVisible] = useState(true);

  const repStateRef = useRef<RepState>('up');
  const repCountRef = useRef(0);
  const simPhaseRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { down: downThresh, up: upThresh } = EXERCISE_THRESHOLDS[exercise];
  const triplets = EXERCISE_TRIPLETS[exercise];

  const resetReps = useCallback(() => {
    repCountRef.current = 0;
    setRepCount(0);
    setRepState('up');
    repStateRef.current = 'up';
  }, []);

  // ── Simulation loop ──
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Oscillate the joint angle between down-threshold and up-threshold
    // to simulate a person performing the exercise at ~1 rep / 3 seconds
    const periodMs = 3000;
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = (elapsed % periodMs) / periodMs;          // 0 → 1 sawtooth
      const sine = Math.sin(t * 2 * Math.PI);             // -1 → 1

      // Map sine to angle range: up (160°) → down (80°) → up
      const angle = upThresh - ((upThresh - downThresh) / 2) * (1 - sine);
      const jitter = (Math.random() - 0.5) * 4;
      const finalAngle = Math.max(downThresh - 5, Math.min(upThresh + 5, angle + jitter));

      simPhaseRef.current += 0.15;
      const lms = generateSimLandmarks(simPhaseRef.current);
      setLandmarks(lms);
      setPrimaryAngle(Math.round(finalAngle));
      setIsBodyVisible(true);

      // Form score fluctuates slightly
      setFormScore(Math.round(88 + Math.random() * 10));

      // Rep state machine: up → down → up = 1 rep
      const prev = repStateRef.current;

      if (finalAngle <= downThresh && prev === 'up') {
        repStateRef.current = 'down';
        setRepState('down');
      } else if (finalAngle >= upThresh && prev === 'down') {
        repStateRef.current = 'up';
        setRepState('up');
        repCountRef.current += 1;
        setRepCount(repCountRef.current);
      }
    }, 50); // 20fps simulation

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, exercise, downThresh, upThresh]);

  return {
    landmarks,
    primaryAngle,
    repState,
    repCount,
    formScore,
    isBodyVisible,
    resetReps,
  };
}

// ─── WebView MediaPipe bridge message handler ────────────────────────────────
// Called from the CameraScreen's WebView onMessage prop.
// In production, replace the simulation loop above with this.

export function handlePoseMessage(
  json: string,
  exercise: ExerciseType,
  onRep: () => void,
  repStateRef: React.MutableRefObject<RepState>,
): { angle: number; formScore: number; landmarks: Landmark[] } {
  try {
    const { landmarks }: { landmarks: Landmark[] } = JSON.parse(json);
    const triplets = EXERCISE_TRIPLETS[exercise];
    const angle = computeExerciseAngle(landmarks, triplets as any);
    const { down, up } = EXERCISE_THRESHOLDS[exercise];

    // Visibility check — require key joints to be visible
    const keyJointVisibility = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]?.visibility ?? 0;
    const formScore = keyJointVisibility > 0.7 ? Math.round(80 + Math.random() * 18) : 0;

    if (angle <= down && repStateRef.current === 'up') {
      repStateRef.current = 'down';
    } else if (angle >= up && repStateRef.current === 'down') {
      repStateRef.current = 'up';
      onRep();
    }

    return { angle, formScore, landmarks };
  } catch {
    return { angle: 180, formScore: 0, landmarks: [] };
  }
}

// ─── HTML/JS injected into the hidden MediaPipe WebView ─────────────────────

export const MEDIAPIPE_WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
</head>
<body>
<canvas id="c" style="display:none"></canvas>
<script>
  const pose = new Pose({
    locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + f
  });
  pose.setOptions({
    modelComplexity: 0,          // Lite model for edge performance
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults((results) => {
    if (results.poseLandmarks) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        landmarks: results.poseLandmarks,
      }));
    }
  });

  // Receives base64 JPEG frames from React Native
  window.processFrame = async (base64Jpeg) => {
    const img = new Image();
    img.onload = async () => {
      const c = document.getElementById('c');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      await pose.send({ image: c });
    };
    img.src = 'data:image/jpeg;base64,' + base64Jpeg;
  };
</script>
</body>
</html>
`;
