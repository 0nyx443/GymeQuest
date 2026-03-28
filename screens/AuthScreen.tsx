import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import RegisterScreen from './RegisterScreen';
import { AuthColors, Fonts } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
import { useGameStore } from '@/store/gameStore';

const AC = AuthColors;


// ─── Pixel Toast ──────────────────────────────────────────────────────────────
function PixelToast({ message, visible }: { message: string; visible: boolean }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toastStyles.wrap, { transform: [{ translateY }], opacity }]}>
      <View style={toastStyles.box}>
        <Text style={toastStyles.icon}>⚠</Text>
        <Text style={toastStyles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    zIndex: 999,
    alignItems: 'center',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AC.crimson,
    borderWidth: 3,
    borderColor: AC.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // hard pixel shadow
    shadowColor: AC.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  icon: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#fff',
  },
  text: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});

// ─── Decorative Pixel Sun ─────────────────────────────────────────────────────
function PixelSun() {
  return (
    <View style={sunStyles.outer}>
      <View style={sunStyles.inner} />
    </View>
  );
}

const sunStyles = StyleSheet.create({
  outer: {
    position: 'absolute',
    width: 96,
    height: 96,
    right: 32,
    top: 32,
    backgroundColor: '#765A05',
    borderWidth: 3,
    borderColor: AC.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: 82,
    height: 82,
    borderWidth: 4,
    borderColor: '#DAB65E',
    borderStyle: 'dashed',
    opacity: 0.5,
  },
});

