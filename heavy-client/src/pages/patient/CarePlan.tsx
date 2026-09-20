import { Activity, Apple, Check, HeartPulse, Minus, Pencil, Plus, Sparkles, Syringe, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, Empty, ErrorText, Field, H2, Pill, Select } from '../../components/ui';
import { api, errorText } from '../../lib/api';
import { WEEKDAYS, shortDay } from '../../lib/time';
import type { Adherence, Task, TaskDraft, TaskKind } from '../../lib/types';
import { usePatient } from '../PatientLayout';

const KINDS: { id: TaskKind; label: string; icon: typeof HeartPulse; hint: string }[] = [
  { id: 'check', label: 'Glucose check', icon: HeartPulse, hint: 'Done when a reading is logged in the window.' },
  { id: 'medicine', label: 'Insulin / medicine', icon: Syringe, hint: 'Done when insulin is logged in the window.' },
  { id: 'meal', label: 'Meal', icon: Apple, hint: 'Done when a meal is logged in the window.' },
  { id: 'activity', label: 'Activity', icon: Activity, hint: 'Done when the day reaches the target minutes.' },
  { id: 'custom', label: 'Other', icon: Sparkles, hint: 'The child marks it done in the app.' },
];

const EMPTY: TaskDraft = {
  title: '',
  instructions: '',
  kind: 'check',
  time: '08:00',
  window_min: 60,
  days: [],
  target_minutes: null,
  importance: 2,
  active: true,
};

/** Clinical priority. The app turns it into the child's reward and how much Dotty reacts. */
const PRIORITY: { value: number; label: string; hint: string; tone: 'neutral' | 'brand' | 'bad' }[] = [
  { value: 1, label: 'Routine', hint: 'Good to do', tone: 'neutral' },
  { value: 2, label: 'Important', hint: 'Expected every day', tone: 'brand' },
  { value: 3, label: 'Critical', hint: 'Must not be missed', tone: 'bad' },
];

function PriorityPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-ink-soft">Priority</span>
      <div className="flex gap-2">
        {PRIORITY.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            title={p.hint}
            className={`rounded-full px-3 py-2 text-sm font-extrabold transition ${
              value === p.value ? 'bg-brand text-ink' : 'bg-line text-ink-soft hover:text-brand'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function priorityLabel(importance: number) {
  return PRIORITY.find((p) => p.value === importance)?.label ?? 'Important';
}

function TaskForm({ draft, onChange, onSave, onCancel, busy }: {
  draft: TaskDraft;
  onChange: (d: TaskDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<TaskDraft>) => onChange({ ...draft, ...patch });
  const kind = KINDS.find((k) => k.id === draft.kind)!;

  return (
    <Card className="border-brand">
      <div className="flex flex-col gap-4">
        <Field label="Task" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Bedtime basal insulin" />

        <Field
          label="Instructions for the parent"
          value={draft.instructions}
          onChange={(e) => set({ instructions: e.target.value })}
          placeholder="12 u Lantus. Rotate injection sites."
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Type" value={draft.kind} onChange={(e) => set({ kind: e.target.value as TaskKind })}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </Select>
          <Field
            label="Time"
            type="time"
            value={draft.time ?? ''}
            onChange={(e) => set({ time: e.target.value || null })}
            hint={draft.time ? undefined : 'Any time today'}
          />
          <Field
            label="Window (± minutes)"
            type="number"
            min={5}
            max={240}
            value={draft.window_min}
            onChange={(e) => set({ window_min: Number(e.target.value) })}
          />
          {draft.kind === 'activity' ? (
            <Field
              label="Target minutes"
              type="number"
              min={5}
              max={300}
              value={draft.target_minutes ?? 20}
              onChange={(e) => set({ target_minutes: Number(e.target.value) })}
            />
          ) : null}
        </div>

        <p className="text-xs text-ink-soft">{kind.hint}</p>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-soft">Days</span>
            <div className="flex gap-1">
              {WEEKDAYS.map((d, i) => {
                const on = draft.days.length === 0 || draft.days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const current = draft.days.length ? draft.days : [0, 1, 2, 3, 4, 5, 6];
                      const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i].sort();
                      set({ days: next.length === 7 ? [] : next });
                    }}
                    className={`size-9 rounded-full text-xs font-semibold ${on ? 'bg-brand text-ink' : 'bg-line text-ink-soft'}`}>
                    {d[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <PriorityPicker value={draft.importance} onChange={(n) => set({ importance: n })} />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
            Active
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={busy || !draft.title.trim()} icon={<Check size={16} />}>
              Save task
            </Button>
          </div>
        </div>

        <p className="rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand-dark">
          In the child's app this appears as “{questPreview(draft)}” and is worth {rewardPreview(draft.importance)} Dots. The child never
          sees the task, the instructions or the time.
        </p>
      </div>
    </Card>
  );
}

/** Same rules as the server (services/tasks.py), shown so the clinician knows what the child will get. */
const MOMENT: Record<string, string> = { morning: 'Morning', lunch: 'Lunchtime', afternoon: 'Afternoon', dinner: 'Dinner', bedtime: 'Bedtime' };

function questPreview(draft: TaskDraft): string {
  const h = draft.time ? Number(draft.time.slice(0, 2)) : null;
  const moment = h === null ? null : h < 11 ? 'morning' : h < 14 ? 'lunch' : h < 17 ? 'afternoon' : h < 20 ? 'dinner' : 'bedtime';
  const m = moment ? MOMENT[moment] : null;
  switch (draft.kind) {
    case 'check':
      return m ? `${m} check-up with Dotty` : 'Check-up with Dotty';
    case 'medicine':
      return m ? `${m} medicine with Dotty` : 'Medicine time with Dotty';
    case 'meal':
      return m ? `${m} meal with Dotty` : 'Eat together with Dotty';
    case 'activity':
      return 'Play time with Dotty';
    default:
      return "Dotty's special mission";
  }
}

const rewardPreview = (importance: number) => ({ 1: 15, 2: 25, 3: 40 })[importance as 1 | 2 | 3] ?? 25;

const CELL = {
  done: { className: 'bg-mint text-ink', icon: <Check size={14} /> },
  missed: { className: 'bg-bad-soft text-bad', icon: <X size={14} /> },
  pending: { className: 'bg-warn-soft text-[#B7791F]', icon: <Minus size={14} /> },
} as const;

export default function CarePlan() {
  const { patient, reload } = usePatient();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [grid, setGrid] = useState<Adherence | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [t, g] = await Promise.all([
      api<Task[]>(`/patients/${patient.id}/tasks?include_inactive=true`),
      api<Adherence>(`/patients/${patient.id}/adherence?days=14`),
    ]);
    setTasks(t);
    setGrid(g);
  }

  useEffect(() => {
    void load().catch((e) => setError(errorText(e)));
  }, [patient.id]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const path = editing === 'new' ? `/patients/${patient.id}/tasks` : `/patients/${patient.id}/tasks/${editing}`;
      await api<Task>(path, { method: editing === 'new' ? 'POST' : 'PUT', body: draft });
      setEditing(null);
      await load();
      reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(task: Task) {
    if (!confirm(`Remove "${task.title}" from the care plan?`)) return;
    try {
      await api(`/patients/${patient.id}/tasks/${task.id}`, { method: 'DELETE' });
      await load();
      reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  function edit(task: Task) {
    const { id, patient_id, created_at, updated_at, quest_title, reward_dots, ...clinical } = task;
    setDraft(clinical);
    setEditing(task.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <H2>Daily care plan</H2>
            <p className="text-sm text-ink-soft">
              Each task becomes a quest in {patient.name}'s app and a checklist item for the parent. Priority decides how much the
              quest is worth and how strongly Dotty reacts.
            </p>
          </div>
          <div className="shrink-0 self-start whitespace-nowrap">
            <Button icon={<Plus size={16} />} onClick={() => { setDraft(EMPTY); setEditing('new'); }}>
              Add task
            </Button>
          </div>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>

      {editing === 'new' && <TaskForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => setEditing(null)} busy={busy} />}

      {tasks?.length === 0 && <Empty>No tasks yet. Add the first one — the child's app picks it up within 15 seconds.</Empty>}

      <div className="flex flex-col gap-3">
        {tasks?.map((task) =>
          editing === task.id ? (
            <TaskForm key={task.id} draft={draft} onChange={setDraft} onSave={save} onCancel={() => setEditing(null)} busy={busy} />
          ) : (
            <Card key={task.id} className={task.active ? '' : 'opacity-60'}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  {(() => {
                    const Icon = KINDS.find((k) => k.id === task.kind)!.icon;
                    return <Icon size={20} />;
                  })()}
                </div>
                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <H2>{task.title}</H2>
                    <Pill tone={task.importance === 3 ? 'bad' : task.importance === 2 ? 'brand' : 'neutral'}>{priorityLabel(task.importance)}</Pill>
                    {!task.active && <Pill>paused</Pill>}
                  </div>
                  <p className="text-sm text-ink-soft">
                    {task.time ? `${task.time} ±${task.window_min} min` : 'Any time today'}
                    {task.days.length ? ` · ${task.days.map((d) => WEEKDAYS[d]).join(', ')}` : ' · every day'}
                    {task.kind === 'activity' && task.target_minutes ? ` · ${task.target_minutes} min` : ''}
                  </p>
                  {task.instructions && <p className="mt-1 text-sm">{task.instructions}</p>}
                  <p className="mt-1 text-xs text-ink-soft">In the child's app: “{task.quest_title}” · {task.reward_dots} Dots</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" icon={<Pencil size={14} />} onClick={() => edit(task)}>
                    Edit
                  </Button>
                  <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => remove(task)}>
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ),
        )}
      </div>

      {grid && grid.rows.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <H2>Last 14 days</H2>
            <Pill tone={grid.rate_pct == null ? 'neutral' : grid.rate_pct >= 80 ? 'good' : grid.rate_pct >= 50 ? 'warn' : 'bad'}>
              {grid.rate_pct == null ? 'No data' : `${grid.rate_pct}% done`}
            </Pill>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-px text-sm sm:border-spacing-1">
              <thead>
                <tr>
                  <th className="w-24 sm:w-44" />
                  {grid.days.map((d) => (
                    <th key={d} className="text-[9px] font-bold text-ink-soft sm:text-[10px]">
                      {/* on a phone only the day of the month fits, e.g. "12" */}
                      <span className="sm:hidden">{shortDay(d).slice(1)}</span>
                      <span className="hidden sm:inline">{shortDay(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row) => (
                  <tr key={row.task.id}>
                    <td className="truncate pr-2 text-xs font-bold">{row.task.title}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i}>
                        <div
                          className={`mx-auto flex size-3.5 items-center justify-center overflow-hidden rounded-sm sm:size-6 sm:rounded-md [&_svg]:size-2.5 sm:[&_svg]:size-3.5 ${cell ? CELL[cell].className : 'bg-line/50 text-line'}`}
                          title={`${row.task.title} · ${grid.days[i]} · ${cell ?? 'not scheduled'}`}>
                          {cell ? CELL[cell].icon : ''}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
