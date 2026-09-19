import 'package:go_router/go_router.dart';

import 'screens/child_home_screen.dart';
import 'screens/parent_feed_screen.dart';
import 'screens/pet_preview_screen.dart';

final router = GoRouter(
  initialLocation: '/child',
  routes: [
    GoRoute(path: '/', redirect: (context, state) => '/child'),
    GoRoute(path: '/child', builder: (context, state) => const ChildHomeScreen()),
    GoRoute(path: '/parent', builder: (context, state) => const ParentFeedScreen()),
    GoRoute(path: '/pet-preview', builder: (context, state) => const PetPreviewScreen()),
  ],
);
