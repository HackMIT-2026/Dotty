/**
 * The doctor's care plan on the device. These rules mirror server/app/services/tasks.py so both apps can show
 * today's progress with no connection; the server stays the authority for rewards.
 */
import type { CareTask, DotEvent, TaskStatus } from './types';

const HOUR = 3_600_000;

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dateKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Is this task scheduled on the day `now` falls in? (`days` empty = every day; 0 = Monday, like the server.) */
export function dueToday(task: CareTask, now: number): boolean {
  if (!task.days?.length) return true;
  const weekday = (new Date(now).getDay() + 6) % 7;
  return task.days.includes(weekday);
}

export function taskWindow(task: CareTask, now: number): [number, number] {
  const day = startOfDay(now);
  if (!task.time) return [day, day + 24 * HOUR];
  const [h, m] = task.time.split(':').map(Number);
  const centre = day + h * HOUR + m * 60_000;
  const w = (task.window_min ?? 60) * 60_000;
  return [centre - w, centre + w];
}

export function taskStatus(task: CareTask, events: DotEvent[], now: number): { status: TaskStatus; doneAt: number | null } {
  const [start, end] = taskWindow(task, now);
  const day = startOfDay(now);
  const sameDay = (e: DotEvent) => {
    const t = new Date(e.ts).getTime();
    return t >= day && t < day + 24 * HOUR && e.source !== 'simulator';
  };
  const inWindow = (e: DotEvent) => {
    const t = new Date(e.ts).getTime();
    return t >= start && t <= end;
  };

  let doneAt: number | null = null;
  if (task.kind === 'custom') {
    const hit = events.find((e) => sameDay(e) && e.type === 'task' && e.data.task_id === task.id);
    doneAt = hit ? new Date(hit.ts).getTime() : null;
  } else if (task.kind === 'activity') {
    let total = 0;
    for (const e of events.filter((e) => sameDay(e) && e.type === 'activity').sort((a, b) => +new Date(a.ts) - +new Date(b.ts))) {
      total += e.data.minutes ?? 0;
      if (total >= (task.target_minutes ?? 20)) {
        doneAt = new Date(e.ts).getTime();
        break;
      }
    }
  } else {
    const types = task.kind === 'medicine' ? ['bolus', 'basal'] : task.kind === 'meal' ? ['meal'] : ['reading'];
    const hit = events.filter((e) => sameDay(e) && inWindow(e) && types.includes(e.type)).sort((a, b) => +new Date(a.ts) - +new Date(b.ts))[0];
    doneAt = hit ? new Date(hit.ts).getTime() : null;
  }

  if (doneAt !== null) return { status: 'done', doneAt };
  if (task.time && now > end) return { status: 'missed', doneAt: null };
  return { status: 'pending', doneAt: null };
}

export interface PlanItem {
  task: CareTask;
  status: TaskStatus;
  doneAt: number | null;
}

/** Today's care plan with each task's state, plus the importance-weighted share that is done. */
export function planToday(tasks: CareTask[], events: DotEvent[], now: number): { items: PlanItem[]; done: number; total: number; adherence: number | null } {
  const items = tasks
    .filter((t) => (t.active ?? true) && dueToday(t, now))
    .map((task) => ({ task, ...taskStatus(task, events, now) }))
    .sort((a, b) => (a.task.time ?? '99:99').localeCompare(b.task.time ?? '99:99'));
  const weight = items.reduce((s, i) => s + (i.task.importance ?? 2), 0);
  const doneWeight = items.filter((i) => i.status === 'done').reduce((s, i) => s + (i.task.importance ?? 2), 0);
  return {
    items,
    done: items.filter((i) => i.status === 'done').length,
    total: items.length,
    adherence: weight ? doneWeight / weight : null,
  };
}

/**
 * What the child sees of today's plan: quests still to do first (by time), finished ones at the bottom, and
 * lapsed ones hidden — a child cannot act on those any more, and the parent gets told instead.
 */
export function childPlan(items: PlanItem[]): { visible: PlanItem[]; done: number; total: number } {
  const open = items.filter((i) => i.status === 'pending');
  const done = items.filter((i) => i.status === 'done').sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0));
  return { visible: [...open, ...done], done: done.length, total: open.length + done.length };
}

/** How the child's app talks about a time: a moment of the day, not a clock (mirrors tasks.friendly_time). */
export function friendlyTime(hhmm: string | null): string {
  if (!hhmm) return 'any time today';
  const h = Number(hhmm.slice(0, 2));
  if (h < 11) return 'in the morning';
  if (h < 14) return 'at lunch';
  if (h < 17) return 'in the afternoon';
  if (h < 20) return 'at dinner';
  return 'at bedtime';
}

/** Last `days` days of the plan, for the parent's adherence strip. */
export function planHistory(tasks: CareTask[], events: DotEvent[], now: number, days: number): { date: string; done: number; total: number }[] {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const at = i === 0 ? now : startOfDay(now) - (i - 1) * 24 * HOUR - 1; // end of that day
    const { done, total } = planToday(tasks, events, at);
    out.push({ date: dateKey(at), done, total });
  }
  return out;
}
