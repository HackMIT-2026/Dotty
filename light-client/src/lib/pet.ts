import type { IconName } from '@/components/icon';
import { C } from '@/constants/theme';

import type { Pet } from './types';

export const DEFAULT_EQUIPPED: Pet['equipped'] = { color: 'color_sky', hat: null, accessory: null, background: 'bg_day' };

export const BADGES: Record<string, { name: string; icon: IconName; color: string; tint: string; how: string }> = {
  first_week: { name: 'First Week', icon: 'calendar-star', color: C.primary, tint: C.primarySoft, how: 'Check-ups 7 days in a row' },
  night_owl: { name: 'Night Owl', icon: 'owl', color: '#5647C9', tint: C.skySoft, how: 'Do a bedtime check-up' },
  carb_counter: { name: 'Carb Counter', icon: 'food-apple', color: C.danger, tint: C.pinkSoft, how: 'Log 10 meals' },
  sport_star: { name: 'Sport Star', icon: 'trophy-award', color: '#D69E2E', tint: C.sunSoft, how: 'Log 5 times you played' },
};

/** The four care actions, shared by the home screen and the Care tab. */
export const CARE_ACTIONS: { mode: 'checkup' | 'eat' | 'play' | 'medicine'; icon: IconName; label: string; color: string; tint: string }[] = [
  { mode: 'checkup', icon: 'heart-pulse', label: 'Check-up', color: '#E0518D', tint: C.pinkSoft },
  { mode: 'eat', icon: 'food-apple', label: 'Eat', color: '#D97706', tint: C.sunSoft },
  { mode: 'play', icon: 'soccer', label: 'Play', color: '#1F9D74', tint: C.mintSoft },
  { mode: 'medicine', icon: 'water-plus', label: 'Medicine', color: '#2F80ED', tint: C.skySoft },
];
