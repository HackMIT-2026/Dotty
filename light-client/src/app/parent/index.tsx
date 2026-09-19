import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlucoseChart } from '@/components/glucose-chart';
import { QuickLog } from '@/components/quick-log';
import { SyncBadge } from '@/components/sync-badge';
import { Body, Button, Card, Chip, H1, H2, Row, Screen, Small } from '@/components/ui';
import { C, FONT, R, S } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { bgOf, eventEmoji, eventTitle, lastReading, ofType, timeInRange, todaysEvents, trend } from '@/lib/derive';
import { useStore } from '@/lib/store';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { Pet } from '@/lib/types';

const TREND = { up: '↗', down: '↘', flat: '→' } as const;

function bgColor(bg: number, low: number, high: number) {
  if (bg < low) return C.danger;
  if (bg > high) return C.warn;
  return C.good;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Small>{label}</Small>
      {sub ? <Small style={{ fontSize: 11 }}>{sub}</Small> : null}
    </View>
  );
}

export default function ParentHome() {
  const now = useNow();
  const events = useStore((s) => s.events);
  const plan = useStore((s) => s.plan);
  const patient = useStore((s) => s.patient);
  const family = useStore((s) => s.session?.family);
  const notifications = useStore((s) => s.notifications);
  const syncing = useStore((s) => s.syncing);
  const pushToast = useStore((s) => s.pushToast);
  const [hours, setHours] = useState(24);
  const [highFiving, setHighFiving] = useState(false);

  const childName = patient?.name ?? family?.child?.name;
  const low = plan?.target.low ?? 70;
  const high = plan?.target.high ?? 180;
  const readings = ofType(events, 'reading');
  const last = lastReading(events);
  const dir = trend(readings);
  const today = todaysEvents(events, now);
  const since14 = readings.filter((r) => now - new Date(r.ts).getTime() <= 14 * 86_400_000);
  const tir = timeInRange(since14, low, high);
  const carbs = today.filter((e) => e.type === 'meal').reduce((s, e) => s + (e.data.carbs_g ?? 0), 0);
  const insulin = today.filter((e) => e.type === 'bolus').reduce((s, e) => s + (e.data.units ?? 0), 0);
  const active = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const checks = today.filter((e) => e.type === 'reading').length;
  const latestNote = notifications.find((n) => n.kind === 'clinician_note');
  const recent = [...events].reverse().filter((e) => e.type !== 'pet').slice(0, 8);
  const markers = events.filter((e) => e.type === 'meal' || e.type === 'activity' || (e.type === 'bolus' && e.data.units != null));

  if (!family?.child) {
    return (
      <Screen>
        <H1>Welcome!</H1>
        <Card>
          <H2>Add your child</H2>
          <Body>
            On your child's phone, choose "Create an account", then "I'm a kid", and enter this family code:
          </Body>
          <Text style={styles.code}>{family?.code ?? '...'}</Text>
          <Small>Your care team uses the same code in the clinician portal.</Small>
          <Button title="I've done it, refresh" variant="secondary" onPress={() => void refreshFamily()} />
        </Card>
      </Screen>
    );
  }

  async function highFive() {
    if (!patient) return;
    setHighFiving(true);
    try {
      await api<Pet>(`/pet/${patient.id}/high-five`, { method: 'POST' });
      pushToast({ kind: 'info', text: `High five sent to ${childName}!`, sub: '+5 Dots for Dotty' });
    } catch (e) {
      pushToast({ kind: 'alert', text: 'High five not sent', sub: errorText(e) });
    } finally {
      setHighFiving(false);
    }
  }

  return (
    <Screen refreshing={syncing} onRefresh={() => void syncNow()}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>{childName}'s day</H1>
        <Row>
          <SyncBadge />
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        </Row>
      </Row>

      <Card>
        {last ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Small>Last glucose · {timeAgo(last.ts, now)}</Small>
              <Row style={{ alignItems: 'baseline' }}>
                <Text style={[styles.big, { color: bgColor(bgOf(last), low, high) }]}>{bgOf(last)}</Text>
                <Body color={C.inkSoft}>mg/dL {dir ? TREND[dir] : ''}</Body>
              </Row>
              {last.source === 'simulator' ? <Small>from the demo simulator</Small> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Small>Target</Small>
              <Body>
                {low}–{high}
              </Body>
            </View>
          </Row>
        ) : (
          <Body color={C.inkSoft}>No glucose logged yet.</Body>
        )}
        <Row>
          <Chip label="24 hours" selected={hours === 24} onPress={() => setHours(24)} />
          <Chip label="14 days" selected={hours === 336} onPress={() => setHours(336)} />
        </Row>
        <GlucoseChart readings={readings} hours={hours} now={now} low={low} high={high} markers={hours === 24 ? markers : []} />
      </Card>

      <View style={styles.stats}>
        <Stat label="In range" value={tir == null ? '–' : `${tir}%`} sub="14 days" />
        <Stat label="Check-ups" value={String(checks)} sub="today" />
        <Stat label="Carbs" value={`${carbs} g`} sub="today" />
        <Stat label="Insulin" value={`${Math.round(insulin * 10) / 10} u`} sub="today" />
        <Stat label="Active" value={`${active} min`} sub="today" />
      </View>

      <Row>
        <Button title="Dose helper" emoji="🧮" style={{ flex: 1 }} onPress={() => router.navigate('/parent/dose')} />
        <Button title="High five" emoji="🙌" variant="sun" style={{ flex: 1 }} onPress={highFive} loading={highFiving} />
      </Row>

      {latestNote ? (
        <Pressable onPress={() => router.navigate('/parent/inbox')}>
          <Card tint={C.primarySoft}>
            <Small color={C.primaryDark}>🩺 {latestNote.title} · {timeAgo(latestNote.created_at, now)}</Small>
            <Body numberOfLines={3}>{latestNote.body}</Body>
          </Card>
        </Pressable>
      ) : null}

      <Card>
        <H2>Log for {childName}</H2>
        <QuickLog />
      </Card>

      <Card>
        <H2>Recent</H2>
        {recent.length === 0 ? <Small>Nothing logged yet.</Small> : null}
        {recent.map((e) => (
          <Row key={e.client_id} style={styles.recent}>
            <Text style={{ fontSize: 20 }}>{eventEmoji(e)}</Text>
            <Body style={{ flex: 1 }}>{eventTitle(e)}</Body>
            <Small>{e.id ? '' : '☁️ '}{timeAgo(e.ts, now)}</Small>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

async function refreshFamily() {
  try {
    const me = await api<{ family: any }>('/me');
    useStore.getState().setFamily(me.family);
    await syncNow();
  } catch {}
}

const styles = StyleSheet.create({
  big: { fontFamily: FONT, fontSize: 52, fontWeight: '800', lineHeight: 58 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: { flexBasis: '30%', flexGrow: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  statValue: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: C.ink },
  recent: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  code: { fontFamily: FONT, fontSize: 40, fontWeight: '800', color: C.primary, letterSpacing: 6, textAlign: 'center', marginVertical: S.sm },
});
