import { AlertTriangle, CheckCheck, ClipboardCheck, Clock, Droplet, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, Empty, H2 } from '../../components/ui';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/time';
import type { AppNotification } from '../../lib/types';
import { usePatient } from '../PatientLayout';

const LOOK: Record<string, { icon: typeof Droplet; className: string }> = {
  out_of_range: { icon: Droplet, className: 'bg-bad-soft text-bad' },
  missed_treatment: { icon: Clock, className: 'bg-warn-soft text-[#B7791F]' },
  care_summary: { icon: ClipboardCheck, className: 'bg-brand-soft text-brand' },
  clinician_note: { icon: ClipboardCheck, className: 'bg-brand-soft text-brand' },
  parent_note: { icon: MessageSquare, className: 'bg-brand-soft text-brand' },
};

export default function Alerts() {
  const { patient, reload } = usePatient();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  async function load() {
    const res = await api<{ notifications: AppNotification[] }>('/notifications');
    setItems(res.notifications.filter((n) => n.data?.patient_id === patient.id || !n.data?.patient_id));
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5_000);
    return () => clearInterval(timer);
  }, [patient.id]);

  async function readAll() {
    await api('/notifications/read-all', { method: 'POST' });
    await load();
    reload();
  }

  const unread = items?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <H2>Messages and alerts for {patient.name}</H2>
            <p className="text-sm text-ink-soft">Messages from parents, urgent lows, sustained highs and missed care-plan tasks.</p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" icon={<CheckCheck size={16} />} onClick={readAll}>
              Mark all read ({unread})
            </Button>
          )}
        </div>
      </Card>

      {items?.length === 0 && <Empty>No messages or alerts. That is good news.</Empty>}

      {items?.map((n) => {
        const look = LOOK[n.kind] ?? { icon: AlertTriangle, className: 'bg-line text-ink-soft' };
        const Icon = look.icon;
        return (
          <Card key={n.id} className={n.read_at ? 'opacity-70' : 'border-brand-soft'}>
            <div className="flex items-start gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${look.className}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">{n.title}</p>
                <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
