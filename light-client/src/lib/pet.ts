import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/components/icon';
import { C } from '@/constants/theme';

import type { Pet } from './types';

export const DEFAULT_EQUIPPED: Pet['equipped'] = { color: 'color_sky', hat: null, accessory: null, background: 'bg_underwater' };

export const BADGES: Record<string, { name: string; icon: IconName; image: ImageSourcePropType; color: string; tint: string; how: string }> = {
  first_week: { image: require('@/assets/icons/firstweek.png'), name: 'First Week', icon: 'calendar-star', color: C.primary, tint: C.primarySoft, how: 'Check-ups 7 days in a row' },
  night_owl: { image: require('@/assets/icons/nightowl.png'), name: 'Night Owl', icon: 'owl', color: '#5647C9', tint: C.skySoft, how: 'Do a bedtime check-up' },
  carb_counter: { image: require('@/assets/icons/carbcounter.png'), name: 'Carb Counter', icon: 'food-apple', color: C.danger, tint: C.pinkSoft, how: 'Log 10 meals' },
  sport_star: { image: require('@/assets/icons/sportstar.png'), name: 'Sport Star', icon: 'trophy-award', color: '#D69E2E', tint: C.sunSoft, how: 'Log 5 times you played' },
};

/** The four care actions, shared by the home screen and the Care tab. */
export const CARE_ACTIONS: { mode: 'checkup' | 'eat' | 'play' | 'medicine'; icon: IconName; image: ImageSourcePropType; label: string; color: string; tint: string }[] = [
  { mode: 'checkup', icon: 'heart-pulse', image: require('@/assets/icons/check-up.png'), label: 'Check-up', color: '#E0518D', tint: C.pinkSoft },
  { mode: 'eat', icon: 'food-apple', image: require('@/assets/icons/eat.png'), label: 'Eat', color: '#D97706', tint: C.sunSoft },
  { mode: 'play', icon: 'soccer', image: require('@/assets/icons/play.png'), label: 'Play', color: '#1F9D74', tint: C.mintSoft },
  { mode: 'medicine', icon: 'water-plus', image: require('@/assets/icons/medicine.png'), label: 'Medicine', color: '#2F80ED', tint: C.skySoft },
];
