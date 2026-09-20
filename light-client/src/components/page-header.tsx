import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { R, S, shadow } from '@/constants/theme';

import { SyncBadge } from './sync-badge';
import { H1 } from './ui';
import { ParentIcon } from './parent-icon';

/** The gear that opens Settings. Shown in the same top-right spot on every signed-in screen. */
export function SettingsButton() {
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      style={({ pressed }) => [styles.gear, pressed && { transform: [{ scale: 0.92 }] }]}>
      <ParentIcon name="settings" size={26} />
    </Pressable>
  );
}

/** Page title with the sync status and Settings on the right. `children` adds extra items before them. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <H1 style={styles.title} numberOfLines={1}>
        {title}
      </H1>
      <View style={styles.right}>
        {children}
        <SyncBadge />
        <SettingsButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  title: { flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  gear: {
    width: 36,
    height: 36,
    borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});
