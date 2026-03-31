/**
 * usePoseEngine.ts
 */
import { useCallback, useState } from 'react';
import { ExerciseType } from '@/constants/game';

export type RepState = 'up' | 'down' | 'transitioning' | 'invalid';

export interface PoseEngineOutput {
  primaryAngle: number;
  repState: RepState;
  repCount: number;
  isBodyVisible: boolean;
  debugMsg: string;
  processPoseData: (jsonString: string) => void;
}

export function usePoseEngine(exercise: ExerciseType, active: boolean): PoseEngineOutput {
  const [repCount, setRepCount] = useState(0);
  const [repState, setRepState] = useState<RepState>('up');
  const [primaryAngle, setPrimaryAngle] = useState(180);
  const [isBodyVisible, setIsBodyVisible] = useState(true);
  const [debugMsg, setDebugMsg] = useState("Booting AI Engine...");

  const processPoseData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      if (parsed.log) {
        setDebugMsg(parsed.log);
        return;
      }

      // Only update stats if the battle is active and we receive a pose update
      if (!active || parsed.type !== 'POSE_UPDATE') return;

      setPrimaryAngle(parsed.angle);
      setRepState(parsed.state);
      setRepCount(parsed.reps);
      setIsBodyVisible(parsed.visible);

    } catch (e) {
      // Ignore rapid frame errors
    }
  }, [active]);

  return {
    primaryAngle, repState, repCount, isBodyVisible, processPoseData, debugMsg,
  };
}

export const MEDIAPIPE_WEBVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
  <style>
    body { margin: 0; background-color: #000; overflow: hidden; }
    /* Both Video and Canvas use 'cover' to perfectly fill the phone screen together */
    video, canvas {
      position: absolute;
      width: 100vw;
      height: 100vh;
      object-fit: cover; 
      transform: scaleX(-1); 
    }
    canvas { z-index: 10; } /* Forces the drawn skeleton on top of the video */
  </style>
</head>
<body>
<video id="video" playsinline autoplay></video>
<canvas id="output_canvas"></canvas>
<script>
  function sendToRN(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ log: msg }));
    }
  }

  // ── True 3D Angle Math ──
  function calcAngle3D(a, b, c) {
    const ax = a.x - b.x, ay = a.y - b.y, az = a.z - b.z;
    const cx = c.x - b.x, cy = c.y - b.y, cz = c.z - b.z;
    const dot = ax*cx + ay*cy + az*cz;
    const magA = Math.sqrt(ax*ax + ay*ay + az*az);
    const magC = Math.sqrt(cx*cx + cy*cy + cz*cz);
    if(magA===0 || magC===0) return 180;
    return (Math.acos(Math.max(-1, Math.min(1, dot/(magA*magC)))) * 180) / Math.PI;
  }

  let bootInterval = setInterval(() => {
    if (window.ReactNativeWebView) {
      clearInterval(bootInterval);
      sendToRN("Bridge Connected! Booting 60FPS UI...");
      initPose();
    }
  }, 50);

  function initPose() {
    try {
      const videoElement = document.getElementById('video');
      const canvasElement = document.getElementById('output_canvas');
      const canvasCtx = canvasElement.getContext('2d');

      let currentState = 'up';
      let localRepCount = 0;
      const downThresh = 110; // Forgiving mobile thresholds
      const upThresh = 145;

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

      pose.onResults((results) => {
        // 1. MATCH CANVAS TO VIDEO PERFECTLY TO AVOID GIANT SKELETONS
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        if (!results.poseLandmarks) {
          sendToRN("SCANNING: No body detected");
          canvasCtx.restore();
          return;
        }

        // 2. DRAW SKELETON DIRECTLY IN WEBVIEW (Zero Lag!)
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#48CAE4', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#48CAE4', lineWidth: 2, radius: 4});
        canvasCtx.restore();

        // 3. CALCULATE PUSH UP LOGIC IN WEBVIEW
        const lms = results.poseLandmarks;
        const visLeft = (lms[11].visibility + lms[13].visibility + lms[15].visibility) / 3;
        const visRight = (lms[12].visibility + lms[14].visibility + lms[16].visibility) / 3;

        let angle = 180;
        // Only measure the side of the body the camera can see best
        if (visLeft > visRight) {
            angle = calcAngle3D(lms[11], lms[13], lms[15]);
        } else {
            angle = calcAngle3D(lms[12], lms[14], lms[16]);
        }

        // State Machine
        if (angle <= downThresh && currentState === 'up') {
            currentState = 'down';
        } else if (angle >= upThresh && currentState === 'down') {
            currentState = 'up';
            localRepCount++;
        }

        // 4. SEND TINY UPDATE TO REACT NATIVE
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'POSE_UPDATE',
                angle: Math.round(angle),
                state: currentState,
                reps: localRepCount,
                visible: lms[11].visibility > 0.5 || lms[12].visibility > 0.5
            }));
        }
      });

      pose.initialize().then(() => {
        const camera = new Camera(videoElement, {
          onFrame: async () => { await pose.send({ image: videoElement }); },
          width: 640,
          height: 480,
          facingMode: "user"
        });
        
        camera.start().then(() => {
          sendToRN("LIVE 60FPS UI ENGAGED!");
        });
      });
    } catch(e) {
       sendToRN("JS Error: " + e.message);
    }
  }
</script>
</body>
</html>
`;