import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { api, loadSession, saveSession } from './api';
import type { Session, User } from './types';

interface Ctx {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, familyCode: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<Ctx>({} as Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const accept = useCallback((res: Session) => {
    if (res.user.role !== 'clinician') throw new Error('This portal is for clinicians. Parents and children use the Dotty app.');
    saveSession(res);
    setSession(res);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      session,
      signIn: async (email, password) =>
        accept(await api<Session>('/auth/login', { method: 'POST', body: { email: email.trim(), password } })),
      register: async (name, email, password, family_code) =>
        accept(
          await api<Session>('/auth/register', {
            method: 'POST',
            body: { name: name.trim(), email: email.trim(), password, role: 'clinician', family_code: family_code.trim().toUpperCase() },
          }),
        ),
      signOut: () => {
        saveSession(null);
        setSession(null);
      },
    }),
    [session, accept],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export const useSession = () => useContext(SessionContext);
export const useClinician = (): User | undefined => useContext(SessionContext).session?.user;
