import { Tabs } from 'expo-router/js-tabs';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { childBar, childTabScreenOptions, parentTabIcon } from '@/components/tab-icon';
import { C } from '@/constants/theme';
import { unreadCount, useStore } from '@/lib/store';

export default function ParentTabs() {
  const unread = useStore(unreadCount);
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={childTabScreenOptions(C.primary, insets.bottom)}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: parentTabIcon('chart'), tabBarStyle: childBar(C.barShop, insets.bottom) }} />
      <Tabs.Screen name="care-plan" options={{ title: 'Care plan', tabBarIcon: parentTabIcon('clipboard'), tabBarStyle: childBar(C.barQuests, insets.bottom) }} />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Messages', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: tabIcon('bell', 'bell-outline') }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Settings', tabBarIcon: parentTabIcon('settings'), tabBarStyle: childBar(C.barCare, insets.bottom) }} />
    </Tabs>
  );
}
