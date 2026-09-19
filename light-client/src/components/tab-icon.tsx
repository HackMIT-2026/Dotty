import type { ColorValue } from 'react-native';

import { C, F } from '@/constants/theme';

import { Icon, type IconName } from './icon';

/** Tab bar icon: filled when selected, outline otherwise (both exist in Material Design Icons). */
export function tabIcon(name: IconName, outline: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => <Icon name={focused ? name : outline} size={26} color={color as string} />;
}

export const tabScreenOptions = (active: string) => ({
  headerShown: false,
  tabBarActiveTintColor: active,
  tabBarInactiveTintColor: C.inkSoft,
  tabBarLabelStyle: { fontFamily: F.bold, fontSize: 12 },
  tabBarStyle: { height: 64, paddingTop: 6 },
});
