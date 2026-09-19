import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum BigButtonTone { primary, soft }

/// Figma BigButton (node 12-6). Main child button, 64 px tall, dark ink text.
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
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: color,
        borderRadius: BorderRadius.circular(AppRadius.button),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.button),
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: AppSize.bigButtonHeight),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.s24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.max,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: AppSize.iconInline, color: AppColors.ink),
                    const SizedBox(width: AppSpace.s8),
                  ],
                  Flexible(child: Text(label, style: AppText.button, textAlign: TextAlign.center)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
