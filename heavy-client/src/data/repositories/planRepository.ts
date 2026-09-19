import type { Plan } from '../models/plan';

export interface PlanRepository {
  plan(patientId: string): Promise<Plan>;

  /** Publishes the plan and returns it with a new version. */
  publish(patientId: string, plan: Plan): Promise<Plan>;
}

/** Fake implementation so the portal runs without the server. Fake data only. */
export class FakePlanRepository implements PlanRepository {
  private current: Plan = {
    version: 3,
    updatedAt: new Date(2026, 8, 14, 9, 30),
    note: 'Great routine this week. Keep morning checks close to breakfast.',
    tasks: [
      {
        id: 'p1',
        task: 'Check glucose',
        window: '7:00 to 9:00 am',
        childWording: 'Sparkle check',
        whyText: 'A quick check helps you and Pip know how your body is doing.',
        reward: 10,
      },
      {
        id: 'p2',
        task: 'Eat a balanced breakfast',
        window: '7:30 to 9:30 am',
        childWording: 'Breakfast with Pip',
        whyText: 'Food gives your body fuel, just like snacks give Pip energy.',
        reward: 15,
      },
      {
        id: 'p3',
        task: 'Take insulin as planned by your care team',
        window: '8:00 to 10:00 am',
        childWording: 'Insulin time',
        whyText: 'Insulin helps your body use its fuel. Your care team set this plan.',
        reward: 20,
      },
    ],
  };

  async plan(): Promise<Plan> {
    return this.current;
  }

  async publish(_patientId: string, plan: Plan): Promise<Plan> {
    this.current = { ...plan, version: this.current.version + 1, updatedAt: new Date() };
    return this.current;
  }
}
