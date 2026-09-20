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

/** `bottom` is the phone's bottom safe area (the home bar), so the labels are not drawn underneath it. */
export const tabScreenOptions = (active: string, bottom = 0) => ({
  headerShown: false,
  tabBarActiveTintColor: active,
  tabBarInactiveTintColor: C.inkSoft,
  tabBarLabelStyle: { fontFamily: F.bold, fontSize: 12 },
  tabBarStyle: { height: 64 + bottom, paddingTop: 6, paddingBottom: bottom },
});

/** The kid's tab bar in a given colour, with a soft white edge on top. Each kid tab picks its own colour. */
export const childBar = (backgroundColor: string, bottom = 0) => ({
  height: 78 + bottom,
  paddingBottom: bottom,
  paddingHorizontal: 6,
  backgroundColor,
  borderTopWidth: BORDER,
  borderTopColor: C.glassLine,
});

/** The kid's tab bar: sand coloured like the pond floor on Dotty's home, with the current tab in a soft white pill. */
export const childTabScreenOptions = (active: string, bottom = 0) => ({
  ...tabScreenOptions(active, bottom),
  tabBarInactiveTintColor: C.ink,
  tabBarActiveTintColor: C.ink,
  tabBarActiveBackgroundColor: 'rgba(255, 255, 255, 0.6)',
  tabBarItemStyle: { borderRadius: R.lg, marginHorizontal: 4, marginVertical: 6 },
  tabBarStyle: childBar(C.sand, bottom),
});
