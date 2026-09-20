import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Field, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';

const KIND: Record<AppNotification['kind'], { icon: IconName; color: string; tint: string }> = {
  clinician_note: { icon: 'doctor', color: C.primary, tint: C.primarySoft },
  missed_treatment: { icon: 'clock-alert-outline', color: '#B7791F', tint: C.sunSoft },
  care_summary: { icon: 'clipboard-check-outline', color: C.primary, tint: C.primarySoft },
  out_of_range: { icon: 'water-alert', color: C.danger, tint: C.dangerSoft },
  reward: { icon: 'star-four-points', color: C.mint, tint: C.mintSoft },
  high_five: { icon: 'hand-clap', color: C.mint, tint: C.mintSoft },
  food_help: { icon: 'silverware-fork-knife', color: '#D97706', tint: C.sunSoft },
  data_check: { icon: 'shield-alert-outline', color: '#B7791F', tint: C.sunSoft },
  help_answered: { icon: 'hand-heart', color: C.mint, tint: C.mintSoft },
};

/**
 * The carbs for a meal the child logged. The estimate (Claude, or the food table) is a starting point — what
 * the parent types here is what the dose helper and the doctor see from then on.
 */
function SetCarbs({ n }: { n: AppNotification }) {
  const [value, setValue] = useState(n.data.carbs_g != null ? String(Math.round(n.data.carbs_g)) : '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const pushToast = useStore((s) => s.pushToast);
  const markRead = useStore((s) => s.markRead);
  const grams = Number(value.replace(',', '.'));
  const valid = value !== '' && !Number.isNaN(grams) && grams >= 0 && grams <= 300;

  async function save() {
    setBusy(true);
    try {
      await api(`/meals/${n.data.event_id}/carbs`, { method: 'POST', body: { carbs_g: Math.round(grams) } });
      setDone(true);
      markRead(n.id);
      void syncNow();
      pushToast({ kind: 'info', text: 'Carbs saved', sub: `${Math.round(grams)} g — the dose helper uses this now.` });
    } catch (e) {
      pushToast({ kind: 'alert', text: 'Not saved', sub: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Small color={C.mint}>Saved. {n.data.items || 'The meal'} is counted.</Small>;
  return (
    <View style={{ gap: S.sm, marginTop: S.sm }}>
      <Field label="Grams of carbs" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0" />
      <Button title="Save carbs" icon="check-bold" onPress={save} disabled={!valid} loading={busy} />
    </View>
  );
}

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
                  {n.kind === 'food_help' && n.data.event_id ? <SetCarbs n={n} /> : null}
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
