import type { IconName } from '@/components/icon';

/** Kid-friendly carb cards. Approximate grams per typical child portion: parents can adjust the total. */
export interface Food {
  id: string;
  icon: IconName;
  color: string;
  name: string;
  carbs: number;
}

export const FOODS: Food[] = [
  { id: 'pizza', icon: 'pizza', color: '#F2994A', name: 'Pizza slice', carbs: 30 },
  { id: 'sandwich', icon: 'baguette', color: '#D9A55B', name: 'Sandwich', carbs: 30 },
  { id: 'pasta', icon: 'noodles', color: '#E8B04A', name: 'Pasta (1 cup)', carbs: 40 },
  { id: 'rice', icon: 'rice', color: '#9A8CFF', name: 'Rice (1 cup)', carbs: 45 },
  { id: 'cereal', icon: 'bowl-mix', color: '#4DA8FF', name: 'Cereal bowl', carbs: 30 },
  { id: 'burger', icon: 'hamburger', color: '#C9793A', name: 'Burger', carbs: 35 },
  { id: 'fries', icon: 'french-fries', color: '#F5B82E', name: 'Small fries', carbs: 30 },
  { id: 'bread', icon: 'bread-slice', color: '#D9A55B', name: 'Bread slice', carbs: 15 },
  { id: 'apple', icon: 'food-apple', color: '#E5534B', name: 'Apple', carbs: 15 },
  { id: 'pear', icon: 'fruit-pear', color: '#8BC34A', name: 'Pear', carbs: 25 },
  { id: 'grapes', icon: 'fruit-grapes', color: '#8E6CEF', name: 'Grapes (handful)', carbs: 15 },
  { id: 'milk', icon: 'glass-mug-variant', color: '#4DA8FF', name: 'Milk (1 cup)', carbs: 12 },
  { id: 'juice', icon: 'cup', color: '#FF8A3D', name: 'Juice (1 cup)', carbs: 25 },
  { id: 'cookie', icon: 'cookie', color: '#B7791F', name: 'Cookie', carbs: 10 },
  { id: 'icecream', icon: 'ice-cream', color: '#FF7EB6', name: 'Ice cream', carbs: 20 },
  { id: 'carrot', icon: 'carrot', color: '#F2994A', name: 'Carrots', carbs: 5 },
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
