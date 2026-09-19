/**
 * Everything the apps show that can be worked out from the local event log alone, so screens stay
 * correct with no connection. The rules mirror server/app/services/gamification.py.
 */
import type { DotEvent, Intensity, Mood, Quest } from './types';

const HOUR = 3_600_000;
export const SLEEPY_AFTER_HOURS = 4;

export const MOOD_MESSAGES: Record<Mood, string> = {
  sleepy: 'Zzz... can you check on me?',
  bouncy: "I feel great! Let's play!",
  sluggish: "I'm a little slow today. A walk might help!",
  shaky: 'I feel wobbly. Maybe a snack?',
};

const t = (e: DotEvent) => new Date(e.ts).getTime();

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

export function moodFor(reading: DotEvent | null, now: number): Mood {
  if (!reading || now - t(reading) >= SLEEPY_AFTER_HOURS * HOUR) return 'sleepy';
  const bg = bgOf(reading);
  if (bg < 70) return 'shaky';
  if (bg > 180) return 'sluggish';
  return 'bouncy';
}

export function isToday(ts: string, now: number): boolean {
  const a = new Date(ts);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function todaysEvents(events: DotEvent[], now: number): DotEvent[] {
  return events.filter((e) => e.source !== 'simulator' && isToday(e.ts, now));
}

export function computeQuests(events: DotEvent[], now: number): Quest[] {
  const today = todaysEvents(events, now);
  const checks = today.filter((e) => e.type === 'reading').length;
  const lunches = today.filter((e) => {
    const h = new Date(e.ts).getHours();
    return e.type === 'meal' && h >= 11 && h < 16;
  }).length;
  const minutes = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const quests = [
    { id: 'checks', title: 'Check on Dotty 4 times', target: 4, progress: Math.min(checks, 4) },
    { id: 'lunch', title: 'Log lunch', target: 1, progress: Math.min(lunches, 1) },
    { id: 'play', title: 'Play outside for 20 min', target: 20, progress: Math.min(minutes, 20) },
  ];
  return quests.map((q) => ({ ...q, done: q.progress >= q.target }));
}

/** Dotty's three "needs" as 0..1 meters. Low means "Dotty would like...", never "Dotty is unwell". */
export function needs(events: DotEvent[], now: number) {
  const meals = ofType(events, 'meal');
  const lastMeal = meals.length ? t(meals[meals.length - 1]) : null;
  const belly = lastMeal === null ? 0.3 : Math.max(0.15, 1 - (now - lastMeal) / (5 * HOUR));
  const today = todaysEvents(events, now);
  const playMinutes = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const heartCount = today.filter((e) => e.type === 'reading').length;
  return {
    belly: Math.min(1, belly),
    fun: Math.min(1, 0.2 + playMinutes / 30),
    heart: Math.min(1, 0.15 + heartCount / 4),
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

/** Highest activity intensity logged in the last 2 hours, for the dose helper's "auto" setting. */
export function recentActivity(events: DotEvent[], now: number): Intensity | null {
  const rank: Record<Intensity, number> = { light: 1, moderate: 2, vigorous: 3 };
  let best: Intensity | null = null;
  for (const e of events) {
    if (e.type !== 'activity' || now - t(e) > 2 * HOUR || now - t(e) < -HOUR) continue;
    const i = (e.data.intensity ?? 'moderate') as Intensity;
    if (!best || rank[i] > rank[best]) best = i;
  }
  return best;
}

export function eventTitle(e: DotEvent): string {
  switch (e.type) {
    case 'reading':
      return `Glucose ${bgOf(e)} mg/dL`;
    case 'meal':
      return `Meal · ${e.data.carbs_g} g carbs`;
    case 'activity':
      return `${e.data.kind ? cap(e.data.kind) : 'Activity'} · ${e.data.minutes} min`;
    case 'bolus':
      return e.data.units != null ? `Insulin ${e.data.units} u` : 'Medicine taken';
    case 'basal':
      return e.data.units != null ? `Basal ${e.data.units} u` : 'Basal taken';
    default:
      return 'Pet';
  }
}

export function eventEmoji(e: DotEvent): string {
  return { reading: '🩸', meal: '🍽️', activity: '⚽', bolus: '💉', basal: '💉', pet: '🐾' }[e.type];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
