/** Mirrors the API shapes (server/app/models.py and the routers). */

export type Role = 'clinician' | 'parent' | 'child';
export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type TaskKind = 'check' | 'medicine' | 'meal' | 'activity' | 'custom';
export type TaskStatus = 'done' | 'pending' | 'missed';
export type EventType = 'reading' | 'bolus' | 'basal' | 'meal' | 'activity' | 'pet' | 'task';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  patient_ids?: string[];
}

export interface Session {
  token: string;
  user: User;
}

export interface PatientSummary {
  id: string;
  name: string;
  family_code: string | null;
  glucose_unit: GlucoseUnit;
  tir_pct: number | null;
  avg_mgdl: number | null;
  readings_count: number;
  last_reading: { bg_mgdl: number; ts: string } | null;
  plan_version: number | null;
  adherence_pct: number | null;
  tasks_count: number;
  open_alerts: number;
}

export interface Task {
  id: string;
  patient_id: string;
  title: string;
  instructions: string;
  quest_title: string;
  kind: TaskKind;
  time: string | null;
  window_min: number;
  days: number[];
  target_minutes: number | null;
  reward_dots: number;
  importance: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * What the clinician's form sends. `quest_title` and `reward_dots` are NOT here: the server derives the child's
 * wording and Dots from kind/time/importance, so clinicians only fill in clinical fields.
 */
export type TaskDraft = Omit<Task, 'id' | 'patient_id' | 'created_at' | 'updated_at' | 'quest_title' | 'reward_dots'>;

export interface Adherence {
  days: string[];
  rows: { task: Task; cells: (TaskStatus | null)[] }[];
  rate_pct: number | null;
}

export interface DotEvent {
  id: string;
  client_id: string;
  type: EventType;
  ts: string;
  source: 'manual' | 'parent' | 'simulator' | 'camera';
  data: Record<string, any>;
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
  reminders: unknown[];
  activity_rules: { light: number; moderate: number; vigorous: number };
  notes: string;
  updated_at: string;
}

export interface Note {
  id: string;
  text: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  kind: 'clinician_note' | 'missed_treatment' | 'out_of_range' | 'reward' | 'high_five' | 'care_summary';
  title: string;
  body: string;
  data: Record<string, any>;
  created_at: string;
  read_at: string | null;
}
