/**
 * Offline-first sync. Every log is an immutable event with a client-generated id, applied locally at once and
 * queued in the outbox. `syncNow` uploads the outbox (the server ignores ids it already has, so retries are safe)
 * and then pulls whatever changed since the last cursor.
 */
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { SYNC_INTERVAL_MS } from './config';
import { ApiError, NetworkError, api } from './api';
import { scheduleReminders } from './reminders';
import { useStore } from './store';
import type { DotEvent, PullResult, PushResult, Reward } from './types';

const BATCH = 200;
let inflight: Promise<void> | null = null;
let remindersFor: string | null = null;

export function syncNow(): Promise<void> {
  if (!inflight) inflight = run().finally(() => (inflight = null));
  return inflight;
}

async function run(): Promise<void> {
  const st = useStore.getState();
  if (!st.session) return;
  const wasOffline = !st.online;
  const pending = st.outbox.length;
  st.setFlags({ syncing: true });
  try {
    await pushOutbox(wasOffline);
    await pull();
    useStore.getState().setFlags({ online: true, lastSyncedAt: Date.now() });
    if (wasOffline && pending > 0 && useStore.getState().outbox.length === 0) {
      useStore.getState().pushToast({
        kind: 'sync',
        text: `${pending} ${pending === 1 ? 'thing' : 'things'} uploaded`,
        sub: 'Back online. Everything is saved.',
      });
    }
  } catch (e) {
    if (e instanceof NetworkError) useStore.getState().setFlags({ online: false });
    else if (e instanceof ApiError && e.status === 400) useStore.getState().setFlags({ online: true });
    else console.warn('sync failed', e);
  } finally {
    useStore.getState().setFlags({ syncing: false });
  }
}

const wire = (e: DotEvent) => ({ client_id: e.client_id, type: e.type, ts: e.ts, source: e.source, data: e.data });

async function pushBatch(batch: DotEvent[]): Promise<PushResult> {
  return api<PushResult>('/sync/push', { method: 'POST', body: { events: batch.map(wire) } });
}

async function pushOutbox(wasOffline: boolean): Promise<void> {
  const rewards: Reward[] = [];
  while (useStore.getState().outbox.length) {
    const batch = useStore.getState().outbox.slice(0, BATCH);
    let result: PushResult;
    try {
      result = await pushBatch(batch);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 422)) throw e;
      // One malformed event must not block the queue forever: retry one by one and drop the bad ones.
      const dropped: string[] = [];
      for (const ev of batch) {
        try {
          rewards.push(...(await pushBatch([ev])).rewards);
        } catch (inner) {
          if (inner instanceof ApiError && inner.status === 422) dropped.push(ev.client_id);
          else throw inner;
        }
      }
      useStore.setState((s) => ({ outbox: s.outbox.filter((x) => !dropped.includes(x.client_id)) }));
      continue;
    }
    rewards.push(...result.rewards);
    useStore.getState().ackPush(result.accepted_ids, result.pet);
  }
  celebrate(rewards, wasOffline);
}

/**
 * Toasts for what a child just earned. Parents don't see these: the Dots go to the child's Dotty.
 * Logs made offline already showed their Dots when they were saved, so a reconnect only announces the extras.
 */
function celebrate(rewards: Reward[], wasOffline: boolean) {
  const st = useStore.getState();
  if (st.session?.user.role !== 'child' || !rewards.length) return;
  st.addSeenRewardIds(rewards.flatMap((r) => (r.id ? [r.id] : [])));
  const dots = rewards.reduce((sum, r) => sum + r.dots, 0);
  if (dots > 0 && !wasOffline) {
    st.pushToast({ kind: 'reward', text: `+${dots} Dots!`, sub: rewards.find((r) => r.dots > 0)?.label });
  }
  for (const r of rewards.filter((r) => ['level_up', 'badge', 'streak', 'quests'].includes(r.kind))) {
    st.pushToast({ kind: 'reward', text: r.label });
  }
  st.bumpCheer();
}

async function pull(): Promise<void> {
  const before = useStore.getState();
  const since = before.cursor ?? undefined;
  const res = await api<PullResult>('/sync/pull', { query: { since } });
  const known = new Set(before.notifications.map((n) => n.id));
  const seen = new Set(before.seenRewardIds);
  useStore.getState().applyPull(res);

  const role = before.session?.user.role;
  if (since) {
    const fresh = res.notifications.filter((n) => !known.has(n.id));
    for (const n of fresh) {
      if (role === 'child' && (n.kind === 'high_five' || (n.kind === 'reward' && !seen.has(n.id)))) {
        useStore.getState().pushToast({ kind: 'reward', text: n.title, sub: n.body });
        useStore.getState().bumpCheer();
      } else if (role === 'parent' && n.kind !== 'reward' && n.kind !== 'high_five') {
        useStore.getState().pushToast({ kind: 'alert', text: n.title, sub: n.body });
      }
    }
  }

  const plan = res.plan;
  const stamp = plan ? `${plan.id}:${plan.version}` : 'none';
  if (role === 'child' && stamp !== remindersFor) {
    remindersFor = stamp;
    void scheduleReminders(plan);
  }
}

/** Sync on connectivity changes, when the app returns to the foreground, and every few seconds. */
export function startSyncLoop(): () => void {
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    if (state.isConnected === false) useStore.getState().setFlags({ online: false });
    else void syncNow();
  });
  const appState = AppState.addEventListener('change', (s) => {
    if (s === 'active') void syncNow();
  });
  const timer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
  void syncNow();
  return () => {
    unsubscribeNet();
    appState.remove();
    clearInterval(timer);
  };
}
