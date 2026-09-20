import { StyleSheet, Text, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { planHistory, planToday, type PlanItem } from '@/lib/tasks';
import { clock, useNow } from '@/lib/time';
import type { TaskKind } from '@/lib/types';

const KIND: Record<TaskKind, { icon: IconName; label: string }> = {
  check: { icon: 'heart-pulse', label: 'Glucose check' },
  medicine: { icon: 'needle', label: 'Insulin / medicine' },
  meal: { icon: 'silverware-fork-knife', label: 'Meal' },
  activity: { icon: 'run', label: 'Activity' },
  custom: { icon: 'star-four-points', label: 'Task' },
};

const STATUS = {
  done: { color: C.mint, tint: C.mintSoft, icon: 'check-bold' as IconName, label: 'Done' },
  pending: { color: '#B7791F', tint: C.sunSoft, icon: 'clock-outline' as IconName, label: 'Due' },
  missed: { color: C.danger, tint: C.dangerSoft, icon: 'alert-circle-outline' as IconName, label: 'Missed' },
};

/** One care-plan task for the parent: the doctor's wording, the instructions and today's state. */
function TaskRow({ item }: { item: PlanItem }) {
  const look = STATUS[item.status];
  const task = item.task;
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start', gap: S.md }}>
        <IconTile name={look.icon} color="#fff" tint={look.color} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={font('800')}>{task.title ?? task.quest_title}</Body>
          <Small>
            {task.time ? `${task.time} ±${task.window_min} min` : 'Any time today'} · {KIND[task.kind].label}
            {task.kind === 'activity' && task.target_minutes ? ` · ${task.target_minutes} min` : ''}
          </Small>
          {task.instructions ? <Body style={{ fontSize: 15 }}>{task.instructions}</Body> : null}
          <Row style={{ gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: look.tint }]}>
              <Text style={[styles.badgeText, { color: look.color }]}>
                {look.label}
                {item.doneAt ? ` · ${clock(item.doneAt)}` : ''}
              </Text>
            </View>
            <Small>Child sees: “{task.quest_title}”</Small>
          </Row>
        </View>
      </Row>
    </Card>
  );
}

export default function ParentCarePlan() {
  const now = useNow();
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const patient = useStore((s) => s.patient);
  const clinician = useStore((s) => s.session?.family?.clinician?.name);

  const plan = planToday(tasks, events, now);
  const history = planHistory(tasks, events, now, 7);

  if (plan.total === 0) {
    return (
      <Screen>
        <PageHeader title="Care plan" />
        <Card>
          <Body>
            No care plan yet. {clinician ?? 'Your care team'} sets the daily tasks in the clinician portal, and they appear here and as
            quests in {patient?.name ?? 'your child'}&apos;s app.
          </Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Care plan" />

      <Card tint={plan.done === plan.total ? C.mintSoft : C.card}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>
            Today: {plan.done} of {plan.total} done
          </H2>
          <Small color={C.inkSoft}>by {clinician ?? 'your care team'}</Small>
        </Row>
        <ProgressBar value={plan.total ? plan.done / plan.total : 0} color={plan.done === plan.total ? C.mint : C.primary} />
      </Card>

      {plan.items.map((item) => (
        <TaskRow key={item.task.id} item={item} />
      ))}

      <Card>
        <H2>Last 7 days</H2>
        <Row style={{ marginTop: S.sm, gap: 4 }}>
          {history.map((d) => {
            const full = d.total > 0 && d.done === d.total;
            const none = d.done === 0;
            return (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View
                  style={[
                    styles.day,
                    { backgroundColor: d.total === 0 ? C.line : full ? C.mint : none ? C.dangerSoft : C.sunSoft },
                  ]}>
                  <Text style={[styles.dayText, { color: full ? '#fff' : none ? C.danger : '#B7791F' }]}>
                    {d.total === 0 ? '–' : `${d.done}/${d.total}`}
                  </Text>
                </View>
                <Small style={{ fontSize: 11 }}>{new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</Small>
              </View>
            );
          })}
        </Row>
      </Card>

      <Card tint={C.primarySoft}>
        <Row>
          <Icon name="information-outline" size={20} color={C.primaryDark} />
          <Small color={C.primaryDark} style={{ flex: 1 }}>
            {patient?.name ?? 'Your child'} sees these as quests with playful names and Dots — never the doses or instructions above.
          </Small>
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { ...font('800'), fontSize: 12 },
  // seven of these share the card's width, so they shrink on small phones instead of running off the edge
  day: { width: '100%', maxWidth: 40, aspectRatio: 1, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  dayText: { ...font('800'), fontSize: 13 },
});
