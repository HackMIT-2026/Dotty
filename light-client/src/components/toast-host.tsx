import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, FONT, MAX_WIDTH, R, S, shadow } from '@/constants/theme';
import { useStore } from '@/lib/store';
import type { Toast } from '@/lib/types';

const ICON: Record<Toast['kind'], string> = { reward: '⭐', info: '🐣', alert: '🔔', sync: '☁️' };
const TINT: Record<Toast['kind'], string> = { reward: C.sunSoft, info: C.primarySoft, alert: C.pinkSoft, sync: C.mintSoft };

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast);
  useEffect(() => {
    if (Platform.OS !== 'web' && toast.kind === 'reward') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timer = setTimeout(() => dismiss(toast.id), 3600);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, dismiss]);

  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutUp} style={[styles.toast, { backgroundColor: TINT[toast.kind] }]}>
      <Text style={styles.icon}>{ICON[toast.kind]}</Text>
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
    <View pointerEvents="none" style={[styles.host, { top: insets.top + S.sm }]}>
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
    gap: S.sm,
    width: '100%',
    maxWidth: MAX_WIDTH - 2 * S.md,
    padding: S.md,
    borderRadius: R.lg,
    ...shadow,
  },
  icon: { fontSize: 26 },
  text: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.ink },
  sub: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.inkSoft },
});
