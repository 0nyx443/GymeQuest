/**
 * usePoseEngine.ts
 *
 * Exercises: push_up | squat | sit_up | pull_up
 *
 * Reads from audioStore for:
 * - coachingTTSEnabled / coachingTTSSpeed
 * - coachingVibrationEnabled / coachingVibrationIntensity
 */
import { useCallback, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { ExerciseType } from '@/constants/game';
import { useAudioStore, intensityToHaptic, speedToRate } from '@/store/audioStore';

export type RepState = 'up' | 'down' | 'transitioning' | 'invalid';

export interface PoseEngineOutput {
  primaryAngle: number;
  repState: RepState;
  repCount: number;
  isBodyVisible: boolean;
  isPositionReady: boolean;  // full-body check for pre-battle positioning
  formFeedback: string | null;
  debugMsg: string;
  processPoseData: (jsonString: string) => void;
}

export function usePoseEngine(exercise: ExerciseType, active: boolean): PoseEngineOutput {
  const [repCount, setRepCount]         = useState(0);
  const [repState, setRepState]         = useState<RepState>('up');
  const [primaryAngle, setPrimaryAngle] = useState(180);
  // Start as false — the WebView must confirm body is visible, not the default
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  // Full-body check for positioning phase (requires shoulders + hips + knees)
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [debugMsg, setDebugMsg]         = useState('Booting AI Engine...');

  const lastTextRef = useRef('');
  const lastTimeRef = useRef(0);

  // Read prefs live from store each call (store is reactive)
  const audioPrefs = useAudioStore();

  const handleSpeakRequest = useCallback((text: string, priority: boolean) => {
    if (!audioPrefs.coachingTTSEnabled) return;
    const now = Date.now();
    if (!priority && text === lastTextRef.current && now - lastTimeRef.current < 7000) return;
    lastTextRef.current = text;
    lastTimeRef.current = now;
    if (priority) Speech.stop();
    Speech.speak(text, { rate: speedToRate(audioPrefs.coachingTTSSpeed), pitch: 1.0 });
  }, [audioPrefs.coachingTTSEnabled, audioPrefs.coachingTTSSpeed]);

  const handleVibrateRequest = useCallback(() => {
    if (!audioPrefs.coachingVibrationEnabled) return;
    const style = intensityToHaptic(audioPrefs.coachingVibrationIntensity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
  }, [audioPrefs.coachingVibrationEnabled, audioPrefs.coachingVibrationIntensity]);

  const processPoseData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);

      if (parsed.type === 'SPEAK') {
        handleSpeakRequest(parsed.text, parsed.priority ?? false);
        if (parsed.priority === false) handleVibrateRequest();
        return;
      }

      if (parsed.log) {
        setDebugMsg(parsed.log);
        return;
      }

      if (parsed.type !== 'POSE_UPDATE') return;

      // Always update visibility — needed for positioning phase (active may be false)
      setIsBodyVisible(parsed.visible ?? false);
      setIsPositionReady(parsed.fullBody ?? false);

      // Only update rep-tracking state when battle is actually active
      if (active) {
        setPrimaryAngle(parsed.angle);
        setRepState(parsed.state);
        setRepCount(parsed.reps);
        setFormFeedback(parsed.cue || null);
      }
    } catch {
      // ignore frame errors
    }
  }, [active, handleSpeakRequest, handleVibrateRequest]);

  return { primaryAngle, repState, repCount, isBodyVisible, isPositionReady, formFeedback, processPoseData, debugMsg };
}

// ─── MediaPipe WebView HTML ───────────────────────────────────────────────────
// No TTS logic here — all speech/vibration handled natively via postMessage bridge.

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
function speak(text, priority) {
  sendUpdate({ type: 'SPEAK', text: text, priority: !!priority });
}

