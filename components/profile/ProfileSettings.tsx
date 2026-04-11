/**
 * components/profile/ProfileSettings.tsx
 *
 * Settings screen with fully working modals.
 * NOTE: expo-notifications is temporarily mocked to prevent SDK 52 Expo Go crashes.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, Switch, Platform,
} from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useGameStore } from '@/store/gameStore';
import {
  useAudioStore,
  VibrationIntensity,
  TTSSpeed,
  ReminderNotifyStyle,
  intensityToHaptic,
  speedToRate,
} from '@/store/audioStore';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// ─── THE BYPASS: Mocking Notifications for Expo Go ────────────────────────────
// By using this dummy object, we prevent the "Missing ExpoPushTokenManager" crash
// while keeping all your UI state logic perfectly intact!
const Notifications = {
  setNotificationHandler: () => { },
  cancelAllScheduledNotificationsAsync: async () => { },
  requestPermissionsAsync: async () => {
    Alert.alert(
      'Dev Build Required',
      'Actual push notifications require a custom Development Build in Expo SDK 52+. This switch is currently in Simulation Mode so you can safely test the UI!'
    );
    return { status: 'granted' };
  },
  getPermissionsAsync: async () => ({ status: 'granted' }),
  scheduleNotificationAsync: async (config: any) => {
    console.log('✅ [SIMULATED NOTIFICATION SCHEDULED]:', config.content.body);
  },
};

Notifications.setNotificationHandler();
// ──────────────────────────────────────────────────────────────────────────────

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={sub.sectionRow}>
      <Text style={sub.sectionText}>{text}</Text>
    </View>
  );
}

function ToggleRow({
  label, value, onToggle, sublabel,
}: { label: string; value: boolean; onToggle: (v: boolean) => void; sublabel?: string }) {
  return (
    <View style={sub.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={sub.toggleLabel}>{label}</Text>
        {sublabel ? <Text style={sub.toggleSub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#CBD5E1', true: AuthColors.tealLink }}
        thumbColor={value ? '#FFFFFF' : '#F1F5F9'}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  label, options, value, onSelect, disabled,
}: { label: string; options: { key: T; label: string }[]; value: T; onSelect: (v: T) => void; disabled?: boolean }) {
  return (
    <View style={[sub.chipBlock, disabled && { opacity: 0.4 }]}>
      <Text style={sub.chipLabel}>{label}</Text>
      <View style={sub.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[sub.chip, value === opt.key && sub.chipActive]}
            onPress={() => !disabled && onSelect(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[sub.chipText, value === opt.key && sub.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={sub.modalHeader}>
      <Text style={sub.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="close" size={24} color={AuthColors.navy} />
      </TouchableOpacity>
    </View>
  );
}

function Divider() {
  return <View style={sub.divider} />;
}

const sub = StyleSheet.create({
  sectionRow: { backgroundColor: AuthColors.navy, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12, marginTop: 4 },
  sectionText: { fontFamily: Fonts.pixel, fontSize: 9, color: '#FFFFFF', letterSpacing: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  toggleLabel: { fontFamily: Fonts.vt323, fontSize: 20, color: AuthColors.navy },
  toggleSub: { fontFamily: Fonts.vt323, fontSize: 15, color: '#64748B', marginTop: 1 },
  chipBlock: { marginBottom: 12 },
  chipLabel: { fontFamily: Fonts.vt323, fontSize: 16, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: AuthColors.navy, borderColor: AuthColors.navy },
  chipText: { fontFamily: Fonts.vt323, fontSize: 18, color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 3, borderColor: '#E2E8F0', paddingBottom: 12 },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.crimson },
  divider: { height: 2, backgroundColor: '#E2E8F0', marginVertical: 12 },
});

// ─── Physical Traits form helpers ─────────────────────────────────────────────

function PI(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={piSt.wrap}>
      <TextInput style={piSt.input} placeholderTextColor="#6B7280" {...props} />
    </View>
  );
}
const piSt = StyleSheet.create({
  wrap: { marginBottom: 20, shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  input: { height: 62, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441', paddingHorizontal: 12, fontFamily: Fonts.vt323, fontSize: 24, color: '#123441' },
});

function SexToggle({ value, onChange }: { value: 'male' | 'female'; onChange: (v: 'male' | 'female') => void }) {
  return (
    <View style={stSt.row}>
      {(['male', 'female'] as const).map((v) => (
        <TouchableOpacity key={v} style={[stSt.btn, value === v && stSt.active]} onPress={() => onChange(v)}>
          <Text style={stSt.text}>{v === 'male' ? 'MALE' : 'FEMALE'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const stSt = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  btn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441', shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  active: { backgroundColor: '#C6E8F8' },
  text: { fontFamily: Fonts.pixel, fontSize: 10, lineHeight: 15, color: '#123441' },
});

function FL({ text }: { text: string }) { return <Text style={flSt.label}>{text}</Text>; }
const flSt = StyleSheet.create({ label: { fontFamily: Fonts.vt323, fontSize: 20, lineHeight: 28, letterSpacing: 1, textTransform: 'uppercase', color: '#123441' } });

// ─── Settings item row ────────────────────────────────────────────────────────

interface SettingsItemProps { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; sublabel?: string; onPress?: () => void; badge?: string; badgeColor?: string; }
function SettingsItem({ icon, label, sublabel, onPress, badge, badgeColor }: SettingsItemProps) {
  return (
    <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={AuthColors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemLabel}>{label}</Text>
          {sublabel ? <Text style={styles.itemSublabel}>{sublabel}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor ?? AuthColors.tealLink }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name="chevron-right" size={20} color="#8D99AE" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfileSettings() {
  const setShowTutorial = useGameStore((s) => s.setShowTutorial);
  const avatar = useGameStore((s) => s.avatar);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const syncProfile = useGameStore((s) => s.syncProfile);

  const [showTraits, setShowTraits] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const [birthday, setBirthday] = useState(avatar.birthday || '');
  const [sex, setSex] = useState<'male' | 'female'>((avatar.sex as any) || 'male');
  const [height, setHeight] = useState(avatar.height_cm ? String(avatar.height_cm) : '');
  const [weight, setWeight] = useState(avatar.weight_kg ? String(avatar.weight_kg) : '');

  const audio = useAudioStore();

  const [reminderHourStr, setReminderHourStr] = useState(String(audio.reminderHour).padStart(2, '0'));
  const [reminderMinStr, setReminderMinStr] = useState(String(audio.reminderMinute).padStart(2, '0'));
  const [customMessage, setCustomMessage] = useState(audio.reminderTTSMessage);

  const audioBadge = audio.coachingTTSEnabled || audio.coachingVibrationEnabled || audio.repVibrationEnabled ? 'ON' : 'OFF';
  const reminderBadge = audio.reminderEnabled ? formatTime(audio.reminderHour, audio.reminderMinute) : 'OFF';

  function formatTime(h: number, m: number) {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  const handleSaveTraits = async () => {
    setAvatar({ birthday: birthday.trim() || undefined, sex, height_cm: height ? parseInt(height) : undefined, weight_kg: weight ? parseInt(weight) : undefined });
    setShowTraits(false);
    try { await syncProfile(); } catch (e: any) { Alert.alert('Sync Error', e.message); }
  };

  const testHaptic = (intensity: VibrationIntensity) => {
    const style = intensityToHaptic(intensity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
  };

  const testTTS = () => {
    Speech.speak('This is how your coaching will sound.', { rate: speedToRate(audio.coachingTTSSpeed) });
  };

  const handleSaveReminder = async () => {
    const h = Math.min(23, Math.max(0, parseInt(reminderHourStr) || 0));
    const m = Math.min(59, Math.max(0, parseInt(reminderMinStr) || 0));
    audio.setReminderHour(h);
    audio.setReminderMinute(m);
    audio.setReminderTTSMessage(customMessage.trim() || "Time to train, warrior! Your quest awaits.");

    if (audio.reminderEnabled) {
      await scheduleReminder(h, m, audio.reminderStyle, customMessage, audio.reminderVibrationIntensity);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setShowReminder(false);
  };

  const scheduleReminder = async (hour: number, minute: number, style: ReminderNotifyStyle, message: string, vibIntensity: VibrationIntensity) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const body = (style === 'tts' || style === 'both') ? message : 'Time to train! 💪';
      await Notifications.scheduleNotificationAsync({
        content: { title: '⚔️ GYME Quest', body, sound: true },
        trigger: { hour, minute, repeats: true } as any,
      });
    } catch (e: any) {
      Alert.alert('Reminder Error', e.message);
    }
  };

  const handleLogout = async () => {
    const title = 'Quit';
    const message = 'Are you sure you want to sign out?';

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}: ${message}`)) {
        await supabase.auth.signOut();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      {/* ── GAMEPLAY section ── */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>GAMEPLAY</Text>
        </View>
        <View style={styles.list}>
          <SettingsItem icon="help-circle" label="How to Play" sublabel="View tutorial steps" onPress={() => setShowTutorial(true)} />
          <SettingsItem icon="volume-high" label="Audio & Feedback" sublabel="Voice, vibration settings" badge={audioBadge} badgeColor={audioBadge === 'ON' ? AuthColors.tealLink : '#94A3B8'} onPress={() => setShowAudio(true)} />
          <SettingsItem icon="camera" label="Calibrate Camera" sublabel="Placement tips for best tracking" onPress={() => setShowCamera(true)} />
        </View>
      </View>

      {/* ── ACCOUNT section ── */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>ACCOUNT</Text>
        </View>
        <View style={styles.list}>
          <SettingsItem icon="human-edit" label="Edit Physical Traits" sublabel="Height, weight, birthday" onPress={() => setShowTraits(true)} />
          <SettingsItem icon="bell" label="Workout Reminders" sublabel="Daily training notification" badge={reminderBadge} badgeColor={audio.reminderEnabled ? AuthColors.crimson : '#94A3B8'} onPress={() => setShowReminder(true)} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color={AuthColors.crimson} />
        <Text style={styles.logoutText}>QUIT</Text>
      </TouchableOpacity>

      {/* ════════════════════════════════════════════════
          MODAL: Edit Physical Traits
      ════════════════════════════════════════════════ */}
      <Modal visible={showTraits} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <ModalHeader title="EDIT TRAITS" onClose={() => setShowTraits(false)} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <FL text="[ BIRTHDAY ]" />
              <PI placeholder="YYYY-MM-DD" value={birthday} onChangeText={setBirthday} maxLength={10} />
              <FL text="[ SEX ]" />
              <SexToggle value={sex} onChange={setSex} />
              <FL text="[ HEIGHT (CM) ]" />
              <PI placeholder="e.g. 175" value={height} onChangeText={setHeight} keyboardType="numeric" maxLength={5} />
              <FL text="[ WEIGHT (KG) ]" />
              <PI placeholder="e.g. 70" value={weight} onChangeText={setWeight} keyboardType="numeric" maxLength={5} />
              <TouchableOpacity style={modal.saveBtn} onPress={handleSaveTraits}>
                <Text style={modal.saveBtnText}>UPDATE PROFILE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL: Audio & Feedback
      ════════════════════════════════════════════════ */}
      <Modal visible={showAudio} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <ModalHeader title="AUDIO & FEEDBACK" onClose={() => setShowAudio(false)} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

              {/* ── REP FEEDBACK ── */}
              <SectionLabel text="[ REP FEEDBACK ]" />
              <ToggleRow label="Vibration on Rep" sublabel="Haptic pulse each time a rep is counted" value={audio.repVibrationEnabled} onToggle={audio.setRepVibrationEnabled} />
              {audio.repVibrationEnabled && (
                <>
                  <ChipRow<VibrationIntensity> label="Intensity" options={[{ key: 'light', label: 'LIGHT' }, { key: 'medium', label: 'MEDIUM' }, { key: 'strong', label: 'STRONG' }]} value={audio.repVibrationIntensity} onSelect={audio.setRepVibrationIntensity} />
                  <TouchableOpacity style={modal.testBtn} onPress={() => testHaptic(audio.repVibrationIntensity)}>
                    <MaterialCommunityIcons name="vibrate" size={16} color={AuthColors.navy} />
                    <Text style={modal.testBtnText}>TEST VIBRATION</Text>
                  </TouchableOpacity>
                </>
              )}

              <Divider />

              {/* ── FORM COACHING ── */}
              <SectionLabel text="[ FORM COACHING ]" />
              <ToggleRow label="Voice Coaching (TTS)" sublabel="Spoken form corrections during exercise" value={audio.coachingTTSEnabled} onToggle={audio.setCoachingTTSEnabled} />
              {audio.coachingTTSEnabled && (
                <>
                  <ChipRow<TTSSpeed> label="Speech Speed" options={[{ key: 'slow', label: 'SLOW' }, { key: 'normal', label: 'NORMAL' }, { key: 'fast', label: 'FAST' }]} value={audio.coachingTTSSpeed} onSelect={audio.setCoachingTTSSpeed} />
                  <TouchableOpacity style={modal.testBtn} onPress={testTTS}>
                    <MaterialCommunityIcons name="text-to-speech" size={16} color={AuthColors.navy} />
                    <Text style={modal.testBtnText}>TEST VOICE</Text>
                  </TouchableOpacity>
                </>
              )}

              <ToggleRow label="Vibration on Form Alert" sublabel="Haptic buzz when your form needs correction" value={audio.coachingVibrationEnabled} onToggle={audio.setCoachingVibrationEnabled} />
              {audio.coachingVibrationEnabled && (
                <>
                  <ChipRow<VibrationIntensity> label="Intensity" options={[{ key: 'light', label: 'LIGHT' }, { key: 'medium', label: 'MEDIUM' }, { key: 'strong', label: 'STRONG' }]} value={audio.coachingVibrationIntensity} onSelect={audio.setCoachingVibrationIntensity} />
                  <TouchableOpacity style={modal.testBtn} onPress={() => testHaptic(audio.coachingVibrationIntensity)}>
                    <MaterialCommunityIcons name="vibrate" size={16} color={AuthColors.navy} />
                    <Text style={modal.testBtnText}>TEST VIBRATION</Text>
                  </TouchableOpacity>
                </>
              )}

              {!audio.coachingTTSEnabled && !audio.coachingVibrationEnabled && (
                <View style={modal.warningBox}>
                  <Ionicons name="warning" size={16} color="#92400E" />
                  <Text style={modal.warningText}>All form coaching is off. Enable at least one to receive feedback.</Text>
                </View>
              )}

              <TouchableOpacity style={modal.saveBtn} onPress={() => setShowAudio(false)}>
                <Text style={modal.saveBtnText}>SAVE PREFERENCES</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL: Calibrate Camera
      ════════════════════════════════════════════════ */}
      <Modal visible={showCamera} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <ModalHeader title="CALIBRATE CAMERA" onClose={() => setShowCamera(false)} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={modal.infoBox}>
                <Ionicons name="information-circle" size={20} color={AuthColors.tealLink} />
                <Text style={modal.infoText}>Proper camera placement ensures accurate rep counting and form detection.</Text>
              </View>

              {[
                { icon: 'ruler' as const, title: 'DISTANCE', desc: 'Place your device 5–8 feet (1.5–2.5m) away so your full body fits in frame.', color: AuthColors.tealLink },
                { icon: 'phone-rotate-portrait' as const, title: 'ORIENTATION', desc: 'Keep the phone in portrait mode. Prop it against a wall or use a stand at chest height.', color: '#765A05' },
                { icon: 'weather-sunny' as const, title: 'LIGHTING', desc: 'Face a light source — avoid bright backlighting. Good front lighting improves detection.', color: '#D97706' },
                { icon: 'human-handsup' as const, title: 'VISIBILITY', desc: 'Make sure your arms AND legs are visible at all times during the exercise.', color: AuthColors.crimson },
                { icon: 'tshirt-crew' as const, title: 'CLOTHING', desc: 'Wear form-fitting clothes if possible — loose clothing can confuse the pose model.', color: '#7C3AED' },
              ].map((tip) => (
                <View key={tip.title} style={modal.tipCard}>
                  <View style={[modal.tipIcon, { backgroundColor: tip.color }]}>
                    <MaterialCommunityIcons name={tip.icon} size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modal.tipTitle}>{tip.title}</Text>
                    <Text style={modal.tipDesc}>{tip.desc}</Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={modal.saveBtn} onPress={() => setShowCamera(false)}>
                <Text style={modal.saveBtnText}>GOT IT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════
          MODAL: Workout Reminders
      ════════════════════════════════════════════════ */}
      <Modal visible={showReminder} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <ModalHeader title="WORKOUT REMINDERS" onClose={() => setShowReminder(false)} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

              <ToggleRow
                label="Daily Reminder"
                sublabel="Get notified to train every day"
                value={audio.reminderEnabled}
                onToggle={async (v) => {
                  if (v) {
                    // Safe simulated prompt
                    await Notifications.requestPermissionsAsync();
                  } else {
                    Notifications.cancelAllScheduledNotificationsAsync();
                  }
                  audio.setReminderEnabled(v);
                }}
              />

              {audio.reminderEnabled && (
                <>
                  <Divider />
                  <SectionLabel text="[ REMINDER TIME ]" />

                  <View style={modal.timeRow}>
                    <View style={modal.timeInput}>
                      <Text style={modal.timeLabel}>HOUR</Text>
                      <TextInput style={modal.timeField} value={reminderHourStr} onChangeText={(t) => setReminderHourStr(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} placeholder="08" placeholderTextColor="#94A3B8" />
                      <Text style={modal.timeHint}>0 – 23</Text>
                    </View>
                    <Text style={modal.timeSep}>:</Text>
                    <View style={modal.timeInput}>
                      <Text style={modal.timeLabel}>MIN</Text>
                      <TextInput style={modal.timeField} value={reminderMinStr} onChangeText={(t) => setReminderMinStr(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor="#94A3B8" />
                      <Text style={modal.timeHint}>0 – 59</Text>
                    </View>
                    <View style={modal.timePreview}>
                      <Text style={modal.timePreviewLabel}>PREVIEW</Text>
                      <Text style={modal.timePreviewValue}>
                        {formatTime(Math.min(23, parseInt(reminderHourStr) || 0), Math.min(59, parseInt(reminderMinStr) || 0))}
                      </Text>
                    </View>
                  </View>

                  <Divider />
                  <SectionLabel text="[ NOTIFICATION STYLE ]" />

                  <ChipRow<ReminderNotifyStyle> label="How to notify you" options={[{ key: 'tts', label: 'VOICE' }, { key: 'vibration', label: 'VIBRATE' }, { key: 'both', label: 'BOTH' }]} value={audio.reminderStyle} onSelect={audio.setReminderStyle} />

                  {(audio.reminderStyle === 'vibration' || audio.reminderStyle === 'both') && (
                    <ChipRow<VibrationIntensity> label="Vibration Intensity" options={[{ key: 'light', label: 'LIGHT' }, { key: 'medium', label: 'MEDIUM' }, { key: 'strong', label: 'STRONG' }]} value={audio.reminderVibrationIntensity} onSelect={audio.setReminderVibrationIntensity} />
                  )}

                  {(audio.reminderStyle === 'tts' || audio.reminderStyle === 'both') && (
                    <>
                      <Divider />
                      <SectionLabel text="[ VOICE MESSAGE ]" />

                      <View style={modal.messageHintBox}>
                        <Ionicons name="create-outline" size={14} color={AuthColors.tealLink} />
                        <Text style={modal.messageHint}>Customize what the voice says when your reminder fires. Tap the box below to edit.</Text>
                      </View>

                      <TextInput style={modal.messageInput} value={customMessage} onChangeText={setCustomMessage} multiline numberOfLines={3} placeholder="Time to train, warrior! Your quest awaits." placeholderTextColor="#94A3B8" />

                      <TouchableOpacity style={modal.ghostBtn} onPress={() => setCustomMessage("Time to train, warrior! Your quest awaits.")}>
                        <MaterialCommunityIcons name="refresh" size={14} color="#64748B" />
                        <Text style={modal.ghostBtnText}>RESET TO DEFAULT</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={modal.testBtn} onPress={() => Speech.speak(customMessage || "Time to train, warrior! Your quest awaits.")}>
                        <MaterialCommunityIcons name="text-to-speech" size={16} color={AuthColors.navy} />
                        <Text style={modal.testBtnText}>PREVIEW VOICE MESSAGE</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              <TouchableOpacity style={modal.saveBtn} onPress={handleSaveReminder}>
                <Text style={modal.saveBtnText}>{audio.reminderEnabled ? 'SAVE & SCHEDULE' : 'SAVE'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Shared modal styles ──────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F3FAFF', borderTopWidth: 4, borderTopColor: AuthColors.navy, borderLeftWidth: 4, borderLeftColor: AuthColors.navy, borderRightWidth: 4, borderRightColor: AuthColors.navy, padding: 20, maxHeight: '88%' },
  saveBtn: { backgroundColor: AuthColors.tealLink, borderWidth: 3, borderColor: AuthColors.navy, paddingVertical: 16, alignItems: 'center', marginTop: 16, shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  saveBtnText: { fontFamily: Fonts.pixel, fontSize: 12, color: '#FFFFFF' },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: AuthColors.navy, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start', marginBottom: 8, shadowColor: AuthColors.navy, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  testBtnText: { fontFamily: Fonts.pixel, fontSize: 9, color: AuthColors.navy },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 8 },
  ghostBtnText: { fontFamily: Fonts.vt323, fontSize: 16, color: '#64748B', textDecorationLine: 'underline' },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderWidth: 2, borderColor: '#D97706', padding: 12, marginBottom: 8 },
  warningText: { flex: 1, fontFamily: Fonts.vt323, fontSize: 16, color: '#92400E', lineHeight: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: AuthColors.tealLink, padding: 12, marginBottom: 16 },
  infoText: { flex: 1, fontFamily: Fonts.vt323, fontSize: 17, color: '#1E3A5F', lineHeight: 21 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 14, marginBottom: 12, shadowColor: AuthColors.navy, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  tipIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: AuthColors.navy },
  tipTitle: { fontFamily: Fonts.pixel, fontSize: 9, color: AuthColors.navy, marginBottom: 4 },
  tipDesc: { fontFamily: Fonts.vt323, fontSize: 17, color: '#3D494C', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timeInput: { alignItems: 'center' },
  timeLabel: { fontFamily: Fonts.vt323, fontSize: 14, color: '#64748B', letterSpacing: 1, marginBottom: 4 },
  timeField: { width: 72, height: 56, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, textAlign: 'center', fontFamily: Fonts.pixel, fontSize: 20, color: AuthColors.navy, shadowColor: AuthColors.navy, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  timeHint: { fontFamily: Fonts.vt323, fontSize: 13, color: '#94A3B8', marginTop: 2 },
  timeSep: { fontFamily: Fonts.pixel, fontSize: 24, color: AuthColors.navy, marginTop: 8 },
  timePreview: { flex: 1, alignItems: 'center', backgroundColor: '#E0F2FE', borderWidth: 2, borderColor: AuthColors.tealLink, padding: 8 },
  timePreviewLabel: { fontFamily: Fonts.vt323, fontSize: 13, color: AuthColors.tealLink, letterSpacing: 1 },
  timePreviewValue: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.navy, marginTop: 2 },
  messageHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: AuthColors.tealLink, padding: 10, marginBottom: 10 },
  messageHint: { flex: 1, fontFamily: Fonts.vt323, fontSize: 16, color: '#166534', lineHeight: 20 },
  messageInput: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 12, fontFamily: Fonts.vt323, fontSize: 20, color: AuthColors.navy, minHeight: 80, textAlignVertical: 'top', marginBottom: 8, shadowColor: AuthColors.navy, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
});

const styles = StyleSheet.create({
  container: { marginTop: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerLabel: { fontFamily: Fonts.vt323, fontSize: 18, color: '#3D494C', letterSpacing: 2 },
  headerTitle: { fontFamily: Fonts.pixel, fontSize: 28, color: AuthColors.crimson, marginTop: 4 },
  sectionBlock: { marginBottom: 24 },
  sectionHeader: { backgroundColor: AuthColors.navy, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12 },
  sectionHeaderText: { fontFamily: Fonts.pixel, fontSize: 10, color: '#FFFFFF', letterSpacing: 2 },
  list: { gap: 10 },
  item: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: AuthColors.navy, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemLabel: { fontFamily: Fonts.pixel, fontSize: 10, color: AuthColors.navy },
  itemSublabel: { fontFamily: Fonts.vt323, fontSize: 15, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  badgeText: { fontFamily: Fonts.vt323, fontSize: 14, color: '#FFFFFF', letterSpacing: 1 },
  logoutButton: { borderWidth: 3, borderColor: AuthColors.crimson, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF', shadowColor: AuthColors.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4, marginTop: 8 },
  logoutText: { fontFamily: Fonts.pixel, fontSize: 14, color: AuthColors.crimson },
});