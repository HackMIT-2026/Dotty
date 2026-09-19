import type { ActivityEntry, CarePlan, Patient, PetState, Quest } from '../models/models';

/**
 * Repository interfaces. Screens depend only on these.
 * Each has a fake implementation now and an API implementation once the server
 * core loop is built. Method names and return types stay the same across both.
 */

export interface PlanRepository {
  patient(patientId: string): Promise<Patient>;
  plan(patientId: string): Promise<CarePlan>;
}

export interface TaskRepository {
  quests(patientId: string): Promise<Quest[]>;
}

export interface LogRepository {
  recent(patientId: string): Promise<ActivityEntry[]>;

  /**
   * Records a completion and returns the current pet. A repeat completion of the
   * same plan on the same day adds no reward.
   */
  logCompletion(patientId: string, planId: string): Promise<PetState>;

  sendCheer(patientId: string, message: string): Promise<void>;
}

export interface PetRepository {
  pet(patientId: string): Promise<PetState>;

  /** One tap wakes a sleepy pet. */
  wake(patientId: string): Promise<PetState>;
}

export interface Repositories {
  plans: PlanRepository;
  tasks: TaskRepository;
  logs: LogRepository;
  pets: PetRepository;
}
