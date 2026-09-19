import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, tabScreenOptions } from '@/components/tab-icon';
import { C } from '@/constants/theme';
import { unreadCount, useStore } from '@/lib/store';

export default function ParentTabs() {
  const unread = useStore(unreadCount);
  return (
    <Tabs screenOptions={tabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('chart-line', 'chart-line') }} />
      <Tabs.Screen name="dose" options={{ title: 'Dose helper', tabBarIcon: tabIcon('calculator', 'calculator') }} />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Inbox', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: tabIcon('bell', 'bell-outline') }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: tabIcon('clipboard-text', 'clipboard-text-outline') }} />
    </Tabs>
  );
}
