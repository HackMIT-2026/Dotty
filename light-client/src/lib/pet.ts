import type { Pet } from './types';

export const DEFAULT_EQUIPPED: Pet['equipped'] = { color: 'color_sky', hat: null, accessory: null, background: 'bg_day' };

export const BADGES: Record<string, { name: string; emoji: string; how: string }> = {
  first_week: { name: 'First Week', emoji: '🗓️', how: 'Check-ups 7 days in a row' },
  night_owl: { name: 'Night Owl', emoji: '🦉', how: 'Do a bedtime check-up' },
  carb_counter: { name: 'Carb Counter', emoji: '🍎', how: 'Log 10 meals' },
  sport_star: { name: 'Sport Star', emoji: '⭐', how: 'Log 5 times you played' },
};
