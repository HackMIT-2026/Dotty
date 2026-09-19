import type { ActivityEntry, CarePlan, Patient, PetState, Quest } from '../models/models';
import type {
  LogRepository,
  PetRepository,
  PlanRepository,
  Repositories,
  TaskRepository,
} from './repositories';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * In memory state shared by the fake repositories so the demo loop works
 * without the server. Fake data only.
 */
export class FakeStore {
  readonly patient: Patient = { id: 'alex', name: 'Alex', petName: 'Pip', streak: 12 };

  readonly plan: CarePlan = {
    version: 3,
    note: 'Great routine this week. Keep morning checks close to breakfast.',
  };

  quests: Quest[] = [
    {
      planId: 'p1',
      title: 'Sparkle check',
      realTask: 'Check glucose',
      windowLabel: '7:00 to 9:00 am',
      reward: 10,
      status: 'waiting',
      whyText: 'A quick check helps you and Pip know how your body is doing.',
    },
    {
      planId: 'p2',
      title: 'Breakfast with Pip',
      realTask: 'Eat a balanced breakfast',
      windowLabel: '7:30 to 9:30 am',
      reward: 15,
      status: 'waiting',
      whyText: 'Food gives your body fuel, just like snacks give Pip energy.',
    },
    {
      planId: 'p3',
      title: 'Insulin time',
      realTask: 'Take insulin as planned by your care team',
      windowLabel: '8:00 to 10:00 am',
      reward: 20,
      status: 'waiting',
      whyText: 'Insulin helps your body use its fuel. Your care team set this plan.',
    },
  ];

  // Pip starts a little sleepy so the wake up tap can be tried.
  pet: PetState = { mood: 'sleepy', energy: 40, evolutionPoints: 120 };

  activity: ActivityEntry[] = (() => {
    const now = new Date();
    return [
      {
        id: 'a1',
        message: 'Alex said hi to Pip',
        at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 40),
      },
    ];
  })();

  addActivity(message: string) {
    this.activity = [
      ...this.activity,
      { id: `a${this.activity.length + 1}`, message, at: new Date() },
    ];
  }

  complete(planId: string): PetState {
    const quest = this.quests.find((q) => q.planId === planId);
    if (!quest || quest.status === 'done') return this.pet; // counts once per plan per day
    this.quests = this.quests.map((q) => (q.planId === planId ? { ...q, status: 'done' } : q));
    this.pet = {
      mood: 'happy',
      energy: clamp(this.pet.energy + quest.reward, 0, 100),
      evolutionPoints: this.pet.evolutionPoints + quest.reward,
    };
    this.addActivity(`Alex finished "${quest.title}" and Pip got ${quest.reward} energy`);
    return this.pet;
  }
}

class FakePlanRepository implements PlanRepository {
  constructor(private store: FakeStore) {}
  async patient(): Promise<Patient> {
    return this.store.patient;
  }
  async plan(): Promise<CarePlan> {
    return this.store.plan;
  }
}

class FakeTaskRepository implements TaskRepository {
  constructor(private store: FakeStore) {}
  async quests(): Promise<Quest[]> {
    return this.store.quests;
  }
}

class FakeLogRepository implements LogRepository {
  constructor(private store: FakeStore) {}

  async recent(): Promise<ActivityEntry[]> {
    return [...this.store.activity].reverse();
  }

  async logCompletion(_patientId: string, planId: string): Promise<PetState> {
    return this.store.complete(planId);
  }

  async sendCheer(_patientId: string, message: string): Promise<void> {
    this.store.pet = { ...this.store.pet, mood: 'cheering' };
    this.store.addActivity(message);
  }
}

class FakePetRepository implements PetRepository {
  constructor(private store: FakeStore) {}

  async pet(): Promise<PetState> {
    return this.store.pet;
  }

  async wake(): Promise<PetState> {
    this.store.pet = { ...this.store.pet, mood: 'curious' };
    return this.store.pet;
  }
}

export function createFakeRepositories(): Repositories {
  const store = new FakeStore();
  return {
    plans: new FakePlanRepository(store),
    tasks: new FakeTaskRepository(store),
    logs: new FakeLogRepository(store),
    pets: new FakePetRepository(store),
  };
}
