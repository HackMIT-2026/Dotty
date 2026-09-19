import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, MAX_WIDTH, R, S, font, shadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Toast } from '@/lib/types';

import { IconTile, type IconName } from './icon';

const STYLE: Record<Toast['kind'], { icon: IconName; color: string; tint: string }> = {
  reward: { icon: 'star-four-points', color: '#D69E2E', tint: C.sunSoft },
  info: { icon: 'check-circle', color: C.primary, tint: C.primarySoft },
  alert: { icon: 'bell-ring-outline', color: '#E0518D', tint: C.pinkSoft },
  sync: { icon: 'cloud-check', color: C.mint, tint: C.mintSoft },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    if (Platform.OS !== 'web' && toast.kind === 'reward') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timer = setTimeout(() => dismiss(toast.id), 3600);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, dismiss]);

  const s = STYLE[toast.kind];
  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp} style={styles.toast}>
      <IconTile name={s.icon} color={s.color} tint={s.tint} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{toast.text}</Text>
        {toast.sub ? <Text style={styles.sub}>{toast.sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.host, { top: insets.top + S.sm, pointerEvents: 'none' }]}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    width: '100%',
    maxWidth: MAX_WIDTH - 2 * S.md,
    padding: S.sm,
    paddingRight: S.md,
    borderRadius: R.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  text: { ...font('800'), fontSize: 16, color: C.ink },
  sub: { ...font('600'), fontSize: 13, color: C.inkSoft },
});
