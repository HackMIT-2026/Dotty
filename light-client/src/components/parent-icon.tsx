/**
 * The parent screens' pictures in the same sticker style as the icons in assets/icons: your own pictures where
 * one fits (glucose check, meal, activity, medicine, Dotty, settings), and drawn stickers for the rest (see sticker.tsx).
 */
import { Image } from 'react-native';

import { INK, SHINE, SKIN, StickerIcon, circ, oval, rrect, type Art } from './sticker';

const IMAGES = {
  settings: require('@/assets/icons/setting.png'),
  glucose: require('@/assets/icons/check-up.png'),
  meal: require('@/assets/icons/eat.png'),
  activity: require('@/assets/icons/play.png'),
  medicine: require('@/assets/icons/medicine.png'),
  dotty: require('@/assets/icons/dotty.png'),
} as const;

const BLUE = '#5AAEF2';
const DEEP_BLUE = '#2F80ED';
const CORAL = '#F2708A';
const RED = '#E5534B';
const AMBER = '#F5A524';
const GOLD = '#FFC94D';
const MINT = '#A8E0C8';
const DEEP_GREEN = '#2E7D5B';
const GREY = '#8896AB';

function star(cx: number, cy: number, R: number, r: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 ? r : R;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
}

const CLOUD = 'M28 74 Q10 74 12 56 Q14 42 30 44 Q34 24 54 26 Q72 28 74 46 Q90 46 90 62 Q90 74 76 74 Z';

const clock = (alert: boolean): Art => ({
  body: [
    { d: circ(27, 26, 10), fill: AMBER },
    { d: circ(73, 26, 10), fill: AMBER },
    { d: circ(50, 56, 32), fill: '#FFF6E6', stroke: AMBER, sw: 6 },
  ],
  detail: [
    { d: 'M50 56 V36 M50 56 L64 63', stroke: INK, sw: 5 },
    { d: circ(50, 56, 4), fill: INK },
    { d: 'M50 28 v3 M78 56 h-3 M50 84 v-3 M22 56 h3', stroke: '#C9B79E', sw: 3 },
    ...(alert
      ? [
          { d: circ(80, 24, 14), fill: RED },
          { d: 'M80 16 v9', stroke: '#FFFFFF', sw: 4.5 },
          { d: circ(80, 32, 2.6), fill: '#FFFFFF' },
        ]
      : []),
  ],
});

const trend = (kind: 'up' | 'down' | 'flat'): Art => {
  const line = kind === 'up' ? 'M18 72 L72 28' : kind === 'down' ? 'M18 28 L72 72' : 'M14 50 H72';
  const head = kind === 'up' ? 'M50 24 H76 V50' : kind === 'down' ? 'M50 76 H76 V50' : 'M56 26 L82 50 L56 74';
  return { body: [{ d: line, stroke: BLUE, sw: 12 }, { d: head, stroke: BLUE, sw: 12 }], detail: [] };
};

