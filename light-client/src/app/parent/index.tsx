import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DotCoin } from '@/components/icon';
import { GlucoseChart } from '@/components/glucose-chart';
import { Dotty } from '@/components/pet/dotty';
import { QuickLog } from '@/components/quick-log';
import { GlucoseUnitToggle } from '@/components/unit-toggle';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Chip, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { bgOf, dottyState, eventTitle, insulinToday, lastReading, ofType, timeInRange, todaysEvents, trend } from '@/lib/derive';
import { DEFAULT_EQUIPPED } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { planToday } from '@/lib/tasks';
import { syncNow } from '@/lib/sync';
import { timeAgo, useNow } from '@/lib/time';
import type { DotEvent, Pet } from '@/lib/types';
import { fmtBg, useGlucoseUnit } from '@/lib/units';
import { ParentIcon, type ParentIconName } from '@/components/parent-icon';

const TREND = { up: 'trend-up', down: 'trend-down', flat: 'trend-flat' } as const;

/** A sticker for each kind of log in the Recent list. */
const EVENT_STICKER: Record<DotEvent['type'], ParentIconName> = {
  reading: 'glucose',
  meal: 'meal',
  activity: 'activity',
  bolus: 'medicine',
  basal: 'medicine',
  pet: 'dotty',
  task: 'star',
};

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
  const pet = useStore((s) => s.pet);
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
  const { message } = dottyState(events, now, carePlan.items.some((i) => i.status === 'missed'));
  const latestNote = notifications.find((n) => n.kind === 'clinician_note');
  const recent = [...events].reverse().filter((e) => e.type !== 'pet').slice(0, 8);
  const markers = events.filter(
    (e) => e.type === 'meal' || e.type === 'activity' || ((e.type === 'bolus' || e.type === 'basal') && e.data.units != null),
  );

  if (!family?.child) {
    return (
      <Screen background={C.pageShop}>
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
    <Screen background={C.pageShop} refreshing={syncing} onRefresh={() => void syncNow()}>
      <PageHeader title={`${childName}'s day`} />

      <Card>
        <Row style={{ gap: S.md }}>
          <View style={{ marginVertical: -10, marginLeft: -6 }}>
            <Dotty equipped={pet?.equipped ?? DEFAULT_EQUIPPED} mood="bouncy" size={112} bounce="gentle" muteCheer />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <H2>
              {pet?.name ?? 'Dotty'} · Level {pet?.level ?? 1}
            </H2>
            <Small color={C.ink}>“{message}”</Small>
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <View style={styles.chip}>
                <DotCoin size={18} />
                <Text style={styles.chipText}>{pet?.dots ?? 0}</Text>
              </View>
              <View style={styles.chip}>
                <ParentIcon name="fire" size={20} />
                <Text style={styles.chipText}>{pet?.streak_days ?? 0} day streak</Text>
              </View>
            </Row>
          </View>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small>Glucose units</Small>
          <GlucoseUnitToggle />
        </Row>
        {last ? (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ flexShrink: 1 }}>
              <Small>Last glucose · {timeAgo(last.ts, now)}</Small>
              <Row style={{ alignItems: 'baseline' }}>
                <Text style={[styles.big, { color: bgColor(bgOf(last), low, high) }]}>{fmtBg(bgOf(last), unit, false)}</Text>
                <Body color={C.inkSoft}>{unit}</Body>
                {dir ? <ParentIcon name={TREND[dir]} size={28} /> : null}
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
                <ParentIcon name="clipboard" size={26} />
                <Small color={C.primaryDark}>Care plan today</Small>
              </Row>
              <Row style={{ gap: 2 }}>
                <Small color={carePlan.items.some((i) => i.status === 'missed') ? C.danger : C.primaryDark}>
                  {carePlan.done}/{carePlan.total} done
                </Small>
                <ParentIcon name="chevron" size={20} />
              </Row>
            </Row>
            <ProgressBar value={carePlan.total ? carePlan.done / carePlan.total : 0} color={carePlan.done === carePlan.total ? C.mint : C.primary} />
          </Card>
        </Pressable>
      ) : null}

      <Button title={`Send ${childName} a high five`} leading={<ParentIcon name="clap" size={30} />} variant="sun" onPress={highFive} loading={highFiving} />

      {latestNote ? (
        <Pressable onPress={() => router.navigate('/parent/inbox')}>
          <Card tint={C.primarySoft}>
            <Row style={{ gap: 6 }}>
              <ParentIcon name="doctor" size={26} />
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
            <ParentIcon name={EVENT_STICKER[e.type]} size={36} />
            <Body style={{ flex: 1 }}>{eventTitle(e, unit)}</Body>
            {e.id ? null : <ParentIcon name="cloud-upload" size={20} />}
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.sunSoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...font('800'), fontSize: 13, color: C.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: { flexBasis: '30%', flexGrow: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.sm, alignItems: 'center' },
  statValue: { ...font('800'), fontSize: 20, color: C.ink },
  recent: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
  code: { ...font('800'), fontSize: 40, color: C.primary, letterSpacing: 6, textAlign: 'center', marginVertical: S.sm },
});
