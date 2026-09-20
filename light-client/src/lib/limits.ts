/**
 * How often Dotty can be cared for, mirrored from server/app/services/integrity.py.
 *
 * The server is the authority: it flags logs that come too fast and pays no Dots for them. The device knows the
 * same rules so the child sees a friendly "Dotty just had that" *before* tapping, instead of a log that silently
 * doesn't count. Keep the numbers in step with the server.
 */
import type { DotEvent } from './types';

export const LIMITS: Record<string, { gapMin: number; perDay: number }> = {
  reading: { gapMin: 3, perDay: 15 },
  meal: { gapMin: 10, perDay: 8 },
  activity: { gapMin: 10, perDay: 6 },
  bolus: { gapMin: 10, perDay: 10 },
};

/**
 * Across all four kinds: a check-up and a meal at once is ordinary, and dinner can be a check-up, the meal and
 * the medicine within a few minutes. Tapping every button at once is not. [minutes, most logs in that window]
 */
export const BURSTS: [number, number][] = [
  [1, 2],
  [5, 3],
];

export interface Guard {
  /** Can this be logged right now? */
  ok: boolean;
  /** Minutes until it can be logged again (0 when it's today's limit, which waits for tomorrow). */
  waitMin: number;
  /** What Dotty says about it, in child words. */
  message?: string;
}

const OK: Guard = { ok: true, waitMin: 0 };

const SOON: Record<string, string> = {
  reading: 'Dotty just had a check-up',
  meal: 'Dotty is still eating',
  activity: 'Dotty is catching their breath',
  bolus: 'Medicine is already done',
};

const ENOUGH: Record<string, string> = {
  reading: "That's lots of check-ups today! Dotty is happy.",
  meal: "Dotty is full for today. Tell a grown-up if you're still eating.",
  activity: 'Dotty has played plenty today. Time to rest!',
  bolus: 'All the medicine for today is logged.',
};

function isSameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Whether a child may log this now, and what to tell them if not. */
export function logGuard(events: DotEvent[], type: DotEvent['type'], now: number): Guard {
  const limit = LIMITS[type];
  if (!limit) return OK;
  const recent = events.filter((e) => e.source !== 'simulator' && LIMITS[e.type]);

  for (const [windowMin, most] of BURSTS) {
    const inWindow = recent.map((e) => new Date(e.ts).getTime()).filter((t) => now - t < windowMin * 60_000);
    if (inWindow.length >= most) {
      const waitMin = Math.max(1, Math.ceil((windowMin * 60_000 - (now - Math.min(...inWindow))) / 60_000));
      return { ok: false, waitMin, message: `That's a lot at once! Dotty needs ${waitMin} ${waitMin === 1 ? 'minute' : 'minutes'}.` };
    }
  }

  const mine = recent.filter((e) => e.type === type);
  const today = mine.filter((e) => isSameDay(new Date(e.ts).getTime(), now));
  if (today.length >= limit.perDay) return { ok: false, waitMin: 0, message: ENOUGH[type] };

  const last = mine.reduce((max, e) => Math.max(max, new Date(e.ts).getTime()), 0);
  const waitMin = Math.ceil((limit.gapMin * 60_000 - (now - last)) / 60_000);
  if (last && waitMin > 0) {
    return { ok: false, waitMin, message: `${SOON[type]}. Come back in ${waitMin} ${waitMin === 1 ? 'minute' : 'minutes'}.` };
  }
  return OK;
}
