import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Icon, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Card, H2, Row, Screen, Small } from '@/components/ui';
import { C, font } from '@/constants/theme';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { dayLabel, timeAgo, useNow } from '@/lib/time';
import { fmtBg, useGlucoseUnit } from '@/lib/units';

interface Note {
  id: string;
  text: string;
  created_at: string;
}

function Item({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row style={{ gap: 6, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={18} color={C.primary} /> : null}
        <Body color={C.inkSoft}>{label}</Body>
      </Row>
      <Body style={font('800')}>{value}</Body>
    </Row>
  );
}

const REMINDER_ICON = { check: 'heart-pulse', meal: 'silverware-fork-knife', bedtime: 'weather-night' } as const;

export default function PlanScreen() {
  const now = useNow();
  const unit = useGlucoseUnit();
  const plan = useStore((s) => s.plan);
  const patient = useStore((s) => s.patient);
  const clinician = useStore((s) => s.session?.family?.clinician?.name);
  const [notes, setNotes] = useState<Note[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!patient) return;
      api<Note[]>(`/patients/${patient.id}/notes`)
        .then(setNotes)
        .catch(() => {});
    }, [patient]),
  );

  if (!plan) {
    return (
      <Screen>
        <PageHeader title="Treatment plan" />
        <Card>
          <Body>No plan yet. Your care team sets it up in the clinician portal, and it appears here automatically.</Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Treatment plan" />
      <Small>
        Version {plan.version} · by {clinician ?? 'your care team'} · updated {timeAgo(plan.updated_at, now)}
      </Small>

      <Card>
        <H2>Carb ratio</H2>
        {[...plan.icr]
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((s) => (
            <Item key={s.start} label={`From ${s.start}`} value={`1 u per ${s.g_per_unit} g`} />
          ))}
      </Card>

      <Card>
        <H2>Corrections</H2>
        <Item label="Sensitivity (ISF)" value={`1 u lowers ${fmtBg(plan.isf_mgdl_per_unit, unit)}`} />
        <Item label="Correct down to" value={fmtBg(plan.correction_target, unit)} />
        <Item label="Target range" value={`${fmtBg(plan.target.low, unit, false)}–${fmtBg(plan.target.high, unit)}`} />
        <Item label="Max single dose" value={`${plan.max_bolus} u`} />
      </Card>

      <Card>
        <H2>Activity</H2>
        <Item label="Light" value={`−${plan.activity_rules.light}%`} />
        <Item label="Moderate" value={`−${plan.activity_rules.moderate}%`} />
        <Item label="Vigorous" value={`−${plan.activity_rules.vigorous}%`} />
      </Card>

      {plan.basal.length ? (
        <Card>
          <H2>Basal</H2>
          {plan.basal.map((b) => (
            <Item key={b.time} label={b.time} value={`${b.units} u`} />
          ))}
        </Card>
      ) : null}

      <Card>
        <H2>Check-up reminders</H2>
        {plan.reminders.map((r) => (
          <Item key={r.time + r.kind} icon={REMINDER_ICON[r.kind]} label={r.label ?? r.kind} value={`${r.time} ±${r.window_min} min`} />
        ))}
      </Card>

      {plan.notes ? (
        <Card tint={C.primarySoft}>
          <Small color={C.primaryDark}>Plan notes</Small>
          <Body>{plan.notes}</Body>
        </Card>
      ) : null}

      <H2>Notes from {clinician ?? 'your care team'}</H2>
      {notes === null ? <Small>Connect to load notes.</Small> : null}
      {notes?.length === 0 ? <Small>No notes yet.</Small> : null}
      {notes?.map((n) => (
        <Card key={n.id}>
          <Small>{dayLabel(n.created_at, now)}</Small>
          <Body>{n.text}</Body>
        </Card>
      ))}
    </Screen>
  );
}
