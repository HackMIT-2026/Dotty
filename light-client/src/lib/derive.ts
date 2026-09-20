/**
 * Everything the apps show that can be worked out from the local event log alone, so screens stay
 * correct with no connection. The rules mirror server/app/services/gamification.py.
 */
import type { IconName } from '@/components/icon';

import { planToday } from './tasks';
import type { CareTask, DotEvent, Mood, Quest } from './types';
import { fmtBg, type GlucoseUnit } from './units';

const HOUR = 3_600_000;
export const SLEEPY_AFTER_HOURS = 4;

export const MOOD_MESSAGES: Record<Mood, string> = {
  sleepy: 'Zzz... can you check on me?',
  waiting: "Let's catch the next quest together!",
  bouncy: "I feel great! Let's play!",
  sluggish: "I'm a little slow today. A walk might help!",
  shaky: 'I feel wobbly. Maybe a snack?',
};

const t = (e: DotEvent) => new Date(e.ts).getTime();

/** How long Dotty stays in her happy "thank you" pose after something is logged. */
export const REACTION_MS = 5 * 60_000;

export interface DottyState {
  mood: Mood;
  /** What her speech bubble says. It always matches the picture. */
  message: string;
  /** Show the cheering picture: she has just been fed, played with, given medicine, or a quest is done. */
  celebrate: boolean;
}

const REACTIONS = {
  meal: 'Yum! Thank you for feeding me!',
  activity: "That was so much fun! Let's play again soon!",
  medicine: "Medicine done. You're doing great!",
  task: 'Quest complete! Great job!',
  checkup: 'Thanks for checking on me!',
} as const;

/**
 * What Dotty looks like and says, from the mood and from what was just logged.
 *  - Just after a meal, play, medicine or a finished quest she cheers and says thanks, so the words and picture agree.
 *  - After a check-up she cheers too, unless the reading was low or high: then she keeps asking for what she needs.
 *  - After a snack that follows a low reading she says thanks and asks for another check-up later, and keeps cheering
 *    until a new reading comes in.
 *  - Otherwise her mood decides both the picture and the words (mirrors gamification.compute_mood).
 */
export function dottyState(events: DotEvent[], now: number, missedTask = false): DottyState {
  const real = events.filter((e) => e.source !== 'simulator' && e.type !== 'pet');
  const mood = moodFor(lastReading(events), now, missedTask);

  const newest = real.reduce<DotEvent | null>((a, e) => (!a || t(e) > t(a) ? e : a), null);
  if (newest && now - t(newest) < REACTION_MS && now >= t(newest) - 60_000) {
    const kind =
      newest.type === 'meal' ? 'meal'
      : newest.type === 'activity' ? 'activity'
      : newest.type === 'bolus' || newest.type === 'basal' ? 'medicine'
      : newest.type === 'task' ? 'task'
      : 'checkup';
    const needsHelp = mood === 'shaky' || mood === 'sluggish';
    if (kind === 'meal' && mood === 'shaky') {
      return { mood, message: "Yum, thank you! Let's check on me again in a little while.", celebrate: true };
    }
    if (kind !== 'checkup' || !needsHelp) return { mood, message: REACTIONS[kind], celebrate: true };
  }

  if (mood === 'shaky') {
    const last = Math.max(0, ...events.filter((e) => e.type === 'reading' && e.source !== 'simulator').map(t));
    if (real.some((e) => e.type === 'meal' && t(e) > last)) {
      // the message is a thank-you, so it always goes with the cheering picture, however long ago the snack was
      return { mood, message: "Yum, thank you! Let's check on me again in a little while.", celebrate: true };
    }
  }
  return { mood, message: MOOD_MESSAGES[mood], celebrate: false };
}

export function ofType(events: DotEvent[], type: DotEvent['type']): DotEvent[] {
  return events.filter((e) => e.type === type).sort((a, b) => t(a) - t(b));
}

export function bgOf(e: DotEvent): number {
  return e.data.bg_mgdl as number;
}

export function lastReading(events: DotEvent[]): DotEvent | null {
  const r = ofType(events, 'reading');
  return r.length ? r[r.length - 1] : null;
}

/** Glucose first, then the doctor's plan, then how long since the last check-up (mirrors gamification.compute_mood). */
export function moodFor(reading: DotEvent | null, now: number, missedTask = false): Mood {
  const recent = !!reading && now - t(reading) < SLEEPY_AFTER_HOURS * HOUR;
  if (recent) {
    const bg = bgOf(reading!);
    if (bg < 70) return 'shaky';
    if (bg > 180) return 'sluggish';
  }
  if (missedTask) return 'waiting';
  return recent ? 'bouncy' : 'sleepy';
}

