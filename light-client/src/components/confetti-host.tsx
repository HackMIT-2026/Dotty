/**
 * Ribbons that pop out of the middle of the screen and flutter down when the child finishes something, with a short
 * buzz from the phone. Triggered by `burstConfetti()` in the store (see saveLog). It never blocks touches, and with
 * reduced motion turned on it skips the ribbons and only buzzes.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Vibration, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { C } from '@/constants/theme';
import { playSfx } from '@/lib/sounds';
import { useStore } from '@/lib/store';

const PIECES = 40;
const DURATION_S = 1.9;
const GRAVITY = 1500; // px per second squared

const COLORS = [C.primary, C.lavender, C.sky, C.mint, C.sun, C.pink];

interface Piece {
  color: string;
  w: number;
  h: number;
  vx: number; // px per second, sideways
  vy: number; // px per second, upward is negative
  spin: number; // degrees per second
  flip: number; // how fast the ribbon turns over, radians per second
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    color: COLORS[i % COLORS.length],
    w: rand(9, 14),
    h: rand(22, 36),
    vx: rand(-340, 340),
    vy: -rand(560, 1080),
    spin: rand(-540, 540),
    flip: rand(6, 14),
  }));
}

function Ribbon({ piece, progress, left, top }: { piece: Piece; progress: SharedValue<number>; left: number; top: number }) {
  const style = useAnimatedStyle(() => {
    const s = progress.value * DURATION_S;
    return {
      opacity: progress.value > 0.72 ? 1 - (progress.value - 0.72) / 0.28 : 1,
      transform: [
        { translateX: piece.vx * s },
        { translateY: piece.vy * s + 0.5 * GRAVITY * s * s },
        { rotate: `${piece.spin * s}deg` },
        { scaleY: Math.cos(piece.flip * s) },
      ],
    };
  });
  return <Animated.View style={[styles.ribbon, { left, top, width: piece.w, height: piece.h, backgroundColor: piece.color }, style]} />;
}

function buzz() {
  if (Platform.OS === 'web') {
    try {
      Vibration.vibrate(40);
    } catch {
      // phones that cannot vibrate just skip it
    }
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function ConfettiHost() {
  const trigger = useStore((s) => s.confetti);
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [burst, setBurst] = useState<{ id: number; pieces: Piece[] } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    buzz();
    playSfx('success');
    if (reduced) return;
    setBurst({ id: trigger, pieces: makePieces() });
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_S * 1000, easing: Easing.linear });
    const done = setTimeout(() => setBurst(null), DURATION_S * 1000 + 120);
    return () => clearTimeout(done);
  }, [trigger, reduced, progress]);

  if (!burst) return null;
  return (
    <View pointerEvents="none" style={styles.host}>
      {burst.pieces.map((p, i) => (
        <Ribbon key={`${burst.id}-${i}`} piece={p} progress={progress} left={width / 2} top={height * 0.6} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill, zIndex: 200 },
  ribbon: { position: 'absolute', borderRadius: 2 },
});
