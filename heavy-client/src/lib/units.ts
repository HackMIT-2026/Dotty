/** Glucose is stored in mg/dL; the family's chosen unit only changes what is shown (light-client/src/lib/units.ts). */
import type { GlucoseUnit } from './types';

export const MGDL_PER_MMOL = 18;

export function toUnit(mgdl: number, unit: GlucoseUnit): number {
  return unit === 'mmol/L' ? Math.round((mgdl / MGDL_PER_MMOL) * 10) / 10 : Math.round(mgdl);
}

export function fmtBg(mgdl: number, unit: GlucoseUnit, withUnit = true): string {
  const v = unit === 'mmol/L' ? toUnit(mgdl, unit).toFixed(1) : String(toUnit(mgdl, unit));
  return withUnit ? `${v} ${unit}` : v;
}
