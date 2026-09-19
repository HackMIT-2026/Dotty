import '../models/models.dart';

/// Abstract repositories. Screens depend only on these.
/// Each has a fake implementation now and an API implementation once the server
/// core loop is built. Method names and return types stay the same across both.

abstract class PlanRepository {
  Future<Patient> patient(String patientId);
  Future<CarePlan> plan(String patientId);
}

abstract class TaskRepository {
  Future<List<Quest>> quests(String patientId);
}

abstract class LogRepository {
  Future<List<ActivityEntry>> recent(String patientId);

  /// Records a completion and returns the current pet. A repeat completion of the
  /// same plan on the same day adds no reward.
  Future<PetState> logCompletion(String patientId, String planId);

  Future<void> sendCheer(String patientId, String message);
}

abstract class PetRepository {
  Future<PetState> pet(String patientId);

  /// One tap wakes a sleepy pet.
  Future<PetState> wake(String patientId);
}
