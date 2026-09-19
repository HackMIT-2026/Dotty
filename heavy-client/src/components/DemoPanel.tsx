import { Play, Square } from 'lucide-react';
import { useState } from 'react';

import { api } from '../lib/api';
import { Button } from './ui';

const SCENARIOS = [
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Going high' },
  { id: 'low', label: 'Going low' },
  { id: 'skip_lunch', label: 'Missed lunch' },
] as const;

/** Drives the server's demo simulator (server/app/services/simulator.py) during a presentation. */
export function DemoPanel({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(scenario: string) {
    setBusy(scenario);
    try {
      await api(`/simulator/${patientId}`, { method: 'POST', body: { scenario, speed: 60 } });
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" icon={<Play size={14} />} onClick={() => setOpen(true)}>
        Demo
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full bg-white px-2 py-1.5">
      {SCENARIOS.map((s) => (
        <Button key={s.id} variant="secondary" disabled={busy !== null} onClick={() => run(s.id)}>
          {busy === s.id ? '…' : s.label}
        </Button>
      ))}
      <Button variant="ghost" icon={<Square size={14} />} onClick={() => api(`/simulator/${patientId}`, { method: 'DELETE' }).then(() => setOpen(false))}>
        Stop
      </Button>
    </div>
  );
}
