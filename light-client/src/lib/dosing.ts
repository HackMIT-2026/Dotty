/**
 * Bolus suggestion, computed on the device from the cached treatment plan so the helper works offline.
 * This is a port of server/app/services/dosing.py: keep the two in sync (server/tests/test_dosing.py
 * holds the reference cases). Every parameter comes from the clinician's plan.
 */
import type { ActivityChoice, DoseResult, Plan } from './types';

export const LOW_BG_MGDL = 70;
export const HIGH_BG_MGDL = 250;

export function roundHalf(x: number): number {
  return Math.floor(x * 2 + 0.5) / 2;
}

/** Grams of carbs per unit for a local time "HH:MM"; wraps to the last slot before the first start. */
export function icrFor(icr: Plan['icr'], hhmm: string): number {
  const slots = [...icr].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  let chosen = slots[slots.length - 1];
  for (const s of slots) if (s.start <= hhmm) chosen = s;
  return chosen.g_per_unit;
}

export function hhmmOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function suggestDose(
  plan: Plan,
  carbsG: number,
  bgMgdl: number,
  hhmm: string,
  activity: ActivityChoice = 'none',
): DoseResult {
  const base: DoseResult = {
    blocked: false,
    message: null,
    warnings: ['Insulin on board is not tracked. Check the last dose before confirming.'],
    carbs_g: carbsG,
    bg_mgdl: bgMgdl,
    activity,
    plan_version: plan.version,
    max_bolus: plan.max_bolus,
    suggested_units: 0,
  };

  if (bgMgdl < LOW_BG_MGDL) {
    return {
      ...base,
      blocked: true,
      message:
        'Glucose is low. Treat the low first: 15 g of fast carbs, then recheck in 15 minutes. No dose suggested.',
    };
  }

  const icr = icrFor(plan.icr, hhmm);
  const reducePct = activity === 'none' ? 0 : (plan.activity_rules[activity] ?? 0);
  const carbUnits = carbsG / icr;
  const correctionUnits = Math.max(0, (bgMgdl - plan.correction_target) / plan.isf_mgdl_per_unit);
  const factor = 1 - reducePct / 100;
  const raw = (carbUnits + correctionUnits) * factor;
  const rounded = roundHalf(raw);
  const suggested = Math.min(rounded, plan.max_bolus);

  const warnings = [...base.warnings];
  if (bgMgdl > HIGH_BG_MGDL) warnings.push("Glucose is high. Follow your care team's plan for high readings.");
  if (rounded > plan.max_bolus) warnings.push(`Capped at the plan's maximum of ${plan.max_bolus} units.`);

  return {
    ...base,
    warnings,
    icr_g_per_unit: icr,
    isf_mgdl_per_unit: plan.isf_mgdl_per_unit,
    correction_target: plan.correction_target,
    carb_units: Math.round(carbUnits * 100) / 100,
    correction_units: Math.round(correctionUnits * 100) / 100,
    activity_reduce_pct: reducePct,
    activity_factor: factor,
    raw_units: Math.round(raw * 100) / 100,
    suggested_units: suggested,
    capped: rounded > plan.max_bolus,
  };
}
