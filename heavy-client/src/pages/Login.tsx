import { useState } from 'react';

import clinician from '../assets/clinician.png';
import { Button, Card, ErrorText, Field } from '../components/ui';
import { apiBase, errorText } from '../lib/api';
import { useSession } from '../lib/session';

export default function Login() {
  const { signIn, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await signIn(email, password);
      else await register(name, email, password, code);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <img src={clinician} alt="Dotty the doctor" width={160} className="h-auto w-40 select-none" draggable={false} />
        <h1 className="text-3xl font-black">Dotty clinician portal</h1>
        <p className="text-sm text-ink-soft">Set each child's care plan and follow how the week is going.</p>
      </div>

      <Card>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {mode === 'register' && <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'register' && (
            <Field
              label="Family code"
              hint="The 6-character code from the parent's app. You can add more families later."
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          )}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create clinician account'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'New here? Create a clinician account' : 'Back to log in'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-ink-soft">
        Demo: lee@dotty.demo / demo1234 · server {apiBase()}
      </p>
    </main>
  );
}
