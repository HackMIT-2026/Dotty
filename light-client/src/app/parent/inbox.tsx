import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, H1, Row, Screen, Small } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { api } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';

const KIND: Record<AppNotification['kind'], { emoji: string; tint: string }> = {
  clinician_note: { emoji: '🩺', tint: C.primarySoft },
  missed_treatment: { emoji: '⏰', tint: C.sunSoft },
  out_of_range: { emoji: '🩸', tint: C.dangerSoft },
  reward: { emoji: '⭐', tint: C.mintSoft },
  high_five: { emoji: '🙌', tint: C.mintSoft },
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
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Inbox</H1>
        {unread > 0 && <Button title="Mark all read" variant="ghost" onPress={readAll} />}
      </Row>
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
                <View style={[styles.icon, { backgroundColor: k.tint }]}>
                  <Text style={{ fontSize: 20 }}>{k.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Body style={{ fontWeight: n.read_at ? '600' : '800', flex: 1 }}>{n.title}</Body>
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
  icon: { width: 40, height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: S.sm },
});
