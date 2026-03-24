/**
 * PoseWireframe.tsx
 *
 * Renders the MediaPipe pose landmark skeleton over the camera feed.
 * Uses react-native-svg for hardware-accelerated rendering.
 *
 * The skeleton is drawn as coloured lines connecting landmark pairs,
 * with joint circles that change colour based on angle quality:
 *   - teal = good form
 *   - amber = marginal
 *   - crimson = poor form / wrong position
 */
import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { Landmark } from '@/hooks/usePoseEngine';
import { Colors } from '@/constants/theme';
import { POSE_LANDMARKS } from '@/constants/game';

const { width: W, height: H } = Dimensions.get('window');

// Skeleton connections — pairs of landmark indices
const CONNECTIONS: [number, number][] = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER,  POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER,  POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP,       POSE_LANDMARKS.RIGHT_HIP],
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW,    POSE_LANDMARKS.LEFT_WRIST],
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW,    POSE_LANDMARKS.RIGHT_WRIST],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP,   POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE,  POSE_LANDMARKS.LEFT_ANKLE],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP,  POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];

// Key joints to render as circles with angle-quality colouring
const KEY_JOINTS = [
  POSE_LANDMARKS.LEFT_ELBOW,   POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_KNEE,    POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_HIP,     POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_WRIST,   POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_ANKLE,   POSE_LANDMARKS.RIGHT_ANKLE,
];

interface PoseWireframeProps {
  landmarks: Landmark[];
  formScore: number;          // 0-100
  width?: number;
  height?: number;
}

export function PoseWireframe({
  landmarks,
  formScore,
  width = W,
  height = H,
}: PoseWireframeProps) {
  if (!landmarks || landmarks.length < 33) return null;

  const jointColor =
    formScore >= 80 ? Colors.teal :
    formScore >= 55 ? Colors.amber :
    Colors.crimson;

  const lineColor = `${Colors.teal}99`;

  function lx(lm: Landmark) { return lm.x * width; }
  function ly(lm: Landmark) { return lm.y * height; }

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      pointerEvents="none"
    >
      {/* Skeleton lines */}
      <G>
        {CONNECTIONS.map(([a, b], i) => {
          const lmA = landmarks[a];
          const lmB = landmarks[b];
          if (!lmA || !lmB) return null;
          if ((lmA.visibility ?? 0) < 0.4 || (lmB.visibility ?? 0) < 0.4) return null;
          return (
            <Line
              key={i}
              x1={lx(lmA)} y1={ly(lmA)}
              x2={lx(lmB)} y2={ly(lmB)}
              stroke={lineColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
      </G>

      {/* Joint circles */}
      <G>
        {KEY_JOINTS.map((idx) => {
          const lm = landmarks[idx];
          if (!lm || (lm.visibility ?? 0) < 0.4) return null;
          return (
            <G key={idx}>
              {/* Outer glow ring */}
              <Circle
                cx={lx(lm)} cy={ly(lm)}
                r={9}
                fill="none"
                stroke={jointColor}
                strokeWidth={1}
                strokeOpacity={0.4}
              />
              {/* Filled joint dot */}
              <Circle
                cx={lx(lm)} cy={ly(lm)}
                r={5}
                fill={jointColor}
                fillOpacity={0.85}
              />
            </G>
          );
        })}
      </G>

      {/* Form score badge (top-right) */}
      <G>
        <SvgText
          x={width - 16}
          y={40}
          textAnchor="end"
          fill={jointColor}
          fontSize={12}
          fontWeight="700"
          fontFamily="monospace"
        >
          FORM {formScore}%
        </SvgText>
      </G>
    </Svg>
  );
}
