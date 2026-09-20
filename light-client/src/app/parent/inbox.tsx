import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Field, Row, Screen, Small } from '@/components/ui';
import { C, S, font } from '@/constants/theme';
import { api } from '@/lib/api';
import { unreadCount, useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { AppNotification } from '@/lib/types';

const KIND: Record<AppNotification['kind'], { icon: IconName; color: string; tint: string }> = {
  clinician_note: { icon: 'doctor', color: C.primary, tint: C.primarySoft },
  parent_note: { icon: 'message-text-outline', color: C.mint, tint: C.mintSoft },
  missed_treatment: { icon: 'clock-alert-outline', color: '#B7791F', tint: C.sunSoft },
  care_summary: { icon: 'clipboard-check-outline', color: C.primary, tint: C.primarySoft },
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
    <Screen refreshing={syncing} onRefresh={() => void syncNow()}>
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
