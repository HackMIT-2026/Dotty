import 'package:flutter/material.dart';

import '../data/models/models.dart';
import '../theme/app_theme.dart';

/// Figma Pet (node 11-54). Shows the Pip image for the mood inside a fixed square
/// box, so Pip keeps the same footprint whatever the image's aspect ratio.
/// Cross fades between moods, and skips the fade when reduced motion is on.
class Pet extends StatelessWidget {
  const Pet({super.key, required this.mood, this.size = AppSize.petStage});

  final PetMood mood;
  final double size;

  String get _asset => switch (mood) {
        PetMood.happy => 'assets/pet/happy.png',
        PetMood.sleepy => 'assets/pet/sleepy.png',
        PetMood.curious => 'assets/pet/curious.png',
        PetMood.cheering => 'assets/pet/cheering.png',
      };

  String get _label => switch (mood) {
        PetMood.happy => 'Pip is happy',
        PetMood.sleepy => 'Pip is sleepy',
        PetMood.curious => 'Pip is curious',
        PetMood.cheering => 'Pip is cheering',
      };

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: _label,
      image: true,
      child: SizedBox(
        width: size,
        height: size,
        child: AnimatedSwitcher(
          duration: AppMotion.of(context),
          child: Image.asset(
            _asset,
            key: ValueKey(mood),
            width: size,
            height: size,
            fit: BoxFit.contain,
            alignment: Alignment.center,
            gaplessPlayback: true,
            excludeFromSemantics: true,
          ),
        ),
      ),
    );
  }
}
