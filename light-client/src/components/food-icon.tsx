/** The food cards' pictures, drawn as little stickers (see sticker.tsx for how they are built). */
import { BROWN, DARK_GREEN, GREEN, SHINE, StickerIcon, circ, oval, rrect, type Art } from './sticker';

const ART: Record<string, Art> = {
  pizza: {
    body: [
      { d: 'M14 28 Q50 10 86 28 L52 90 Q50 92 48 90 Z', fill: '#FFCB4D' },
      { d: 'M10 27 Q50 5 90 27 L86 38 Q50 20 14 38 Z', fill: '#E39A4B' },
    ],
    detail: [
      { d: circ(38, 48, 7), fill: '#E5534B' },
      { d: circ(60, 45, 6.5), fill: '#E5534B' },
      { d: circ(50, 68, 6), fill: '#E5534B' },
      { d: oval(34, 24, 12, 3), fill: SHINE },
    ],
  },
  sandwich: {
    body: [
      { d: rrect(12, 30, 76, 18, 8), fill: '#F3CE8A' },
      { d: 'M10 48 q6 8 11 0 t11 0 t11 0 t11 0 t11 0 t11 0 t11 0 v5 H10 Z', fill: GREEN },
      { d: rrect(14, 52, 72, 9, 4), fill: '#E5534B' },
      { d: rrect(10, 61, 80, 9, 4.5), fill: '#FFD84D' },
      { d: rrect(12, 70, 76, 18, 8), fill: '#F3CE8A' },
      { d: 'M50 6 L50 32', stroke: BROWN, sw: 3.5, fill: 'none' },
      { d: circ(50, 10, 6), fill: '#E5534B' },
    ],
    detail: [
      { d: 'M18 36 H82', stroke: '#E1B56B', sw: 3, fill: 'none' },
      { d: 'M18 82 H82', stroke: '#E1B56B', sw: 3, fill: 'none' },
      { d: oval(30, 38, 9, 2.5), fill: SHINE },
      { d: circ(48, 8, 2), fill: SHINE },
    ],
  },
  pasta: {
    body: [
      { d: 'M22 52 q7 -20 15 -2 t15 -1 t15 -1 t14 -2 v8 H22 Z', fill: '#FFD060' },
      { d: 'M28 44 q6 -14 12 -2 t12 -2 t12 -2', stroke: '#FFD060', sw: 7, fill: 'none' },
      { d: 'M12 54 H88 Q88 88 50 88 Q12 88 12 54 Z', fill: '#F27D5B' },
    ],
    detail: [
      { d: 'M22 46 q10 -6 20 0 t20 0 t20 0', stroke: '#E5534B', sw: 5, fill: 'none' },
      { d: oval(28, 68, 4, 9), fill: SHINE },
      { d: circ(58, 24, 4.5), fill: '#7BC65A' },
    ],
  },
  rice: {
    body: [
      { d: 'M16 52 Q16 18 50 18 Q84 18 84 52 Z', fill: '#FFFDF4' },
      { d: 'M10 52 H90 Q90 88 50 88 Q10 88 10 52 Z', fill: '#8A78E8' },
    ],
    detail: [
      { d: oval(38, 36, 4, 2), fill: '#E6DFCB' },
      { d: oval(54, 30, 4, 2), fill: '#E6DFCB' },
      { d: oval(64, 42, 4, 2), fill: '#E6DFCB' },
      { d: oval(46, 44, 4, 2), fill: '#E6DFCB' },
      { d: 'M50 76 c-8 -6 -10 -12 -5 -14 c3 -1 5 1 5 3 c0 -2 2 -4 5 -3 c5 2 3 8 -5 14z', fill: '#FFFFFF' },
      { d: oval(28, 66, 4, 9), fill: SHINE },
    ],
  },
  cereal: {
    body: [{ d: 'M10 46 H90 Q90 86 50 86 Q10 86 10 46 Z', fill: '#5AAEF2' }],
    detail: [
      { d: oval(50, 46, 40, 9), fill: '#FFF6DF' },
      { d: circ(34, 44, 6), stroke: '#F0A93B', sw: 4.5, fill: 'none' },
      { d: circ(52, 48, 6), stroke: '#F0A93B', sw: 4.5, fill: 'none' },
      { d: circ(68, 43, 6), stroke: '#F0A93B', sw: 4.5, fill: 'none' },
      { d: oval(26, 68, 4, 9), fill: SHINE },
    ],
  },
  burger: {
    body: [
      { d: 'M12 44 Q12 12 50 12 Q88 12 88 44 Z', fill: '#EDA24A' },
      { d: 'M10 44 q6 8 11 0 t11 0 t11 0 t11 0 t11 0 t11 0 t11 0 v6 H10 Z', fill: GREEN },
      { d: rrect(10, 50, 80, 12, 6), fill: '#8B5A3C' },
      { d: 'M12 62 H88 L82 72 L70 66 L58 74 L46 66 L34 72 L22 66 Z', fill: '#FFD84D' },
      { d: 'M12 70 H88 V76 Q88 88 76 88 H24 Q12 88 12 76 Z', fill: '#E8A24E' },
    ],
    detail: [
      { d: oval(34, 26, 3, 1.6), fill: '#FFF3D6' },
      { d: oval(50, 20, 3, 1.6), fill: '#FFF3D6' },
      { d: oval(64, 28, 3, 1.6), fill: '#FFF3D6' },
      { d: oval(28, 21, 9, 2.5), fill: SHINE },
    ],
  },
  fries: {
    body: [
      { d: rrect(26, 16, 11, 44, 5), fill: '#FFD860' },
      { d: rrect(39, 10, 11, 50, 5), fill: '#FFCB45' },
      { d: rrect(52, 14, 11, 46, 5), fill: '#FFD860' },
      { d: rrect(65, 20, 11, 40, 5), fill: '#FFCB45' },
      { d: 'M20 46 L27 90 H73 L80 46 Z', fill: '#E5534B' },
    ],
    detail: [
      { d: 'M28 56 L32 84 H44 L40 56 Z', fill: '#FFFFFF', stroke: 'none' },
      { d: 'M58 56 L62 84 H70 L74 56 Z', fill: '#FFFFFF' },
    ],
  },
  bread: {
    body: [{ d: 'M18 32 Q16 14 34 14 Q42 8 50 12 Q58 8 66 14 Q84 14 82 32 Q92 40 82 50 V82 Q82 90 74 90 H26 Q18 90 18 82 V50 Q8 40 18 32 Z', fill: '#E8A24E' }],
    detail: [
      { d: 'M27 34 Q27 24 38 24 H62 Q73 24 73 34 Q80 40 73 47 V80 H27 V47 Q20 40 27 34 Z', fill: '#FFE3A6' },
      { d: oval(38, 34, 8, 3), fill: SHINE },
    ],
  },
  apple: {
    body: [
      { d: 'M50 30 Q30 14 18 34 Q8 58 26 82 Q38 92 50 84 Q62 92 74 82 Q92 58 82 34 Q70 14 50 30 Z', fill: '#F0533F' },
      { d: 'M50 30 Q48 18 54 10 L60 12 Q54 20 56 30 Z', fill: BROWN },
      { d: 'M58 22 Q70 8 84 16 Q78 32 58 22 Z', fill: GREEN },
    ],
    detail: [{ d: oval(30, 44, 5, 10), fill: SHINE }],
  },
  pear: {
    body: [
      { d: 'M50 22 Q63 22 63 38 Q63 46 73 56 Q85 72 75 84 Q63 92 50 90 Q37 92 25 84 Q15 72 27 56 Q37 46 37 38 Q37 22 50 22 Z', fill: '#A6DA5C' },
      { d: 'M50 22 Q48 12 54 6 L59 8 Q54 14 55 22 Z', fill: BROWN },
      { d: 'M56 16 Q68 4 80 12 Q74 26 56 16 Z', fill: GREEN },
    ],
    detail: [{ d: oval(34, 66, 5, 11), fill: SHINE }],
  },
  grapes: {
    body: [
      { d: circ(32, 42, 12), fill: '#9B6BE8' },
      { d: circ(50, 42, 12), fill: '#9B6BE8' },
      { d: circ(68, 42, 12), fill: '#9B6BE8' },
      { d: circ(41, 58, 12), fill: '#8A58DC' },
      { d: circ(59, 58, 12), fill: '#8A58DC' },
      { d: circ(50, 74, 12), fill: '#9B6BE8' },
      { d: 'M50 32 Q48 20 54 12 L58 14 Q54 22 55 32 Z', fill: BROWN },
      { d: 'M56 18 Q68 6 82 14 Q76 28 56 18 Z', fill: GREEN },
    ],
    detail: [
      { d: circ(28, 38, 3), fill: SHINE },
      { d: circ(46, 38, 3), fill: SHINE },
      { d: circ(64, 38, 3), fill: SHINE },
      { d: circ(37, 54, 3), fill: SHINE },
      { d: circ(46, 70, 3), fill: SHINE },
    ],
  },
  milk: {
    body: [{ d: 'M24 20 H76 L69 88 H31 Z', fill: '#D6ECFB' }],
    detail: [
      { d: 'M28 44 H72 L69 88 H31 Z', fill: '#FFFFFF' },
      { d: oval(50, 44, 22, 4), fill: '#FFFFFF' },
      { d: 'M33 30 L36 80', stroke: SHINE, sw: 4, fill: 'none' },
      { d: 'M48 60 c-7 -5 -9 -10 -4.5 -12 c3 -1 4.5 1 4.5 3 c0 -2 1.5 -4 4.5 -3 c4.5 2 2.5 7 -4.5 12z', fill: '#F58C9B' },
    ],
  },
  juice: {
    body: [
      { d: 'M54 6 L61 8 L50 44 L43 42 Z', fill: '#E5534B' },
      { d: 'M24 26 H76 L69 88 H31 Z', fill: '#FFE6BF' },
      { d: circ(72, 28, 12), fill: '#FFB84D' },
    ],
    detail: [
      { d: 'M27 44 H73 L69 88 H31 Z', fill: '#FF9A3D' },
      { d: circ(72, 28, 8), fill: '#FFE08A' },
      { d: 'M72 20 V36 M64 28 H80', stroke: '#FFB84D', sw: 2, fill: 'none' },
      { d: 'M33 52 L36 80', stroke: SHINE, sw: 4, fill: 'none' },
    ],
  },
  cookie: {
    body: [{ d: circ(50, 52, 36), fill: '#DDA35E' }],
    detail: [
      { d: 'M28 34 Q34 24 46 22', stroke: SHINE, sw: 4, fill: 'none' },
      { d: oval(38, 42, 5, 4), fill: '#6E4326' },
      { d: oval(60, 36, 5, 4), fill: '#6E4326' },
      { d: oval(66, 58, 5.5, 4), fill: '#6E4326' },
      { d: oval(44, 64, 5, 4), fill: '#6E4326' },
      { d: oval(30, 60, 4, 3), fill: '#6E4326' },
      { d: oval(54, 52, 4, 3), fill: '#6E4326' },
    ],
  },
  icecream: {
    body: [
      { d: 'M31 50 L69 50 L50 92 Z', fill: '#F2B36B' },
      { d: 'M28 48 Q26 22 50 20 Q74 22 72 48 Q66 56 60 48 Q54 58 48 48 Q42 58 36 48 Q30 56 28 48 Z', fill: '#FF8FB8' },
      { d: circ(56, 16, 6), fill: '#E5534B' },
    ],
    detail: [
      { d: 'M38 56 L58 78 M46 54 L62 68 M52 58 L38 76 M58 56 L48 84', stroke: '#D99A4E', sw: 2.5, fill: 'none' },
      { d: oval(38, 34, 5, 8), fill: SHINE },
    ],
  },
  carrot: {
    body: [
      { d: 'M46 20 L54 10 L60 22 L70 14 L68 30 Z', fill: GREEN },
      { d: 'M38 30 Q52 20 66 32 Q76 46 58 88 Q54 94 50 90 Q28 56 38 30 Z', fill: '#FF9A3D' },
    ],
    detail: [
      { d: 'M46 44 H56 M44 58 H54 M46 72 H52', stroke: '#E57F22', sw: 3, fill: 'none' },
      { d: oval(46, 38, 3, 6), fill: SHINE },
    ],
  },
};

export function FoodIcon({ id, size = 48 }: { id: string; size?: number }) {
  return <StickerIcon art={ART[id]} size={size} />;
}
