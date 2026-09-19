enum PetMood { happy, sleepy, curious, cheering }

enum QuestStatus { waiting, done }

class Patient {
  const Patient({
    required this.id,
    required this.name,
    required this.petName,
    required this.streak,
  });

  final String id;
  final String name;
  final String petName;

  /// "Days with Pip". Never resets to zero when a day is missed.
  final int streak;
}

/// A plan task shown to the child as a quest.
class Quest {
  const Quest({
    required this.planId,
    required this.title,
    required this.realTask,
    required this.windowLabel,
    required this.reward,
    required this.status,
    required this.whyText,
  });

  final String planId;
  final String title; // child's wording
  final String realTask;
  final String windowLabel;
  final int reward; // fixed by the task, never by a logged value
  final QuestStatus status;
  final String whyText;

  bool get isDone => status == QuestStatus.done;

  Quest copyWith({QuestStatus? status}) => Quest(
        planId: planId,
        title: title,
        realTask: realTask,
        windowLabel: windowLabel,
        reward: reward,
        status: status ?? this.status,
        whyText: whyText,
      );
}

class PetState {
  const PetState({
    required this.mood,
    required this.energy,
    required this.evolutionPoints,
  });

  final PetMood mood;
  final int energy; // 0 to 100
  final int evolutionPoints; // separate from energy, never reduced

  PetState copyWith({PetMood? mood, int? energy, int? evolutionPoints}) => PetState(
        mood: mood ?? this.mood,
        energy: energy ?? this.energy,
        evolutionPoints: evolutionPoints ?? this.evolutionPoints,
      );
}

/// One line in the parent activity feed.
class ActivityEntry {
  const ActivityEntry({required this.id, required this.message, required this.at});

  final String id;
  final String message;
  final DateTime at;
}

/// The care team's plan, as the parent sees it (clinician note included).
class CarePlan {
  const CarePlan({required this.version, required this.note});

  final int version;
  final String note; // typed by the clinician, shown as coming from the care team
}

String formatTime(DateTime t) {
  final hour = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final minute = t.minute.toString().padLeft(2, '0');
  final suffix = t.hour < 12 ? 'am' : 'pm';
  return '$hour:$minute $suffix';
}
