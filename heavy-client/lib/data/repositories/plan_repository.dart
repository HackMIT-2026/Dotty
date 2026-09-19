import '../models/plan.dart';

abstract class PlanRepository {
  Future<Plan> plan(String patientId);

  /// Publishes the plan and returns it with a new version.
  Future<Plan> publish(String patientId, Plan plan);
}

/// Fake implementation so the portal runs without the server. Fake data only.
class FakePlanRepository implements PlanRepository {
  Plan _plan = Plan(
    version: 3,
    updatedAt: DateTime(2026, 9, 14, 9, 30),
    note: 'Great routine this week. Keep morning checks close to breakfast.',
    tasks: const [
      PlanTask(
        id: 'p1',
        task: 'Check glucose',
        window: '7:00 to 9:00 am',
        childWording: 'Sparkle check',
        whyText: 'A quick check helps you and Pip know how your body is doing.',
        reward: 10,
      ),
      PlanTask(
        id: 'p2',
        task: 'Eat a balanced breakfast',
        window: '7:30 to 9:30 am',
        childWording: 'Breakfast with Pip',
        whyText: 'Food gives your body fuel, just like snacks give Pip energy.',
        reward: 15,
      ),
      PlanTask(
        id: 'p3',
        task: 'Take insulin as planned by your care team',
        window: '8:00 to 10:00 am',
        childWording: 'Insulin time',
        whyText: 'Insulin helps your body use its fuel. Your care team set this plan.',
        reward: 20,
      ),
    ],
  );

  @override
  Future<Plan> plan(String patientId) async => _plan;

  @override
  Future<Plan> publish(String patientId, Plan plan) async {
    _plan = plan.copyWith(version: _plan.version + 1, updatedAt: DateTime.now());
    return _plan;
  }
}
