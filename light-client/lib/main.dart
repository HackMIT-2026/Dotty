import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import 'theme/app_theme.dart';

void main() => runApp(const ProviderScope(child: DottyApp()));

class DottyApp extends StatelessWidget {
  const DottyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Dotty',
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
