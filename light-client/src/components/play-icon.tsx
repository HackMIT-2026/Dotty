/**
 * The Play screen's pictures as little stickers (see sticker.tsx): the eight activities, a stopwatch for how long,
 * and a turtle, rabbit and rocket for how hard.
 */
import { BROWN, GREEN, INK, SHINE, SKIN, StickerIcon, circ, oval, rrect, type Art } from './sticker';

const CORAL = '#F2708A';
const BLUE = '#4C8DF6';
const TEAL = '#3DCB9A';

/** A wedge of the stopwatch face, `fraction` of the way round from 12 o'clock. */
function wedge(fraction: number): string {
  const f = Math.min(1, Math.max(0, fraction));
  if (f >= 0.999) return circ(50, 56, 25);
  const a = f * 2 * Math.PI;
  const x = 50 + 25 * Math.sin(a);
  const y = 56 - 25 * Math.cos(a);
  return `M50 56 L50 31 A25 25 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)} Z`;
}

function stopwatch(minutes: number): Art {
  return {
    body: [
      { d: rrect(42, 8, 16, 9, 3), fill: CORAL },
      { d: circ(50, 56, 34), fill: '#FFFFFF', stroke: CORAL, sw: 6 },
      { d: 'M76 24 l7 -7', stroke: CORAL, sw: 6 },
    ],
    detail: [
      { d: wedge(minutes / 60), fill: '#FFD27A' },
      { d: 'M50 56 L50 34', stroke: INK, sw: 4.5 },
      { d: circ(50, 56, 4), fill: INK },
      { d: 'M50 26 v3 M80 56 h-3 M50 86 v-3 M20 56 h3', stroke: '#B9A99B', sw: 3 },
      ...(minutes > 60 ? [{ d: 'M84 80 h10 M89 75 v10', stroke: CORAL, sw: 4 }] : []),
    ],
  };
}

