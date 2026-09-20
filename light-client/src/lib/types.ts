export type EventType = 'reading' | 'bolus' | 'basal' | 'meal' | 'activity' | 'pet' | 'task';
export type TaskKind = 'check' | 'medicine' | 'meal' | 'activity' | 'custom';
export type TaskStatus = 'done' | 'pending' | 'missed';
export type Intensity = 'light' | 'moderate' | 'vigorous';
export type Mood = 'bouncy' | 'sleepy' | 'sluggish' | 'shaky' | 'waiting';
export type Slot = 'color' | 'hat' | 'accessory' | 'background';

export interface User {
  id: string;
  role: 'child' | 'parent' | 'clinician';
  name: string;
  /** Children sign in with the family code and a PIN, so they have no email. */
  email: string | null;
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
  glucose_unit: 'mg/dL' | 'mmol/L';
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
  /** Set on the device when the log came too soon to earn Dots (lib/limits.ts). Never uploaded. */
  noDots?: boolean;
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

/**
 * One item of the doctor's care plan. The child's app only ever receives the game fields; the parent's app also
 * gets `title` and `instructions` (server/app/services/tasks.py filters this by role).
 */
export interface CareTask {
  id: string;
  quest_title: string;
  kind: TaskKind;
  time: string | null;
  window_min: number;
  days: number[];
  target_minutes: number | null;
  importance: number;
  reward_dots: number;
  // parent only
  title?: string;
  instructions?: string;
  active?: boolean;
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
  quests: { plan: PetPlanQuest[]; habits: Quest[] };
  adherence_today: number | null;
  last_checkup_at?: string | null;
}

/** A care-plan task as the server sends it to the child (already status-resolved). */
export interface PetPlanQuest extends CareTask {
  when: string;
  status: 'done' | 'upcoming' | 'waiting';
  done: boolean;
}

export type NotificationKind =
  | 'clinician_note'
  | 'parent_note'
  | 'missed_treatment'
  | 'out_of_range'
  | 'reward'
  | 'high_five'
  | 'care_summary'
  /** A meal waiting for a grown-up to count the carbs. */
  | 'food_help'
  /** Logs that looked spammed and didn't count (server/app/services/integrity.py). */
  | 'data_check'
  /** Back to the child: a grown-up sorted their meal out. */
  | 'help_answered';

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
  settings?: { glucose_unit: 'mg/dL' | 'mmol/L' };
  patient: { id: string; name: string };
  events: DotEvent[];
  plan: Plan | null;
  tasks: CareTask[];
  notifications: AppNotification[];
  pet: Pet;
}

export interface PushResult {
  accepted_ids: string[];
  new_count: number;
  rewards: Reward[];
  pet: Pet;
}
