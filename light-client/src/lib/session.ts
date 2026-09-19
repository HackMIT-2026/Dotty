import { api } from './api';
import { useStore } from './store';
import type { Family, User } from './types';

interface AuthResult {
  token: string;
  user: User;
}

/** Store the session (with the family) after login or registration. Only children and parents use this app. */
export async function startSession(res: AuthResult): Promise<void> {
  if (res.user.role === 'clinician') {
    throw new Error('Clinicians use the Dotty clinician portal on a laptop.');
  }
  const me = await api<{ user: User; family: Family | null }>('/me', { token: res.token });
  useStore.getState().signIn({ token: res.token, user: me.user, family: me.family });
}

export async function login(email: string, password: string): Promise<void> {
  const res = await api<AuthResult>('/auth/login', { method: 'POST', body: { email: email.trim(), password } });
  await startSession(res);
}

/** Children sign in with the family code and their 4-digit PIN. No email, nothing to type but 4 digits. */
export async function childLogin(familyCode: string, pin: string): Promise<void> {
  const res = await api<AuthResult>('/auth/child/login', {
    method: 'POST',
    body: { family_code: familyCode.trim().toUpperCase(), pin },
  });
  await startSession(res);
}

export async function childRegister(name: string, familyCode: string, pin: string): Promise<void> {
  const res = await api<AuthResult>('/auth/child/register', {
    method: 'POST',
    body: { name: name.trim(), family_code: familyCode.trim().toUpperCase(), pin },
  });
  await startSession(res);
}

export function localTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}
