import { ChevronRight, LogOut, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, Empty, ErrorText, Field, H2, Pill } from '../components/ui';
import { api, errorText } from '../lib/api';
import { useSession } from '../lib/session';
import { timeAgo } from '../lib/time';
import type { PatientSummary } from '../lib/types';
import { fmtBg } from '../lib/units';

function tirTone(pct: number | null) {
  if (pct == null) return 'neutral' as const;
  return pct >= 70 ? ('good' as const) : pct >= 50 ? ('warn' as const) : ('bad' as const);
}

export default function Patients() {
  const { session, signOut } = useSession();
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setPatients(await api<PatientSummary[]>('/patients'));
    } catch (e) {
      setError(errorText(e));
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, []);

  async function addFamily(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await api('/clinician/join', { method: 'POST', body: { family_code: code.trim().toUpperCase() } });
      setCode('');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Patients</h1>
          <p className="text-sm text-ink-soft">Signed in as {session?.user.name}</p>
        </div>
        <Button variant="ghost" icon={<LogOut size={16} />} onClick={signOut}>
          Log out
        </Button>
      </header>

      <ErrorText>{error}</ErrorText>

      {patients?.length === 0 && <Empty>No patients yet. Add a family with the code from the parent's app.</Empty>}

      <div className="flex flex-col gap-3">
        {patients?.map((p) => (
          <Link key={p.id} to={`/patients/${p.id}`}>
            <Card className="transition hover:border-brand">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-40 flex-1">
                  <H2>{p.name}</H2>
                  <p className="text-xs text-ink-soft">
                    {p.last_reading ? `${fmtBg(p.last_reading.bg_mgdl, p.glucose_unit)} · ${timeAgo(p.last_reading.ts)}` : 'No readings yet'}
                  </p>
                </div>
                <Pill tone={tirTone(p.tir_pct)}>{p.tir_pct == null ? 'No data' : `${p.tir_pct}% in range`}</Pill>
                <Pill tone={tirTone(p.adherence_pct)}>
                  {p.adherence_pct == null ? 'No care plan' : `${p.adherence_pct}% plan done`}
                </Pill>
                <Pill tone="brand">{p.tasks_count} tasks</Pill>
                {p.open_alerts > 0 && <Pill tone="bad">{p.open_alerts} alerts</Pill>}
                <ChevronRight size={18} className="text-ink-soft" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <H2>Add a family</H2>
        <form className="mt-2 flex flex-wrap items-end gap-3" onSubmit={addFamily}>
          <Field
            label="Family code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="DEMO42"
            className="w-44"
          />
          <Button type="submit" icon={<Plus size={16} />} disabled={adding || code.length < 6}>
            Add family
          </Button>
        </form>
      </Card>
    </main>
  );
}
