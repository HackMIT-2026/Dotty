import { ArrowLeft, Bell, ClipboardList, LineChart, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';

import { DemoPanel } from '../components/DemoPanel';
import { ErrorText, Pill } from '../components/ui';
import { api, errorText } from '../lib/api';
import type { PatientSummary } from '../lib/types';

const PatientContext = createContext<{ patient: PatientSummary; reload: () => void }>(null!);
export const usePatient = () => useContext(PatientContext);

const TABS = [
  { to: '', label: 'Overview', icon: LineChart, end: true },
  { to: 'care-plan', label: 'Care plan', icon: ClipboardList },
  { to: 'treatment-plan', label: 'Treatment plan', icon: SlidersHorizontal },
  { to: 'notes', label: 'Notes', icon: MessageSquare },
  { to: 'alerts', label: 'Alerts', icon: Bell },
];

export default function PatientLayout() {
  const { id = '' } = useParams();
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const all = await api<PatientSummary[]>('/patients');
      const found = all.find((p) => p.id === id);
      if (!found) throw new Error('This patient is not on your list.');
      setPatient(found);
    } catch (e) {
      setError(errorText(e));
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [id]);

  if (error) return <main className="p-6"><ErrorText>{error}</ErrorText></main>;
  if (!patient) return <main className="p-6 text-ink-soft">Loading…</main>;

  return (
    <PatientContext value={{ patient, reload: load }}>
      <main className="mx-auto flex max-w-5xl flex-col gap-5 p-6">
        <header className="flex flex-wrap items-center gap-3">
          <Link to="/patients" className="flex size-9 items-center justify-center rounded-full bg-white text-ink-soft hover:text-brand">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-3xl font-black">{patient.name}</h1>
          <Pill tone="brand">{patient.glucose_unit}</Pill>
          {patient.family_code && <Pill>Family {patient.family_code}</Pill>}
          <div className="ml-auto">
            <DemoPanel patientId={patient.id} />
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  isActive ? 'bg-brand text-white' : 'bg-white text-ink-soft hover:text-brand'
                }`
              }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </main>
    </PatientContext>
  );
}
