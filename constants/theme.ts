import { Dimensions } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const Colors = {
  // Backgrounds
  bgVoid:    '#080810',
  bgDeep:    '#0D0D1A',
  bgPanel:   '#12121F',
  bgCard:    '#1A1A2E',
  bgRaised:  '#1E1E35',

  // Brand
  gold:         '#C8922A',
  goldLight:    '#F0C060',
  goldDim:      '#7A5520',
  crimson:      '#C0282A',
  crimsonDark:  '#7A1515',
  teal:         '#1DB8A0',
  tealDim:      '#0E6B5E',
  violet:       '#7C4DFF',
  violetDim:    '#3D2880',
  amber:        '#F5A623',

  // Text
  textHero:    '#F5EDD6',
  textPrimary: '#CCC0A0',
  textMuted:   '#7A7060',
  textDanger:  '#FF5555',

  // Gameplay bars
  hpGreen:  '#38D970',
  hpYellow: '#F5C842',
  hpRed:    '#E0352A',
  xpBlue:   '#4488FF',

  // Borders
  borderGlow:  'rgba(200,146,42,0.35)',
  borderFaint: 'rgba(200,146,42,0.12)',

  transparent: 'transparent',
} as const;

export const Fonts = {
  display: 'Cinzel_700Bold',        // Expo Google Fonts
  displayMed: 'Cinzel_600SemiBold',
  ui: 'Rajdhani_500Medium',
  uiBold: 'Rajdhani_700Bold',
  uiLight: 'Rajdhani_300Light',
  mono: 'ShareTechMono_400Regular',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
