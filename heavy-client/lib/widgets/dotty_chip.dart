import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Figma Chip (node 12-7). Named DottyChip to avoid Flutter's own Chip.
class DottyChip extends StatelessWidget {
  const DottyChip({super.key, required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.pondBlue,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.s16, vertical: AppSpace.s8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: AppSize.iconInline, color: AppColors.ink),
              const SizedBox(width: AppSpace.s8),
            ],
            Text(label, style: AppText.clinicianMedium),
          ],
        ),
      ),
    );
  }
}
