import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlucoseChart } from '@/components/glucose-chart';
import { Icon, IconTile } from '@/components/icon';
import { QuickLog } from '@/components/quick-log';
import { GlucoseUnitToggle } from '@/components/unit-toggle';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Chip, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { EVENT_ICON, bgOf, eventTitle, insulinToday, lastReading, ofType, timeInRange, todaysEvents, trend } from '@/lib/derive';
import { useStore } from '@/lib/store';
import { planToday } from '@/lib/tasks';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { Pet } from '@/lib/types';
import { fmtBg, useGlucoseUnit } from '@/lib/units';

const TREND = { up: 'trending-up', down: 'trending-down', flat: 'trending-neutral' } as const;

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
  const unit = useGlucoseUnit();
  const tasks = useStore((s) => s.tasks);
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
  const insulin = insulinToday(events, now);
  const active = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const checks = today.filter((e) => e.type === 'reading').length;
  const carePlan = planToday(tasks, events, now);
  const latestNote = notifications.find((n) => n.kind === 'clinician_note');
  const recent = [...events].reverse().filter((e) => e.type !== 'pet').slice(0, 8);
  const markers = events.filter(
    (e) => e.type === 'meal' || e.type === 'activity' || ((e.type === 'bolus' || e.type === 'basal') && e.data.units != null),
  );

  if (!family?.child) {
    return (
      <Screen>
        <PageHeader title="Welcome!" />
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
      <PageHeader title={`${childName}'s day`} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small>Glucose units</Small>
          <GlucoseUnitToggle />
        </Row>
        {last ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Small>Last glucose · {timeAgo(last.ts, now)}</Small>
              <Row style={{ alignItems: 'baseline' }}>
                <Text style={[styles.big, { color: bgColor(bgOf(last), low, high) }]}>{fmtBg(bgOf(last), unit, false)}</Text>
                <Body color={C.inkSoft}>{unit}</Body>
                {dir ? <Icon name={TREND[dir]} size={24} color={C.inkSoft} /> : null}
              </Row>
              {last.source === 'simulator' ? <Small>from the demo simulator</Small> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Small>Target</Small>
              <Body>
                {fmtBg(low, unit, false)}–{fmtBg(high, unit, false)}
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
        <GlucoseChart readings={readings} hours={hours} now={now} low={low} high={high} markers={hours === 24 ? markers : []} unit={unit} />
      </Card>

      <View style={styles.stats}>
        <Stat label="In range" value={tir == null ? '–' : `${tir}%`} sub="14 days" />
        <Stat label="Check-ups" value={String(checks)} sub="today" />
        <Stat label="Carbs" value={`${carbs} g`} sub="today" />
        <Stat label="Insulin" value={`${insulin.tdd} u`} sub={`${insulin.rapid} rapid · ${insulin.basal} long-acting`} />
        <Stat label="Active" value={`${active} min`} sub="today" />
      </View>

      {carePlan.total > 0 ? (
        <Pressable onPress={() => router.navigate('/parent/care-plan')}>
          <Card tint={carePlan.done === carePlan.total ? C.mintSoft : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 6 }}>
                <Icon name="clipboard-check-outline" size={18} color={C.primaryDark} />
                <Small color={C.primaryDark}>Care plan today</Small>
              </Row>
              <Row style={{ gap: 2 }}>
                <Small color={carePlan.items.some((i) => i.status === 'missed') ? C.danger : C.primaryDark}>
                  {carePlan.done}/{carePlan.total} done
                </Small>
                <Icon name="chevron-right" size={18} color={C.primaryDark} />
              </Row>
            </Row>
            <ProgressBar value={carePlan.total ? carePlan.done / carePlan.total : 0} color={carePlan.done === carePlan.total ? C.mint : C.primary} />
          </Card>
        </Pressable>
      ) : null}

      <Button title={`Send ${childName} a high five`} icon="hand-clap" variant="sun" onPress={highFive} loading={highFiving} />

      {latestNote ? (
        <Pressable onPress={() => router.navigate('/parent/inbox')}>
          <Card tint={C.primarySoft}>
            <Row style={{ gap: 6 }}>
              <Icon name="doctor" size={18} color={C.primaryDark} />
              <Small color={C.primaryDark}>
                {latestNote.title} · {timeAgo(latestNote.created_at, now)}
              </Small>
            </Row>
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
            <IconTile name={EVENT_ICON[e.type].icon} color={EVENT_ICON[e.type].color} tint={EVENT_ICON[e.type].tint} size={34} radius={R.sm} />
            <Body style={{ flex: 1 }}>{eventTitle(e, unit)}</Body>
            {e.id ? null : <Icon name="cloud-upload" size={15} color={C.inkSoft} />}
            <Small>{timeAgo(e.ts, now)}</Small>
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
  big: { ...font('900'), fontSize: 52, lineHeight: 58 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: { flexBasis: '30%', flexGrow: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  statValue: { ...font('800'), fontSize: 20, color: C.ink },
  recent: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  code: { ...font('800'), fontSize: 40, color: C.primary, letterSpacing: 6, textAlign: 'center', marginVertical: S.sm },
});
