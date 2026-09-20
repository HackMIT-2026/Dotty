/**
 * The shop's "extras" (glasses, headphones, bow tie, scarf, cape), drawn in each pose picture's own pixel space so
 * they land on the right spot however Pip is sitting: glasses on the eyes, headphones on the ears, and so on.
 * The points below were measured from the pictures in assets/pet (see pose-art.ts for where those come from).
 */
import { G, Path, Circle, Polygon, Rect } from 'react-native-svg';

export type PoseName = 'happy' | 'curious' | 'cheering' | 'sleepy';

interface PosePoints {
  /** size of the picture; every number below is in its pixels */
  w: number;
  h: number;
  eyes: { l: [number, number]; r: [number, number] };
  /** the round of the head: where headphones sit */
  head: { cx: number; cy: number; rx: number; ry: number };
  /** middle of the neck, where a bow tie or scarf goes */
  neck: [number, number];
  /** the cape, drawn behind the body */
  cape: string;
}

export const POSE_POINTS: Record<PoseName, PosePoints> = {
  happy: {
    w: 540,
    h: 493,
    eyes: { l: [200, 178], r: [349, 200] },
    head: { cx: 277, cy: 195, rx: 150, ry: 150 },
    neck: [277, 282],
    cape: 'M205 278 C120 300 55 370 60 455 C170 497 390 497 482 450 C492 375 430 305 350 278 Z',
  },
  curious: {
    w: 566,
    h: 484,
    eyes: { l: [208, 196], r: [349, 159] },
    head: { cx: 285, cy: 195, rx: 152, ry: 150 },
    neck: [262, 290],
    cape: 'M195 295 C110 320 60 390 70 452 C180 492 400 492 472 432 C472 370 410 315 330 292 Z',
  },
  cheering: {
    w: 1174,
    h: 976,
    eyes: { l: [410, 299], r: [716, 363] },
    head: { cx: 575, cy: 365, rx: 290, ry: 285 },
    neck: [575, 548],
    cape: 'M340 560 C180 640 90 790 110 900 C350 960 800 950 1030 870 C1050 770 970 650 820 560 Z',
  },
  sleepy: {
    w: 1448,
    h: 1086,
    eyes: { l: [370, 728], r: [742, 753] },
    head: { cx: 560, cy: 640, rx: 395, ry: 300 },
    neck: [600, 880],
    cape: 'M880 520 C980 380 1200 330 1380 420 C1425 520 1385 610 1330 650 C1200 570 1050 570 900 650 Z',
  },
};

const INK = '#3B2A46';

/** The cape sits behind the body, so it is drawn on its own layer under the picture. */
export function BackAccessory({ id, pose }: { id: string | null; pose: PoseName }) {
  if (id !== 'acc_cape') return null;
  const p = POSE_POINTS[pose];
  return (
    <G>
      <Path d={p.cape} fill="#E5534B" stroke="#B93A34" strokeWidth={p.w * 0.008} strokeLinejoin="round" />
      <Path d={p.cape} fill="none" stroke="#F58A84" strokeWidth={p.w * 0.006} strokeDasharray={`${p.w * 0.02} ${p.w * 0.03}`} opacity={0.6} />
    </G>
  );
}

