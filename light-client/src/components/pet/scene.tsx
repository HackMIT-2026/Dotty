import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/** Background scenes for the `background` shop slot. Drawn in a 400x300 box, cropped to fill. */
function Backdrop({ id }: { id: string }) {
  switch (id) {
    case 'bg_night':
      return (
        <G>
          <Rect width={400} height={300} fill="#2B2F6B" />
          {[
            [40, 40], [120, 70], [210, 30], [300, 60], [360, 110], [70, 130], [250, 120],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 3} fill="#FFF7C2" />
          ))}
          <Circle cx={330} cy={50} r={26} fill="#FFF3B0" />
          <Circle cx={342} cy={42} r={22} fill="#2B2F6B" />
          <Ellipse cx={200} cy={300} rx={300} ry={70} fill="#1E4D3A" />
        </G>
      );
    case 'bg_beach':
      return (
        <G>
          <Rect width={400} height={300} fill="#BDE8FF" />
          <Circle cx={330} cy={60} r={30} fill="#FFD34D" />
          <Rect y={170} width={400} height={50} fill="#4DB6E8" />
          <Path d="M0 180 q25 -8 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#fff" strokeWidth={4} fill="none" opacity={0.7} />
          <Ellipse cx={200} cy={300} rx={320} ry={90} fill="#FFE2A8" />
        </G>
      );
    case 'bg_space':
      return (
        <G>
          <Rect width={400} height={300} fill="#1B1340" />
          {[
            [30, 30], [90, 100], [160, 40], [240, 90], [320, 30], [370, 140], [60, 190], [300, 200],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={2} fill="#fff" />
          ))}
          <Circle cx={70} cy={70} r={30} fill="#FF7EB6" />
          <Ellipse cx={70} cy={70} rx={48} ry={10} stroke="#FFD34D" strokeWidth={5} fill="none" />
          <Circle cx={340} cy={80} r={16} fill="#7FE0B8" />
          <Ellipse cx={200} cy={310} rx={300} ry={70} fill="#9A8CFF" />
          <Circle cx={120} cy={270} r={10} fill="#7F70E6" />
          <Circle cx={290} cy={262} r={14} fill="#7F70E6" />
        </G>
      );
    case 'bg_candy':
      return (
        <G>
          <Rect width={400} height={300} fill="#FFE4F0" />
          <Rect x={52} y={110} width={6} height={110} fill="#fff" />
          <Circle cx={55} cy={100} r={26} fill="#FF7EB6" />
          <Path d="M55 100 m-16 0 a16 16 0 1 0 32 0 a10 10 0 1 0 -20 0" stroke="#fff" strokeWidth={4} fill="none" />
          <Rect x={342} y={120} width={6} height={100} fill="#fff" />
          <Circle cx={345} cy={110} r={22} fill="#7FE0B8" />
          <Circle cx={200} cy={46} r={10} fill="#FFD34D" />
          <Circle cx={250} cy={70} r={7} fill="#B592FF" />
          <Circle cx={140} cy={60} r={8} fill="#7CC4FF" />
          <Ellipse cx={200} cy={300} rx={320} ry={80} fill="#FFB3D1" />
        </G>
      );
    default: // bg_day
      return (
        <G>
          <Rect width={400} height={300} fill="#CFEBFF" />
          <Circle cx={60} cy={56} r={28} fill="#FFD34D" />
          <G fill="#fff">
            <Ellipse cx={260} cy={60} rx={40} ry={16} />
            <Ellipse cx={290} cy={50} rx={26} ry={16} />
            <Ellipse cx={150} cy={100} rx={30} ry={11} />
          </G>
          <Ellipse cx={200} cy={300} rx={320} ry={80} fill="#9BE08A" />
          <Ellipse cx={80} cy={260} rx={60} ry={20} fill="#86D076" />
        </G>
      );
  }
}

export function PetScene({ background, children, style }: { background: string; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.scene, style]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <Backdrop id={background} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
