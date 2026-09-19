import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/models.dart';
import '../data/providers.dart';
import '../theme/app_theme.dart';
import '../widgets/activity_item.dart';
import '../widgets/big_button.dart';
import '../widgets/dotty_chip.dart';
import '../widgets/pet.dart';
import '../widgets/phone_frame.dart';

/// ParentFeed (Figma node 14-44). What Alex did with Pip, the care team note, and cheers.
class ParentFeedScreen extends ConsumerWidget {
  const ParentFeedScreen({super.key});

  String _mood(PetMood mood) => switch (mood) {
        PetMood.sleepy => 'Pip is sleepy. A cheer can help.',
        PetMood.curious => 'Pip is curious about today.',
        PetMood.happy => 'Pip is happy.',
        PetMood.cheering => 'Pip is cheering!',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patient = ref.watch(patientProvider).valueOrNull;
    final pet = ref.watch(petProvider).valueOrNull;
    final plan = ref.watch(carePlanProvider).valueOrNull;
    final quests = ref.watch(questsProvider).valueOrNull ?? const <Quest>[];
    final activity = ref.watch(activityProvider).valueOrNull ?? const <ActivityEntry>[];
    final doneCount = quests.where((q) => q.isDone).length;

    return PhoneFrame(
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.s16),
        children: [
          Text("${patient?.name ?? 'Alex'}'s day", style: AppText.h1),
          const SizedBox(height: AppSpace.s16),
          Row(
            children: [
              if (pet != null) Pet(mood: pet.mood, size: AppSize.petSmall),
              const SizedBox(width: AppSpace.s16),
              Expanded(child: Text(pet == null ? '' : _mood(pet.mood), style: AppText.bodyLarge)),
            ],
          ),
          const SizedBox(height: AppSpace.s16),
          Wrap(
            spacing: AppSpace.s8,
            runSpacing: AppSpace.s8,
            children: [
              DottyChip(
                icon: doneCount == quests.length && quests.isNotEmpty ? Icons.check : Icons.schedule,
                label: '$doneCount of ${quests.length} quests done',
              ),
              DottyChip(icon: Icons.favorite, label: '${patient?.streak ?? 0} Days with Pip'),
            ],
          ),
          if (plan != null) ...[
            const SizedBox(height: AppSpace.s16),
            _CareTeamNote(note: plan.note),
          ],
          const SizedBox(height: AppSpace.s24),
          Text('Today with Pip', style: AppText.h2),
          const SizedBox(height: AppSpace.s12),
          for (final entry in activity) ...[
            ActivityItem(message: entry.message, time: formatTime(entry.at)),
            const SizedBox(height: AppSpace.s12),
          ],
          const SizedBox(height: AppSpace.s12),
          BigButton(
            label: 'Send Pip a cheer',
            tone: BigButtonTone.soft,
            icon: Icons.celebration,
            onPressed: ref.read(careActionsProvider).sendCheer,
          ),
          const SizedBox(height: AppSpace.s32),
        ],
      ),
    );
  }
}

/// A note typed by the clinician, always labeled as coming from the care team.
class _CareTeamNote extends StatelessWidget {
  const _CareTeamNote({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpace.s16),
      decoration: BoxDecoration(
        color: AppColors.lavender,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.medical_services_outlined, size: AppSize.iconInline),
              const SizedBox(width: AppSpace.s8),
              Text('From the care team', style: AppText.button),
            ],
          ),
          const SizedBox(height: AppSpace.s8),
          Text(note, style: AppText.body),
        ],
      ),
    );
  }
}
