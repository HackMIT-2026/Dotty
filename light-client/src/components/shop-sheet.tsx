/**
 * The half-page sheet that slides up when the child taps the Shop tab. It asks what to change
 * (hats, extras, colors or places) and then opens the real shop on that shelf.
 */
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, C, MAX_WIDTH, R, S, font } from '@/constants/theme';
import type { Slot } from '@/lib/types';


const CHOICES: { slot: Slot; label: string; image: ImageSourcePropType }[] = [
  { slot: 'hat', label: 'Hats', image: require('@/assets/icons/hat.png') },
  { slot: 'accessory', label: 'Extras', image: require('@/assets/icons/extras.png') },
  { slot: 'color', label: 'Colors', image: require('@/assets/icons/colors.png') },
  { slot: 'background', label: 'Places', image: require('@/assets/icons/places.png') },
];

const SLIDE_MS = 260;

export function ShopSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (slot: Slot) => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0); // 0 hidden, 1 shown

  useEffect(() => {
    const duration = reduced ? 0 : SLIDE_MS;
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(0, { duration, easing: Easing.in(Easing.cubic) });
    const t = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(t);
  }, [visible, reduced, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.45 }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * 420 }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close the shop menu" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }, sheet]}>
          <View style={styles.pop}>
            <Image source={require('@/assets/icons/home.png')} style={styles.popIcon} resizeMode="contain" />
          </View>
          <View style={styles.sign}>
            <Text style={styles.signText}>Shop</Text>
          </View>
          <Text style={styles.ask}>What do you want to change?</Text>

          <View style={styles.grid}>
            {CHOICES.map((c) => (
              <Pressable
                key={c.slot}
                accessibilityRole="button"
                onPress={() => onPick(c.slot)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <Image source={c.image} style={styles.cardIcon} resizeMode="contain" />
                <Text style={styles.cardText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { backgroundColor: C.ink },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: C.sky,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 72,
    paddingHorizontal: S.md,
    alignItems: 'center',
    gap: S.md,
  },
  pop: { position: 'absolute', top: -46, alignSelf: 'center' },
  popIcon: { width: 96, height: 96 },
  sign: { backgroundColor: C.sun, borderBottomWidth: 4, borderBottomColor: C.sunEdge, borderRadius: R.md, paddingHorizontal: 44, paddingVertical: 8, transform: [{ rotate: '-1.5deg' }] },
  signText: { ...font('900'), fontSize: 24, color: C.ink },
  ask: { ...font('800'), fontSize: 17, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, width: '100%' },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.md,
    borderRadius: R.lg,
    backgroundColor: C.card,
    borderWidth: BORDER,
    borderColor: C.glassLine,
    borderBottomWidth: 4,
    borderBottomColor: C.line,
  },
  cardPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  cardIcon: { width: 60, height: 60 },
  cardText: { ...font('800'), fontSize: 18, color: C.ink },
});
