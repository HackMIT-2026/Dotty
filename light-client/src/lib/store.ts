import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { newId } from './ids';
import { logGuard } from './limits';
import type {
  AppNotification,
  CareTask,
  DotEvent,
  Family,
  Pet,
  Plan,
  PullResult,
  Session,
  ShopItem,
  Toast,
} from './types';

const KEEP_EVENT_DAYS = 30;
const MAX_EVENTS = 3000;

/** Dots a log will earn, shown right away while offline. The server is the authority once synced. */
export function previewDots(e: DotEvent): number {
  if (e.noDots) return 0; // logged again too soon: the server won't pay for it, so Dotty must not promise it
  switch (e.type) {
    case 'reading':
    case 'meal':
    case 'bolus':
    case 'basal':
      return 10;
    case 'activity':
      return 10 + Math.min(30, 5 * Math.floor((e.data.minutes ?? 0) / 15));
    default:
      return 0;
  }
}

function withPreview(pet: Pet | null, e: DotEvent): Pet | null {
  if (!pet) return pet;
  const dots = previewDots(e);
  return { ...pet, dots: pet.dots + dots, xp: pet.xp + dots };
}

export function mergeEvents(existing: DotEvent[], incoming: DotEvent[]): DotEvent[] {
  const byId = new Map<string, DotEvent>();
  for (const e of existing) byId.set(e.client_id, e);
  for (const e of incoming) byId.set(e.client_id, { ...byId.get(e.client_id), ...e });
  const cutoff = Date.now() - KEEP_EVENT_DAYS * 86_400_000;
  return [...byId.values()]
    .filter((e) => new Date(e.ts).getTime() >= cutoff)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .slice(-MAX_EVENTS);
}

function mergeNotifications(existing: AppNotification[], incoming: AppNotification[]): AppNotification[] {
  const byId = new Map<string, AppNotification>();
  for (const n of existing) byId.set(n.id, n);
  for (const n of incoming) {
    const local = byId.get(n.id);
    byId.set(n.id, { ...n, read_at: local?.read_at ?? n.read_at }); // keep a read mark made while offline
  }
  return [...byId.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 100);
}

let toastSeq = 1;

interface State {
  apiUrl: string | null;
  forceOffline: boolean;
  session: Session | null;
  patient: { id: string; name: string } | null;
  events: DotEvent[];
  outbox: DotEvent[];
  plan: Plan | null;
  tasks: CareTask[];
  pet: Pet | null;
  notifications: AppNotification[];
  shop: ShopItem[];
  cursor: string | null;
  seenRewardIds: string[];

  // volatile (not persisted)
  online: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  toasts: Toast[];
  cheer: number;
  /** Counts up each time the child finishes something; the confetti listens for it. Not saved. */
  confetti: number;

  setApiUrl: (url: string | null) => void;
  setForceOffline: (v: boolean) => void;
  signIn: (s: Session) => void;
  signOut: () => void;
  setFamily: (f: Family | null) => void;
  setGlucoseUnit: (unit: Family['glucose_unit']) => void;
  logEvent: (type: DotEvent['type'], data: Record<string, any>) => DotEvent;
  ackPush: (acceptedIds: string[], pet: Pet) => void;
  applyPull: (res: PullResult) => void;
  setPet: (pet: Pet) => void;
  setShop: (items: ShopItem[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addSeenRewardIds: (ids: string[]) => void;
  setFlags: (f: Partial<Pick<State, 'online' | 'syncing' | 'lastSyncedAt'>>) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  bumpCheer: () => void;
  burstConfetti: () => void;
}

const EMPTY_DATA = {
  session: null,
  patient: null,
  events: [] as DotEvent[],
  outbox: [] as DotEvent[],
  plan: null,
  tasks: [] as CareTask[],
  pet: null,
  notifications: [] as AppNotification[],
  shop: [] as ShopItem[],
  cursor: null,
  seenRewardIds: [] as string[],
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      apiUrl: null,
      forceOffline: false,
      ...EMPTY_DATA,
      online: true,
      syncing: false,
      lastSyncedAt: null,
      toasts: [],
      cheer: 0,
      confetti: 0,

      setApiUrl: (apiUrl) => set({ apiUrl }),
      setForceOffline: (forceOffline) => set({ forceOffline, ...(forceOffline ? { online: false } : {}) }),
      signIn: (session) => set({ ...EMPTY_DATA, session }),
      signOut: () => set({ ...EMPTY_DATA, toasts: [], forceOffline: false, online: true }),
      setFamily: (family) => set((s) => (s.session ? { session: { ...s.session, family } } : {})),
      setGlucoseUnit: (glucose_unit) =>
        set((s) =>
          s.session?.family ? { session: { ...s.session, family: { ...s.session.family, glucose_unit } } } : {},
        ),

      logEvent: (type, data) => {
        const role = get().session?.user.role;
        const event: DotEvent = {
          client_id: newId(),
          type,
          ts: new Date().toISOString(),
          source: role === 'parent' ? 'parent' : 'manual',
          data,
          ...(role === 'child' && !logGuard(get().events, type, Date.now()).ok ? { noDots: true } : {}),
        };
        set((s) => ({
          events: mergeEvents(s.events, [event]),
          outbox: [...s.outbox, event],
          pet: role === 'child' ? withPreview(s.pet, event) : s.pet,
        }));
        return event;
      },

      ackPush: (acceptedIds, pet) =>
        set((s) => {
          const done = new Set(acceptedIds);
          const outbox = s.outbox.filter((e) => !done.has(e.client_id));
          return { outbox, pet: outbox.reduce<Pet | null>(withPreview, pet) };
        }),

      applyPull: (res) =>
        set((s) => ({
          session:
            s.session?.family && res.settings && res.settings.glucose_unit !== s.session.family.glucose_unit
              ? { ...s.session, family: { ...s.session.family, glucose_unit: res.settings.glucose_unit } }
              : s.session,
          patient: res.patient,
          plan: res.plan,
          tasks: res.tasks ?? [],
          pet: s.outbox.reduce<Pet | null>(withPreview, res.pet),
          events: mergeEvents(s.events, res.events),
          notifications: mergeNotifications(s.notifications, res.notifications),
          cursor: res.server_time,
        })),

      setPet: (pet) => set((s) => ({ pet: s.outbox.reduce<Pet | null>(withPreview, pet) })),
      setShop: (shop) => set({ shop }),

      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
        })),
      addSeenRewardIds: (ids) => set((s) => ({ seenRewardIds: [...s.seenRewardIds, ...ids].slice(-200) })),

      setFlags: (f) => set(f),
      pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: toastSeq++ }].slice(-3) })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      bumpCheer: () => set((s) => ({ cheer: s.cheer + 1 })),
      burstConfetti: () => set((s) => ({ confetti: s.confetti + 1 })),
    }),
    {
      name: 'dotty-store-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        apiUrl: s.apiUrl,
        forceOffline: s.forceOffline,
        session: s.session,
        patient: s.patient,
        events: s.events,
        outbox: s.outbox,
        plan: s.plan,
        tasks: s.tasks,
        pet: s.pet,
        notifications: s.notifications,
        shop: s.shop,
        cursor: s.cursor,
        seenRewardIds: s.seenRewardIds,
      }),
    },
  ),
);

export const unreadCount = (s: State) => s.notifications.filter((n) => !n.read_at).length;
