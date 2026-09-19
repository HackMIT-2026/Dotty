import { Tabs } from 'expo-router/js-tabs';

import { TabIcon, tabScreenOptions } from '@/components/tab-icon';
import { C } from '@/constants/theme';

export default function ChildTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Dotty', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="log" options={{ title: 'Care', tabBarIcon: ({ focused }) => <TabIcon emoji="💖" focused={focused} /> }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} /> }} />
    </Tabs>
  );
}
