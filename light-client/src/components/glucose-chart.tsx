import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { C, F, font } from '@/constants/theme';
import { bgOf } from '@/lib/derive';
import type { DotEvent } from '@/lib/types';
import { fmtBg, type GlucoseUnit } from '@/lib/units';

// Rapid (bolus) and long-acting (basal) insulin are different medicines and get different marks.
const MARKER = { meal: '#F5A524', activity: '#1F9D74', bolus: '#2F80ED', basal: '#C2255C' } as const;
const Y_MIN = 40;
const Y_MAX = 320;
const PAD = { left: 30, right: 10, top: 10, bottom: 22 };

function colorFor(bg: number, low: number, high: number) {
  if (bg < low) return C.danger;
  if (bg > high) return C.warn;
  return C.good;
}

interface Props {
  readings: DotEvent[];
  hours: number;
  now: number;
  low: number;
  high: number;
  height?: number;
  /** Other events drawn as markers along the bottom (meals, insulin, activity). */
  markers?: DotEvent[];
  unit?: GlucoseUnit;
}

/** Glucose over the last `hours`, with the target range shaded. Parent-facing only. */
export function GlucoseChart({ readings, hours, now, low, high, height = 190, markers = [], unit = 'mg/dL' }: Props) {
  const [width, setWidth] = useState(0);
  const start = now - hours * 3_600_000;
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (ts: string) => PAD.left + ((new Date(ts).getTime() - start) / (now - start)) * plotW;
  const y = (bg: number) => PAD.top + (1 - (Math.min(Y_MAX, Math.max(Y_MIN, bg)) - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  const visible = readings.filter((r) => new Date(r.ts).getTime() >= start);
  const path = visible.map((r, i) => `${i ? 'L' : 'M'}${x(r.ts).toFixed(1)},${y(bgOf(r)).toFixed(1)}`).join(' ');
  const tickEvery = hours <= 24 ? 6 : 24 * Math.ceil(hours / 24 / 7);
  const ticks: number[] = [];
  for (let h = hours; h >= 0; h -= tickEvery) ticks.push(now - h * 3_600_000);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width === 0 ? <View style={{ height }} /> : (
        <Svg width={width} height={height}>
          <Rect x={PAD.left} y={y(high)} width={plotW} height={y(low) - y(high)} fill={C.mintSoft} />
          {[low, high, 250].map((v) => (
            <SvgText key={v} x={PAD.left - 4} y={y(v) + 4} fontSize={11} fontFamily={F.bold} fill={C.inkSoft} textAnchor="end">
              {fmtBg(v, unit, false)}
            </SvgText>
          ))}
          <Line x1={PAD.left} x2={PAD.left + plotW} y1={y(250)} y2={y(250)} stroke={C.line} strokeDasharray="4 4" />
          {ticks.map((tk) => {
            const d = new Date(tk);
            const label = hours <= 24 ? `${d.getHours()}:00` : `${d.getMonth() + 1}/${d.getDate()}`;
            const tx = PAD.left + ((tk - start) / (now - start)) * plotW;
            return (
              <SvgText key={tk} x={tx} y={height - 6} fontSize={11} fontFamily={F.bold} fill={C.inkSoft} textAnchor="middle">
                {label}
              </SvgText>
            );
          })}
          {visible.length > 1 && <Path d={path} stroke={C.primary} strokeWidth={2} fill="none" opacity={0.5} />}
          {visible.map((r) => (
            <Circle key={r.client_id} cx={x(r.ts)} cy={y(bgOf(r))} r={hours <= 24 ? 4 : 2.5} fill={colorFor(bgOf(r), low, high)} />
          ))}
          {markers
            .filter((m) => new Date(m.ts).getTime() >= start)
            .map((m) => {
              const mx = x(m.ts);
              const my = PAD.top + plotH - 6;
              const color = MARKER[m.type as keyof typeof MARKER] ?? C.inkSoft;
              return m.type === 'bolus' ? (
                <Path key={m.client_id} d={`M${mx} ${my - 5} L${mx + 5} ${my + 4} L${mx - 5} ${my + 4} Z`} fill={color} />
              ) : m.type === 'basal' ? (
                <Rect key={m.client_id} x={mx - 2} y={my - 7} width={4} height={13} rx={2} fill={color} />
              ) : (
                <Rect key={m.client_id} x={mx - 4} y={my - 4} width={8} height={8} rx={m.type === 'meal' ? 4 : 1.5} fill={color} />
              );
            })}
        </Svg>
      )}
      {markers.length > 0 && (
        <View style={styles.legend}>
          {[
            ['Meal', MARKER.meal, 5],
            ['Activity', MARKER.activity, 1.5],
            ['Rapid insulin', MARKER.bolus, 0],
            ['Long-acting', MARKER.basal, 2],
          ].map(([label, color, radius]) => (
            <View key={label as string} style={styles.legendItem}>
              <View style={{ width: 9, height: 9, backgroundColor: color as string, borderRadius: radius as number }} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { ...font('700'), fontSize: 12, color: C.inkSoft },
});
