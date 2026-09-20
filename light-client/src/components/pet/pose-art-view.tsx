/**
 * Dotty's picture for one pose, with three gentle loops running on top of it:
 *  - the tail swings slowly (nine pre-bent pictures, faded into each other and played back and forth)
 *  - the mouth opens a little and closes again now and then
 *  - the expression marks (hearts, "?", Zzz, bursts) float, wobble or pulse
 *
 * The pieces are cut from the artwork by scripts/pet_frames.py; pose-art.ts says where each one goes.
 * With reduced motion turned on (or `animated` false) everything holds still.
 */
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { POSE_ART, type MarkKind, type PoseArt } from './pose-art';

export type PoseName = keyof typeof POSE_ART;

const TAIL_SWEEP_MS = 1800; // one sweep of the tail from side to side; there and back is twice this
const MOUTH_SPEED = 1.5; // how much faster than the first version the mouth moves
const MOUTH_PAUSE_MS = 1000; // mouth shut between the end of one opening and the start of the next
const ms = (n: number) => Math.round(n / MOUTH_SPEED);

const KIND_MS: Record<MarkKind, number> = { float: 1100, wobble: 900, burst: 650, zzz: 1500 };

function TailFrame({ index, position, source, pad, width, height }: { index: number; position: SharedValue<number>; source: PoseArt['frames'][number]; pad: [number, number]; width: number; height: number }) {
  // the frame below the current position stays fully visible and the next one fades in over it,
  // so the body never gets see-through in the middle of a fade
  const style = useAnimatedStyle(() => {
    const lower = Math.floor(position.value);
    return { opacity: index === lower ? 1 : index === lower + 1 ? position.value - lower : 0 };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: -pad[0] * width, top: -pad[1] * height, width: width * (1 + 2 * pad[0]), height: height * (1 + 2 * pad[1]) }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="fill" />
    </Animated.View>
  );
}

function Mark({ mark, width, height, animate }: { mark: PoseArt['marks'][number]; width: number; height: number; animate: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      t.value = 0;
      return;
    }
    t.value = withDelay(
      mark.delay,
      withRepeat(withTiming(1, { duration: KIND_MS[mark.kind], easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [animate, mark.delay, mark.kind, t]);

  const drift = width * 0.02;
  const style = useAnimatedStyle(() => {
    switch (mark.kind) {
      case 'wobble':
        return {
          transform: [{ translateY: interpolate(t.value, [0, 1], [0, -drift * 0.5]) }, { rotate: `${interpolate(t.value, [0, 1], [-9, 9])}deg` }],
        };
      case 'burst':
        return {
          opacity: interpolate(t.value, [0, 1], [0.8, 1]),
          transform: [
            { translateX: interpolate(t.value, [0, 1], [0, mark.dir[0] * drift * 0.8]) },
            { translateY: interpolate(t.value, [0, 1], [0, mark.dir[1] * drift * 0.8]) },
            { scale: interpolate(t.value, [0, 1], [0.92, 1.12]) },
          ],
        };
      case 'zzz':
        return {
          opacity: interpolate(t.value, [0, 1], [0.6, 1]),
          transform: [{ translateY: interpolate(t.value, [0, 1], [0, -drift]) }, { scale: interpolate(t.value, [0, 1], [0.95, 1.06]) }],
        };
      default: // float: hearts drift up a touch and swell
        return {
          transform: [{ translateY: interpolate(t.value, [0, 1], [0, -drift]) }, { scale: interpolate(t.value, [0, 1], [1, 1.1]) }],
        };
    }
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: mark.box[0] * width, top: mark.box[1] * height, width: mark.box[2] * width, height: mark.box[3] * height },
        mark.kind === 'wobble' && { transformOrigin: '50% 100%' },
        style,
      ]}>
      <Image source={mark.src} style={StyleSheet.absoluteFill} contentFit="fill" />
    </Animated.View>
  );
}

export function PoseArtView({ pose, width, height, animate = true }: { pose: PoseName; width: number; height: number; animate?: boolean }) {
  const art: PoseArt = POSE_ART[pose];
  const reduced = useReducedMotion();
  const moving = animate && !reduced;

  const last = art.frames.length - 1;
  const middle = last / 2; // the neutral frame
  const position = useSharedValue(middle); // where the tail is, from 0 to the last frame
  const mouth = useSharedValue(0); // 0 closed, 1 open

  useEffect(() => {
    if (!moving) {
      position.value = middle;
      mouth.value = 0;
      return;
    }
    // one continuous swing: an eased sweep to the far side and back, over and over
    position.value = 0;
    position.value = withRepeat(withTiming(last, { duration: TAIL_SWEEP_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    mouth.value = withRepeat(
      withSequence(
        withTiming(0, { duration: MOUTH_PAUSE_MS }),
        withTiming(1, { duration: ms(260), easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: ms(700) }),
        withTiming(0, { duration: ms(260), easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
  }, [moving, last, middle, pose, position, mouth]);

  const mouthStyle = useAnimatedStyle(() => ({ opacity: mouth.value }));

  return (
    <View pointerEvents="none" style={{ width, height }}>
      {art.frames.map((source, i) => (
        <TailFrame key={i} index={i} position={position} source={source} pad={art.pad} width={width} height={height} />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: art.mouth.box[0] * width, top: art.mouth.box[1] * height, width: art.mouth.box[2] * width, height: art.mouth.box[3] * height }, mouthStyle]}>
        <Image source={art.mouth.src} style={StyleSheet.absoluteFill} contentFit="fill" />
      </Animated.View>
      {art.marks.map((mark, i) => (
        <Mark key={i} mark={mark} width={width} height={height} animate={moving} />
      ))}
    </View>
  );
}
