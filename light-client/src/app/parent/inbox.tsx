import { Pressable, StyleSheet, View } from 'react-native';

import { IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';

const KIND: Record<AppNotification['kind'], { icon: IconName; color: string; tint: string }> = {
  clinician_note: { icon: 'doctor', color: C.primary, tint: C.primarySoft },
  missed_treatment: { icon: 'clock-alert-outline', color: '#B7791F', tint: C.sunSoft },
  out_of_range: { icon: 'water-alert', color: C.danger, tint: C.dangerSoft },
  reward: { icon: 'star-four-points', color: C.mint, tint: C.mintSoft },
  high_five: { icon: 'hand-clap', color: C.mint, tint: C.mintSoft },
};

export default function Inbox() {
  const now = useNow();
  const notifications = useStore((s) => s.notifications);
  const unread = useStore(unreadCount);
  const markRead = useStore((s) => s.markRead);
  const markAllRead = useStore((s) => s.markAllRead);
  const syncing = useStore((s) => s.syncing);

  function open(n: AppNotification) {
    if (n.read_at) return;
    markRead(n.id);
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
  }

  function readAll() {
    markAllRead();
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  return (
    <Screen refreshing={syncing} onRefresh={() => void syncNow()}>
      <PageHeader title="Inbox" />
      {unread > 0 && (
        <Row style={{ justifyContent: 'space-between' }}>
          <Small>{unread} unread</Small>
          <Button title="Mark all read" icon="check-all" variant="ghost" onPress={readAll} />
        </Row>
      )}
      {notifications.length === 0 ? (
        <Card>
          <Body color={C.inkSoft}>No notifications yet. Notes from your care team and alerts show up here.</Body>
        </Card>
      ) : null}
      {notifications.map((n) => {
        const k = KIND[n.kind] ?? KIND.reward;
        return (
          <Pressable key={n.id} onPress={() => open(n)}>
            <Card style={!n.read_at ? styles.unread : undefined}>
              <Row style={{ alignItems: 'flex-start' }}>
                <IconTile name={k.icon} color={k.color} tint={k.tint} size={42} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Body style={[font(n.read_at ? '700' : '900'), { flex: 1 }]}>{n.title}</Body>
                    {!n.read_at && <View style={styles.dot} />}
                  </Row>
                  <Body color={C.inkSoft} style={{ fontSize: 15 }}>
                    {n.body}
                  </Body>
                  <Small>{timeAgo(n.created_at, now)}</Small>
                </View>
              </Row>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unread: { borderWidth: 2, borderColor: C.primarySoft },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: S.sm },
});
