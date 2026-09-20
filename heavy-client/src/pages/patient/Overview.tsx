import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button, Card, Empty, H2, Pill, Stat } from '../../components/ui';
import { api } from '../../lib/api';
import { clock, dayLabel, localDate, timeAgo } from '../../lib/time';
import type { DotEvent, Plan } from '../../lib/types';
import { fmtBg, toUnit } from '../../lib/units';
import { usePatient } from '../PatientLayout';

const EVENT_LABEL: Record<string, (e: DotEvent, fmt: (mgdl: number) => string) => string> = {
  reading: (e, fmt) => `Glucose ${fmt(e.data.bg_mgdl)}`,
  meal: (e) => `Meal · ${e.data.carbs_g} g carbs`,
  activity: (e) => `${e.data.kind ?? 'Activity'} · ${e.data.minutes} min`,
  bolus: (e) => (e.data.units != null ? `Insulin ${e.data.units} u` : 'Medicine taken'),
  basal: (e) => (e.data.units != null ? `Basal ${e.data.units} u` : 'Basal taken'),
  task: () => 'Care-plan task done',
};

export default function Overview() {
  const { patient } = usePatient();
  const [hours, setHours] = useState(24);
  const [events, setEvents] = useState<DotEvent[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const load = async () => {
      const from = new Date(Date.now() - hours * 3_600_000).toISOString();
      setEvents(await api<DotEvent[]>(`/patients/${patient.id}/events?from=${encodeURIComponent(from)}`));
    };
    void load();
    const timer = setInterval(() => void load(), 5_000); // live during a consultation
    return () => clearInterval(timer);
  }, [patient.id, hours]);

  useEffect(() => {
    api<Plan>(`/patients/${patient.id}/plan`)
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [patient.id]);

  const unit = patient.glucose_unit;
  const fmt = (mgdl: number) => fmtBg(mgdl, unit, false);
  const low = plan?.target.low ?? 70;
  const high = plan?.target.high ?? 180;

  const readings = useMemo(
    () => events.filter((e) => e.type === 'reading').map((e) => ({ t: new Date(e.ts).getTime(), bg: toUnit(e.data.bg_mgdl, unit) })),
    [events, unit],
  );
  const today = events.filter((e) => localDate(e.ts) === localDate(Date.now()));
  const carbs = today.filter((e) => e.type === 'meal').reduce((s, e) => s + (e.data.carbs_g ?? 0), 0);
  const insulin = today.filter((e) => e.type === 'bolus' || e.type === 'basal').reduce((s, e) => s + (e.data.units ?? 0), 0);
  const active = today.filter((e) => e.type === 'activity').reduce((s, e) => s + (e.data.minutes ?? 0), 0);
  const domainEnd = Date.now();
  const domainStartDate = new Date(domainEnd - hours * 3_600_000);
  if (hours <= 24) domainStartDate.setHours(0, 0, 0, 0);
  const domain: [number, number] = [domainStartDate.getTime(), domainEnd];
  const ticks: number[] = [];
  const firstTick = new Date(domain[0]);
  firstTick.setHours(0, 0, 0, 0);
  const tickStepHours = hours <= 24 ? 1 : 24;
  for (const tick = new Date(firstTick); tick.getTime() <= domain[1]; tick.setHours(tick.getHours() + tickStepHours)) {
    ticks.push(tick.getTime());
  }
  const tickFmt = (t: number) =>
    hours <= 24
      ? new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : new Date(t).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Last glucose" value={patient.last_reading ? fmt(patient.last_reading.bg_mgdl) : '–'} sub={patient.last_reading ? timeAgo(patient.last_reading.ts) : unit} />
        <Stat label="In range" value={patient.tir_pct == null ? '–' : `${patient.tir_pct}%`} sub="14 days" />
        <Stat label="Plan done" value={patient.adherence_pct == null ? '–' : `${patient.adherence_pct}%`} sub="14 days" />
        <Stat label="Carbs" value={`${carbs} g`} sub="today" />
        <Stat label="Insulin" value={`${Math.round(insulin * 10) / 10} u`} sub={`today · ${active} min active`} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <H2>Glucose ({unit})</H2>
          <div className="flex gap-2">
            {[24, 24 * 14].map((h) => (
              <Button key={h} variant={hours === h ? 'primary' : 'secondary'} onClick={() => setHours(h)}>
                {h === 24 ? '24 hours' : '14 days'}
              </Button>
            ))}
          </div>
        </div>
        {readings.length === 0 ? (
          <Empty>No glucose in this period.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={readings} margin={{ top: 8, right: 8, bottom: 8, left: -12 }}>
              <CartesianGrid stroke="#E6E2F5" vertical={false} />
              <ReferenceArea y1={toUnit(low, unit)} y2={toUnit(high, unit)} fill="#DDF7EC" fillOpacity={0.8} />
              <XAxis type="number" dataKey="t" domain={domain} scale="time" ticks={ticks} tickFormatter={tickFmt} stroke="#6E6A8F" fontSize={12} />
              <YAxis domain={[toUnit(40, unit), toUnit(320, unit)]} stroke="#6E6A8F" fontSize={12} />
              <Tooltip
                labelFormatter={(t) => `${dayLabel(t as number)} ${clock(t as number)}`}
                formatter={(v) => [`${v} ${unit}`, 'Glucose']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E6E2F5' }}
              />
              <Line type="linear" dataKey="bg" stroke="#6C5CE7" strokeWidth={2} dot={{ r: 3, fill: '#6C5CE7' }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <H2>Logbook</H2>
        {events.length === 0 ? (
          <Empty>Nothing logged in this period.</Empty>
        ) : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {[...events].reverse().slice(0, 40).map((e) => (
                <tr key={e.client_id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-bold">{clock(e.ts)}</td>
                  <td className="py-2 pr-3 text-ink-soft">{dayLabel(e.ts)}</td>
                  <td className="py-2 pr-3">{(EVENT_LABEL[e.type] ?? (() => e.type))(e, fmt)}</td>
                  <td className="py-2 text-right">
                    {e.source === 'simulator' ? <Pill>simulated</Pill> : e.source === 'parent' ? <Pill tone="brand">parent</Pill> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
