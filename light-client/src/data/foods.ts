/** Kid-friendly carb cards. Approximate grams per typical child portion: parents can adjust the total. */
export interface Food {
  id: string;
  emoji: string;
  name: string;
  carbs: number;
}

export const FOODS: Food[] = [
  { id: 'pizza', emoji: '🍕', name: 'Pizza slice', carbs: 30 },
  { id: 'sandwich', emoji: '🥪', name: 'Sandwich', carbs: 30 },
  { id: 'pasta', emoji: '🍝', name: 'Pasta (1 cup)', carbs: 40 },
  { id: 'rice', emoji: '🍚', name: 'Rice (1 cup)', carbs: 45 },
  { id: 'cereal', emoji: '🥣', name: 'Cereal bowl', carbs: 30 },
  { id: 'burger', emoji: '🍔', name: 'Burger', carbs: 35 },
  { id: 'fries', emoji: '🍟', name: 'Small fries', carbs: 30 },
  { id: 'bread', emoji: '🍞', name: 'Bread slice', carbs: 15 },
  { id: 'apple', emoji: '🍎', name: 'Apple', carbs: 15 },
  { id: 'banana', emoji: '🍌', name: 'Banana', carbs: 25 },
  { id: 'grapes', emoji: '🍇', name: 'Grapes (handful)', carbs: 15 },
  { id: 'milk', emoji: '🥛', name: 'Milk (1 cup)', carbs: 12 },
  { id: 'juice', emoji: '🧃', name: 'Juice box', carbs: 15 },
  { id: 'cookie', emoji: '🍪', name: 'Cookie', carbs: 10 },
  { id: 'icecream', emoji: '🍦', name: 'Ice cream', carbs: 20 },
  { id: 'carrot', emoji: '🥕', name: 'Carrots', carbs: 5 },
];

export const ACTIVITIES = [
  { id: 'soccer', emoji: '⚽', name: 'Soccer' },
  { id: 'running', emoji: '🏃', name: 'Running' },
  { id: 'bike', emoji: '🚲', name: 'Biking' },
  { id: 'swim', emoji: '🏊', name: 'Swimming' },
  { id: 'dance', emoji: '💃', name: 'Dancing' },
  { id: 'playground', emoji: '🛝', name: 'Playground' },
  { id: 'walk', emoji: '🚶', name: 'Walking' },
  { id: 'basketball', emoji: '🏀', name: 'Basketball' },
];
