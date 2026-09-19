export type PetMood = 'happy' | 'sleepy' | 'curious' | 'cheering';

export const petMoods: PetMood[] = ['happy', 'sleepy', 'curious', 'cheering'];

export type QuestStatus = 'waiting' | 'done';

export interface Patient {
  id: string;
  name: string;
  petName: string;
  /** "Days with Pip". Never resets to zero when a day is missed. */
  streak: number;
}

/** A plan task shown to the child as a quest. */
export interface Quest {
  planId: string;
  title: string; // child's wording
  realTask: string;
  windowLabel: string;
  reward: number; // fixed by the task, never by a logged value
  status: QuestStatus;
  whyText: string;
}

export interface PetState {
  mood: PetMood;
  energy: number; // 0 to 100
  evolutionPoints: number; // separate from energy, never reduced
}

/** One line in the parent activity feed. */
export interface ActivityEntry {
  id: string;
  message: string;
  at: Date;
}

/** The care team's plan, as the parent sees it (clinician note included). */
export interface CarePlan {
  version: number;
  note: string; // typed by the clinician, shown as coming from the care team
}

export function formatTime(t: Date): string {
  const hour = t.getHours() % 12 === 0 ? 12 : t.getHours() % 12;
  const minute = String(t.getMinutes()).padStart(2, '0');
  const suffix = t.getHours() < 12 ? 'am' : 'pm';
  return `${hour}:${minute} ${suffix}`;
}
