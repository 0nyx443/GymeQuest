import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { supabase } from '@/utils/supabase';
import { useGameStore } from '@/store/gameStore';

type Props = {
  forceNameStep?: boolean;
};

export default function AuthScreen({ forceNameStep = false }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [isNameStep, setIsNameStep] = useState(forceNameStep);
  const [savingName, setSavingName] = useState(false);
  const loadProfile = useGameStore((state) => state.loadProfile);
  const setAvatar = useGameStore((state) => state.setAvatar);
  const setProfileNeedsName = useGameStore((state) => state.setProfileNeedsName);

  async function handleAuth(mode: 'login' | 'signup') {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    let result;

    if (mode === 'signup') {
      result = await supabase.auth.signUp({ email, password });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    setLoading(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      if (mode === 'signup') {
        setProfileNeedsName(true);
        setIsNameStep(true);
        return;
      }
      const needName = await loadProfile();
      if (needName) {
        setProfileNeedsName(true);
        setIsNameStep(true);
      }
    }
  }

  async function handleSaveName() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setSavingName(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setSavingName(false);
      Alert.alert('Session expired', 'Please log in again.');
      setIsNameStep(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, name: name.trim() });
    setSavingName(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setAvatar({ name: name.trim() });
    const needName = await loadProfile();
    setProfileNeedsName(!!needName);
    setIsNameStep(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GymeQuest</Text>
      <Text style={styles.subtitle}>{isNameStep ? 'Choose your hero name' : 'Enter the arena'}</Text>

      <View style={styles.form}>
        {isNameStep ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your hero name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            {savingName ? (
              <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 20 }} />
            ) : (
              <>
                <TouchableOpacity style={styles.button} onPress={handleSaveName}>
                  <Text style={styles.buttonText}>Save Name</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.outlineButton]}
                  onPress={() => setIsNameStep(false)}
                >
                  <Text style={[styles.buttonText, styles.outlineText]}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, authMode === 'signup' && styles.modeTabActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.modeText, authMode === 'signup' && styles.modeTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {loading ? (
              <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.button} onPress={() => handleAuth(authMode)}>
                  <Text style={styles.buttonText}>{authMode === 'login' ? 'Log In' : 'Sign Up'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.bgDeep,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 48,
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 2,
  },
  modeSwitch: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.bgPanel,
  },
  modeTabActive: {
    backgroundColor: Colors.bgDeep,
  },
  modeText: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.textMuted,
  },
  modeTextActive: {
    color: Colors.gold,
    fontFamily: Fonts.uiBold,
  },
  form: {
    backgroundColor: Colors.bgPanel,
    padding: 24,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
  },
  input: {
    backgroundColor: Colors.bgDeep,
    borderWidth: 1,
    borderColor: Colors.borderFaint,
    borderRadius: Radius.md,
    color: Colors.textMuted,
    fontFamily: Fonts.ui,
    fontSize: 16,
    padding: 16,
    marginBottom: 16,
  },
  actions: {
    marginTop: 8,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontFamily: Fonts.uiBold,
    fontSize: 16,
    color: '#000',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  outlineText: {
    color: Colors.gold,
  },
});
