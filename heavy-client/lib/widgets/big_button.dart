import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum BigButtonTone { primary, soft }

/// Figma BigButton (node 12-6), clinician size: 48 px tall, 16 px text, dark ink.
class BigButton extends StatelessWidget {
  const BigButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.tone = BigButtonTone.primary,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final BigButtonTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final color = tone == BigButtonTone.primary ? AppColors.coral : AppColors.lavender;
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(AppRadius.clinician),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.clinician),
        onTap: onPressed,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSize.minTapTarget),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.s24),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: AppSize.iconInline, color: AppColors.ink),
                  const SizedBox(width: AppSpace.s8),
                ],
                Text(label, style: AppText.clinicianMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
