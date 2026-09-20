import { Image, type ColorValue, type ImageSourcePropType } from 'react-native';

import { BORDER, C, F, R } from '@/constants/theme';

import { Icon, type IconName } from './icon';

/** Tab bar icon: filled when selected, outline otherwise (both exist in Material Design Icons). */
export function tabIcon(name: IconName, outline: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => <Icon name={focused ? name : outline} size={26} color={color as string} />;
}

/** Tab bar icon drawn from a full-colour PNG with its white sticker outline. Not tinted. */
export function imageTabIcon(source: ImageSourcePropType) {
  return () => <Image source={source} style={{ width: 40, height: 40 }} resizeMode="contain" />;
}

export const tabScreenOptions = (active: string) => ({
  headerShown: false,
  tabBarActiveTintColor: active,
  tabBarInactiveTintColor: C.inkSoft,
  tabBarLabelStyle: { fontFamily: F.bold, fontSize: 12 },
  tabBarStyle: { height: 64, paddingTop: 6 },
});

/** The kid's tab bar: sand coloured like the pond floor, with the current tab in a soft white pill. */
export const childTabScreenOptions = (active: string) => ({
  ...tabScreenOptions(active),
  tabBarInactiveTintColor: C.ink,
  tabBarActiveTintColor: C.ink,
  tabBarActiveBackgroundColor: 'rgba(255, 255, 255, 0.6)',
  tabBarItemStyle: { borderRadius: R.lg, marginHorizontal: 4, marginVertical: 6 },
  tabBarStyle: { height: 78, paddingHorizontal: 6, backgroundColor: C.sand, borderTopWidth: BORDER, borderTopColor: C.glassLine },
});
