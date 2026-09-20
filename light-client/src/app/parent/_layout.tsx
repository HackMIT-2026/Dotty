import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, tabScreenOptions } from '@/components/tab-icon';
import { C } from '@/constants/theme';
import { unreadCount, useStore } from '@/lib/store';

export default function ParentTabs() {
  const unread = useStore(unreadCount);
  return (
    <Tabs screenOptions={tabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('chart-line', 'chart-line') }} />
      <Tabs.Screen name="care-plan" options={{ title: 'Care plan', tabBarIcon: tabIcon('clipboard-check', 'clipboard-check-outline') }} />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Messages', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: tabIcon('bell', 'bell-outline') }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Settings', tabBarIcon: tabIcon('tune', 'tune-variant') }} />
    </Tabs>
  );
}
