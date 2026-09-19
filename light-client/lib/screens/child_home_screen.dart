import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/models.dart';
import '../data/providers.dart';
import '../theme/app_theme.dart';
import '../widgets/big_button.dart';
import '../widgets/dotty_chip.dart';
import '../widgets/energy_meter.dart';
import '../widgets/pet.dart';
import '../widgets/phone_frame.dart';
import '../widgets/task_card.dart';

/// ChildHome (Figma node 14-2). Pip, energy, and today's quests.
class ChildHomeScreen extends ConsumerWidget {
  const ChildHomeScreen({super.key});

  String _speech(PetMood mood) => switch (mood) {
        PetMood.sleepy => "I'm a little sleepy. Tap to wake me up!",
        PetMood.curious => 'What are we doing today?',
        PetMood.happy => 'Thanks for looking after me!',
        PetMood.cheering => 'Your family sent a cheer!',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patient = ref.watch(patientProvider);
    final pet = ref.watch(petProvider);
    final quests = ref.watch(questsProvider);
    final actions = ref.read(careActionsProvider);

    return PhoneFrame(
      underwater: true,
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.s16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: DottyChip(
              icon: Icons.favorite,
              label: '${patient.valueOrNull?.streak ?? 0} Days with Pip',
            ),
          ),
          const SizedBox(height: AppSpace.s16),
          pet.when(
            skipLoadingOnReload: true,
            data: (p) => Column(
              children: [
                Center(child: Pet(mood: p.mood)),
                const SizedBox(height: AppSpace.s8),
                Text(_speech(p.mood), style: AppText.bodyLarge, textAlign: TextAlign.center),
                const SizedBox(height: AppSpace.s16),
                EnergyMeter(energy: p.energy),
                if (p.mood == PetMood.sleepy) ...[
                  const SizedBox(height: AppSpace.s16),
                  BigButton(
                    label: 'Wake up Pip',
                    icon: Icons.wb_sunny,
                    onPressed: actions.wakePet,
                  ),
                ],
              ],
            ),
            loading: () => const SizedBox(height: AppSize.petStage),
            error: (_, __) => Text('Pip is taking a nap. Try again soon.', style: AppText.body),
          ),
          const SizedBox(height: AppSpace.s24),
          Text("Today's quests", style: AppText.h2),
          const SizedBox(height: AppSpace.s12),
          ...quests.when(
            skipLoadingOnReload: true,
            data: (list) => [
              for (final q in list) ...[
                TaskCard(
                  done: q.isDone,
                  title: q.title,
                  subtitle: q.isDone ? 'Done! Pip got ${q.reward} energy' : q.windowLabel,
                  whyText: q.whyText,
                  onComplete: q.isDone ? null : () => actions.completeQuest(q.planId),
                ),
                const SizedBox(height: AppSpace.s12),
              ],
            ],
            loading: () => const <Widget>[],
            error: (_, __) => [Text('Quests are resting. Try again soon.', style: AppText.body)],
          ),
          const SizedBox(height: AppSpace.s32),
        ],
      ),
    );
  }
}
