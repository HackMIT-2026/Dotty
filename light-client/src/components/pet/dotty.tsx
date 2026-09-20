/**
 * Pip, the pet. The body is the artwork from the `gloria` branch (one image per mood); the shop's hats and
 * accessories are drawn as SVG on top, and a colour item becomes the glow behind Pip.
 *
 * Each pose has its own anchor (where the head sits in that image), so a hat lands correctly whether Pip is
 * sitting, curious or asleep. Anchors are fractions of the image, measured from the artwork.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import type { Mood, Pet } from '@/lib/types';

import { BackAccessory, FrontAccessory, POSE_POINTS } from './accessories';
import { PoseArtView } from './pose-art-view';

type Equipped = Pet['equipped'];

/**
 * Where the head sits in each pose's picture, as fractions of it (for hats and accessories). The pictures and their
 * animated pieces (tail frames, mouth, expression marks) are in pose-art.ts, cut from assets/pet/*.png by scripts/pet_frames.py.
 */
const POSES = {
  happy: { aspect: 540 / 493, head: { cx: 0.51, top: 0.085, w: 0.45 } },
  curious: { aspect: 566 / 484, head: { cx: 0.47, top: 0.095, w: 0.53 } },
  cheering: { aspect: 1174 / 976, head: { cx: 0.49, top: 0.08, w: 0.49 } },
  sleepy: { aspect: 1448 / 1086, head: { cx: 0.43, top: 0.32, w: 0.46 } },
} as const;

type PoseName = keyof typeof POSES;

/** Pip's face for each of Dotty's moods. `cheering` is used for a moment when the child earns something. */
const MOOD_POSE: Record<Mood, PoseName> = {
  bouncy: 'happy',
  sleepy: 'sleepy',
  sluggish: 'curious',
  shaky: 'curious',
  waiting: 'curious',
};

/** How each colour item recolours Pip's body (`null` keeps the artwork's own pink). */
export const BODY_TINT: Record<string, string | null> = {
  color_sky: null,
  color_mint: '#3DCB9A',
  color_sunset: '#FF9A3D',
  color_grape: '#9B6BE8',
  color_gold: '#FFC61A',
};

/** Colour items become the soft glow behind Pip (the artwork itself keeps its own colours). */
export const BODY_COLORS: Record<string, { fill: string; shade: string; cheek: string }> = {
  color_sky: { fill: '#A9D8EE', shade: '#7FC3E4', cheek: '#FF9EC4' },
  color_mint: { fill: '#A8E0C8', shade: '#7FCFAE', cheek: '#FF9EB0' },
  color_sunset: { fill: '#F5C26B', shade: '#E8A945', cheek: '#FF6F8E' },
  color_grape: { fill: '#B8A9E8', shade: '#9B88DE', cheek: '#FF9ED8' },
  color_gold: { fill: '#FFD34D', shade: '#F2B620', cheek: '#FF9E7A' },
};

