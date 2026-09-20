import { previewDots, useStore } from './store';
import { syncNow } from './sync';
import type { DotEvent } from './types';

/**
 * Save a log on the device, then try to upload it. Online, the server's rewards arrive as toasts from the sync.
 * Offline, the child still gets their Dots right away (a preview the server confirms later).
 */
export async function saveLog(type: DotEvent['type'], data: Record<string, any>): Promise<DotEvent> {
  const st = useStore.getState();
  const event = st.logEvent(type, data);
  await syncNow();
  const after = useStore.getState();
  // a child finishing something: ribbons pop and the phone buzzes
  if (after.session?.user.role === 'child') after.burstConfetti();
  if (!after.online && after.session?.user.role === 'child') {
    const dots = previewDots(event);
    after.pushToast({
      kind: 'reward',
      text: dots ? `+${dots} Dots!` : 'Saved!',
      sub: 'Saved on this phone. It uploads when you are back online.',
    });
    after.bumpCheer();
  } else if (!after.online) {
    after.pushToast({ kind: 'sync', text: 'Saved offline', sub: 'It uploads when you are back online.' });
  }
  return event;
}
