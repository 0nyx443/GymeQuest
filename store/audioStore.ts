/**
 * store/audioStore.ts
 *
 * Persisted audio/haptic/reminder preferences for the multimodal feedback system.
 * Saved to AsyncStorage under 'gymequest-audio-prefs'.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

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

// ── Dynamic Audio Players ──
// Separate from persisted Zustand state for memory safety
let bgmSound: Audio.Sound | null = null;
let thwackSound: Audio.Sound | null = null;

export const playCombatBgm = async () => {
  try {
    if (bgmSound) {
      await bgmSound.stopAsync();
      await bgmSound.unloadAsync();
      bgmSound = null;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/audio/bgm.mp3'),
      { isLooping: true, shouldPlay: true, rate: 1.0, volume: 0.5 }
    );
    bgmSound = sound;
  } catch (e) {
    // console.log("missing bgm.mp3");
  }
};

export const setBgmSpeed = async (rate: number) => {
  if (bgmSound) {
    try {
      await bgmSound.setRateAsync(rate, true);
    } catch(e) {}
  }
};

export const stopCombatBgm = async () => {
  if (bgmSound) {
    try {
      await bgmSound.stopAsync();
      await bgmSound.unloadAsync();
    } catch(e){}
    bgmSound = null;
  }
};

export const playThwackSound = async () => {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/audio/thwack.mp3'),
      { shouldPlay: true, volume: 1.0 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      // @ts-ignore
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    // missing sound
  }
};