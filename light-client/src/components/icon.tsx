/**
 * One icon family for the whole app: Material Design Icons (pictogrammers.com/library/mdi, Apache 2.0),
 * bundled with Expo as @expo/vector-icons so it works offline. Browse names at icons.expo.fyi.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { R } from '@/constants/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color, style }: { name: IconName; size?: number; color: string; style?: StyleProp<any> }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}

/** An icon on a soft rounded tile, the app's main visual unit (actions, foods, badges, inbox rows). */
export function IconTile({
  name,
  color,
  tint,
  size = 44,
  radius = R.md,
  style,
}: {
  name: IconName;
  color: string;
  tint: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={name} size={Math.round(size * 0.56)} color={color} />
    </View>
  );
}

/** The Dots currency: a glossy little dot, like Dotty. */
export function DotCoin({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="coin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8FD0FF" />
          <Stop offset="1" stopColor="#3D8BF0" />
        </LinearGradient>
      </Defs>
      <Circle cx={12} cy={12} r={11} fill="url(#coin)" />
      <Circle cx={12} cy={12} r={8} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} />
      <Circle cx={8.5} cy={8} r={2.6} fill="#fff" opacity={0.7} />
    </Svg>
  );
}
