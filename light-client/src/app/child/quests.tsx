import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { BORDER, C, R, S, font, shadow } from '@/constants/theme';
import { computeQuests } from '@/lib/derive';
import { saveLog } from '@/lib/log-action';
import { BADGES } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { childPlan, dateKey, friendlyTime, planToday, type PlanItem } from '@/lib/tasks';
import { useNow } from '@/lib/time';
import type { TaskKind } from '@/lib/types';

type Look = { image: ImageSourcePropType | null; icon: IconName; color: string; tint: string };

const CHECK_IMG = require('@/assets/icons/check-up.png');
const EAT_IMG = require('@/assets/icons/eat.png');
const PLAY_IMG = require('@/assets/icons/play.png');
const MEDICINE_IMG = require('@/assets/icons/medicine.png');

/** Daily habit quests: the picture, and which Care tab a tap on the arrow opens. */
const QUEST_LOOK: Record<string, Look & { mode: string }> = {
  checks: { image: CHECK_IMG, icon: 'heart-pulse', color: '#E0518D', tint: C.pinkSoft, mode: 'checkup' },
  lunch: { image: EAT_IMG, icon: 'food-apple', color: '#D97706', tint: C.sunSoft, mode: 'eat' },
  play: { image: PLAY_IMG, icon: 'soccer', color: '#1F9D74', tint: C.mintSoft, mode: 'play' },
};

const KIND_LOOK: Record<TaskKind, Look> = {
  check: { image: CHECK_IMG, icon: 'heart-pulse', color: '#E0518D', tint: C.pinkSoft },
  medicine: { image: MEDICINE_IMG, icon: 'water-plus', color: '#2F80ED', tint: C.skySoft },
  meal: { image: EAT_IMG, icon: 'silverware-fork-knife', color: '#D97706', tint: C.sunSoft },
  activity: { image: PLAY_IMG, icon: 'soccer', color: '#1F9D74', tint: C.mintSoft },
  custom: { image: null, icon: 'star-four-points', color: C.primary, tint: C.primarySoft },
};

/** A rounded square holding a quest's picture. */
function QuestTile({ look, done }: { look: Look; done: boolean }) {
  if (done) return <IconTile name="check-bold" color="#fff" tint={C.mint} size={64} radius={R.lg} />;
  return (
    <View style={[styles.tile, { backgroundColor: look.tint }]}>
      {look.image ? <Image source={look.image} style={styles.tileImage} resizeMode="contain" /> : <Icon name={look.icon} size={34} color={look.color} />}
    </View>
  );
}

/** Progress as an amber blob on a light track, with the count in the middle. There is always a little blob showing. */
function QuestBar({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.blob, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
      <Text style={styles.trackText}>{label}</Text>
    </View>
  );
}

/** The arrow (or check) block button at the right of a quest card. */
function BlockArrow({ done, onPress }: { done: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={done}
      accessibilityRole="button"
      accessibilityLabel={done ? 'Done' : 'Go do this quest'}
      style={({ pressed }) => [styles.arrow, done && styles.arrowDone, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
      <Icon name={done ? 'check-bold' : 'arrow-right'} size={28} color={C.ink} />
    </Pressable>
  );
}

/** A section title with something small on the right (a countdown or a count). */
function SectionHeader({ title, right, icon }: { title: string; right?: string; icon?: IconName }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: S.sm }}>
      <H2 style={styles.sectionTitle}>{title}</H2>
      {right ? (
        <Row style={{ gap: 4 }}>
          {icon ? <Icon name={icon} size={20} color={C.ink} /> : null}
          <Text style={styles.sectionRight}>{right}</Text>
        </Row>
      ) : null}
    </Row>
  );
}

