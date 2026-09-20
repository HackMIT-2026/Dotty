/**
 * Little sticker pictures: soft colours, a shine, and a white outline, to sit with the icons in assets/icons.
 * A picture is a list of shapes in a 100x100 box. The `body` shapes get the white outline, the `detail` shapes are
 * drawn on top of them. Used by the food cards (food-icon.tsx) and the Play screen (play-icon.tsx).
 */
import Svg, { G, Path } from 'react-native-svg';

export interface Shape {
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
}
export interface Art {
  body: Shape[];
  detail?: Shape[];
}

// ---------- small path helpers ----------
export const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
export const oval = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
export const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} h${w - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${h - 2 * r} a${r} ${r} 0 0 1 ${-r} ${r} h${-(w - 2 * r)} a${r} ${r} 0 0 1 ${-r} ${-r} v${-(h - 2 * r)} a${r} ${r} 0 0 1 ${r} ${-r}Z`;

export const SHINE = 'rgba(255,255,255,0.75)';
export const BROWN = '#8A5A3B';
export const GREEN = '#6FC451';
export const DARK_GREEN = '#4FA23B';
export const INK = '#3B2A46';
export const SKIN = '#FFC9A3';

/** The little pop lines top right, like on the icons in assets/icons. */
const SPARKLE = 'M84 12 l3 -7 M92 22 l7 -3 M90 34 l6 3';

export function StickerIcon({ art, size = 48, sparkle = true }: { art: Art | undefined; size?: number; sparkle?: boolean }) {
  if (!art) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {sparkle ? (
        <G opacity={0.9}>
          <Path d={SPARKLE} stroke="#FFC94D" strokeWidth={4} strokeLinecap="round" fill="none" />
        </G>
      ) : null}
      {/* the white sticker outline: every body shape again, fatter, in white */}
      <G>
        {art.body.map((s, i) => (
          <Path key={`o${i}`} d={s.d} fill={s.fill ? '#FFFFFF' : 'none'} stroke="#FFFFFF" strokeWidth={(s.sw ?? 0) + 12} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </G>
      {art.body.map((s, i) => (
        <Path key={`b${i}`} d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.sw} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {(art.detail ?? []).map((s, i) => (
        <Path key={`d${i}`} d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke === 'none' ? undefined : s.stroke} strokeWidth={s.sw} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </Svg>
  );
}