function calcAngle3D(a, b, c) {
  var ax=a.x-b.x, ay=a.y-b.y, az=(a.z||0)-(b.z||0);
  var cx=c.x-b.x, cy=c.y-b.y, cz=(c.z||0)-(b.z||0);
  var dot=ax*cx+ay*cy+az*cz;
  var mA=Math.sqrt(ax*ax+ay*ay+az*az);
  var mC=Math.sqrt(cx*cx+cy*cy+cz*cz);
  if(mA===0||mC===0) return 180;
  return (Math.acos(Math.max(-1,Math.min(1,dot/(mA*mC))))*180)/Math.PI;
}

var CONFIGS = {
  push_up: {
    downThresh:110, upThresh:145, invertedLogic:false,
    getAngle:function(lms){
      var vL=(lms[11].visibility+lms[13].visibility+lms[15].visibility)/3;
      var vR=(lms[12].visibility+lms[14].visibility+lms[16].visibility)/3;
      return vL>vR?calcAngle3D(lms[11],lms[13],lms[15]):calcAngle3D(lms[12],lms[14],lms[16]);
    },
    getVisible:function(lms){return lms[11].visibility>0.5||lms[12].visibility>0.5;},
    getFormCue:function(angle,state){
      if(state==='down'&&angle>108) return 'Lower your chest, bend your elbows more';
      if(state==='up'&&angle<150)   return 'Fully extend your arms at the top';
      return null;
    }
  },
  pull_up: {
    downThresh:110, upThresh:145, invertedLogic:false,
    getAngle:function(lms){
      var vL=(lms[11].visibility+lms[13].visibility+lms[15].visibility)/3;
      var vR=(lms[12].visibility+lms[14].visibility+lms[16].visibility)/3;
      return vL>vR?calcAngle3D(lms[11],lms[13],lms[15]):calcAngle3D(lms[12],lms[14],lms[16]);
    },
    getVisible:function(lms){return lms[11].visibility>0.5||lms[12].visibility>0.5;},
    getFormCue:function(angle,state){
      if(state==='down'&&angle>120) return 'Pull higher, chin above the bar';
      if(state==='up'&&angle<160)   return 'Lower all the way down for full range';
      return null;
    }
  },
  squat: {
    downThresh:110, upThresh:155, invertedLogic:false,
    getAngle:function(lms){
      var vL=(lms[23].visibility+lms[25].visibility+lms[27].visibility)/3;
      var vR=(lms[24].visibility+lms[26].visibility+lms[28].visibility)/3;
      return vL>vR?calcAngle3D(lms[23],lms[25],lms[27]):calcAngle3D(lms[24],lms[26],lms[28]);
    },
    getVisible:function(lms){return lms[25].visibility>0.4||lms[26].visibility>0.4;},
    getFormCue:function(angle,state){
      if(state==='down'&&angle>118) return 'Squat deeper, get your thighs parallel to the floor';
      if(state==='up'&&angle<162)   return 'Stand up fully to complete the rep';
      return null;
    }
  },
  sit_up: {
    downThresh:130, upThresh:75, invertedLogic:true,
    getAngle:function(lms){
      var vL=(lms[11].visibility+lms[23].visibility+lms[25].visibility)/3;
      var vR=(lms[12].visibility+lms[24].visibility+lms[26].visibility)/3;
      return vL>vR?calcAngle3D(lms[11],lms[23],lms[25]):calcAngle3D(lms[12],lms[24],lms[26]);
    },
    getVisible:function(lms){return lms[23].visibility>0.4||lms[24].visibility>0.4;},
    getFormCue:function(angle,state){
      if(state==='up'&&angle>82)    return 'Crunch higher, bring your chest toward your knees';
      if(state==='down'&&angle<138) return 'Lower all the way down to reset';
      return null;
    }
  }
};

var exerciseType  = 'push_up';
var cfg           = CONFIGS[exerciseType];
var currentState  = 'up';
var localRepCount = 0;
var badFormFrames = 0;
var BAD_THRESH    = 25;
var noBodyFrames  = 0;
var NO_BODY_THRESH = 60;
var noBodySpoken  = false;

