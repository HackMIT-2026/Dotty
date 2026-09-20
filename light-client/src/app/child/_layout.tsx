import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { childBar, childTabScreenOptions, imageTabIcon } from '@/components/tab-icon';
import { ShopSheet } from '@/components/shop-sheet';
import { C } from '@/constants/theme';

export default function ChildTabs() {
  const [shopMenu, setShopMenu] = useState(false);
  const bottom = useSafeAreaInsets().bottom;

  return (
    <>
      <Tabs screenOptions={childTabScreenOptions(C.primary, bottom)}>
        <Tabs.Screen name="index" options={{ title: 'Dotty', tabBarIcon: imageTabIcon(require('@/assets/icons/dotty.png')) }} />
        <Tabs.Screen name="log" options={{ title: 'Care', tabBarIcon: imageTabIcon(require('@/assets/icons/care.png')), tabBarStyle: childBar(C.barCare, bottom) }} />
        <Tabs.Screen name="quests" options={{ title: 'Quests', tabBarIcon: imageTabIcon(require('@/assets/icons/quest.png')), tabBarStyle: childBar(C.barQuests, bottom) }} />
        <Tabs.Screen
          name="shop"
          options={{ title: 'Shop', tabBarIcon: imageTabIcon(require('@/assets/icons/home.png')), tabBarStyle: childBar(C.barShop, bottom) }}
          listeners={{
            // the Shop tab opens the "what do you want to change?" sheet first, then the shop itself
            tabPress: (e) => {
              e.preventDefault();
              setShopMenu(true);
            },
          }}
        />
      </Tabs>
      <ShopSheet
        visible={shopMenu}
        onClose={() => setShopMenu(false)}
        onPick={(slot) => {
          setShopMenu(false);
          router.navigate({ pathname: '/child/shop', params: { slot, t: String(Date.now()) } });
        }}
      />
    </>
  );
}
