import { Pressable, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';
import { ParentIcon, type ParentIconName } from '@/components/parent-icon';

const KIND: Record<AppNotification['kind'], { sticker: ParentIconName; color: string; tint: string }> = {
  clinician_note: { sticker: 'doctor' as ParentIconName, color: C.primary, tint: C.primarySoft },
  missed_treatment: { sticker: 'clock-alert' as ParentIconName, color: '#B7791F', tint: C.sunSoft },
  care_summary: { sticker: 'clipboard' as ParentIconName, color: C.primary, tint: C.primarySoft },
  out_of_range: { sticker: 'drop-alert' as ParentIconName, color: C.danger, tint: C.dangerSoft },
  reward: { sticker: 'star' as ParentIconName, color: C.mint, tint: C.mintSoft },
  high_five: { sticker: 'clap' as ParentIconName, color: C.mint, tint: C.mintSoft },
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
    <Screen background={C.pageInbox} refreshing={syncing} onRefresh={() => void syncNow()}>
      <PageHeader title="Inbox" />
      {unread > 0 && (
        <Row style={{ justifyContent: 'space-between' }}>
          <Small color={C.ink}>{unread} unread</Small>
          <Button title="Mark all read" leading={<ParentIcon name="check-all" size={26} />} variant="ghost" onPress={readAll} />
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
                <ParentIcon name={k.sticker} size={46} />
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
