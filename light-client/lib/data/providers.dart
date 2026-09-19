import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/models.dart';
import 'repositories/fake_repositories.dart';
import 'repositories/repositories.dart';

/// Chooses fake or real data. Build with --dart-define=USE_SERVER=true for the server.
const useServer = bool.fromEnvironment('USE_SERVER');

/// One patient for the demo.
final patientIdProvider = Provider<String>((ref) => 'alex');

final _storeProvider = Provider<FakeStore>((ref) => FakeStore());

T _pick<T>(T Function() fake) {
  if (useServer) {
    throw UnimplementedError('API repositories arrive with the server core loop.');
  }
  return fake();
}

final planRepositoryProvider =
    Provider<PlanRepository>((ref) => _pick(() => FakePlanRepository(ref.watch(_storeProvider))));
final taskRepositoryProvider =
    Provider<TaskRepository>((ref) => _pick(() => FakeTaskRepository(ref.watch(_storeProvider))));
final logRepositoryProvider =
    Provider<LogRepository>((ref) => _pick(() => FakeLogRepository(ref.watch(_storeProvider))));
final petRepositoryProvider =
    Provider<PetRepository>((ref) => _pick(() => FakePetRepository(ref.watch(_storeProvider))));

final patientProvider = FutureProvider<Patient>(
  (ref) => ref.watch(planRepositoryProvider).patient(ref.watch(patientIdProvider)),
);
final carePlanProvider = FutureProvider<CarePlan>(
  (ref) => ref.watch(planRepositoryProvider).plan(ref.watch(patientIdProvider)),
);
final questsProvider = FutureProvider<List<Quest>>(
  (ref) => ref.watch(taskRepositoryProvider).quests(ref.watch(patientIdProvider)),
);
final activityProvider = FutureProvider<List<ActivityEntry>>(
  (ref) => ref.watch(logRepositoryProvider).recent(ref.watch(patientIdProvider)),
);
final petProvider = FutureProvider<PetState>(
  (ref) => ref.watch(petRepositoryProvider).pet(ref.watch(patientIdProvider)),
);

/// Actions that change state, then refresh what the screens read.
class CareActions {
  CareActions(this._ref);
  final Ref _ref;

  String get _patientId => _ref.read(patientIdProvider);

  void _refresh() {
    _ref.invalidate(questsProvider);
    _ref.invalidate(petProvider);
    _ref.invalidate(activityProvider);
  }

  Future<void> completeQuest(String planId) async {
    await _ref.read(logRepositoryProvider).logCompletion(_patientId, planId);
    _refresh();
  }

  Future<void> wakePet() async {
    await _ref.read(petRepositoryProvider).wake(_patientId);
    _refresh();
  }

  Future<void> sendCheer() async {
    await _ref.read(logRepositoryProvider).sendCheer(_patientId, 'You sent Pip a cheer');
    _refresh();
  }
}

final careActionsProvider = Provider<CareActions>((ref) => CareActions(ref));
