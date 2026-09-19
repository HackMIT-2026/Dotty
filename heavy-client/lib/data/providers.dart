import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/plan.dart';
import 'repositories/plan_repository.dart';

/// Build with --dart-define=USE_SERVER=true for the server (not built yet).
const useServer = bool.fromEnvironment('USE_SERVER');

const demoPatientId = 'alex';

final planRepositoryProvider = Provider<PlanRepository>((ref) {
  if (useServer) {
    throw UnimplementedError('API repository arrives with the server core loop.');
  }
  return FakePlanRepository();
});

/// The plan being edited. Loads the published plan, then edits stay local until publish.
class PlanDraft extends AsyncNotifier<Plan> {
  @override
  Future<Plan> build() => ref.read(planRepositoryProvider).plan(demoPatientId);

  void addTask(PlanTask task) {
    final plan = state.requireValue;
    state = AsyncData(plan.copyWith(tasks: [...plan.tasks, task]));
  }

  void removeTask(String id) {
    final plan = state.requireValue;
    state = AsyncData(plan.copyWith(tasks: plan.tasks.where((t) => t.id != id).toList()));
  }

  void setNote(String note) {
    state = AsyncData(state.requireValue.copyWith(note: note));
  }

  Future<void> publish() async {
    final published =
        await ref.read(planRepositoryProvider).publish(demoPatientId, state.requireValue);
    state = AsyncData(published);
  }
}

final planDraftProvider = AsyncNotifierProvider<PlanDraft, Plan>(PlanDraft.new);
