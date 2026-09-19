import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, tabScreenOptions } from '@/components/tab-icon';
import { C } from '@/constants/theme';
import { unreadCount, useStore } from '@/lib/store';

export default function ParentTabs() {
  const unread = useStore(unreadCount);
  return (
    <Tabs screenOptions={tabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }} />
      <Tabs.Screen name="dose" options={{ title: 'Dose helper', tabBarIcon: ({ focused }) => <TabIcon emoji="🧮" focused={focused} /> }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />,
        }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
    </Tabs>
  );
}
