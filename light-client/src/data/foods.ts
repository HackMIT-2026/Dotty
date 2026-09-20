import type { IconName } from '@/components/icon';

/**
 * Kid-friendly food cards: one short word a child can read at a glance. There are no carbs here on purpose —
 * counting carbs is the grown-ups' job, so the grams and the portion each card stands for live only on the
 * server (server/app/data/foods.py, matched by `id`) and reach the parent and the doctor.
 */
export interface Food {
  id: string;
  icon: IconName;
  color: string;
  name: string;
}

export const FOODS: Food[] = [
  { id: 'pizza', icon: 'pizza', color: '#F2994A', name: 'Pizza' },
  { id: 'sandwich', icon: 'baguette', color: '#D9A55B', name: 'Sandwich' },
  { id: 'pasta', icon: 'noodles', color: '#E8B04A', name: 'Pasta' },
  { id: 'rice', icon: 'rice', color: '#9A8CFF', name: 'Rice' },
  { id: 'cereal', icon: 'bowl-mix', color: '#4DA8FF', name: 'Cereal' },
  { id: 'burger', icon: 'hamburger', color: '#C9793A', name: 'Burger' },
  { id: 'fries', icon: 'french-fries', color: '#F5B82E', name: 'Fries' },
  { id: 'bread', icon: 'bread-slice', color: '#D9A55B', name: 'Bread' },
  { id: 'apple', icon: 'food-apple', color: '#E5534B', name: 'Apple' },
  { id: 'pear', icon: 'fruit-pear', color: '#8BC34A', name: 'Pear' },
  { id: 'grapes', icon: 'fruit-grapes', color: '#8E6CEF', name: 'Grapes' },
  { id: 'milk', icon: 'glass-mug-variant', color: '#4DA8FF', name: 'Milk' },
  { id: 'juice', icon: 'cup', color: '#FF8A3D', name: 'Juice' },
  { id: 'cookie', icon: 'cookie', color: '#B7791F', name: 'Cookie' },
  { id: 'icecream', icon: 'ice-cream', color: '#FF7EB6', name: 'Ice cream' },
  { id: 'carrot', icon: 'carrot', color: '#F2994A', name: 'Carrots' },
];

export const ACTIVITIES: { id: string; icon: IconName; name: string }[] = [
  { id: 'soccer', icon: 'soccer', name: 'Soccer' },
  { id: 'running', icon: 'run', name: 'Running' },
  { id: 'bike', icon: 'bike', name: 'Biking' },
  { id: 'swim', icon: 'swim', name: 'Swimming' },
  { id: 'dance', icon: 'human-female-dance', name: 'Dancing' },
  { id: 'playground', icon: 'slide', name: 'Playground' },
  { id: 'walk', icon: 'walk', name: 'Walking' },
  { id: 'basketball', icon: 'basketball', name: 'Basketball' },
];
