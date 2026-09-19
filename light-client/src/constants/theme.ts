import { Platform } from 'react-native';

export const C = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  ink: '#2B2650',
  inkSoft: '#6E6A8F',
  line: '#E6E2F5',
  primary: '#6C5CE7',
  primaryDark: '#5647C9',
  primarySoft: '#ECE9FD',
  sky: '#4DA8FF',
  skySoft: '#E3F1FF',
  mint: '#2FBF8F',
  mintSoft: '#DDF7EC',
  sun: '#FFB93B',
  sunSoft: '#FFF1D6',
  pink: '#FF7EB6',
  pinkSoft: '#FFE4F0',
  // status colors are only used in the parent app: the child UI never shows red
  good: '#2FB67C',
  warn: '#F5A524',
  danger: '#E5534B',
  dangerSoft: '#FDE8E7',
} as const;

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const R = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** Nunito (Google Fonts), loaded in the root layout. One family per weight so Android renders weights correctly. */
export const F = {
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

type Weight = '500' | '600' | '700' | '800' | '900';
const WEIGHT: Record<Weight, string> = { '500': F.medium, '600': F.medium, '700': F.bold, '800': F.heavy, '900': F.black };

/** Style for a Nunito weight, e.g. `{ ...font('800'), fontSize: 20 }`. */
export const font = (w: Weight = '600') => ({ fontFamily: WEIGHT[w] });

export const MAX_WIDTH = 560;

export const shadow = Platform.select({
  web: { boxShadow: '0 4px 14px rgba(43, 38, 80, 0.08)' } as object,
  default: {
    shadowColor: '#2B2650',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
