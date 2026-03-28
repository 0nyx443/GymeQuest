/**
 * screens/RegisterScreen.tsx
 *
 * Full pixel-art character creation / registration form.
 * Shown when a new user clicks CREATE CHARACTER.
 * Handles: supabase.auth.signUp + profile upsert in one shot.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
import { useGameStore } from '@/store/gameStore';

const AC = AuthColors;

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  onBack: () => void;
};

// ─── Avatar definitions ───────────────────────────────────────────────────────
const AVATARS = [
  { label: 'THE IRON FIST', bg: '#4A90D9', body: '#2C5F8A', accent: '#87CEEB' },
  { label: 'SHADOW BLADE',  bg: '#8B6914', body: '#5A4309', accent: '#DAB65E' },
  { label: 'STORM CALLER',  bg: '#7B3FA0', body: '#4A1F6B', accent: '#C59FD0' },
  { label: 'FLAME WARDEN',  bg: '#BB152C', body: '#7A0E1E', accent: '#F4A0A0' },
];

// ─── Fitness tiers ────────────────────────────────────────────────────────────
const TIERS = [
  { id: 'villager', label: 'VILLAGER', desc: 'I am new to exercise.',        rank: 'RECRUIT'    },
  { id: 'squire',   label: 'SQUIRE',   desc: 'I work out occasionally.',     rank: 'APPRENTICE' },
  { id: 'knight',   label: 'KNIGHT',   desc: 'I am a calisthenics veteran.', rank: 'VETERAN'    },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function PixelToast({ message, visible }: { message: string; visible: boolean }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toastSt.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={toastSt.box}>
        <Text style={toastSt.icon}>⚠</Text>
        <Text style={toastSt.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const toastSt = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 999, alignItems: 'center' },
  box:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: AC.crimson,
          borderWidth: 3, borderColor: AC.navy, paddingHorizontal: 16, paddingVertical: 12,
          shadowColor: AC.navy, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  icon: { fontFamily: Fonts.vt323, fontSize: 20, color: '#fff' },
  text: { fontFamily: Fonts.vt323, fontSize: 18, color: '#fff', letterSpacing: 0.5, flexShrink: 1 },
});

// ─── Pixel Avatar Sprite ──────────────────────────────────────────────────────
function PixelAvatar({ index }: { index: number }) {
  const a = AVATARS[index];
  const B = (style: object) => <View style={[{ position: 'absolute', borderWidth: 2, borderColor: '#123441' }, style]} />;
  return (
    <View style={{ width: 160, height: 160 }}>
      {/* Head */}
      {B({ width: 52, height: 52, top: 8,  left: 54, backgroundColor: a.bg })}
      {/* Left eye */}
      {B({ width: 8,  height: 8,  top: 24, left: 62, backgroundColor: '#000', borderWidth: 0 })}
      {/* Right eye */}
      {B({ width: 8,  height: 8,  top: 24, right: 62, backgroundColor: '#000', borderWidth: 0 })}
      {/* Torso */}
      {B({ width: 44, height: 52, top: 68, left: 58, backgroundColor: a.body })}
      {/* Left arm */}
      {B({ width: 16, height: 44, top: 72, left: 38, backgroundColor: a.body })}
      {/* Right arm */}
      {B({ width: 16, height: 44, top: 72, right: 38, backgroundColor: a.body })}
      {/* Left leg */}
      {B({ width: 20, height: 36, bottom: 0, left: 58, backgroundColor: a.accent })}
      {/* Right leg */}
      {B({ width: 20, height: 36, bottom: 0, right: 58, backgroundColor: a.accent })}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, iconColor }: { title: string; iconColor: string }) {
  return (
    <View style={secSt.row}>
      <View style={[secSt.icon, { backgroundColor: iconColor }]} />
      <View style={secSt.line} />
      <Text style={secSt.title}>{title}</Text>
      <View style={secSt.line} />
    </View>
  );
}
const secSt = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  icon:  { width: 16, height: 20 },
  line:  { flex: 1, height: 3, backgroundColor: '#123441', opacity: 0.2 },
  title: { fontFamily: Fonts.pixel, fontSize: 10, lineHeight: 15, color: '#123441' },
});

// ─── Field Label ──────────────────────────────────────────────────────────────
function FL({ text }: { text: string }) {
  return <Text style={flSt.label}>{text}</Text>;
}
const flSt = StyleSheet.create({
  label: { fontFamily: Fonts.vt323, fontSize: 20, lineHeight: 28, letterSpacing: 1,
           textTransform: 'uppercase', color: '#123441' },
});

