import { REQUEST_TIMEOUT_MS, defaultApiUrl } from './config';
import { useStore } from './store';

/** The server answered with an error status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The server couldn't be reached (offline, timeout, wrong address). */
export class NetworkError extends Error {}

export function apiBase(): string {
  return (useStore.getState().apiUrl || defaultApiUrl()).replace(/\/+$/, '');
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Use this token instead of the signed-in session's (right after login). */
  token?: string;
}

function detail(payload: any, status: number): string {
  const d = payload?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) return d.map((x) => x.msg ?? String(x)).join('; ');
  return `Something went wrong (${status})`;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { forceOffline, session } = useStore.getState();
  if (forceOffline) throw new NetworkError('Offline mode is on');

  const token = opts.token ?? session?.token;
  const query = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&')
    : '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(apiBase() + path + query, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError("Can't reach Dotty right now");
  } finally {
    clearTimeout(timer);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !opts.token && session) useStore.getState().signOut(); // expired token
    throw new ApiError(res.status, detail(payload, res.status));
  }
  return payload as T;
}

/** Human-friendly text for an error thrown by `api`. */
export function errorText(e: unknown): string {
  if (e instanceof NetworkError) return "You're offline. Dotty will do this when you're back online.";
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
