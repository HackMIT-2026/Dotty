import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Figma ActivityItem (node 12-24). One line in the parent feed.
class ActivityItem extends StatelessWidget {
  const ActivityItem({super.key, required this.message, required this.time});

  final String message;
  final String time;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpace.s16),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.borderSoft, width: AppBorder.width),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Row(
        children: [
          Container(
            width: AppSize.minTapTarget,
            height: AppSize.minTapTarget,
            decoration: const BoxDecoration(color: AppColors.pondBlue, shape: BoxShape.circle),
            child: const Icon(Icons.favorite),
          ),
          const SizedBox(width: AppSpace.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(message, style: AppText.body),
                Text(time, style: AppText.captionMuted),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
