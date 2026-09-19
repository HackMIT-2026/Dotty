import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Figma PlanRow (node 13-2). One task in the plan, with the child's wording.
class PlanRow extends StatelessWidget {
  const PlanRow({
    super.key,
    required this.task,
    required this.window,
    required this.childWording,
    required this.whyText,
    required this.reward,
    this.onRemove,
  });

  final String task;
  final String window;
  final String childWording;
  final String whyText;
  final int reward;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpace.s16),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.borderSoft, width: AppBorder.width),
        borderRadius: BorderRadius.circular(AppRadius.clinician),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 3, child: Text(task, style: AppText.clinicianMedium)),
          Expanded(flex: 2, child: Text(window, style: AppText.clinician)),
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(childWording, style: AppText.clinicianMedium),
                Text(whyText, style: AppText.clinicianMuted),
              ],
            ),
          ),
          Expanded(flex: 1, child: Text('$reward', style: AppText.clinician)),
          SizedBox(
            width: AppSize.minTapTarget,
            height: AppSize.minTapTarget,
            child: IconButton(
              tooltip: 'Remove from plan',
              onPressed: onRemove,
              icon: const Icon(Icons.delete_outline),
            ),
          ),
        ],
      ),
    );
  }
}
