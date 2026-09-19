/**
 * Glucose units. Everything is stored and computed in mg/dL (server, events, the clinician's plan, the dose math);
 * the family's chosen unit only changes what people see and type. The parent picks it in Settings.
 */
import { useStore } from './store';

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export const MGDL_PER_MMOL = 18;
export const MIN_MGDL = 20;
export const MAX_MGDL = 600;

/** mg/dL -> the number shown in `unit` (mmol/L to one decimal). */
export function toUnit(mgdl: number, unit: GlucoseUnit): number {
  return unit === 'mmol/L' ? Math.round((mgdl / MGDL_PER_MMOL) * 10) / 10 : Math.round(mgdl);
}

export function fmtBg(mgdl: number, unit: GlucoseUnit, withUnit = true): string {
  const v = unit === 'mmol/L' ? toUnit(mgdl, unit).toFixed(1) : String(toUnit(mgdl, unit));
  return withUnit ? `${v} ${unit}` : v;
}

/** Typed text in `unit` -> mg/dL, or null if it isn't a plausible glucose value. */
export function parseBg(text: string, unit: GlucoseUnit): number | null {
  const n = Number(text.trim().replace(',', '.'));
  if (!text.trim() || Number.isNaN(n)) return null;
  const mgdl = unit === 'mmol/L' ? Math.round(n * MGDL_PER_MMOL) : Math.round(n);
  return mgdl >= MIN_MGDL && mgdl <= MAX_MGDL ? mgdl : null;
}

export function rangeHint(unit: GlucoseUnit): string {
  return `${fmtBg(MIN_MGDL, unit, false)}–${fmtBg(MAX_MGDL, unit)}`;
}

export function useGlucoseUnit(): GlucoseUnit {
  return useStore((s) => s.session?.family?.glucose_unit ?? 'mg/dL');
}
