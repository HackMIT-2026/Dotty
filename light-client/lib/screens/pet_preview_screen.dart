import 'package:flutter/material.dart';

import '../data/models/models.dart';
import '../theme/app_theme.dart';
import '../widgets/pet.dart';

/// Dev-only screen at /pet-preview. Shows all four Pip moods in the same fixed box,
/// with the box outlined so any size change or drift is easy to spot. Tap the pet
/// at the top to step through the moods and watch the cross fade.
class PetPreviewScreen extends StatefulWidget {
  const PetPreviewScreen({super.key});

  @override
  State<PetPreviewScreen> createState() => _PetPreviewScreenState();
}

class _PetPreviewScreenState extends State<PetPreviewScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    const moods = PetMood.values;
    final current = moods[_index % moods.length];
    return Scaffold(
      appBar: AppBar(
        title: Text('Pip preview', style: AppText.h2),
        backgroundColor: AppColors.cream,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.s16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('All moods, same box', style: AppText.bodyLarge),
            const SizedBox(height: AppSpace.s12),
            Wrap(
              spacing: AppSpace.s16,
              runSpacing: AppSpace.s16,
              children: [
                for (final mood in moods)
                  Column(
                    children: [
                      _Boxed(child: Pet(mood: mood, size: AppSize.petSmall)),
                      const SizedBox(height: AppSpace.s4),
                      Text(mood.name, style: AppText.body),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.s32),
            Text('Tap Pip to change mood (${current.name})', style: AppText.bodyLarge),
            const SizedBox(height: AppSpace.s12),
            Center(
              child: GestureDetector(
                onTap: () => setState(() => _index++),
                child: _Boxed(child: Pet(mood: current)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Boxed extends StatelessWidget {
  const _Boxed({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.borderSoft, width: AppBorder.width),
        ),
        child: child,
      );
}
