import { Platform } from 'react-native';

/**
 * Dotty's design tokens, from the design system on the `gloria` branch
 * (heavy-client/src/theme/tokens.css, itself taken from Figma): cream page, coral primary,
 * lavender and pond blue accents, mint for success, amber for gentle attention, and Fredoka.
 * Never type a hex code outside this file.
 */
export const C = {
  bg: '#FFF8F0', // cream page background
  card: '#FFFFFF',
  ink: '#2B2A33',
  inkSoft: '#6B6875',
  line: '#EADFD3', // card borders
  primary: '#F28B82', // coral: main buttons, Pip's body
  primaryDark: '#E56B8A', // gill rose: pressed states and headings on soft fills
  primarySoft: '#FDEDEB',
  lavender: '#B8A9E8', // accent, soft buttons, banners
  lavenderSoft: '#F1EDFB',
  sky: '#A9D8EE', // pond blue: chips, water, info
  skySoft: '#EDF7FC',
  mint: '#A8E0C8', // success fills, always with a check icon
  mintInk: '#1F7A5C', // readable success text on white
  mintSoft: '#EAF8F1',
  sun: '#F5C26B', // sunny amber: gentle attention, with a clock icon
  sunInk: '#96651B',
  sunSoft: '#FDF3E3',
  // one colour per kid tab (Care, Quests, Shop); the tab bar takes a lighter shade of the page it sits under
  pageCare: '#F7B955',
  barCare: '#F9CC80',
  pageQuests: '#84D6CB',
  barQuests: '#9DE0D7',
  pageShop: '#7CC8F0',
  barShop: '#98D5F5',
  sand: '#F3DFB4', // the sand in the kid's pond scene: the child tab bar
  glass: 'rgba(255, 255, 255, 0.82)', // frosted white panels over the scene
  glassLine: 'rgba(255, 255, 255, 0.9)',
  // the darker bottom edge that gives buttons their little "block" look
  primaryEdge: '#D9736B',
  sunEdge: '#D6A24E',
  mintEdge: '#7DC2A3',
  lavenderEdge: '#9C8BD6',
  sandEdge: '#DEC48E',
  skyEdge: '#7DBAD9', // the underline of Dotty's speech bubble
  pink: '#E56B8A',
  pinkSoft: '#FBE7EC',
  // status colors are only used in the parent and clinician views: the child UI never shows red
  good: '#1F7A5C',
  warn: '#96651B',
  danger: '#D9534F',
  dangerSoft: '#FBE9E8',
} as const;

export const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
/** Radius scale from the design system: cards 24, buttons 16, pills round. */
export const R = { sm: 12, md: 16, lg: 24, pill: 999 } as const;
export const BORDER = 2;

/**
 * Fredoka (bundled under assets/fonts, so it works offline), loaded in the root layout.
 * One family per weight, because a custom font on Android does not synthesise weights.
 */
export const F = {
  regular: 'Fredoka400',
  medium: 'Fredoka500',
  bold: 'Fredoka600',
  heavy: 'Fredoka700',
} as const;

type Weight = '500' | '600' | '700' | '800' | '900';
const WEIGHT: Record<Weight, string> = {
  '500': F.regular,
  '600': F.medium,
  '700': F.medium,
  '800': F.bold,
  '900': F.heavy,
};

/** Style for a weight, e.g. `{ ...font('800'), fontSize: 20 }`. */
export const font = (w: Weight = '600') => ({ fontFamily: WEIGHT[w] });

export const MAX_WIDTH = 560;

/** The design system has exactly one shadow: y 4, blur 12, black at 8 percent. */
export const shadow = Platform.select({
  web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' } as object,
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
