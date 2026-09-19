import { Tabs } from 'expo-router/js-tabs';

import { tabIcon, tabScreenOptions } from '@/components/tab-icon';
import { C } from '@/constants/theme';

export default function ChildTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Dotty', tabBarIcon: tabIcon('home-heart', 'home-outline') }} />
      <Tabs.Screen name="log" options={{ title: 'Care', tabBarIcon: tabIcon('heart', 'heart-outline') }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: tabIcon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: tabIcon('shopping', 'shopping-outline') }} />
    </Tabs>
  );
}
