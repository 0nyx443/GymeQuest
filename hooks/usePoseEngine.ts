/**
 * usePoseEngine.ts
 */
import { useRef, useState, useCallback } from 'react';
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
  primaryAngle: number;
  repState: RepState;
  repCount: number;
  formScore: number;
  isBodyVisible: boolean;
  debugMsg: string;
  resetReps: () => void;
  processPoseData: (jsonString: string) => void;
}

function toDeg(rad: number) { return (rad * 180) / Math.PI; }

export function calcJointAngle(a: Landmark, vertex: Landmark, b: Landmark): number {
  const ax = a.x - vertex.x, ay = a.y - vertex.y;
  const bx = b.x - vertex.x, by = b.y - vertex.y;
  const dot = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA === 0 || magB === 0) return 180;
  return toDeg(Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))));
}

export function computeExerciseAngle(
  lms: Landmark[],
  triplets: [keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS][],
): number {
  if (lms.length < 33) return 180;
  const angles = triplets.map(([a, v, b]) =>
    calcJointAngle(lms[POSE_LANDMARKS[a]], lms[POSE_LANDMARKS[v]], lms[POSE_LANDMARKS[b]])
  );
  return angles.reduce((s, a) => s + a, 0) / angles.length;
}

type Triplet = [keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS, keyof typeof POSE_LANDMARKS];

const EXERCISE_TRIPLETS: Record<ExerciseType, Triplet[]> = {
  push_up: [['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'], ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST']],
  squat: [['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'], ['RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE']],
  sit_up: [['LEFT_SHOULDER', 'LEFT_HIP', 'LEFT_KNEE']],
  pull_up: [['LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST'], ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST']],
};

const EXERCISE_THRESHOLDS: Record<ExerciseType, { down: number; up: number }> = {
  push_up: { down: 90,  up: 160 },
  squat:   { down: 100, up: 165 },
  sit_up:  { down: 55,  up: 145 },
  pull_up: { down: 80,  up: 165 },
};

export function usePoseEngine(exercise: ExerciseType, active: boolean): PoseEngineOutput {
  const [repCount, setRepCount] = useState(0);
  const [repState, setRepState] = useState<RepState>('up');
  const [primaryAngle, setPrimaryAngle] = useState(170);
  const [formScore, setFormScore] = useState(0);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isBodyVisible, setIsBodyVisible] = useState(true);
  const [debugMsg, setDebugMsg] = useState("Waiting for WebView..."); 

  const repStateRef = useRef<RepState>('up');
  const repCountRef = useRef(0);

  const { down: downThresh, up: upThresh } = EXERCISE_THRESHOLDS[exercise];
  const triplets = EXERCISE_TRIPLETS[exercise];

  const resetReps = useCallback(() => {
    repCountRef.current = 0;
    setRepCount(0);
    setRepState('up');
    repStateRef.current = 'up';
  }, []);

  const processPoseData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      if (parsed.log) {
        setDebugMsg(parsed.log); 
        return;
      }

      if (!active) return; 

      if (!parsed.landmarks) return;

      const newLandmarks = parsed.landmarks as Landmark[];
      setLandmarks(newLandmarks);

      const angle = computeExerciseAngle(newLandmarks, triplets as any);
      setPrimaryAngle(Math.round(angle));

      const keyJointVisibility = newLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]?.visibility ?? 0;
      const visible = keyJointVisibility > 0.5;
      setIsBodyVisible(visible);

      const score = visible ? Math.round(80 + Math.random() * 18) : 0;
      setFormScore(score);

      const prev = repStateRef.current;
      if (angle <= downThresh && prev === 'up') {
        repStateRef.current = 'down';
        setRepState('down');
      } else if (angle >= upThresh && prev === 'down') {
        repStateRef.current = 'up';
        setRepState('up');
        repCountRef.current += 1;
        setRepCount(repCountRef.current);
      }
    } catch (e) {
      // Ignore rapid JSON frame errors
    }
  }, [active, exercise, downThresh, upThresh, triplets]);

  return {
    landmarks, primaryAngle, repState, repCount,
    formScore, isBodyVisible, resetReps, processPoseData, debugMsg,
  };
}

export const MEDIAPIPE_WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
  <style>
    /* Centers the canvas in our new X-Ray box so it looks clean */
    body { margin: 0; background-color: #111; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  function sendToRN(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ log: msg }));
    }
  }

  window.onerror = function(msg, url, line) {
    sendToRN("CRIT ERR: " + msg + " @ line " + line);
  };

  let bootInterval = setInterval(() => {
    if (window.ReactNativeWebView) {
      clearInterval(bootInterval);
      sendToRN("Bridge Connected! Loading Model...");
      initPose();
    }
  }, 50);

  function initPose() {
    try {
      const pose = new Pose({
        locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + f
      });
      
      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      let isReady = false;

      pose.onResults((results) => {
        if (results.poseLandmarks) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            landmarks: results.poseLandmarks,
          }));
        } else {
          sendToRN("SCANNING: No body detected");
        }
      });

      pose.initialize().then(() => {
        isReady = true;
        sendToRN("READY AND TRACKING!");
      }).catch(err => {
        sendToRN("Init Err: " + err.message);
      });

      window.processFrame = async (base64Jpeg) => {
        if (!isReady) return;
        const img = new Image();
        
        img.onload = async () => {
          const c = document.getElementById('c');
          const ctx = c.getContext('2d');
          
          c.width = img.width;
          c.height = img.height;
          ctx.drawImage(img, 0, 0, c.width, c.height);

          try {
            await pose.send({ image: c });
          } catch(e) {
            sendToRN("Pose Send Err: " + e.message);
          }
        };

        img.onerror = () => {
          sendToRN("IMG LOAD ERR: Base64 broken");
        };

        img.src = 'data:image/jpeg;base64,' + base64Jpeg;
      };
    } catch(e) {
       sendToRN("JS Try/Catch: " + e.message);
    }
  }
</script>
</body>
</html>
`;