import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/plan.dart';
import '../data/providers.dart';
import '../theme/app_theme.dart';
import '../widgets/big_button.dart';
import '../widgets/dotty_chip.dart';
import '../widgets/plan_row.dart';

/// ClinicianPlanBuilder (Figma node 14-68). Build and publish Alex's care plan.
class ClinicianPlanBuilderScreen extends ConsumerWidget {
  const ClinicianPlanBuilderScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(planDraftProvider);
    final draft = ref.read(planDraftProvider.notifier);

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.s32),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSize.clinicianContentMax),
            child: plan.when(
              skipLoadingOnReload: true,
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => Text('The plan could not load.', style: AppText.clinician),
              data: (p) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text('Care plan for Alex', style: AppText.h1),
                      const SizedBox(width: AppSpace.s16),
                      DottyChip(icon: Icons.check, label: 'Version ${p.version}'),
                      const Spacer(),
                      BigButton(
                        label: 'Publish plan',
                        icon: Icons.send,
                        onPressed: draft.publish,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.s24),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 3, child: _TaskTable(tasks: p.tasks, onRemove: draft.removeTask)),
                      const SizedBox(width: AppSpace.s24),
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _AddTaskForm(onAdd: draft.addTask),
                            const SizedBox(height: AppSpace.s24),
                            _NoteField(note: p.note, onChanged: draft.setNote),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TaskTable extends StatelessWidget {
  const _TaskTable({required this.tasks, required this.onRemove});

  final List<PlanTask> tasks;
  final void Function(String id) onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.s16),
          child: Row(
            children: [
              Expanded(flex: 3, child: Text('Task', style: AppText.clinicianMuted)),
              Expanded(flex: 2, child: Text('Time window', style: AppText.clinicianMuted)),
              Expanded(flex: 4, child: Text("Child's wording and why", style: AppText.clinicianMuted)),
              Expanded(flex: 1, child: Text('Reward', style: AppText.clinicianMuted)),
              const SizedBox(width: AppSize.minTapTarget),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.s8),
        for (final t in tasks) ...[
          PlanRow(
            task: t.task,
            window: t.window,
            childWording: t.childWording,
            whyText: t.whyText,
            reward: t.reward,
            onRemove: () => onRemove(t.id),
          ),
          const SizedBox(height: AppSpace.s8),
        ],
      ],
    );
  }
}

InputDecoration _decoration(String label) => InputDecoration(
      labelText: label,
      labelStyle: AppText.clinicianMuted,
      filled: true,
      fillColor: AppColors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.clinician),
        borderSide: const BorderSide(color: AppColors.borderSoft, width: AppBorder.width),
      ),
    );

class _AddTaskForm extends StatefulWidget {
  const _AddTaskForm({required this.onAdd});

  final void Function(PlanTask task) onAdd;

  @override
  State<_AddTaskForm> createState() => _AddTaskFormState();
}

class _AddTaskFormState extends State<_AddTaskForm> {
  final _task = TextEditingController();
  final _window = TextEditingController();
  final _wording = TextEditingController();
  final _why = TextEditingController();
  final _reward = TextEditingController(text: '10');
  int _nextId = 1;

  @override
  void dispose() {
    for (final c in [_task, _window, _wording, _why, _reward]) {
      c.dispose();
    }
    super.dispose();
  }

  void _add() {
    if (_task.text.trim().isEmpty || _why.text.trim().isEmpty) return;
    final reward = (int.tryParse(_reward.text) ?? 0).clamp(0, 100);
    widget.onAdd(PlanTask(
      id: 'new${_nextId++}',
      task: _task.text.trim(),
      window: _window.text.trim(),
      childWording: _wording.text.trim().isEmpty ? _task.text.trim() : _wording.text.trim(),
      whyText: _why.text.trim(),
      reward: reward,
    ));
    for (final c in [_task, _window, _wording, _why]) {
      c.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpace.s16),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.borderSoft, width: AppBorder.width),
        borderRadius: BorderRadius.circular(AppRadius.clinician),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Add a task', style: AppText.h2),
          const SizedBox(height: AppSpace.s16),
          TextField(controller: _task, style: AppText.clinician, decoration: _decoration('Task')),
          const SizedBox(height: AppSpace.s12),
          TextField(
            controller: _window,
            style: AppText.clinician,
            decoration: _decoration('Time window, for example 7:00 to 9:00 am'),
          ),
          const SizedBox(height: AppSpace.s12),
          TextField(
            controller: _wording,
            style: AppText.clinician,
            decoration: _decoration("Child's wording (optional)"),
          ),
          const SizedBox(height: AppSpace.s12),
          TextField(
            controller: _why,
            style: AppText.clinician,
            decoration: _decoration('Why am I doing this?'),
          ),
          const SizedBox(height: AppSpace.s12),
          TextField(
            controller: _reward,
            style: AppText.clinician,
            keyboardType: TextInputType.number,
            decoration: _decoration('Reward (0 to 100 energy, fixed by the task)'),
          ),
          const SizedBox(height: AppSpace.s16),
          Align(
            alignment: Alignment.centerLeft,
            child: BigButton(
              label: 'Add to plan',
              tone: BigButtonTone.soft,
              icon: Icons.add,
              onPressed: _add,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoteField extends StatelessWidget {
  const _NoteField({required this.note, required this.onChanged});

  final String note;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Note for the parent', style: AppText.h2),
        const SizedBox(height: AppSpace.s8),
        Text('Shown in the parent app as coming from the care team.', style: AppText.clinicianMuted),
        const SizedBox(height: AppSpace.s12),
        TextFormField(
          initialValue: note,
          maxLines: 4,
          style: AppText.clinician,
          decoration: _decoration('Note'),
          onChanged: onChanged,
        ),
      ],
    );
  }
}