const ART: Record<string, Art> = {
  chart: {
    body: [{ d: rrect(12, 14, 76, 72, 14), fill: '#FFFFFF', stroke: BLUE, sw: 5 }],
    detail: [
      { d: rrect(24, 56, 11, 20, 3), fill: '#A9D8EE' },
      { d: rrect(44.5, 44, 11, 32, 3), fill: BLUE },
      { d: rrect(65, 32, 11, 44, 3), fill: DEEP_BLUE },
      { d: 'M22 46 L40 34 L56 40 L78 22', stroke: CORAL, sw: 5 },
      { d: circ(40, 34, 4), fill: CORAL },
      { d: circ(78, 22, 4.5), fill: CORAL },
    ],
  },
  clipboard: {
    body: [
      { d: rrect(18, 14, 64, 74, 10), fill: '#D9A05B' },
      { d: rrect(38, 6, 24, 16, 6), fill: '#7BA9E8' },
    ],
    detail: [
      { d: rrect(26, 26, 48, 54, 6), fill: '#FFF6E6' },
      { d: circ(50, 14, 3.5), fill: '#4C7DC2' },
      { d: 'M34 50 l8 8 l16 -18', stroke: '#4FA23B', sw: 7 },
      { d: 'M34 70 H66', stroke: '#CFC6D6', sw: 4.5 },
    ],
  },
  bell: {
    body: [
      { d: 'M50 12 Q26 16 26 46 V60 L16 72 H84 L74 60 V46 Q74 16 50 12 Z', fill: GOLD },
      { d: circ(50, 82, 8), fill: '#E8A23C' },
      { d: circ(50, 10, 5), fill: '#E8A23C' },
    ],
    detail: [
      { d: 'M22 66 H78', stroke: '#E8A23C', sw: 4 },
      { d: oval(38, 38, 5, 14), fill: SHINE },
    ],
  },
  doctor: {
    body: [
      { d: 'M32 16 V44 Q32 64 50 64 Q68 64 68 44 V16', stroke: '#5B6B84', sw: 7 },
      { d: 'M50 64 V74', stroke: '#5B6B84', sw: 7 },
      { d: circ(50, 82, 11), fill: BLUE },
      { d: circ(32, 14, 5.5), fill: GREY },
      { d: circ(68, 14, 5.5), fill: GREY },
    ],
    detail: [
      { d: circ(50, 82, 6), fill: '#DCEBFF' },
      { d: oval(46, 78, 2.6, 3.4), fill: SHINE },
    ],
  },
  clock: clock(false),
  'clock-alert': clock(true),
  'drop-alert': {
    body: [{ d: 'M50 10 Q78 46 78 62 A28 28 0 0 1 22 62 Q22 46 50 10 Z', fill: '#F0533F' }],
    detail: [
      { d: 'M50 40 V62', stroke: '#FFFFFF', sw: 7 },
      { d: circ(50, 74, 4.2), fill: '#FFFFFF' },
      { d: oval(34, 58, 4, 9), fill: SHINE },
    ],
  },
  alert: {
    body: [{ d: circ(50, 52, 38), fill: RED }],
    detail: [
      { d: 'M50 32 V56', stroke: '#FFFFFF', sw: 8 },
      { d: circ(50, 70, 4.6), fill: '#FFFFFF' },
      { d: oval(34, 34, 8, 4), fill: SHINE },
    ],
  },
  check: {
    body: [{ d: circ(50, 52, 38), fill: MINT, stroke: '#5BBE97', sw: 3 }],
    detail: [
      { d: 'M30 53 l14 14 l27 -30', stroke: DEEP_GREEN, sw: 9 },
      { d: oval(34, 34, 8, 4), fill: SHINE },
    ],
  },
  'check-all': {
    body: [{ d: rrect(10, 22, 80, 60, 16), fill: MINT, stroke: '#5BBE97', sw: 3 }],
    detail: [{ d: 'M22 54 l12 12 l20 -24 M42 54 l12 12 l24 -28', stroke: DEEP_GREEN, sw: 8 }],
  },
  star: {
    body: [{ d: star(50, 54, 40, 18), fill: GOLD, stroke: '#F0A020', sw: 4 }],
    detail: [{ d: oval(40, 44, 5, 9), fill: SHINE }],
  },
  clap: {
    body: [
      { d: rrect(28, 20, 11, 36, 5.5), fill: SKIN },
      { d: rrect(40, 12, 11, 44, 5.5), fill: SKIN },
      { d: rrect(52, 14, 11, 42, 5.5), fill: SKIN },
      { d: rrect(64, 24, 10, 32, 5), fill: SKIN },
      { d: circ(51, 62, 24), fill: SKIN },
      { d: oval(27, 60, 8, 14), fill: SKIN },
    ],
    detail: [
      { d: 'M40 12 v22 M52 14 v20 M64 24 v14', stroke: '#F2B58F', sw: 2.5 },
      { d: 'M84 8 l4 -6 M92 20 l7 -2 M14 12 l-4 -6', stroke: GOLD, sw: 4 },
    ],
  },
  'trend-up': trend('up'),
  'trend-down': trend('down'),
  'trend-flat': trend('flat'),
  'cloud-upload': {
    body: [{ d: CLOUD, fill: '#DCEBFF', stroke: BLUE, sw: 5 }],
    detail: [{ d: 'M50 66 V42 M39 52 L50 41 L61 52', stroke: CORAL, sw: 7 }],
  },
  'cloud-check': {
    body: [{ d: CLOUD, fill: '#E6F8EF', stroke: '#5BBE97', sw: 5 }],
    detail: [{ d: 'M38 56 l9 9 l17 -19', stroke: DEEP_GREEN, sw: 7 }],
  },
  'cloud-off': {
    body: [{ d: CLOUD, fill: '#FFF1D6', stroke: AMBER, sw: 5 }],
    detail: [{ d: 'M24 22 L78 82', stroke: '#B7791F', sw: 7 }],
  },
  info: {
    body: [{ d: circ(50, 52, 38), fill: BLUE }],
    detail: [
      { d: 'M50 46 V70', stroke: '#FFFFFF', sw: 9 },
      { d: circ(50, 32, 5.4), fill: '#FFFFFF' },
    ],
  },
  lock: {
    body: [
      { d: 'M32 46 V34 a18 18 0 0 1 36 0 V46', stroke: GREY, sw: 9 },
      { d: rrect(20, 44, 60, 44, 12), fill: '#F5B93E' },
    ],
    detail: [
      { d: circ(50, 62, 6), fill: '#8A5A1E' },
      { d: 'M50 64 V74', stroke: '#8A5A1E', sw: 5 },
      { d: oval(32, 56, 4, 7), fill: SHINE },
    ],
  },
  fire: {
    body: [{ d: 'M50 8 Q72 30 72 52 Q78 44 72 32 Q92 52 84 70 Q76 92 50 92 Q24 92 16 70 Q8 48 30 30 Q32 42 42 46 Q36 26 50 8 Z', fill: '#FF8A3D' }],
    detail: [{ d: 'M50 44 Q64 58 64 72 Q62 84 50 84 Q38 84 36 72 Q36 60 50 44 Z', fill: GOLD }],
  },
  chevron: { body: [{ d: 'M36 22 L64 50 L36 78', stroke: CORAL, sw: 14 }], detail: [] },
};

export type ParentIconName = keyof typeof IMAGES | keyof typeof ART;

/** A parent screen picture by name. Sized in px. */
export function ParentIcon({ name, size = 32 }: { name: ParentIconName; size?: number }) {
  if (name in IMAGES) return <Image source={IMAGES[name as keyof typeof IMAGES]} style={{ width: size, height: size }} resizeMode="contain" />;
  return <StickerIcon art={ART[name]} size={size} sparkle={false} />;
}