window.setExerciseType = function(type) {
  if (!CONFIGS[type]) return;
  exerciseType  = type;
  cfg           = CONFIGS[type];
  currentState  = (type==='sit_up') ? 'down' : 'up';
  localRepCount = 0;
  badFormFrames = 0;
  noBodyFrames  = 0;
  noBodySpoken  = false;
  sendLog('Exercise set: ' + type);
};

window.speakVictory = function() {
  speak('Quest complete! You defeated the enemy!', true);
};

// Spoken after countdown ends — reinforces what to do
window.speakStart = function(exerciseName, enemyName) {
  var target = (enemyName && enemyName !== 'undefined') ? enemyName : 'the enemy';
  speak('Defeat ' + target + ' by doing ' + exerciseName + 's. Go!', true);
};

// Spoken as soon as camera is ready — guides user into starting position
window.speakGetInPosition = function(exerciseName) {
  speak('Get in position for ' + exerciseName + 's. Make sure your full body is visible in the camera.', true);
};

// Spoken once body is confirmed in correct position
window.speakBattleStart = function() {
  speak('Great! Battle starts now. Get ready!', true);
};

var bootInterval = setInterval(function() {
  if (window.ReactNativeWebView) {
    clearInterval(bootInterval);
    sendLog('Bridge ready. Loading pose model...');
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
      modelComplexity:0, smoothLandmarks:true,
      enableSegmentation:false,
      minDetectionConfidence:0.5, minTrackingConfidence:0.5
    });

    pose.onResults(function(results) {
      canvasEl.width  = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.save();
      ctx.clearRect(0,0,canvasEl.width,canvasEl.height);

      if (!results.poseLandmarks) {
        noBodyFrames++;
        if (noBodyFrames===NO_BODY_THRESH && !noBodySpoken) {
          speak('Step back so I can see your full body.', false);
          noBodySpoken = true;
        }
        sendLog('No body detected');
        ctx.restore();
        return;
      }

      if (noBodyFrames > 0) { noBodyFrames=0; noBodySpoken=false; }

      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {color:'#48CAE4',lineWidth:4});
      drawLandmarks(ctx, results.poseLandmarks, {color:'#48CAE4',lineWidth:2,radius:4});
      ctx.restore();

      var lms     = results.poseLandmarks;
      var visible = cfg.getVisible(lms);

      // Full-body check for positioning phase: requires shoulders + hips + knees
      // Prevents face-only camera views from passing the 'get in position' gate
      function isFullBodyReady() {
        var hasShoulder = Math.max(lms[11].visibility, lms[12].visibility) > 0.5;
        var hasHip      = Math.max(lms[23].visibility, lms[24].visibility) > 0.4;
        var hasKnee     = Math.max(lms[25].visibility, lms[26].visibility) > 0.3;
        return hasShoulder && hasHip && hasKnee;
      }

      if (!visible) {
        var invisibleCue = 'Adjust camera to show your whole body';
        sendUpdate({type:'POSE_UPDATE',angle:180,state:currentState,reps:localRepCount,visible:false,fullBody:isFullBodyReady(),cue:invisibleCue});
        return;
      }

      var angle = cfg.getAngle(lms);

      if (!cfg.invertedLogic) {
        if (angle<=cfg.downThresh && currentState==='up')   { currentState='down'; }
        else if (angle>=cfg.upThresh && currentState==='down') { currentState='up'; localRepCount++; }
      } else {
        if (angle<=cfg.upThresh && currentState==='down')   { currentState='up'; localRepCount++; }
        else if (angle>=cfg.downThresh && currentState==='up') { currentState='down'; }
      }

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

      sendUpdate({type:'POSE_UPDATE',angle:Math.round(angle),state:currentState,reps:localRepCount,visible:visible,fullBody:isFullBodyReady(),cue:cue});
    });

    pose.initialize().then(function() {
      var camera = new Camera(videoEl, {
        onFrame: async function(){ await pose.send({image:videoEl}); },
        width:640, height:480, facingMode:'user'
      });
      camera.start().then(function(){ sendLog('Pose engine live!'); });
    });
  } catch(e) {
    sendLog('Init error: ' + e.message);
  }
}

</script>
</body>
</html>
`;