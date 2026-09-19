import '../models/models.dart';
import 'repositories.dart';

/// In memory state shared by the fake repositories so the demo loop works
/// without the server. Fake data only.
class FakeStore {
  FakeStore() {
    final now = DateTime.now();
    _activity = [
      ActivityEntry(
        id: 'a1',
        message: 'Alex said hi to Pip',
        at: DateTime(now.year, now.month, now.day, 7, 40),
      ),
    ];
  }

  static const _reward = 10;

  final patient = const Patient(id: 'alex', name: 'Alex', petName: 'Pip', streak: 12);

  final plan = const CarePlan(
    version: 3,
    note: 'Great routine this week. Keep morning checks close to breakfast.',
  );

  List<Quest> quests = const [
    Quest(
      planId: 'p1',
      title: 'Sparkle check',
      realTask: 'Check glucose',
      windowLabel: '7:00 to 9:00 am',
      reward: _reward,
      status: QuestStatus.waiting,
      whyText: 'A quick check helps you and Pip know how your body is doing.',
    ),
    Quest(
      planId: 'p2',
      title: 'Breakfast with Pip',
      realTask: 'Eat a balanced breakfast',
      windowLabel: '7:30 to 9:30 am',
      reward: 15,
      status: QuestStatus.waiting,
      whyText: 'Food gives your body fuel, just like snacks give Pip energy.',
    ),
    Quest(
      planId: 'p3',
      title: 'Insulin time',
      realTask: 'Take insulin as planned by your care team',
      windowLabel: '8:00 to 10:00 am',
      reward: 20,
      status: QuestStatus.waiting,
      whyText: 'Insulin helps your body use its fuel. Your care team set this plan.',
    ),
  ];

  // Pip starts a little sleepy so the wake up tap can be tried.
  PetState pet = const PetState(mood: PetMood.sleepy, energy: 40, evolutionPoints: 120);

  late List<ActivityEntry> _activity;
  List<ActivityEntry> get activity => List.unmodifiable(_activity);

  void addActivity(String message) {
    _activity = [
      ..._activity,
      ActivityEntry(id: 'a${_activity.length + 1}', message: message, at: DateTime.now()),
    ];
  }

  PetState complete(String planId) {
    final index = quests.indexWhere((q) => q.planId == planId);
    if (index == -1 || quests[index].isDone) return pet; // counts once per plan per day
    final quest = quests[index];
    quests = [
      for (final q in quests) q.planId == planId ? q.copyWith(status: QuestStatus.done) : q,
    ];
    pet = pet.copyWith(
      mood: PetMood.happy,
      energy: (pet.energy + quest.reward).clamp(0, 100),
      evolutionPoints: pet.evolutionPoints + quest.reward,
    );
    addActivity('Alex finished "${quest.title}" and Pip got ${quest.reward} energy');
    return pet;
  }
}

class FakePlanRepository implements PlanRepository {
  FakePlanRepository(this._store);
  final FakeStore _store;

  @override
  Future<Patient> patient(String patientId) async => _store.patient;

  @override
  Future<CarePlan> plan(String patientId) async => _store.plan;
}

class FakeTaskRepository implements TaskRepository {
  FakeTaskRepository(this._store);
  final FakeStore _store;

  @override
  Future<List<Quest>> quests(String patientId) async => _store.quests;
}

class FakeLogRepository implements LogRepository {
  FakeLogRepository(this._store);
  final FakeStore _store;

  @override
  Future<List<ActivityEntry>> recent(String patientId) async =>
      _store.activity.reversed.toList();

  @override
  Future<PetState> logCompletion(String patientId, String planId) async =>
      _store.complete(planId);

  @override
  Future<void> sendCheer(String patientId, String message) async {
    _store.pet = _store.pet.copyWith(mood: PetMood.cheering);
    _store.addActivity(message);
  }
}

class FakePetRepository implements PetRepository {
  FakePetRepository(this._store);
  final FakeStore _store;

  @override
  Future<PetState> pet(String patientId) async => _store.pet;

  @override
  Future<PetState> wake(String patientId) async {
    _store.pet = _store.pet.copyWith(mood: PetMood.curious);
    return _store.pet;
  }
}