// ─── Pixel Input ──────────────────────────────────────────────────────────────
function PI(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={piSt.wrap}>
      <TextInput style={piSt.input} placeholderTextColor="#6B7280" {...props} />
    </View>
  );
}
const piSt = StyleSheet.create({
  wrap:  { marginBottom: 20, shadowColor: '#123441', shadowOffset: { width: 4, height: 4 },
           shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  input: { height: 62, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441',
           paddingHorizontal: 12, fontFamily: Fonts.vt323, fontSize: 24, color: '#123441' },
});

// ─── Unit Toggle ──────────────────────────────────────────────────────────────
function UnitToggle({ options, selected, onSelect }:
  { options: [string, string]; selected: 0 | 1; onSelect: (i: 0 | 1) => void }) {
  return (
    <View style={utSt.wrap}>
      {options.map((opt, i) => (
        <TouchableOpacity key={opt} style={[utSt.btn, i === selected && utSt.active]} onPress={() => onSelect(i as 0 | 1)}>
          <Text style={[utSt.text, i === selected && utSt.activeText]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const utSt = StyleSheet.create({
  wrap:       { flexDirection: 'row', borderWidth: 2, borderColor: '#123441', backgroundColor: '#E6F6FF' },
  btn:        { paddingHorizontal: 8, paddingVertical: 4 },
  active:     { backgroundColor: '#123441' },
  text:       { fontFamily: Fonts.vt323, fontSize: 14, fontWeight: '700', color: '#123441', lineHeight: 20 },
  activeText: { color: '#F3FAFF' },
});

// ─── Sex Toggle ───────────────────────────────────────────────────────────────
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
  row:  { flexDirection: 'row', gap: 8, marginBottom: 20 },
  btn:  { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center',
          backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441',
          shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  active: { backgroundColor: '#C6E8F8' },
  text: { fontFamily: Fonts.pixel, fontSize: 10, lineHeight: 15, color: '#123441' },
});

// ─── Tier Card ────────────────────────────────────────────────────────────────
function TierCard({ tier, selected, onPress }:
  { tier: typeof TIERS[0]; selected: boolean; onPress: () => void }) {
  const s = selected;
  return (
    <TouchableOpacity style={[tcSt.card, s && tcSt.cardSel]} onPress={onPress}>
      <View style={[tcSt.iconBox, s && tcSt.iconBoxSel]}>
        <View style={[tcSt.icon, { backgroundColor: s ? '#E63946' : '#123441' }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[tcSt.label, s && tcSt.labelSel]}>{tier.label}</Text>
        <Text style={[tcSt.desc,  s && tcSt.descSel]}>{tier.desc}</Text>
      </View>
      {s && <View style={tcSt.check} />}
    </TouchableOpacity>
  );
}
const tcSt = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, marginBottom: 16,
                backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#123441',
                shadowColor: '#123441', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  cardSel:    { backgroundColor: '#FDF1E6', borderColor: '#E63946', shadowColor: '#E63946' },
  iconBox:    { width: 48, height: 48, justifyContent: 'center', alignItems: 'center',
                backgroundColor: '#E6F6FF', borderWidth: 2, borderColor: '#123441' },
  iconBoxSel: { backgroundColor: '#FFFFFF', borderColor: '#E63946' },
  icon:       { width: 24, height: 24 },
  label:      { fontFamily: Fonts.pixel, fontSize: 12, lineHeight: 18, color: '#123441', marginBottom: 4 },
  labelSel:   { color: '#E63946' },
  desc:       { fontFamily: Fonts.vt323, fontSize: 18, lineHeight: 28, color: '#123441', opacity: 0.7 },
  descSel:    { color: '#E63946', opacity: 0.8 },
  check:      { width: 20, height: 20, backgroundColor: '#E63946' },
});

// ─── RegisterScreen ───────────────────────────────────────────────────────────
export default function RegisterScreen({ onBack }: Props) {
  // Avatar
  const [avatarIdx, setAvatarIdx] = useState(0);

  // Account
  const [heroName, setHeroName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Biometrics
  const [age,        setAge]        = useState('');
  const [sex,        setSex]        = useState<'male' | 'female'>('male');
  const [height,     setHeight]     = useState('');
  const [heightUnit, setHeightUnit] = useState<0 | 1>(0); // 0=CM, 1=IN
  const [weight,     setWeight]     = useState('');
  const [weightUnit, setWeightUnit] = useState<0 | 1>(0); // 0=KG, 1=LB

  // Combat tier
  const [tier, setTier] = useState('squire');

  // Loading / Toast
  const [loading,      setLoading]      = useState(false);
  const [toastMsg,     setToastMsg]     = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile        = useGameStore((s) => s.loadProfile);
  const setAvatar          = useGameStore((s) => s.setAvatar);
  const setProfileNeedsName = useGameStore((s) => s.setProfileNeedsName);

  // Derived
  const selectedTier = TIERS.find((t) => t.id === tier)!;
  const weightKg = weightUnit === 0
    ? parseFloat(weight) || 0
    : Math.round((parseFloat(weight) || 0) * 0.453592);
  const heightCm = heightUnit === 0
    ? parseFloat(height) || 0
    : Math.round((parseFloat(height) || 0) * 2.54);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
  }

  async function handleSubmit() {
    if (!heroName.trim()) { showToast('Enter a hero name!'); return; }
    if (!email.trim())    { showToast('Enter your guild email!'); return; }
    if (!password)        { showToast('Enter a pass code!'); return; }
    if (password.length < 6) { showToast('Pass code must be 6+ chars!'); return; }

    setLoading(true);

    // 1. Sign up
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) {
      setLoading(false);
      const m = authErr.message.toLowerCase();
      showToast(m.includes('already') ? 'Email already registered!' : authErr.message);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      showToast('Something went wrong. Try again.');
      return;
    }

    // 2. Upsert profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: userId,
      name: heroName.trim(),
      level: 1,
      exp: 0,
      str: 0,
      agi: 0,
      sta: 0,
      battles: 0,
      victories: 0,
      total_reps: 0,
    });

    setLoading(false);

    if (profileErr) {
      showToast(profileErr.message);
      return;
    }

    setAvatar({ name: heroName.trim() });
    // Update atomically using Zustand so we don't flash the Dashboard
    useGameStore.setState({ showTutorial: true, profileNeedsName: false });
    
    // Background sync of the updated profile
    loadProfile();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={rs.scroll}
        contentContainerStyle={rs.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── INTERACTIVE AVATAR PREVIEW ── */}
        <View style={rs.avatarSection}>
          {/* Left Arrow */}
          <TouchableOpacity
            style={[rs.arrowBtn, { left: 0 }]}
            onPress={() => setAvatarIdx((i) => (i - 1 + AVATARS.length) % AVATARS.length)}
          >
            <View style={rs.arrowL} />
          </TouchableOpacity>

          {/* Avatar Box */}
          <View style={rs.avatarBox}>
            <PixelAvatar index={avatarIdx} />
          </View>

          {/* Right Arrow */}
          <TouchableOpacity
            style={[rs.arrowBtn, { right: 0 }]}
            onPress={() => setAvatarIdx((i) => (i + 1) % AVATARS.length)}
          >
            <View style={rs.arrowR} />
          </TouchableOpacity>

          {/* Label */}
          <View style={rs.avatarLabelWrap}>
            <Text style={rs.avatarLabelText}>
              {`SELECT YOUR HERO\n${AVATARS[avatarIdx].label}`}
            </Text>
          </View>
        </View>

        {/* ── ACCOUNT BASICS ── */}
        <View style={rs.section}>
          <SectionHeader title="ACCOUNT BASICS" iconColor={AC.gold} />
          <FL text="[ HERO NAME ]" />
          <PI
            placeholder="e.g. SWOLE_SLAYER"
            value={heroName}
            onChangeText={setHeroName}
            autoCapitalize="characters"
          />
          <FL text="[ GUILD EMAIL ]" />
          <PI
            placeholder="hero@quest.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FL text="[ PASS CODE ]" />
          <PI
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* ── BIOMETRIC CALIBRATION ── */}
        <View style={rs.section}>
          <SectionHeader title="BIOMETRIC CALIBRATION" iconColor={AC.crimson} />
          <Text style={rs.calibNote}>THIS DATA CALIBRATES YOUR QUEST DIFFICULTY</Text>

          <FL text="[ AGE ]" />
          <PI
            placeholder="0"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            maxLength={3}
          />

          <FL text="[ SEX ]" />
          <SexToggle value={sex} onChange={setSex} />

          <View style={rs.labelRow}>
            <FL text="[ HEIGHT ]" />
            <UnitToggle options={['CM', 'IN']} selected={heightUnit} onSelect={setHeightUnit} />
          </View>
          <PI
            placeholder={heightUnit === 0 ? 'e.g. 175' : 'e.g. 5\'9"'}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            maxLength={5}
          />

          <View style={rs.labelRow}>
            <FL text="[ WEIGHT ]" />
            <UnitToggle options={['KG', 'LB']} selected={weightUnit} onSelect={setWeightUnit} />
          </View>
          <PI
            placeholder={weightUnit === 0 ? 'e.g. 70' : 'e.g. 154'}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>

        {/* ── COMBAT EXPERIENCE ── */}
        <View style={rs.section}>
          <View style={rs.combatHeader}>
            <View style={rs.combatLine} />
            <Text style={rs.combatLabel}>COMBAT EXPERIENCE</Text>
            <View style={rs.combatLine} />
          </View>
          <Text style={rs.selectLabel}>SELECT YOUR COMBAT TIER:</Text>
          {TIERS.map((t) => (
            <TierCard key={t.id} tier={t} selected={tier === t.id} onPress={() => setTier(t.id)} />
          ))}
        </View>

        {/* ── CALCULATION PREVIEW ── */}
        <View style={rs.previewBox}>
          {/* Floating tag on border */}
          <View style={rs.previewTag}>
            <Text style={rs.previewTagText}>STAT PREVIEW</Text>
          </View>
          <View style={rs.previewTopRow}>
            <Text style={rs.previewHeading}>STAT PREVIEW</Text>
            <View style={rs.previewIcon} />
          </View>
          <Text style={rs.previewRank}>FITNESS RANK: {selectedTier.rank}</Text>
          <Text style={rs.previewSub}>
            {weightKg > 0 ? `(Scaled to ${weightKg}KG Bodyweight)` : '(Fill in your stats above)'}
          </Text>
        </View>

        {/* ── BEGIN YOUR QUEST CTA ── */}
        {loading ? (
          <ActivityIndicator size="large" color={AC.crimson} style={{ marginVertical: 16 }} />
        ) : (
          <TouchableOpacity style={rs.ctaBtn} onPress={handleSubmit}>
            <Text style={rs.ctaText}>BEGIN YOUR QUEST</Text>
            {/* Arrow icon */}
            <View style={rs.ctaArrow} />
          </TouchableOpacity>
        )}

        {/* Back link */}
        <TouchableOpacity style={rs.backBtn} onPress={onBack}>
          <Text style={rs.backText}>← BACK TO LOGIN</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Toast */}
      <PixelToast message={toastMsg} visible={toastVisible} />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const rs = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: AC.bg,
  },
  container: {
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 32,
    maxWidth: 672,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    width: '100%',
  },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarBox: {
    width: 192,
    height: 192,
    backgroundColor: '#C6E8F8',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtn: {
    position: 'absolute',
    top: '30%' as any,
    width: 36,
    height: 56,
    backgroundColor: '#F3FAFF',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  arrowL: {
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: '#123441',
  },
  arrowR: {
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#123441',
  },
  avatarLabelWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  avatarLabelText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    lineHeight: 16,
    color: '#123441',
    textAlign: 'center',
  },

  // ── Calibration ──
  calibNote: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    lineHeight: 28,
    color: '#006A60',
    textAlign: 'center',
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  // ── Combat Experience ──
  combatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  combatLine: {
    flex: 1,
    height: 4,
    backgroundColor: '#D4A373',
  },
  combatLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    lineHeight: 21,
    color: '#123441',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    lineHeight: 28,
    color: '#123441',
    marginBottom: 16,
  },

  // ── Calculation Preview ──
  previewBox: {
    padding: 24,
    backgroundColor: '#E6F6FF',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#765A05',
    position: 'relative',
    gap: 8,
  },
  previewTag: {
    position: 'absolute',
    top: -9,
    left: 19,
    backgroundColor: '#E6F6FF',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  previewTagText: {
    fontFamily: Fonts.pixel,
    fontSize: 8,
    lineHeight: 12,
    color: '#765A05',
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewHeading: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    lineHeight: 15,
    color: '#765A05',
  },
  previewIcon: {
    width: 20,
    height: 21,
    backgroundColor: '#765A05',
  },
  previewRank: {
    fontFamily: Fonts.vt323,
    fontSize: 30,
    lineHeight: 36,
    color: '#123441',
  },
  previewSub: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    lineHeight: 28,
    color: '#123441',
    opacity: 0.7,
  },

  // ── CTA ──
  ctaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
    backgroundColor: '#BB152C',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  ctaText: {
    fontFamily: Fonts.pixel,
    fontSize: 16,
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ctaArrow: {
    width: 0, height: 0,
    borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 11,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFFFFF',
  },

  // ── Back ──
  backBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#3D494C',
    letterSpacing: 0.5,
  },
});
