class PlanTask {
  const PlanTask({
    required this.id,
    required this.task,
    required this.window,
    required this.childWording,
    required this.whyText,
    required this.reward,
  });

  final String id;
  final String task; // the real treatment task
  final String window; // for example "7:00 to 9:00 am"
  final String childWording; // quest title the child sees
  final String whyText; // "Why am I doing this?" in the child's wording
  final int reward; // fixed by the task, 0 to 100
}

class Plan {
  const Plan({
    required this.version,
    required this.updatedAt,
    required this.note,
    required this.tasks,
  });

  final int version;
  final DateTime updatedAt;
  final String note; // shown to the parent as coming from the care team
  final List<PlanTask> tasks;

  Plan copyWith({int? version, DateTime? updatedAt, String? note, List<PlanTask>? tasks}) => Plan(
        version: version ?? this.version,
        updatedAt: updatedAt ?? this.updatedAt,
        note: note ?? this.note,
        tasks: tasks ?? this.tasks,
      );
}
