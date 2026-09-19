export type EventType = 'reading' | 'bolus' | 'basal' | 'meal' | 'activity' | 'pet';
export type Intensity = 'light' | 'moderate' | 'vigorous';
export type ActivityChoice = 'none' | Intensity;
export type Mood = 'bouncy' | 'sleepy' | 'sluggish' | 'shaky';
export type Slot = 'color' | 'hat' | 'accessory' | 'background';

export interface User {
  id: string;
  role: 'child' | 'parent' | 'clinician';
  name: string;
  email: string;
  family_id: string | null;
}

export interface Person {
  id: string;
  name: string;
}

export interface Family {
  id: string;
  code: string;
  tz: string;
  child: Person | null;
  parents: (Person | null)[];
  clinician: Person | null;
}

export interface Session {
  token: string;
  user: User;
  family: Family | null;
}

/** An immutable log entry. `client_id` is generated on the device and makes uploads idempotent. */
export interface DotEvent {
  id?: string;
  client_id: string;
  type: EventType;
  ts: string;
  source: 'manual' | 'parent' | 'simulator' | 'camera';
  data: Record<string, any>;
}

export interface Reminder {
  time: string;
  kind: 'check' | 'meal' | 'bedtime';
  window_min: number;
  label?: string | null;
}

export interface Plan {
  id: string;
  patient_id: string;
  version: number;
  icr: { start: string; g_per_unit: number }[];
  isf_mgdl_per_unit: number;
  target: { low: number; high: number };
  correction_target: number;
  max_bolus: number;
  basal: { time: string; units: number }[];
  reminders: Reminder[];
  activity_rules: Record<Intensity, number>;
  notes: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  target: number;
  progress: number;
  done: boolean;
}

export interface Pet {
  id: string;
  name: string;
  dots: number;
  xp: number;
  level: number;
  level_progress: number;
  dots_per_level: number;
  streak_days: number;
  mood: Mood;
  mood_message: string;
  equipped: { color: string; hat: string | null; accessory: string | null; background: string };
  owned_items: string[];
  badges: string[];
  quests: Quest[];
  last_checkup_at?: string | null;
}

export type NotificationKind = 'clinician_note' | 'missed_treatment' | 'out_of_range' | 'reward' | 'high_five';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data: Record<string, any>;
  created_at: string;
  read_at: string | null;
}

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic';
  asset_key: string;
  unlock_badge: string | null;
}

export interface Reward {
  kind: string;
  dots: number;
  label: string;
  id?: string;
}

export interface Toast {
  id: number;
  kind: 'reward' | 'info' | 'alert' | 'sync';
  text: string;
  sub?: string;
}

export interface PullResult {
  server_time: string;
  patient: { id: string; name: string };
  events: DotEvent[];
  plan: Plan | null;
  notifications: AppNotification[];
  pet: Pet;
}

export interface PushResult {
  accepted_ids: string[];
  new_count: number;
  rewards: Reward[];
  pet: Pet;
}

export interface DoseResult {
  blocked: boolean;
  message: string | null;
  warnings: string[];
  carbs_g: number;
  bg_mgdl: number;
  activity: ActivityChoice;
  plan_version: number | null;
  max_bolus: number;
  suggested_units: number;
  icr_g_per_unit?: number;
  isf_mgdl_per_unit?: number;
  correction_target?: number;
  carb_units?: number;
  correction_units?: number;
  activity_reduce_pct?: number;
  activity_factor?: number;
  raw_units?: number;
  capped?: boolean;
}
