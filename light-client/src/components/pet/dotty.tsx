/**
 * Dotty, drawn in SVG layers: cape (behind) -> body -> face (by mood) -> accessory -> hat.
 * Every shop item's `asset_key` maps to one layer here, so a new skin is one more case below.
 */
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { Mood, Pet } from '@/lib/types';

type Equipped = Pet['equipped'];

export const BODY_COLORS: Record<string, { fill: string; shade: string; cheek: string }> = {
  color_sky: { fill: '#7CC4FF', shade: '#5AAAF0', cheek: '#FF9EC4' },
  color_mint: { fill: '#7FE0B8', shade: '#58C99C', cheek: '#FF9EB0' },
  color_sunset: { fill: '#FFA46B', shade: '#F5854A', cheek: '#FF6F8E' },
  color_grape: { fill: '#B592FF', shade: '#9570F0', cheek: '#FF9ED8' },
  color_gold: { fill: '#FFD34D', shade: '#F2B620', cheek: '#FF9E7A' },
};

function Face({ mood }: { mood: Mood }) {
  const ink = '#2B2650';
  switch (mood) {
    case 'sleepy':
      return (
        <G>
          <Path d="M66 108 q10 8 20 0" stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M114 108 q10 8 20 0" stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Ellipse cx={100} cy={138} rx={7} ry={8} fill={ink} />
          <SvgText x={150} y={62} fontSize={22} fontWeight="bold" fill="#6C5CE7">z</SvgText>
          <SvgText x={164} y={44} fontSize={28} fontWeight="bold" fill="#6C5CE7">Z</SvgText>
        </G>
      );
    case 'sluggish':
      return (
        <G>
          <Circle cx={76} cy={108} r={11} fill={ink} />
          <Circle cx={124} cy={108} r={11} fill={ink} />
          <Rect x={62} y={94} width={28} height={11} rx={4} fill="currentColor" />
          <Rect x={110} y={94} width={28} height={11} rx={4} fill="currentColor" />
          <Path d="M84 140 q8 -6 16 0 t16 0" stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M156 86 q6 10 0 16 q-6 -6 0 -16z" fill="#8FD3FF" />
        </G>
      );
    case 'shaky':
      return (
        <G>
          <Circle cx={76} cy={106} r={14} fill="#fff" />
          <Circle cx={124} cy={106} r={14} fill="#fff" />
          <Circle cx={78} cy={108} r={8} fill={ink} />
          <Circle cx={122} cy={108} r={8} fill={ink} />
          <Path d="M82 142 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx={76} cy={106} r={12} fill={ink} />
          <Circle cx={124} cy={106} r={12} fill={ink} />
          <Circle cx={80} cy={101} r={4} fill="#fff" />
          <Circle cx={128} cy={101} r={4} fill="#fff" />
          <Path d="M80 132 q20 22 40 0 z" fill={ink} />
          <Path d="M90 142 q10 8 20 0 q-10 -4 -20 0z" fill="#FF7E9D" />
        </G>
      );
  }
}

function Hat({ id }: { id: string | null }) {
  switch (id) {
    case 'hat_cap':
      return (
        <G>
          <Path d="M58 64 q42 -46 84 0 z" fill="#E5534B" />
          <Path d="M130 62 q26 -2 36 8 q-18 6 -40 0z" fill="#C13F38" />
          <Circle cx={100} cy={30} r={5} fill="#C13F38" />
        </G>
      );
    case 'hat_beanie':
      return (
        <G>
          <Path d="M56 66 q44 -60 88 0 z" fill="#2FBF8F" />
          <Rect x={52} y={58} width={96} height={16} rx={8} fill="#239C74" />
          <Circle cx={100} cy={20} r={12} fill="#FFF3B0" />
        </G>
      );
    case 'hat_party':
      return (
        <G>
          <Polygon points="100,-6 72,64 128,64" fill="#FF7EB6" />
          <Path d="M88 34 l24 0 M81 50 l38 0" stroke="#FFD34D" strokeWidth={6} strokeLinecap="round" />
          <Circle cx={100} cy={-6} r={9} fill="#FFD34D" />
        </G>
      );
    case 'hat_crown':
      return (
        <G>
          <Polygon points="62,66 62,26 81,46 100,18 119,46 138,26 138,66" fill="#FFD34D" stroke="#E0A800" strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={100} cy={52} r={6} fill="#E5534B" />
          <Circle cx={78} cy={56} r={4} fill="#4DA8FF" />
          <Circle cx={122} cy={56} r={4} fill="#2FBF8F" />
        </G>
      );
    case 'hat_wizard':
      return (
        <G>
          <Path d="M100 -18 L64 64 L136 64 Z" fill="#5647C9" />
          <Ellipse cx={100} cy={64} rx={52} ry={9} fill="#3F33A6" />
          <SvgText x={88} y={42} fontSize={18} fill="#FFD34D">★</SvgText>
          <SvgText x={102} y={20} fontSize={12} fill="#FFD34D">★</SvgText>
        </G>
      );
    default:
      return null;
  }
}

