import type { Session } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
const STORAGE_KEY = 'dotty-clinician';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

function detail(payload: any, status: number): string {
  const d = payload?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d.map((x) => x.msg ?? String(x)).join('; ');
  return `Something went wrong (${status})`;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const token = opts.token ?? loadSession()?.token;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Can't reach the Dotty server at ${BASE}. Is it running?`);
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !opts.token) {
      saveSession(null);
      location.reload();
    }
    throw new ApiError(res.status, detail(payload, res.status));
  }
  return payload as T;
}

export const apiBase = () => BASE;
export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