export function isToday(ts: string, now: number): boolean {
  const a = new Date(ts);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function todaysEvents(events: DotEvent[], now: number): DotEvent[] {
  return events.filter((e) => e.source !== 'simulator' && isToday(e.ts, now));
}

/** Good-habit quests. The generic check-up quest steps aside when the doctor set check-up tasks. */
export function computeQuests(events: DotEvent[], now: number, hasCheckTasks = false): Quest[] {
  const today = todaysEvents(events, now);
  const checks = today.filter((e) => e.type === 'reading').length;
  const lunches = today.filter((e) => {
    const h = new Date(e.ts).getHours();
    return e.type === 'meal' && h >= 11 && h < 16;
  }).length;
  const minutes = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const quests = [
    ...(hasCheckTasks ? [] : [{ id: 'checks', title: 'Check on Dotty 4 times', target: 4, progress: Math.min(checks, 4) }]),
    { id: 'lunch', title: 'Log lunch', target: 1, progress: Math.min(lunches, 1) },
    { id: 'play', title: 'Play outside for 20 min', target: 20, progress: Math.min(minutes, 20) },
  ];
  return quests.map((q) => ({ ...q, done: q.progress >= q.target }));
}

/** Dotty's three "needs" as 0..1 meters. Low means "Dotty would like...", never "Dotty is unwell". */
export function needs(events: DotEvent[], now: number, tasks: CareTask[] = []) {
  const meals = ofType(events, 'meal');
  const lastMeal = meals.length ? t(meals[meals.length - 1]) : null;
  const belly = lastMeal === null ? 0.3 : Math.max(0.15, 1 - (now - lastMeal) / (5 * HOUR));
  const today = todaysEvents(events, now);
  const playMinutes = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  // Love follows the doctor's plan when there is one, otherwise the day's check-ups.
  const plan = planToday(tasks, events, now);
  const heartCount = today.filter((e) => e.type === 'reading').length;
  const heart = plan.adherence === null ? 0.15 + heartCount / 4 : 0.15 + 0.85 * plan.adherence;
  return {
    belly: Math.min(1, belly),
    fun: Math.min(1, 0.2 + playMinutes / 30),
    heart: Math.min(1, heart),
  };
}

export function timeInRange(readings: DotEvent[], low: number, high: number): number | null {
  if (!readings.length) return null;
  const inRange = readings.filter((r) => bgOf(r) >= low && bgOf(r) <= high).length;
  return Math.round((100 * inRange) / readings.length);
}

export function trend(readings: DotEvent[]): 'up' | 'down' | 'flat' | null {
  if (readings.length < 2) return null;
  const [prev, cur] = readings.slice(-2).map(bgOf);
  if (cur - prev >= 15) return 'up';
  if (prev - cur >= 15) return 'down';
  return 'flat';
}

export function eventTitle(e: DotEvent, unit: GlucoseUnit = 'mg/dL'): string {
  switch (e.type) {
    case 'reading':
      return `Glucose ${fmtBg(bgOf(e), unit)}`;
    case 'task':
      return 'Care-plan task done';
    case 'meal':
      // the child's app is never sent the grams (server/app/routers/sync.py), so fall back to the food
      return e.data.carbs_g != null ? `Meal · ${e.data.carbs_g} g carbs` : mealName(e);
    case 'activity':
      return `${e.data.kind ? cap(e.data.kind) : 'Activity'} · ${e.data.minutes} min`;
    case 'bolus':
      return e.data.units != null ? `Rapid insulin ${e.data.units} u${WHY[e.data.reason] ?? ''}` : 'Medicine taken';
    case 'basal':
      return e.data.units != null ? `Long-acting insulin ${e.data.units} u` : 'Long-acting insulin taken';
    default:
      return 'Pet';
  }
}

/** Why a bolus was given, when whoever logged it said so. */
const WHY: Record<string, string> = { meal: ' · for food', correction: ' · correction' };

/**
 * Today's insulin, kept apart the way a care team reads it: rapid (bolus) for food and corrections,
 * long-acting (basal) once or twice a day, and the total daily dose. Doses with no units (the child's
 * "I did my medicine") count as done but add nothing to the numbers.
 */
export function insulinToday(events: DotEvent[], now: number) {
  const today = todaysEvents(events, now);
  const sum = (type: DotEvent['type']) =>
    Math.round(today.filter((e) => e.type === type).reduce((s, e) => s + (e.data.units ?? 0), 0) * 10) / 10;
  const rapid = sum('bolus');
  const basal = sum('basal');
  return { rapid, basal, tdd: Math.round((rapid + basal) * 10) / 10, doses: today.filter((e) => e.type === 'bolus').length };
}

export const EVENT_ICON: Record<DotEvent['type'], { icon: IconName; color: string; tint: string }> = {
  reading: { icon: 'water', color: '#E0518D', tint: '#FFE4F0' },
  meal: { icon: 'silverware-fork-knife', color: '#D97706', tint: '#FFF1D6' },
  activity: { icon: 'run', color: '#1F9D74', tint: '#DDF7EC' },
  bolus: { icon: 'needle', color: '#2F80ED', tint: '#E3F1FF' },
  basal: { icon: 'needle', color: '#C2255C', tint: '#FBE4EC' },
  pet: { icon: 'paw', color: '#6C5CE7', tint: '#ECE9FD' },
  task: { icon: 'star-four-points', color: '#D69E2E', tint: '#FFF1D6' },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Pizza slice, Milk" — what a meal was, for screens that don't get the carbs. */
export function mealName(e: DotEvent): string {
  const items = (e.data.items ?? []) as { label?: string; name?: string }[];
  const names = items.map((i) => i.label ?? i.name).filter(Boolean);
  return names.length ? names.join(', ') : 'Meal';
}
