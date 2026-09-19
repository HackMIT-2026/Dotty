// heavy-client/lib/theme/app_theme.dart
// Design tokens for Dotty. Figma is the source of truth. Keep this file matching
// the Figma variables and text styles. Never type a hex code or font size in a widget.
//
// Fredoka is bundled as an asset (see pubspec.yaml), so it works offline.
//
// Verified from Figma: all colors except sunnyAmber, Heading 1/2, Body, Button, Caption,
// card radius 24, card border 2, card padding 20, status icon 44.
// UNVERIFIED (from CLAUDE.md, not yet read from Figma): sunnyAmber, Display, Body large,
// button and clinician radius, the spacing scale, bigButtonHeight, minTapTarget.
// Additions marked "new" were added for the first screen build and need a Figma check.

import 'package:flutter/material.dart';

class AppColors {
  static const cream = Color(0xFFFFF8F0); // page background
  static const coral = Color(0xFFF28B82); // primary, pet body, main buttons
  static const gillRose = Color(0xFFE56B8A); // gills and highlights
  static const lavender = Color(0xFFB8A9E8); // accent, soft buttons, banners
  static const pondBlue = Color(0xFFA9D8EE); // chips, water, info
  static const mint = Color(0xFFA8E0C8); // success, always with a check icon
  static const sunnyAmber = Color(0xFFF5C26B); // gentle attention, with a clock icon
  static const ink = Color(0xFF2B2A33); // text and icons
  static const inkMuted = Color(0xFF6B6875); // secondary text
  static const white = Color(0xFFFFFFFF); // cards and surfaces
  static const borderSoft = Color(0xFFEADFD3); // card borders
}

class AppRadius {
  static const card = 24.0;
  static const button = 16.0;
  static const clinician = 8.0;
  static const pill = 999.0;
}

class AppSpace {
  static const s4 = 4.0;
  static const s8 = 8.0;
  static const s12 = 12.0;
  static const s16 = 16.0;
  static const s20 = 20.0; // new: card padding, read from Figma TaskCard, off the 4-48 scale
  static const s24 = 24.0;
  static const s32 = 32.0;
  static const s48 = 48.0;
}

class AppBorder {
  static const width = 2.0; // card border, read from Figma TaskCard
}

class AppSize {
  static const bigButtonHeight = 64.0; // main child buttons
  static const minTapTarget = 48.0;
  static const statusIcon = 44.0; // TaskCard status circle, read from Figma
  static const iconInline = 24.0; // new: icons next to text
  static const phoneWidth = 393.0; // design width of the child and parent views
  static const petStage = 220.0; // new: pet on the child home
  static const petSmall = 96.0; // new: pet on the parent feed
  static const energyBarHeight = 16.0; // new
  static const clinicianContentMax = 1200.0; // new: content width inside the 1440 layout
}

class AppShadows {
  // y 4, blur 12, black at 8 percent
  static const soft = [
    BoxShadow(color: Color(0x14000000), offset: Offset(0, 4), blurRadius: 12),
  ];
}

class AppMotion {
  static const short = Duration(milliseconds: 300); // new

  /// Returns zero when the user asked for reduced motion.
  static Duration of(BuildContext context, [Duration duration = short]) =>
      MediaQuery.disableAnimationsOf(context) ? Duration.zero : duration;
}

class AppText {
  static const _family = 'Fredoka';

  static TextStyle _fredoka(
    double size,
    double lineHeight,
    FontWeight weight, {
    Color color = AppColors.ink,
  }) =>
      TextStyle(
        fontFamily: _family,
        fontSize: size,
        height: lineHeight / size,
        fontWeight: weight,
        color: color,
      );

  static const _muted = AppColors.inkMuted;

  static final display = _fredoka(44, 52, FontWeight.w700); // Dotty/Display (unverified)
  static final h1 = _fredoka(32, 40, FontWeight.w600); // Dotty/Heading 1
  static final h2 = _fredoka(24, 32, FontWeight.w600); // Dotty/Heading 2
  static final bodyLarge = _fredoka(20, 30, FontWeight.w400); // Dotty/Body large (unverified)
  static final body = _fredoka(18, 28, FontWeight.w400); // Dotty/Body
  static final button = _fredoka(18, 24, FontWeight.w500); // Dotty/Button
  static final caption = _fredoka(14, 20, FontWeight.w500); // Dotty/Caption
  static final bodyMuted = _fredoka(18, 28, FontWeight.w400, color: _muted);
  static final captionMuted = _fredoka(14, 20, FontWeight.w500, color: _muted);

  // new: clinician screens may use 16 px (CLAUDE.md rule, not a Figma style)
  static final clinician = _fredoka(16, 24, FontWeight.w400);
  static final clinicianMedium = _fredoka(16, 24, FontWeight.w500);
  static final clinicianMuted = _fredoka(16, 24, FontWeight.w400, color: _muted);
}

ThemeData buildAppTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.cream,
    colorScheme: const ColorScheme.light(
      primary: AppColors.coral,
      onPrimary: AppColors.ink,
      secondary: AppColors.lavender,
      onSecondary: AppColors.ink,
      surface: AppColors.white,
      onSurface: AppColors.ink,
    ),
    iconTheme: const IconThemeData(color: AppColors.ink),
    textTheme: base.textTheme.apply(
      fontFamily: 'Fredoka',
      bodyColor: AppColors.ink,
      displayColor: AppColors.ink,
    ),
  );
}
