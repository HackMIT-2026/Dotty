import { Tabs } from 'expo-router/js-tabs';

import { childTabScreenOptions, imageTabIcon } from '@/components/tab-icon';
import { C } from '@/constants/theme';

export default function ChildTabs() {
  return (
    <Tabs screenOptions={childTabScreenOptions(C.primary)}>
      <Tabs.Screen name="index" options={{ title: 'Dotty', tabBarIcon: imageTabIcon(require('@/assets/icons/dotty.png')) }} />
      <Tabs.Screen name="log" options={{ title: 'Care', tabBarIcon: imageTabIcon(require('@/assets/icons/care.png')) }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: imageTabIcon(require('@/assets/icons/quest.png')) }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: imageTabIcon(require('@/assets/icons/home.png')) }} />
    </Tabs>
  );
}
