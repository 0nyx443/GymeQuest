/**
 * usePoseEngine.ts
 *
 * Pose estimation hook + MediaPipe WebView HTML.
 *
 * Exercises: push_up | squat | sit_up | pull_up
 *
 * TTS coaching:
 *  Android WebView does NOT support window.speechSynthesis.
 *  The WebView sends { type: 'SPEAK', text, priority } via postMessage,
 *  and the hook calls expo-speech natively.
 */
import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
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
  const [debugMsg, setDebugMsg] = useState('Booting AI Engine...');

  const lastSpokenRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);

  const speak = useCallback((text: string, priority = false) => {
    const now = Date.now();
    if (!priority && text === lastSpokenRef.current && now - lastSpokenTimeRef.current < 5000) return;
    lastSpokenRef.current = text;
    lastSpokenTimeRef.current = now;
    if (priority) Speech.stop();
    Speech.speak(text, { rate: 1.05, pitch: 1.0 });
  }, []);

  const processPoseData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      // Coaching cue from WebView → speak via expo-speech
      if (parsed.type === 'SPEAK') {
        speak(parsed.text, parsed.priority ?? false);
        return;
      }

      if (parsed.log) {
        setDebugMsg(parsed.log);
        return;
      }

      if (!active || parsed.type !== 'POSE_UPDATE') return;

      setPrimaryAngle(parsed.angle);
      setRepState(parsed.state);
      setRepCount(parsed.reps);
      setIsBodyVisible(parsed.visible);
    } catch {
      // ignore frame errors
    }
  }, [active, speak]);

  return { primaryAngle, repState, repCount, isBodyVisible, processPoseData, debugMsg };
}

// ---------------------------------------------------------------------------
// MediaPipe WebView HTML
// All coaching is sent to RN via postMessage({ type:'SPEAK', text, priority })
// ---------------------------------------------------------------------------

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
    video, canvas {
      position: absolute; width: 100vw; height: 100vh;
      object-fit: cover; transform: scaleX(-1);
    }
    canvas { z-index: 10; }
  </style>
</head>
<body>
<video id="video" playsinline autoplay></video>
<canvas id="output_canvas"></canvas>
<script>

function sendLog(msg) {
  if (window.ReactNativeWebView)
    window.ReactNativeWebView.postMessage(JSON.stringify({ log: msg }));
}

function sendUpdate(obj) {
  if (window.ReactNativeWebView)
    window.ReactNativeWebView.postMessage(JSON.stringify(obj));
}

// All speech goes through React Native (expo-speech)
function speak(text, priority) {
  sendUpdate({ type: 'SPEAK', text: text, priority: !!priority });
}

function calcAngle3D(a, b, c) {
  var ax = a.x-b.x, ay = a.y-b.y, az = (a.z||0)-(b.z||0);
  var cx = c.x-b.x, cy = c.y-b.y, cz = (c.z||0)-(b.z||0);
  var dot = ax*cx + ay*cy + az*cz;
  var mA = Math.sqrt(ax*ax+ay*ay+az*az);
  var mC = Math.sqrt(cx*cx+cy*cy+cz*cz);
  if (mA===0||mC===0) return 180;
  return (Math.acos(Math.max(-1,Math.min(1,dot/(mA*mC))))*180)/Math.PI;
}

// ── Exercise configs ──────────────────────────────────────────────────────────
var CONFIGS = {
  push_up: {
    downThresh: 110, upThresh: 145, invertedLogic: false,
    getAngle: function(lms) {
      var vL=(lms[11].visibility+lms[13].visibility+lms[15].visibility)/3;
      var vR=(lms[12].visibility+lms[14].visibility+lms[16].visibility)/3;
      return vL>vR ? calcAngle3D(lms[11],lms[13],lms[15]) : calcAngle3D(lms[12],lms[14],lms[16]);
    },
    getVisible: function(lms){ return lms[11].visibility>0.5||lms[12].visibility>0.5; },
    getFormCue: function(angle, state) {
      if (state==='down' && angle>108) return 'Go lower, bend your elbows more';
      if (state==='up'   && angle<150) return 'Fully extend your arms at the top';
      return null;
    }
  },
  pull_up: {
    downThresh: 110, upThresh: 145, invertedLogic: false,
    getAngle: function(lms) {
      var vL=(lms[11].visibility+lms[13].visibility+lms[15].visibility)/3;
      var vR=(lms[12].visibility+lms[14].visibility+lms[16].visibility)/3;
      return vL>vR ? calcAngle3D(lms[11],lms[13],lms[15]) : calcAngle3D(lms[12],lms[14],lms[16]);
    },
    getVisible: function(lms){ return lms[11].visibility>0.5||lms[12].visibility>0.5; },
    getFormCue: function(angle, state) {
      if (state==='down' && angle>120) return 'Pull higher, chin above the bar';
      if (state==='up'   && angle<160) return 'Lower all the way down for full range';
      return null;
    }
  },
  squat: {
    // hip-knee-ankle: ~90-105 at depth, ~165-170 standing
    downThresh: 110, upThresh: 155, invertedLogic: false,
    getAngle: function(lms) {
      var vL=(lms[23].visibility+lms[25].visibility+lms[27].visibility)/3;
      var vR=(lms[24].visibility+lms[26].visibility+lms[28].visibility)/3;
      return vL>vR ? calcAngle3D(lms[23],lms[25],lms[27]) : calcAngle3D(lms[24],lms[26],lms[28]);
    },
    getVisible: function(lms){ return lms[25].visibility>0.4||lms[26].visibility>0.4; },
    getFormCue: function(angle, state) {
      if (state==='down' && angle>118) return 'Squat deeper, get your thighs parallel to the floor';
      if (state==='up'   && angle<162) return 'Stand up fully to complete the rep';
      if (state==='down') return 'Keep your chest up and knees over your toes';
      return null;
    }
  },
  sit_up: {
    // shoulder-hip-knee: small when crunched (~50-70), large when flat (~145+)
    // "up" = small angle (crunched), so invertedLogic = true
    downThresh: 130, upThresh: 75, invertedLogic: true,
    getAngle: function(lms) {
      var vL=(lms[11].visibility+lms[23].visibility+lms[25].visibility)/3;
      var vR=(lms[12].visibility+lms[24].visibility+lms[26].visibility)/3;
      return vL>vR ? calcAngle3D(lms[11],lms[23],lms[25]) : calcAngle3D(lms[12],lms[24],lms[26]);
    },
    getVisible: function(lms){ return lms[23].visibility>0.4||lms[24].visibility>0.4; },
    getFormCue: function(angle, state) {
      if (state==='up'   && angle>82)  return 'Crunch higher, bring your chest toward your knees';
      if (state==='down' && angle<138) return 'Lower all the way down to fully reset';
      return null;
    }
  }
};