// ─── Panning Slot Strip ───────────────────────────────────────────────────────
function CloudStrip() {
  const pan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopped = false;

    function runLoop() {
      pan.setValue(0);
      Animated.timing(pan, {
        toValue: -640,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !stopped) runLoop();
      });
    }

    runLoop();
    return () => { stopped = true; };
  }, []);

  // Slot-window shapes at varying sizes/gaps
  const slots: { w: number; tabW: number; tabL: number; h: number }[] = [
    { w: 192, tabW: 64, tabL: 35, h: 48 },
    { w: 128, tabW: 48, tabL: 19, h: 40 },
    { w: 160, tabW: 56, tabL: 28, h: 44 },
    { w: 192, tabW: 64, tabL: 35, h: 48 },
    { w: 128, tabW: 48, tabL: 19, h: 40 },
    { w: 160, tabW: 56, tabL: 28, h: 44 },
  ];

  return (
    <View style={cloudStyles.strip}>
      <Animated.View style={[cloudStyles.row, { transform: [{ translateX: pan }] }]}>
        {slots.map((s, i) => (
          <View key={i} style={[cloudStyles.slot, { width: s.w, marginRight: i % 2 === 0 ? 32 : 48 }]}>
            {/* Tab notch */}
            <View
              style={{
                position: 'absolute',
                width: s.tabW,
                height: 24,
                left: s.tabL,
                top: 0,
                backgroundColor: '#FFFFFF',
                borderTopWidth: 3,
                borderLeftWidth: 3,
                borderRightWidth: 3,
                borderBottomWidth: 0,
                borderColor: '#123441',
              }}
            />
            {/* Body */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                width: s.w,
                height: s.h,
                backgroundColor: '#FFFFFF',
                borderWidth: 3,
                borderColor: '#123441',
              }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const cloudStyles = StyleSheet.create({
  strip: {
    position: 'absolute',
    height: 128,
    left: 0,
    right: 0,
    top: 80,
    overflow: 'hidden',
    pointerEvents: 'none',
  } as any,
  row: {
    position: 'absolute',
    flexDirection: 'row',
    width: 1280,
    top: 28,
    alignItems: 'flex-end',
  },
  slot: {
    height: 80,
    position: 'relative',
  },
});




// ─── Slot Window (decorative tab window header) ───────────────────────────────
function SlotWindow({ wide }: { wide?: boolean }) {
  const w = wide ? 192 : 128;
  const tabW = wide ? 64 : 48;
  const tabH = wide ? 32 : 24;
  const tabLeft = wide ? 35 : 19;
  return (
    <View style={{ width: w, height: wide ? 72 : 40 + 13, marginBottom: 8 }}>
      {/* Tab notch */}
      <View
        style={{
          position: 'absolute',
          width: tabW,
          height: tabH,
          left: tabLeft,
          top: 0,
          backgroundColor: AC.white,
          borderTopWidth: 3,
          borderLeftWidth: 3,
          borderRightWidth: 3,
          borderBottomWidth: 0,
          borderColor: AC.navy,
        }}
      />
      {/* Body */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: w,
          height: wide ? 48 : 40,
          backgroundColor: AC.white,
          borderWidth: 3,
          borderColor: AC.navy,
        }}
      />
    </View>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
function FieldLabel({ text }: { text: string }) {
  return (
    <View style={{ paddingLeft: 4, marginBottom: 6 }}>
      <Text style={fieldStyles.label}>{text}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: AC.labelMuted,
  },
});

// ─── Pixel Input ──────────────────────────────────────────────────────────────
function PixelInput(props: React.ComponentProps<typeof TextInput> & { value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={inputStyles.wrap}>
      <TextInput
        style={inputStyles.input}
        placeholderTextColor="rgba(188,201,204,0.5)"
        {...props}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    shadowColor: AC.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  input: {
    width: '100%',
    height: 58,
    backgroundColor: AC.white,
    borderWidth: 3,
    borderColor: AC.navy,
    paddingHorizontal: 16,
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: AC.navy,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);

  // Toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = useGameStore((s) => s.loadProfile);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const setProfileNeedsName = useGameStore((s) => s.setProfileNeedsName);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
  }

  async function handleLogin() {
    if (!email || !password) {
      showToast('Please enter email and password.');
      return;
    }

    setLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (result.error) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password') || msg.includes('email not confirmed')) {
        showToast('Wrong password or email. Try again!');
      } else {
        showToast(result.error.message);
      }
      return;
    }

    const needName = await loadProfile();
    if (needName) {
      setProfileNeedsName(true);
    }
  }



  // ── Show full RegisterScreen for new users ──
  if (authMode === 'signup') {
    return <RegisterScreen onBack={() => setAuthMode('login')} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Background ── */}
        <View style={styles.bg} pointerEvents="none">
          <View style={styles.bgTexture} />
        </View>

        {/* ── Decorative elements ── */}
        <PixelSun />
        <CloudStrip />

        {/* ── Decorative slot windows (top corners) ── */}
        <View style={styles.slotRow}>
          <SlotWindow wide />
          <View style={{ width: 16 }} />
          <SlotWindow />
        </View>

        {/* ── Main content ── */}
        <View style={styles.content}>

          {/* ── Pixel Title ── */}
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <View style={styles.titleShadowBox}>
                <Text style={[styles.titleWord, { color: AC.crimson }]}>GYME</Text>
              </View>
            </View>
            <View style={styles.titleRow}>
              <View style={styles.titleShadowBox}>
                <Text style={[styles.titleWord, { color: AC.gold }]}>Quest</Text>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <FieldLabel text="[ HERO EMAIL ]" />
            <PixelInput
              placeholder="player@village.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FieldLabel text="[ SECRET CODE ]" />
            <PixelInput
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {loading ? (
              <ActivityIndicator size="large" color={AC.crimson} style={{ marginVertical: 8 }} />
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
                <Text style={styles.primaryBtnText}>ENTER THE ARENA</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New adventurer? </Text>
              <TouchableOpacity onPress={() => setAuthMode('signup')}>
                <Text style={styles.footerLink}>CREATE CHARACTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <PixelToast message={toastMsg} visible={toastVisible} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: AC.bg,
    minHeight: 901,
  },
  bg: {
    position: 'absolute',
    inset: 0,
  } as any,
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // subtle dot background via opacity overlay
    opacity: 0.05,
  },

  // ── Slot windows ──
  slotRow: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingHorizontal: 24,
    zIndex: 5,
  },

  // ── Title ──
  titleBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  titleRow: {
    alignItems: 'center',
  },
  titleShadowBox: {
    shadowColor: AC.navy,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    backgroundColor: 'rgba(255,255,255,0.004)',
  },
  titleWord: {
    fontFamily: Fonts.pixel,
    fontSize: 42,
    lineHeight: 53,
    letterSpacing: -2.1,
    textAlign: 'center',
    borderWidth: 3,
    borderColor: AC.navy,
    paddingHorizontal: 8,
  },

  // ── Content ──
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    zIndex: 5,
  },

  // ── Form ──
  form: {
    width: '100%',
    maxWidth: 340,
  },

  // ── Mode tabs ──
  modeRow: {
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: AC.navy,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modeTabActive: {
    backgroundColor: AC.navy,
  },
  modeTabText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    letterSpacing: 0.9,
    color: AC.labelMuted,
  },
  modeTabTextActive: {
    color: AC.white,
  },

  // ── Primary button ──
  primaryBtn: {
    width: '100%',
    height: 66,
    backgroundColor: AC.crimson,
    borderWidth: 3,
    borderColor: AC.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: AC.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    lineHeight: 20,
    color: AC.white,
    textAlign: 'center',
  },

  // ── Outline button (name step back) ──
  outlineBtn: {
    width: '100%',
    height: 56,
    borderWidth: 3,
    borderColor: AC.navy,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AC.white,
    shadowColor: AC.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  outlineBtnText: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: AC.navy,
    letterSpacing: 0.9,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 3,
    backgroundColor: AC.navy,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: AC.labelMuted,
    letterSpacing: 0.5,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 16,
    paddingBottom: 48,
    gap: 4,
  },
  footerText: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    lineHeight: 28,
    color: AC.textDark,
    textAlign: 'center',
  },
  footerLink: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: AC.tealLink,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