function Accessory({ id, layer }: { id: string | null; layer: 'back' | 'front' }) {
  if (id === 'acc_cape') {
    return layer === 'back' ? <Path d="M48 96 q-26 70 -6 96 l116 0 q20 -26 -6 -96 z" fill="#E5534B" /> : (
      <Path d="M62 150 q38 16 76 0" stroke="#C13F38" strokeWidth={6} strokeLinecap="round" fill="none" />
    );
  }
  if (layer === 'back') return null;
  switch (id) {
    case 'acc_glasses':
      return (
        <G stroke="#2B2650" strokeWidth={4} fill="rgba(255,255,255,0.35)">
          <Circle cx={76} cy={106} r={18} />
          <Circle cx={124} cy={106} r={18} />
          <Path d="M94 104 q6 -5 12 0" fill="none" />
        </G>
      );
    case 'acc_bowtie':
      return (
        <G>
          <Polygon points="100,166 76,154 76,178" fill="#E5534B" />
          <Polygon points="100,166 124,154 124,178" fill="#E5534B" />
          <Circle cx={100} cy={166} r={6} fill="#C13F38" />
        </G>
      );
    case 'acc_scarf':
      return (
        <G>
          <Path d="M46 150 q54 26 108 0 l0 14 q-54 26 -108 0z" fill="#FFB93B" />
          <Rect x={120} y={158} width={16} height={32} rx={6} fill="#F59E0B" />
        </G>
      );
    case 'acc_headphones':
      return (
        <G>
          <Path d="M36 104 q0 -84 128 0" stroke="#2B2650" strokeWidth={8} fill="none" />
          <Rect x={26} y={94} width={20} height={34} rx={9} fill="#FF7EB6" />
          <Rect x={154} y={94} width={20} height={34} rx={9} fill="#FF7EB6" />
        </G>
      );
    default:
      return null;
  }
}

interface DottyProps {
  equipped: Equipped;
  mood?: Mood;
  size?: number;
  /** Increment to make Dotty jump for joy. */
  cheer?: number;
  animated?: boolean;
}

export function Dotty({ equipped, mood = 'bouncy', size = 220, cheer = 0, animated = true }: DottyProps) {
  const color = BODY_COLORS[equipped.color] ?? BODY_COLORS.color_sky;
  const bob = useSharedValue(0);
  const jump = useSharedValue(0);
  const squish = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    const speed = mood === 'bouncy' ? 700 : mood === 'shaky' ? 120 : 1400;
    const height = mood === 'bouncy' ? -10 : mood === 'shaky' ? -2 : -4;
    bob.value = withRepeat(
      withSequence(
        withTiming(height, { duration: speed, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: speed, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [animated, mood, bob]);

  useEffect(() => {
    if (!animated || cheer === 0) return;
    jump.value = withSequence(withTiming(-46, { duration: 180 }), withSpring(0, { damping: 6, stiffness: 180 }));
    squish.value = withSequence(withTiming(0.9, { duration: 120 }), withSpring(1, { damping: 5 }));
  }, [animated, cheer, jump, squish]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + jump.value }, { scaleY: squish.value }, { scaleX: 2 - squish.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="-10 -30 220 230">
        <Ellipse cx={100} cy={192} rx={58} ry={8} fill="rgba(43,38,80,0.15)" />
        <Accessory id={equipped.accessory} layer="back" />
        <Path
          d="M100 46 C150 46 172 88 172 128 C172 168 140 188 100 188 C60 188 28 168 28 128 C28 88 50 46 100 46 Z"
          fill={color.fill}
        />
        <Path d="M40 150 C52 178 80 188 100 188 C130 188 160 176 168 146 C150 170 60 172 40 150 Z" fill={color.shade} />
        <Ellipse cx={70} cy={70} rx={16} ry={9} fill="rgba(255,255,255,0.45)" transform="rotate(-25 70 70)" />
        <Circle cx={58} cy={128} r={10} fill={color.cheek} opacity={0.6} />
        <Circle cx={142} cy={128} r={10} fill={color.cheek} opacity={0.6} />
        <G color={color.fill}>
          <Face mood={mood} />
        </G>
        <Accessory id={equipped.accessory} layer="front" />
        <Hat id={equipped.hat} />
      </Svg>
    </Animated.View>
  );
}
