import { Pressable, Text } from 'react-native';

import { C, FONT, R } from '@/constants/theme';
import { syncNow } from '@/lib/sync';
import { useStore } from '@/lib/store';

/** The cloud icon: shows whether everything is saved, and how many logs are waiting for a connection. */
export function SyncBadge() {
  const online = useStore((s) => s.online);
  const syncing = useStore((s) => s.syncing);
  const pending = useStore((s) => s.outbox.length);

  let label = '☁️ Saved';
  let bg: string = C.mintSoft;
  let fg: string = C.mint;
  if (!online) {
    label = pending ? `☁️ Offline · ${pending} waiting` : '☁️ Offline';
    bg = C.sunSoft;
    fg = '#B7791F';
  } else if (pending || syncing) {
    label = pending ? `☁️ Uploading ${pending}…` : '☁️ Syncing…';
    bg = C.skySoft;
    fg = C.sky;
  }

  return (
    <Pressable
      onPress={() => void syncNow()}
      accessibilityLabel="Sync status"
      style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '800', color: fg }}>{label}</Text>
    </Pressable>
  );
}
