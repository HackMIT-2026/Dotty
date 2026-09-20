import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { C, R, S, font, shadow } from '@/constants/theme';

/**
 * Dotty's speech bubble. It sits on a thicker pond-blue bottom edge, like the block buttons, and pops out of its
 * tail whenever it appears or the words change. With reduced motion it just shows.
 */
export function SpeechBubble({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1); // 0 hidden, 1 shown (overshoots a little while popping)

  useEffect(() => {
    if (reduced) {
      pop.value = 1;
      return;
    }
    pop.value = 0;
    pop.value = withSequence(withTiming(0, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 190, mass: 0.8 }));
  }, [text, reduced, pop]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ translateY: (1 - pop.value) * 14 }, { scale: 0.55 + 0.45 * pop.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
      <View style={styles.tail} />
    </Animated.View>
  );
}

const EDGE = 4;

const styles = StyleSheet.create({
  // it grows out of the tail, so scale from the bottom middle
  wrap: { alignItems: 'center', marginBottom: 46, maxWidth: 280, transformOrigin: '50% 100%' },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: 10,
    borderBottomWidth: EDGE,
    borderBottomColor: C.skyEdge,
    ...shadow,
  },
  tail: {
    position: 'absolute',
    bottom: -7,
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    borderRightWidth: EDGE,
    borderBottomWidth: EDGE,
    borderColor: C.skyEdge,
    transform: [{ rotate: '45deg' }],
  },
  text: { ...font('800'), fontSize: 16, color: C.ink, textAlign: 'center' },
});
