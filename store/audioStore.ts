/**
 * store/audioStore.ts
 *
 * Persisted audio/haptic/reminder preferences for the multimodal feedback system.
 * Saved to AsyncStorage under 'gymequest-audio-prefs'.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VibrationIntensity = 'light' | 'medium' | 'strong';
export type TTSSpeed = 'slow' | 'normal' | 'fast';
export type ReminderNotifyStyle = 'tts' | 'vibration' | 'both';

export interface AudioPrefs {
  // ── Rep Feedback ──
  repVibrationEnabled: boolean;
  repVibrationIntensity: VibrationIntensity;

  // ── Form Coaching ──
  coachingTTSEnabled: boolean;
  coachingTTSSpeed: TTSSpeed;
  coachingVibrationEnabled: boolean;
  coachingVibrationIntensity: VibrationIntensity;

  // ── Workout Reminders ──
  reminderEnabled: boolean;
  reminderHour: number;    // 0-23
  reminderMinute: number;  // 0-59
  reminderStyle: ReminderNotifyStyle;
  reminderVibrationIntensity: VibrationIntensity;
  reminderTTSMessage: string;
}

interface AudioStore extends AudioPrefs {
  setRepVibrationEnabled: (v: boolean) => void;
  setRepVibrationIntensity: (v: VibrationIntensity) => void;
  setCoachingTTSEnabled: (v: boolean) => void;
  setCoachingTTSSpeed: (v: TTSSpeed) => void;
  setCoachingVibrationEnabled: (v: boolean) => void;
  setCoachingVibrationIntensity: (v: VibrationIntensity) => void;
  setReminderEnabled: (v: boolean) => void;
  setReminderHour: (v: number) => void;
  setReminderMinute: (v: number) => void;
  setReminderStyle: (v: ReminderNotifyStyle) => void;
  setReminderVibrationIntensity: (v: VibrationIntensity) => void;
  setReminderTTSMessage: (v: string) => void;
}

const DEFAULT_PREFS: AudioPrefs = {
  repVibrationEnabled: true,
  repVibrationIntensity: 'medium',
  coachingTTSEnabled: true,
  coachingTTSSpeed: 'normal',
  coachingVibrationEnabled: false,
  coachingVibrationIntensity: 'light',
  reminderEnabled: false,
  reminderHour: 8,
  reminderMinute: 0,
  reminderStyle: 'both',
  reminderVibrationIntensity: 'medium',
  reminderTTSMessage: "Time to train, warrior! Your quest awaits.",
};

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFS,
      setRepVibrationEnabled: (v) => set({ repVibrationEnabled: v }),
      setRepVibrationIntensity: (v) => set({ repVibrationIntensity: v }),
      setCoachingTTSEnabled: (v) => set({ coachingTTSEnabled: v }),
      setCoachingTTSSpeed: (v) => set({ coachingTTSSpeed: v }),
      setCoachingVibrationEnabled: (v) => set({ coachingVibrationEnabled: v }),
      setCoachingVibrationIntensity: (v) => set({ coachingVibrationIntensity: v }),
      setReminderEnabled: (v) => set({ reminderEnabled: v }),
      setReminderHour: (v) => set({ reminderHour: v }),
      setReminderMinute: (v) => set({ reminderMinute: v }),
      setReminderStyle: (v) => set({ reminderStyle: v }),
      setReminderVibrationIntensity: (v) => set({ reminderVibrationIntensity: v }),
      setReminderTTSMessage: (v) => set({ reminderTTSMessage: v }),
    }),
    {
      name: 'gymequest-audio-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Maps VibrationIntensity to expo-haptics ImpactFeedbackStyle string */
export function intensityToHaptic(intensity: VibrationIntensity): 'Light' | 'Medium' | 'Heavy' {
  if (intensity === 'light') return 'Light';
  if (intensity === 'strong') return 'Heavy';
  return 'Medium';
}

/** Maps TTSSpeed to expo-speech rate number */
export function speedToRate(speed: TTSSpeed): number {
  if (speed === 'slow') return 0.8;
  if (speed === 'fast') return 1.25;
  return 1.0;
}