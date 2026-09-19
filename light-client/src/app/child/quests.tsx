import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { computeQuests } from '@/lib/derive';
import { saveLog } from '@/lib/log-action';
import { BADGES } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { childPlan, dateKey, friendlyTime, planToday, type PlanItem } from '@/lib/tasks';
import { useNow } from '@/lib/time';
import type { TaskKind } from '@/lib/types';

const QUEST_ICON: Record<string, { icon: IconName; color: string; tint: string }> = {
  checks: { icon: 'heart-pulse', color: '#E0518D', tint: C.pinkSoft },
  lunch: { icon: 'food-apple', color: '#D97706', tint: C.sunSoft },
  play: { icon: 'soccer', color: '#1F9D74', tint: C.mintSoft },
};

const KIND_ICON: Record<TaskKind, { icon: IconName; color: string; tint: string }> = {
  check: { icon: 'heart-pulse', color: '#E0518D', tint: C.pinkSoft },
  medicine: { icon: 'water-plus', color: '#2F80ED', tint: C.skySoft },
  meal: { icon: 'silverware-fork-knife', color: '#D97706', tint: C.sunSoft },
  activity: { icon: 'soccer', color: '#1F9D74', tint: C.mintSoft },
  custom: { icon: 'star-four-points', color: C.primary, tint: C.primarySoft },
};

function Stars({ value }: { value: number }) {
  return (
    <Row style={{ gap: 1 }}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name={n <= value ? 'star' : 'star-outline'} size={15} color={n <= value ? '#F5A524' : C.line} />
      ))}
    </Row>
  );
}

/** One of the doctor's tasks, as a quest. Kid wording only: no doses, no clock times, and never "missed". */
function BigQuest({ item, now }: { item: PlanItem; now: number }) {
  const [busy, setBusy] = useState(false);
  const look = KIND_ICON[item.task.kind];
  const done = item.status === 'done';

  async function markDone() {
    setBusy(true);
    await saveLog('task', { task_id: item.task.id, date: dateKey(now) });
    setBusy(false);
  }

  return (
    <Card style={[styles.big, done ? { backgroundColor: C.mintSoft, borderColor: C.mint } : null]}>
      <Row style={{ alignItems: 'flex-start', gap: S.md }}>
        <IconTile
          name={done ? 'check-bold' : look.icon}
          color={done ? '#fff' : look.color}
          tint={done ? C.mint : look.tint}
          size={52}
          radius={R.lg}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Body style={font('900')}>{item.task.quest_title}</Body>
          <Row style={{ gap: S.sm }}>
            <Stars value={item.task.importance} />
            <Small color={done ? C.mint : C.inkSoft}>{done ? 'Done!' : friendlyTime(item.task.time)}</Small>
          </Row>
          <Row style={{ gap: 4 }}>
            <Icon name="circle-slice-8" size={14} color="#D69E2E" />
            <Small color="#B7791F">{item.task.reward_dots} Dots</Small>
          </Row>
        </View>
        {!done && item.task.kind === 'custom' ? (
          <Button title="Done!" icon="check-bold" variant="mint" onPress={markDone} loading={busy} />
        ) : null}
      </Row>
    </Card>
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
    <Screen>
      <PageHeader title="Quests" />

      {plan.total > 0 ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>Dotty&apos;s big quests</H2>
            <Small color={plan.done === plan.total ? C.mint : C.inkSoft}>
              {plan.done}/{plan.total} done
            </Small>
          </Row>
          <ProgressBar value={plan.total ? plan.done / plan.total : 0} color={C.primary} />
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

      <Row style={{ justifyContent: 'space-between' }}>
        <H2>Good habits</H2>
        <Small>
          {habitsDone}/{habits.length} done
        </Small>
      </Row>
      <Card>
        {habits.map((q) => {
          const look = QUEST_ICON[q.id];
          return (
            <View key={q.id} style={styles.quest}>
              {q.done ? (
                <IconTile name="check-bold" color="#fff" tint={C.mint} size={44} />
              ) : (
                <IconTile name={look.icon} color={look.color} tint={look.tint} size={44} />
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <Body style={q.done ? { color: C.inkSoft } : undefined}>{q.title}</Body>
                <ProgressBar value={q.progress / q.target} color={q.done ? C.mint : C.primary} />
              </View>
              <Small>
                {q.progress}/{q.target}
              </Small>
            </View>
          );
        })}
      </Card>

      <Card tint={C.sunSoft}>
        <Row style={{ gap: S.md }}>
          <IconTile name="fire" color="#fff" tint="#F76707" size={52} radius={R.lg} />
          <View style={{ flex: 1 }}>
            <H2>{pet?.streak_days ?? 0} day streak</H2>
            <Small color={C.ink}>3 check-ups a day keeps your streak going. 3, 7 and 30 days earn big bonuses!</Small>
          </View>
        </Row>
      </Card>

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

      <H2>Badges</H2>
      <View style={styles.badges}>
        {Object.entries(BADGES).map(([id, b]) => {
          const earned = pet?.badges.includes(id);
          return (
            <View key={id} style={[styles.badge, earned ? { borderColor: b.color, backgroundColor: b.tint } : null]}>
              <View style={{ opacity: earned ? 1 : 0.35 }}>
                <IconTile
                  name={earned ? b.icon : 'lock-outline'}
                  color={earned ? '#fff' : C.inkSoft}
                  tint={earned ? b.color : C.line}
                  size={58}
                  radius={29}
                />
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
  big: { borderWidth: 2, borderColor: 'transparent' },
  quest: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm },
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
  badgeName: { ...font('800'), fontSize: 15, color: C.ink, marginTop: 4 },
  badgeHow: { ...font('600'), fontSize: 12, color: C.inkSoft, textAlign: 'center' },
});