const ART: Record<string, Art> = {
  soccer: {
    body: [{ d: circ(50, 52, 35), fill: '#FFFFFF', stroke: INK, sw: 3.5 }],
    detail: [
      { d: 'M50 41 L60.5 48.6 L56.5 61 L43.5 61 L39.5 48.6 Z', fill: INK },
      { d: 'M50 41 V29 M60.5 48.6 L72 42 M56.5 61 L64 71 M43.5 61 L36 71 M39.5 48.6 L28 42', stroke: INK, sw: 3 },
      { d: oval(50, 21, 8, 3.6), fill: INK },
      { d: oval(79, 40, 4, 8), fill: INK },
      { d: oval(71, 77, 8, 3.6), fill: INK },
      { d: oval(29, 77, 8, 3.6), fill: INK },
      { d: oval(21, 40, 4, 8), fill: INK },
      { d: oval(34, 33, 6, 3), fill: SHINE },
    ],
  },
  running: {
    body: [
      { d: 'M52 30 L44 54', stroke: CORAL, sw: 12 },
      { d: 'M54 36 L70 46 L79 40', stroke: CORAL, sw: 8 },
      { d: 'M50 36 L36 40 L30 52', stroke: CORAL, sw: 8 },
      { d: 'M44 54 L62 62 L60 82', stroke: BLUE, sw: 9 },
      { d: 'M44 54 L32 70 L16 66', stroke: BLUE, sw: 9 },
      { d: circ(60, 20, 10), fill: SKIN },
    ],
    detail: [
      { d: oval(64, 86, 8, 4), fill: '#FFFFFF', stroke: INK, sw: 2 },
      { d: oval(13, 68, 6, 4), fill: '#FFFFFF', stroke: INK, sw: 2 },
      { d: 'M52 12 Q60 6 68 12', stroke: BROWN, sw: 4 },
    ],
  },
  bike: {
    body: [
      { d: circ(26, 64, 17), stroke: INK, sw: 5 },
      { d: circ(74, 64, 17), stroke: INK, sw: 5 },
      { d: 'M26 64 L44 38 L66 38 L74 64 M44 38 L52 64 L26 64', stroke: CORAL, sw: 5 },
      { d: 'M36 32 h14', stroke: BROWN, sw: 5 },
      { d: 'M66 38 L63 26 h10', stroke: INK, sw: 5 },
    ],
    detail: [
      { d: circ(26, 64, 3.5), fill: INK },
      { d: circ(74, 64, 3.5), fill: INK },
      { d: circ(52, 64, 3.5), fill: '#FFC94D' },
    ],
  },
  swim: {
    body: [
      { d: circ(34, 46, 10), fill: SKIN },
      { d: 'M24 44 Q24 33 34 33 Q44 33 44 44 Z', fill: CORAL },
      { d: 'M44 50 Q58 24 76 38 L84 34', stroke: SKIN, sw: 8 },
      { d: 'M6 60 q11 -11 22 0 t22 0 t22 0 t22 0 V90 H6 Z', fill: '#5AAEF2' },
    ],
    detail: [
      { d: 'M6 74 q11 -8 22 0 t22 0 t22 0 t22 0', stroke: '#8FD0FF', sw: 4 },
      { d: circ(31, 46, 1.8), fill: INK },
      { d: circ(38, 46, 1.8), fill: INK },
    ],
  },
  dance: {
    body: [
      { d: 'M46 36 L26 20', stroke: SKIN, sw: 7 },
      { d: 'M54 36 L74 26', stroke: SKIN, sw: 7 },
      { d: 'M44 72 L40 90 M56 72 L66 86', stroke: SKIN, sw: 7 },
      { d: 'M50 32 L28 72 Q50 82 72 72 Z', fill: CORAL },
      { d: circ(50, 20, 10), fill: SKIN },
    ],
    detail: [
      { d: 'M42 14 Q50 8 58 14', stroke: BROWN, sw: 4 },
      { d: 'M36 62 q14 8 28 0', stroke: '#FFD0DA', sw: 3.5 },
      { d: circ(82, 14, 4), fill: '#9B6BE8' },
      { d: 'M86 14 V2', stroke: '#9B6BE8', sw: 3 },
    ],
  },
  playground: {
    body: [
      { d: 'M22 90 V30 M44 90 V30', stroke: BROWN, sw: 7 },
      { d: rrect(14, 26, 38, 9, 3), fill: '#F5C26B' },
      { d: 'M50 34 Q66 42 68 62 Q70 78 90 82', stroke: BLUE, sw: 11 },
    ],
    detail: [
      { d: 'M22 48 H44 M22 62 H44 M22 76 H44', stroke: BROWN, sw: 4 },
      { d: 'M52 30 Q66 38 70 58', stroke: '#8FBBFF', sw: 3 },
      { d: circ(30, 14, 8), fill: SKIN },
      { d: 'M24 8 Q30 3 36 8', stroke: BROWN, sw: 3 },
    ],
  },
  walk: {
    body: [
      { d: 'M50 32 L50 60', stroke: TEAL, sw: 12 },
      { d: 'M50 38 L38 56 M50 38 L62 54', stroke: TEAL, sw: 8 },
      { d: 'M50 60 L42 84 M50 60 L60 84', stroke: BLUE, sw: 9 },
      { d: circ(50, 20, 10), fill: SKIN },
    ],
    detail: [
      { d: oval(40, 88, 7, 4), fill: '#FFFFFF', stroke: INK, sw: 2 },
      { d: oval(62, 88, 7, 4), fill: '#FFFFFF', stroke: INK, sw: 2 },
      { d: 'M42 13 Q50 7 58 13', stroke: BROWN, sw: 4 },
    ],
  },
  basketball: {
    body: [{ d: circ(50, 52, 35), fill: '#F58B3A', stroke: '#8A4A1E', sw: 3.5 }],
    detail: [
      { d: 'M15 52 H85 M50 17 V87', stroke: '#8A4A1E', sw: 3.5 },
      { d: 'M27 24 Q44 52 27 80 M73 24 Q56 52 73 80', stroke: '#8A4A1E', sw: 3.5 },
      { d: oval(34, 34, 7, 3.5), fill: SHINE },
    ],
  },

  // how hard: a turtle, a rabbit and a rocket
  light: {
    body: [
      { d: 'M20 64 Q20 30 52 30 Q84 30 84 64 Z', fill: '#7BCB5A' },
      { d: rrect(18, 62, 68, 12, 6), fill: '#E8C88A' },
      { d: circ(88, 58, 10), fill: '#A6DA5C' },
      { d: oval(34, 78, 8, 6), fill: '#A6DA5C' },
      { d: oval(68, 78, 8, 6), fill: '#A6DA5C' },
    ],
    detail: [
      { d: 'M52 30 V62 M34 42 L52 50 L70 42 M28 56 H76', stroke: '#4FA23B', sw: 3 },
      { d: circ(91, 55, 2), fill: INK },
      { d: oval(38, 40, 6, 3), fill: SHINE },
    ],
  },
  moderate: {
    body: [
      { d: oval(36, 26, 9, 22), fill: '#FFFFFF', stroke: '#E8D5DC', sw: 2 },
      { d: oval(64, 26, 9, 22), fill: '#FFFFFF', stroke: '#E8D5DC', sw: 2 },
      { d: circ(50, 62, 28), fill: '#FFFFFF', stroke: '#E8D5DC', sw: 2 },
    ],
    detail: [
      { d: oval(36, 28, 4, 15), fill: '#FFB8CC' },
      { d: oval(64, 28, 4, 15), fill: '#FFB8CC' },
      { d: circ(40, 60, 3.6), fill: INK },
      { d: circ(60, 60, 3.6), fill: INK },
      { d: oval(50, 68, 4.5, 3), fill: CORAL },
      { d: 'M50 71 Q46 77 42 74 M50 71 Q54 77 58 74', stroke: INK, sw: 2 },
      { d: oval(32, 70, 5, 3.5), fill: '#FFC2D2' },
      { d: oval(68, 70, 5, 3.5), fill: '#FFC2D2' },
    ],
  },
  vigorous: {
    body: [
      { d: 'M34 54 L18 78 L34 74 Z', fill: '#E5534B' },
      { d: 'M66 54 L82 78 L66 74 Z', fill: '#E5534B' },
      { d: 'M50 6 Q72 28 68 68 H32 Q28 28 50 6 Z', fill: '#F3F3F8' },
      { d: 'M42 68 Q50 96 58 68 Z', fill: '#FFC94D' },
    ],
    detail: [
      { d: 'M50 6 Q62 16 66 32 H34 Q38 16 50 6 Z', fill: '#E5534B' },
      { d: circ(50, 48, 9), fill: '#5AAEF2', stroke: '#B8C4D8', sw: 3 },
      { d: 'M46 74 Q50 88 54 74 Z', fill: '#FF8A3D' },
      { d: oval(43, 44, 2.6, 4.5), fill: SHINE },
    ],
  },
};

const DURATIONS = [15, 30, 45, 60, 90];
for (const m of DURATIONS) ART[`min-${m}`] = stopwatch(m);

/** `id` is an activity id, `light`, `moderate` or `vigorous`, or `min-15` and so on for the stopwatch. */
export function PlayIcon({ id, size = 28 }: { id: string; size?: number }) {
  return <StickerIcon art={ART[id]} size={size} sparkle={false} />;
}
