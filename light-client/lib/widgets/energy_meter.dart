import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Pip's energy, 0 to 100. Shown as a bar plus the number, so it never relies on color alone.
class EnergyMeter extends StatelessWidget {
  const EnergyMeter({super.key, required this.energy});

  final int energy;

  @override
  Widget build(BuildContext context) {
    final fraction = energy.clamp(0, 100) / 100;
    return Semantics(
      label: 'Energy $energy out of 100',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.bolt, size: AppSize.iconInline),
              const SizedBox(width: AppSpace.s4),
              Text('Energy', style: AppText.button),
              const Spacer(),
              Text('$energy / 100', style: AppText.body),
            ],
          ),
          const SizedBox(height: AppSpace.s8),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: Stack(
              children: [
                Container(height: AppSize.energyBarHeight, color: AppColors.pondBlue),
                AnimatedFractionallySizedBox(
                  duration: AppMotion.of(context),
                  widthFactor: fraction,
                  child: Container(height: AppSize.energyBarHeight, color: AppColors.coral),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