/** Time left in today's quests, like "6 hrs 53 min". */
function timeLeftToday(now: number): string {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((end.getTime() - now) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} hr${h === 1 ? '' : 's'} ${mins % 60} min` : `${mins} min`;
}

function Stars({ value }: { value: number }) {
  return (
    <Row style={{ gap: 1 }}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name={n <= value ? 'star' : 'star-outline'} size={15} color={n <= value ? '#F5A524' : C.line} />
      ))}
    </Row>
  );
}

/** One daily quest on the timeline: a circle on the left (filled when done), joined to the next by a dashed line. */
function DailyQuestRow({ q, last }: { q: { id: string; title: string; target: number; progress: number; done: boolean }; last: boolean }) {
  const [height, setHeight] = useState(0);
  const look = QUEST_LOOK[q.id];
  return (
    <View style={styles.timelineRow} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.rail}>
        <View style={[styles.node, q.done && styles.nodeDone]}>{q.done ? <Icon name="check-bold" size={16} color={C.ink} /> : null}</View>
        {!last && height > 0 ? (
          // from just under this circle to just above the next one
          <Svg style={styles.dash} width={4} height={Math.max(0, height - 30)}>
            <Line x1={2} y1={0} x2={2} y2={Math.max(0, height - 30)} stroke={C.ink} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />
          </Svg>
        ) : null}
      </View>
      <View style={styles.questCard}>
        <QuestTile look={look} done={q.done} />
        <View style={{ flex: 1, gap: 8 }}>
          <Body style={font('900')}>{q.title}</Body>
          <QuestBar value={q.progress / q.target} label={`${q.progress} / ${q.target}`} />
        </View>
        <BlockArrow done={q.done} onPress={() => router.navigate({ pathname: '/child/log', params: { mode: look.mode } })} />
      </View>
    </View>
  );
}

/** One of the doctor's tasks, as a quest. Kid wording only: no doses, no clock times, and never "missed". */
function BigQuest({ item, now }: { item: PlanItem; now: number }) {
  const [busy, setBusy] = useState(false);
  const look = KIND_LOOK[item.task.kind];
  const done = item.status === 'done';

  async function markDone() {
    setBusy(true);
    await saveLog('task', { task_id: item.task.id, date: dateKey(now) });
    setBusy(false);
  }

  return (
    <View style={[styles.special, done && styles.specialDone]}>
      <QuestTile look={look} done={done} />
      <View style={{ flex: 1, gap: 4 }}>
        <Body style={font('900')}>{item.task.quest_title}</Body>
        <Small color={C.ink}>{done ? 'Done! Dotty is proud of you' : friendlyTime(item.task.time)}</Small>
        <Row style={{ gap: 4 }}>
          <Icon name="circle-slice-8" size={14} color="#D69E2E" />
          <Small color="#B7791F">{item.task.reward_dots} Dots</Small>
        </Row>
      </View>
      {!done && item.task.kind === 'custom' ? <Button title="Done!" variant="mint" onPress={markDone} loading={busy} /> : null}
    </View>
  );
}

export default function Quests() {
  const now = useNow();
  const pet = useStore((s) => s.pet);
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);

  const plan = childPlan(planToday(tasks, events, now).items);
  const habits = computeQuests(events, now, tasks.some((t) => t.kind === 'check'));
  const habitsDone = habits.filter((q) => q.done).length;

  return (
    <Screen background={C.pageQuests}>
      <PageHeader title="Quests" />

      <Card style={styles.hero}>
        <Row style={{ gap: S.md }}>
          <IconTile name="fire" color="#fff" tint="#F76707" size={56} radius={R.lg} />
          <View style={{ flex: 1 }}>
            <H2>{pet?.streak_days ?? 0} day streak</H2>
            <Small color={C.ink}>3 check-ups a day keeps your streak going. 3, 7 and 30 days earn big bonuses!</Small>
          </View>
        </Row>
        <Button title="Check on Dotty" icon="heart-pulse" onPress={() => router.navigate({ pathname: '/child/log', params: { mode: 'checkup' } })} />
      </Card>

      <SectionHeader title="Daily Quests" icon="refresh" right={timeLeftToday(now)} />
      <View>
        {habits.map((q, i) => (
          <DailyQuestRow key={q.id} q={q} last={i === habits.length - 1} />
        ))}
      </View>
      <Small color={C.ink} style={{ textAlign: 'right' }}>
        {habitsDone} of {habits.length} done today
      </Small>

      {plan.total > 0 ? (
        <>
          <SectionHeader title="Big Quests" right={`${plan.done}/${plan.total} done`} />
          {plan.visible.map((item) => (
            <BigQuest key={item.task.id} item={item} now={now} />
          ))}
          {plan.done === plan.total ? (
            <Card tint={C.mintSoft}>
              <Row>
                <Icon name="party-popper" size={22} color={C.mint} />
                <Body color={C.ink} style={{ flex: 1 }}>
                  All big quests done today — Dotty is so proud of you!
                </Body>
              </Row>
            </Card>
          ) : null}
        </>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Level {pet?.level ?? 1}</H2>
          <Icon name="star-circle" size={26} color={C.primary} />
        </Row>
        <ProgressBar value={pet ? pet.level_progress / pet.dots_per_level : 0} color={C.primary} />
        <Small>
          {pet ? `${pet.dots_per_level - pet.level_progress} more Dots to level ${pet.level + 1}` : 'Log something to start leveling up'}
        </Small>
      </Card>

      <SectionHeader title="Badges" />
      <View style={styles.badges}>
        {Object.entries(BADGES).map(([id, b]) => {
          const earned = pet?.badges.includes(id);
          return (
            <View key={id} style={[styles.badge, earned ? { borderColor: b.color, backgroundColor: b.tint } : null]}>
              <View style={styles.badgeArt}>
                <Image source={b.image} style={[styles.badgeImage, !earned && { opacity: 0.3 }]} resizeMode="contain" />
                {!earned && (
                  <View style={styles.lock}>
                    <Icon name="lock-outline" size={18} color={C.inkSoft} />
                  </View>
                )}
              </View>
              <Text style={styles.badgeName}>{b.name}</Text>
              <Text style={styles.badgeHow}>{earned ? 'Earned!' : b.how}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: R.lg, gap: S.md },
  sectionTitle: { fontSize: 24, color: C.ink },
  sectionRight: { ...font('800'), fontSize: 16, color: C.ink },
  tile: { width: 64, height: 64, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },
  tileImage: { width: 48, height: 48 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: S.sm, marginBottom: S.sm },
  rail: { width: 30, alignItems: 'center', paddingTop: 34 },
  node: { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: C.card, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: C.mint, borderColor: C.mint },
  // drawn from just under this quest's circle to just above the next one, without adding to the row's height
  dash: { position: 'absolute', top: 68, left: 13 },
  questCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: BORDER,
    borderColor: C.glassLine,
    padding: S.md,
    ...shadow,
  },
  track: { height: 32, borderRadius: R.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, justifyContent: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', left: 0, top: 0, bottom: 0, minWidth: 36, borderRadius: R.pill, backgroundColor: C.sun },
  trackText: { ...font('800'), fontSize: 16, color: C.inkSoft, textAlign: 'center' },
  arrow: { width: 56, height: 56, borderRadius: R.md, backgroundColor: C.bg, borderBottomWidth: 4, borderBottomColor: C.line, alignItems: 'center', justifyContent: 'center' },
  arrowDone: { backgroundColor: C.mint, borderBottomColor: C.mintEdge },
  special: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.mintSoft, borderRadius: R.lg, borderWidth: BORDER, borderColor: C.glassLine, padding: S.md },
  specialDone: { backgroundColor: C.card },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.line,
    gap: 4,
  },
  badgeArt: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  badgeImage: { width: 72, height: 72 },
  lock: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  badgeName: { ...font('800'), fontSize: 15, color: C.ink, marginTop: 4 },
  badgeHow: { ...font('600'), fontSize: 12, color: C.inkSoft, textAlign: 'center' },
});
