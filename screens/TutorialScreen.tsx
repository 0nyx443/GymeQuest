import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthColors, Fonts } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

const AC = AuthColors;

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const setShowTutorial = useGameStore((s) => s.setShowTutorial);

  function handleDismiss() {
    setShowTutorial(false);
  }

  return (
    <View style={ts.screen}>
      {/* ── Background Pattern ── */}
      <View style={ts.bgTexture} pointerEvents="none" />

      {/* ── Top AppBar ── */}
      <View style={[ts.appBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={ts.appBarLeft}>
          <View style={ts.appBarIcon} />
          <Text style={ts.appBarTitle}>GYME Quest</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={ts.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Titles ── */}
        <View style={ts.titleHeader}>
          <View style={ts.heading2Box}>
            <Text style={ts.heading2Text}>TUTORIAL</Text>
          </View>
          <Text style={ts.heading3Text}>HOW TO PLAY</Text>
        </View>

        {/* ── Step-by-Step Cards ── */}
        <View style={ts.stepsContainer}>

          {/* STEP 1 */}
          <View style={ts.card}>
            <View style={ts.tag}>
              <Text style={ts.tagText}>STEP 1</Text>
            </View>
            <View style={ts.imageMargin}>
              <View style={[ts.imageBox, { backgroundColor: '#D8F2FF' }]}>
                {/* Floating placeholder icon */}
                <View style={{ width: 37, height: 55, backgroundColor: '#123441', opacity: 0.3 }} />
              </View>
            </View>
            <View style={ts.textContent}>
              <Text style={ts.heading4}>THE SETUP</Text>
              <Text style={ts.descText}>Place your device 6ft away.</Text>
            </View>
          </View>

          {/* STEP 2 */}
          <View style={ts.card}>
            <View style={ts.tag}>
              <Text style={ts.tagText}>STEP 2</Text>
            </View>
            <View style={ts.imageMargin}>
              <View style={[ts.imageBox, { backgroundColor: '#8CF5E4' }]}>
                <View style={{ width: 50, height: 40, backgroundColor: '#006A60', opacity: 0.3 }} />
              </View>
            </View>
            <View style={ts.textContent}>
              <Text style={ts.heading4}>THE COMBAT</Text>
              <Text style={ts.descText}>Perform reps to deal damage.</Text>
            </View>
          </View>

          {/* STEP 3 */}
          <View style={ts.card}>
            <View style={ts.tag}>
              <Text style={ts.tagText}>STEP 3</Text>
            </View>
            <View style={ts.imageMargin}>
              <View style={[ts.imageBox, { backgroundColor: '#DAB65E' }]}>
                <View style={{ width: 45, height: 45, backgroundColor: '#765A05', opacity: 0.3 }} />
              </View>
            </View>
            <View style={ts.textContent}>
              <Text style={ts.heading4}>THE REWARD</Text>
              <Text style={ts.descText}>Earn XP & build your hero.</Text>
            </View>
          </View>

        </View>

        {/* ── Bottom CTA ── */}
        <View style={ts.ctaArea}>
          <TouchableOpacity style={ts.ctaBtn} onPress={handleDismiss} activeOpacity={0.8}>
            <Text style={ts.ctaText}>GOT IT</Text>
            {/* White Arrow Placeholder */}
            <View style={ts.ctaArrow} />
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ts = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3FAFF',
  },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    ...(Platform.OS === 'web'
      ? {
        backgroundImage: 'radial-gradient(70.71% 70.71% at 50% 50%, #123441 3.54%, transparent 3.54%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 8px 8px',
      }
      : {}),
  },

  /* ── AppBar ── */
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F3FAFF',
    borderBottomWidth: 3,
    borderBottomColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    zIndex: 10,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appBarIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#BB152C',
  },
  appBarTitle: {
    fontFamily: Fonts.spaceGrotesk,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: '#123441',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontFamily: Fonts.spaceGrotesk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    color: '#BB152C',
    letterSpacing: 1.4,
  },

  /* ── Content ── */
  scrollContent: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    maxWidth: 672,
    alignSelf: 'center',
    width: '100%',
  },

  /* ── Headings ── */
  titleHeader: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 24,
  },
  heading2Box: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#C6E8F8',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  heading2Text: {
    fontFamily: Fonts.pixel,
    fontSize: 12,
    lineHeight: 16,
    color: '#BB152C',
    textTransform: 'uppercase',
  },
  heading3Text: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    lineHeight: 39,
    color: '#123441',
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  /* ── Steps ── */
  stepsContainer: {
    width: '100%',
    maxWidth: 358,
    alignItems: 'center',
    gap: 48,
    marginBottom: 48,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  tag: {
    position: 'absolute',
    left: -16,
    top: -16,
    backgroundColor: '#765A05',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  tagText: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    lineHeight: 15,
    color: '#FFFFFF',
  },
  imageMargin: {
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  imageBox: {
    width: '100%',
    height: 192,
    borderWidth: 3,
    borderColor: '#123441',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    alignItems: 'center',
    gap: 8,
  },
  heading4: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: '#BB152C',
    textAlign: 'center',
  },
  descText: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    lineHeight: 28,
    color: '#3D494C',
    textAlign: 'center',
  },

  /* ── CTA ── */
  ctaArea: {
    width: '100%',
    maxWidth: 358,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#006A60',
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
    fontSize: 18,
    lineHeight: 28,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  ctaArrow: {
    width: 0, height: 0,
    borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 12,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFFFFF',
  },
});
