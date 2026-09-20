import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Icon, IconTile } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Field, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';
import { ParentIcon, type ParentIconName } from '@/components/parent-icon';

const KIND: Record<AppNotification['kind'], { sticker: ParentIconName }> = {
  clinician_note: { sticker: 'doctor' },
  parent_note: { sticker: 'info' },
  missed_treatment: { sticker: 'clock-alert' },
  care_summary: { sticker: 'clipboard' },
  out_of_range: { sticker: 'drop-alert' },
  reward: { sticker: 'star' },
  high_five: { sticker: 'clap' },
  food_help: { sticker: 'meal' },
  data_check: { sticker: 'alert' },
  help_answered: { sticker: 'check' },
};

/**
 * The carbs for a meal your child logged. The estimate (Claude, or the food table) is a starting point — what
 * you type here is what the dose helper and the care team see from then on.
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
      <Button title="Save carbs" leading={<ParentIcon name="check" size={24} />} onPress={save} disabled={!valid} loading={busy} />
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
  const patient = useStore((s) => s.patient);
  const clinician = useStore((s) => s.session?.family?.clinician?.name);
  const [composeOpen, setComposeOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const doctorName = clinician?.trim() || 'your doctor';
  const doctorLastName = doctorName.split(/\s+/).at(-1) ?? doctorName;

  function open(n: AppNotification) {
    if (n.read_at) return;
    markRead(n.id);
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
  }

  function readAll() {
    markAllRead();
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  async function sendNote() {
    const text = message.trim();
    if (!text || !patient) return;
    setSending(true);
    setSendError(null);
    try {
      await api(`/patients/${patient.id}/notes/from-parent`, { method: 'POST', body: { text } });
      setMessage('');
      setComposeOpen(false);
      await syncNow();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send the note.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen background={C.pageInbox} refreshing={syncing} onRefresh={() => void syncNow()}>
      <PageHeader title="Inbox" />
      <Button
        title={`Message Dr. ${doctorLastName}`}
        icon="message-text-outline"
        onPress={() => {
          setSendError(null);
          setComposeOpen(true);
        }}
        style={styles.messageButton}
      />
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
                  {n.kind === 'food_help' && n.data.event_id ? <SetCarbs n={n} /> : null}
                </View>
              </Row>
            </Card>
          </Pressable>
        );
      })}
      <Modal visible={composeOpen} transparent animationType="fade" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Pressable accessibilityLabel="Close message" onPress={() => setComposeOpen(false)} style={styles.closeButton}>
              <Icon name="close" size={22} color={C.inkSoft} />
            </Pressable>
            <Body style={styles.modalTitle}>Message Dr. {doctorLastName}</Body>
            <Field
              label="Message"
              multiline
              numberOfLines={5}
              autoFocus
              value={message}
              onChangeText={setMessage}
              placeholder="Share an update or question about your child's care."
              style={styles.messageField}
            />
            {sendError ? <Small color={C.danger}>{sendError}</Small> : null}
            <Button title="Send" icon="send" onPress={() => void sendNote()} disabled={!message.trim() || !patient} loading={sending} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageButton: { width: '100%', minHeight: 46 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: S.md, backgroundColor: 'rgba(43, 42, 51, 0.38)' },
  modalCard: { position: 'relative', paddingTop: S.lg },
  closeButton: { position: 'absolute', top: S.sm, right: S.sm, padding: S.xs, zIndex: 1 },
  modalTitle: { ...font('900'), fontSize: 22, color: C.ink, paddingRight: S.xl },
  messageField: { minHeight: 120, textAlignVertical: 'top' },
  unread: { borderWidth: 2, borderColor: C.primarySoft },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginLeft: S.sm },
});