/** Everything else goes in front of the body. */
export function FrontAccessory({ id, pose }: { id: string | null; pose: PoseName }) {
  const p = POSE_POINTS[pose];
  const [lx, ly] = p.eyes.l;
  const [rx, ry] = p.eyes.r;
  const dist = Math.hypot(rx - lx, ry - ly);
  const angle = (Math.atan2(ry - ly, rx - lx) * 180) / Math.PI;
  const { cx, cy, rx: hx, ry: hy } = p.head;
  const [nx, ny] = p.neck;

  switch (id) {
    case 'acc_glasses': {
      const r = dist * 0.36;
      const sw = dist * 0.05;
      return (
        <G transform={`translate(${(lx + rx) / 2} ${(ly + ry) / 2}) rotate(${angle})`}>
          <G stroke={INK} strokeWidth={sw} fill="rgba(255,255,255,0.35)">
            <Circle cx={-dist / 2} cy={0} r={r} />
            <Circle cx={dist / 2} cy={0} r={r} />
          </G>
          <Path d={`M${-dist / 2 + r} ${-r * 0.1} q${dist / 2 - r} ${-r * 0.5} ${dist - 2 * r} 0`} fill="none" stroke={INK} strokeWidth={sw} strokeLinecap="round" />
          <Path d={`M${-dist / 2 - r} ${-r * 0.1} l${-r * 0.6} ${-r * 0.15} M${dist / 2 + r} ${-r * 0.1} l${r * 0.6} ${-r * 0.15}`} stroke={INK} strokeWidth={sw} strokeLinecap="round" />
        </G>
      );
    }
    case 'acc_headphones': {
      const lxp = cx - hx * 1.0;
      const rxp = cx + hx * 1.0;
      const yp = cy + hy * 0.05;
      const padW = hx * 0.2;
      const padH = hx * 0.44;
      return (
        <G>
          <Path d={`M${lxp} ${yp} A${hx * 1.03} ${hy * 1.03} 0 0 1 ${rxp} ${yp}`} stroke={INK} strokeWidth={hx * 0.075} fill="none" strokeLinecap="round" />
          <Rect x={lxp - padW / 2} y={yp - padH / 2} width={padW} height={padH} rx={padW / 2} fill="#E56B8A" stroke="#B94C69" strokeWidth={hx * 0.02} />
          <Rect x={rxp - padW / 2} y={yp - padH / 2} width={padW} height={padH} rx={padW / 2} fill="#E56B8A" stroke="#B94C69" strokeWidth={hx * 0.02} />
        </G>
      );
    }
    case 'acc_bowtie': {
      const s = hx * 0.2;
      return (
        <G>
          <Polygon points={`${nx},${ny} ${nx - 2.2 * s},${ny - s} ${nx - 2.2 * s},${ny + s}`} fill="#E5534B" stroke="#B93A34" strokeWidth={s * 0.14} strokeLinejoin="round" />
          <Polygon points={`${nx},${ny} ${nx + 2.2 * s},${ny - s} ${nx + 2.2 * s},${ny + s}`} fill="#E5534B" stroke="#B93A34" strokeWidth={s * 0.14} strokeLinejoin="round" />
          <Circle cx={nx} cy={ny} r={s * 0.55} fill="#C13F38" />
        </G>
      );
    }
    case 'acc_scarf': {
      const w = hx * 0.62;
      const t = hx * 0.2;
      return (
        <G>
          <Path
            d={`M${nx - w} ${ny - t * 0.5} Q${nx} ${ny + t * 1.1} ${nx + w} ${ny - t * 0.5} L${nx + w} ${ny + t * 0.6} Q${nx} ${ny + t * 2.2} ${nx - w} ${ny + t * 0.6} Z`}
            fill="#F5C26B"
            stroke="#DDA23C"
            strokeWidth={t * 0.12}
            strokeLinejoin="round"
          />
          <Rect x={nx + w * 0.35} y={ny + t * 0.9} width={t * 0.95} height={t * 2.4} rx={t * 0.4} fill="#E8A945" stroke="#DDA23C" strokeWidth={t * 0.12} />
        </G>
      );
    }
    case 'acc_cape': {
      const s = hx * 0.11;
      return (
        <G>
          <Circle cx={nx} cy={ny} r={s} fill="#F5C26B" stroke="#DDA23C" strokeWidth={s * 0.25} />
          <Circle cx={nx - s * 0.3} cy={ny - s * 0.3} r={s * 0.3} fill="#FFF3B0" />
        </G>
      );
    }
    default:
      return null;
  }
}