/** Points of a 5-pointed star centred on (cx, cy). */
function star(cx: number, cy: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(a)).toFixed(1)},${(cy + radius * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/**
 * Hats are drawn in a 100x100 box whose bottom edge is the top of the head, so each one can be scaled to the
 * head of whichever pose is showing.
 */
function Hat({ id }: { id: string | null }) {
  switch (id) {
    case 'hat_cap':
      return (
        <G>
          <Path d="M10 96 q40 -78 80 0 z" fill="#E5534B" />
          <Path d="M78 92 q28 -4 40 8 q-20 8 -42 0z" fill="#C13F38" />
          <Circle cx={50} cy={46} r={6} fill="#C13F38" />
        </G>
      );
    case 'hat_beanie':
      return (
        <G>
          <Path d="M8 92 q42 -92 84 0 z" fill="#2FBF8F" />
          <Rect x={4} y={80} width={92} height={18} rx={9} fill="#239C74" />
          <Circle cx={50} cy={16} r={13} fill="#FFF3B0" />
        </G>
      );
    case 'hat_party':
      return (
        <G>
          <Polygon points="50,2 20,96 80,96" fill="#E56B8A" />
          <Path d="M35 62 l30 0 M28 82 l44 0" stroke="#F5C26B" strokeWidth={7} strokeLinecap="round" />
          <Circle cx={50} cy={4} r={9} fill="#F5C26B" />
        </G>
      );
    case 'hat_crown':
      return (
        <G>
          <Polygon points="12,96 12,40 32,64 50,26 68,64 88,40 88,96" fill="#F5C26B" stroke="#DDA23C" strokeWidth={3} strokeLinejoin="round" />
          <Circle cx={50} cy={74} r={7} fill="#E5534B" />
          <Circle cx={26} cy={80} r={5} fill="#A9D8EE" />
          <Circle cx={74} cy={80} r={5} fill="#A8E0C8" />
        </G>
      );
    case 'hat_wizard':
      return (
        <G>
          <Path d="M50 0 L16 88 L84 88 Z" fill="#7C6BD6" />
          <Ellipse cx={50} cy={90} rx={46} ry={9} fill="#5647C9" />
          <Polygon points={star(46, 58, 10)} fill="#F5C26B" />
          <Polygon points={star(58, 30, 6)} fill="#F5C26B" />
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
  /** Increment to make Pip cheer. */
  cheer?: number;
  animated?: boolean;
}

export function Dotty({ equipped, mood = 'bouncy', size = 220, cheer = 0, animated = true }: DottyProps) {
  const bob = useSharedValue(0);
  const jump = useSharedValue(0);
  const squish = useSharedValue(1);
  const [cheering, setCheering] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const speed = mood === 'bouncy' ? 900 : mood === 'shaky' ? 140 : 1600;
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
    jump.value = withSequence(withTiming(-40, { duration: 180 }), withSpring(0, { damping: 6, stiffness: 180 }));
    squish.value = withSequence(withTiming(0.92, { duration: 120 }), withSpring(1, { damping: 5 }));
    setCheering(true);
    const timer = setTimeout(() => setCheering(false), 2200);
    return () => clearTimeout(timer);
  }, [animated, cheer, jump, squish]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value + jump.value }, { scaleY: squish.value }, { scaleX: 2 - squish.value }],
  }));

  const poseName = cheering ? 'cheering' : MOOD_POSE[mood];
  const pose = POSES[poseName];
  const glow = BODY_COLORS[equipped.color] ?? BODY_COLORS.color_sky;

  // the artwork is laid out inside a square stage, so the anchors below map straight onto it
  const imgW = size;
  const imgH = size / pose.aspect;
  const imgTop = (size - imgH) / 2;
  const headW = pose.head.w * imgW;
  const headCx = pose.head.cx * imgW;
  const headTop = imgTop + pose.head.top * imgH;

  const hatW = headW * 1.12;
  const pts = POSE_POINTS[poseName];

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.glow,
          { top: imgTop + imgH * 0.28, left: imgW * 0.18, width: imgW * 0.64, height: imgH * 0.56, backgroundColor: glow.fill },
        ]}
      />
      <View style={{ marginTop: imgTop, width: imgW, height: imgH }}>
        {equipped.accessory === 'acc_cape' ? (
          <Svg style={StyleSheet.absoluteFill} width={imgW} height={imgH} viewBox={`0 0 ${pts.w} ${pts.h}`}>
            <BackAccessory id={equipped.accessory} pose={poseName} />
          </Svg>
        ) : null}
        <PoseArtView key={poseName} pose={poseName} width={imgW} height={imgH} animate={animated} tint={BODY_TINT[equipped.color] ?? null} />
        {equipped.accessory ? (
          <Svg style={StyleSheet.absoluteFill} width={imgW} height={imgH} viewBox={`0 0 ${pts.w} ${pts.h}`}>
            <FrontAccessory id={equipped.accessory} pose={poseName} />
          </Svg>
        ) : null}
      </View>

      {equipped.hat ? (
        <View style={[styles.layer, { left: headCx - hatW / 2, top: headTop - hatW * 0.78, width: hatW, height: hatW }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Hat id={equipped.hat} />
          </Svg>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', borderRadius: 999, opacity: 0.22 },
  layer: { position: 'absolute' },
});
