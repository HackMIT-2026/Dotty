import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/clinician_plan_builder_screen.dart';
import 'theme/app_theme.dart';

void main() => runApp(const ProviderScope(child: DottyClinicianApp()));

class DottyClinicianApp extends StatelessWidget {
  const DottyClinicianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dotty Clinician',
      theme: buildAppTheme(),
      home: const ClinicianPlanBuilderScreen(),
    );
  }
}
