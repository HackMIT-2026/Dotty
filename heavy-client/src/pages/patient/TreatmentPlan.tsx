import { Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, ErrorText, Field, H2, Pill } from '../../components/ui';
import { api, errorText } from '../../lib/api';
import { timeAgo } from '../../lib/time';
import type { Plan } from '../../lib/types';
import { MGDL_PER_MMOL, toUnit } from '../../lib/units';
import { usePatient } from '../PatientLayout';

type Draft = Omit<Plan, 'id' | 'patient_id' | 'version' | 'updated_at'>;

const EMPTY: Draft = {
  icr: [{ start: '00:00', g_per_unit: 10 }],
  isf_mgdl_per_unit: 50,
  target: { low: 70, high: 180 },
  correction_target: 120,
  max_bolus: 10,
  basal: [],
  reminders: [],
  activity_rules: { light: 0, moderate: 25, vigorous: 50 },
  notes: '',
};

export default function TreatmentPlan() {
  const { patient } = usePatient();
  const unit = patient.glucose_unit;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Plan>(`/patients/${patient.id}/plan`)
      .then((p) => {
        setPlan(p);
        const { id, patient_id, version, updated_at, ...rest } = p;
        setDraft(rest);
      })
      .catch(() => setPlan(null));
  }, [patient.id]);

  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setSaved(false);
  };

  /** Glucose parameters are stored in mg/dL; the family's unit only changes what is typed here. */
  const inUnit = (mgdl: number) => toUnit(mgdl, unit);
  const toMgdl = (v: number) => (unit === 'mmol/L' ? Math.round(v * MGDL_PER_MMOL) : Math.round(v));
  const step = unit === 'mmol/L' ? 0.1 : 1;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await api<Plan>(`/patients/${patient.id}/plan`, { method: 'PUT', body: draft });
      setPlan(next);
      setSaved(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <H2>Treatment plan</H2>
            <p className="text-sm text-ink-soft">
              Carb ratios and correction settings. The parent app shows these and uses them for dosing decisions; the child never sees them.
            </p>
          </div>
          {plan ? <Pill tone="brand">v{plan.version} · {timeAgo(plan.updated_at)}</Pill> : <Pill tone="warn">No plan yet</Pill>}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <H2>Carb ratios</H2>
          <Button variant="secondary" icon={<Plus size={14} />} onClick={() => set({ icr: [...draft.icr, { start: '12:00', g_per_unit: 10 }] })}>
            Add slot
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {draft.icr.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Field
                label="From"
                type="time"
                value={slot.start}
                onChange={(e) => set({ icr: draft.icr.map((s, j) => (i === j ? { ...s, start: e.target.value } : s)) })}
                className="w-32"
              />
              <Field
                label="1 unit covers (g carbs)"
                type="number"
                min={1}
                max={100}
                value={slot.g_per_unit}
                onChange={(e) => set({ icr: draft.icr.map((s, j) => (i === j ? { ...s, g_per_unit: Number(e.target.value) } : s)) })}
                className="w-48"
              />
              {draft.icr.length > 1 && (
                <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => set({ icr: draft.icr.filter((_, j) => j !== i) })}>
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <H2>Corrections ({unit})</H2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="1 unit lowers glucose by"
            type="number"
            step={step}
            value={inUnit(draft.isf_mgdl_per_unit)}
            onChange={(e) => set({ isf_mgdl_per_unit: toMgdl(Number(e.target.value)) })}
          />
          <Field
            label="Correct down to"
            type="number"
            step={step}
            value={inUnit(draft.correction_target)}
            onChange={(e) => set({ correction_target: toMgdl(Number(e.target.value)) })}
          />
          <Field
            label="Target low"
            type="number"
            step={step}
            value={inUnit(draft.target.low)}
            onChange={(e) => set({ target: { ...draft.target, low: toMgdl(Number(e.target.value)) } })}
          />
          <Field
            label="Target high"
            type="number"
            step={step}
            value={inUnit(draft.target.high)}
            onChange={(e) => set({ target: { ...draft.target, high: toMgdl(Number(e.target.value)) } })}
          />
          <Field label="Max single dose (u)" type="number" step={0.5} value={draft.max_bolus} onChange={(e) => set({ max_bolus: Number(e.target.value) })} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <H2>Basal</H2>
          <Button variant="secondary" icon={<Plus size={14} />} onClick={() => set({ basal: [...draft.basal, { time: '21:00', units: 12 }] })}>
            Add dose
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {draft.basal.map((b, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <Field label="Time" type="time" value={b.time} onChange={(e) => set({ basal: draft.basal.map((x, j) => (i === j ? { ...x, time: e.target.value } : x)) })} className="w-32" />
              <Field
                label="Units"
                type="number"
                step={0.5}
                value={b.units}
                onChange={(e) => set({ basal: draft.basal.map((x, j) => (i === j ? { ...x, units: Number(e.target.value) } : x)) })}
                className="w-32"
              />
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => set({ basal: draft.basal.filter((_, j) => j !== i) })}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <H2>Activity adjustments (% less insulin)</H2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['light', 'moderate', 'vigorous'] as const).map((k) => (
            <Field
              key={k}
              label={k[0].toUpperCase() + k.slice(1)}
              type="number"
              min={0}
              max={100}
              value={draft.activity_rules[k]}
              onChange={(e) => set({ activity_rules: { ...draft.activity_rules, [k]: Number(e.target.value) } })}
            />
          ))}
        </div>
      </Card>

      <Card>
        <H2>Notes on the plan</H2>
        <textarea
          className="mt-2 w-full rounded-xl border-2 border-line px-3 py-2 font-semibold outline-none focus:border-brand"
          rows={3}
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Anything the parent should know about these settings."
        />
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy} icon={<Check size={16} />}>
          {plan ? 'Save new version' : 'Create plan'}
        </Button>
        {saved && <span className="text-sm font-bold text-good">Saved — the parent has been notified.</span>}
      </div>
    </div>
  );
}
