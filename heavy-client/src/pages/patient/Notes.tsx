import { Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Card, Empty, ErrorText, H2 } from '../../components/ui';
import { api, errorText } from '../../lib/api';
import { dayLabel, timeAgo } from '../../lib/time';
import type { Note } from '../../lib/types';
import { usePatient } from '../PatientLayout';

export default function Notes() {
  const { patient } = usePatient();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api<Note[]>(`/patients/${patient.id}/notes`).then(setNotes).catch((e) => setError(errorText(e)));

  useEffect(() => {
    void load();
  }, [patient.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/patients/${patient.id}/notes`, { method: 'POST', body: { text: text.trim() } });
      setText('');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(note: Note) {
    if (!confirm('Remove this note? The parent stops seeing it too.')) return;
    try {
      await api(`/patients/${patient.id}/notes/${note.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <H2>Send a note to {patient.name}'s parent</H2>
        <form className="mt-2 flex flex-col gap-3" onSubmit={send}>
          <textarea
            className="w-full rounded-[--radius-clinician] border-2 border-line px-3 py-2 font-medium outline-none focus:border-brand"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Great week! Let's try a 1:8 ratio at breakfast."
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy || !text.trim()} icon={<Send size={16} />} className="self-start">
            Send note
          </Button>
        </form>
      </Card>

      {notes?.length === 0 && <Empty>No notes yet.</Empty>}
      {notes?.map((n) => (
        <Card key={n.id}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs font-bold text-ink-soft">
                {dayLabel(n.created_at)} · {timeAgo(n.created_at)}
              </p>
              <p className="mt-1">{n.text}</p>
            </div>
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => remove(n)}>
              Remove
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