// ── Runtime state ─────────────────────────────────────────────────────────────
var exerciseType   = 'push_up';
var cfg            = CONFIGS[exerciseType];
var currentState   = 'up';
var localRepCount  = 0;
var badFormFrames  = 0;
var BAD_THRESH     = 25;   // frames of bad form before speaking
var noBodyFrames   = 0;
var NO_BODY_THRESH = 45;
var lastRepSpeak   = 0;
var REP_CD         = 6000; // ms between rep cues

var REP_CUES = [
  'Great rep, keep going!',
  'Excellent, one more!',
  'You are crushing it!',
  'Stay strong, keep pushing!',
  'Perfect, well done!'
];

// Called by CombatScreen after WebView loads
window.setExerciseType = function(type) {
  if (!CONFIGS[type]) return;
  exerciseType  = type;
  cfg           = CONFIGS[type];
  // sit_up starts in 'down' (lying flat); others start 'up'
  currentState  = (type === 'sit_up') ? 'down' : 'up';
  localRepCount = 0;
  badFormFrames = 0;
  sendLog('Exercise set: ' + type);
};

window.speakVictory = function() {
  speak('Quest complete! Outstanding effort! You defeated the enemy!', true);
};

window.speakStart = function(name) {
  speak('Get ready! Starting ' + name + '. Begin when you are set.', true);
};

// ── Init ──────────────────────────────────────────────────────────────────────
var bootInterval = setInterval(function() {
  if (window.ReactNativeWebView) {
    clearInterval(bootInterval);
    sendLog('Bridge connected. Loading pose model...');
    initPose();
  }
}, 50);

function initPose() {
  try {
    var videoEl  = document.getElementById('video');
    var canvasEl = document.getElementById('output_canvas');
    var ctx      = canvasEl.getContext('2d');

    var pose = new Pose({
      locateFile: function(f){ return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/'+f; }
    });
    pose.setOptions({
      modelComplexity: 0, smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });

    pose.onResults(function(results) {
      canvasEl.width  = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.save();
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      if (!results.poseLandmarks) {
        noBodyFrames++;
        if (noBodyFrames === NO_BODY_THRESH)
          speak('Step back so I can see your full body.', false);
        sendLog('No body detected');
        ctx.restore();
        return;
      }
      noBodyFrames = 0;

      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {color:'#48CAE4', lineWidth:4});
      drawLandmarks(ctx, results.poseLandmarks, {color:'#48CAE4', lineWidth:2, radius:4});
      ctx.restore();

      var lms     = results.poseLandmarks;
      var visible = cfg.getVisible(lms);

      if (!visible) {
        sendUpdate({ type:'POSE_UPDATE', angle:180, state:currentState, reps:localRepCount, visible:false });
        return;
      }

      var angle = cfg.getAngle(lms);

      // ── State machine ──────────────────────────────────────────────────────
      if (!cfg.invertedLogic) {
        if (angle <= cfg.downThresh && currentState === 'up') {
          currentState = 'down';
        } else if (angle >= cfg.upThresh && currentState === 'down') {
          currentState = 'up';
          localRepCount++;
          onRep(localRepCount);
        }
      } else {
        // sit_up: small angle = crunched = "up"
        if (angle <= cfg.upThresh && currentState === 'down') {
          currentState = 'up';
          localRepCount++;
          onRep(localRepCount);
        } else if (angle >= cfg.downThresh && currentState === 'up') {
          currentState = 'down';
        }
      }

      // ── Form coaching ──────────────────────────────────────────────────────
      var cue = cfg.getFormCue(angle, currentState);
      if (cue) {
        badFormFrames++;
        if (badFormFrames >= BAD_THRESH) {
          speak(cue, false);
          badFormFrames = 0;
        }
      } else {
        if (badFormFrames > 0) badFormFrames--;
      }

      sendUpdate({ type:'POSE_UPDATE', angle:Math.round(angle), state:currentState, reps:localRepCount, visible:visible });
    });

    pose.initialize().then(function() {
      var camera = new Camera(videoEl, {
        onFrame: async function(){ await pose.send({ image: videoEl }); },
        width: 640, height: 480, facingMode: 'user'
      });
      camera.start().then(function(){ sendLog('Pose engine live!'); });
    });
  } catch(e) {
    sendLog('Init error: ' + e.message);
  }
}

function onRep(count) {
  var now = Date.now();
  if (now - lastRepSpeak < REP_CD) return;
  lastRepSpeak = now;
  var msg = (count % 5 === 0)
    ? (count + ' reps! Keep it up!')
    : REP_CUES[Math.floor(Math.random() * REP_CUES.length)];
  speak(msg, false);
}

</script>
</body>
</html>
`;