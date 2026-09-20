import { Pressable, Text } from 'react-native';

import { C, R, font } from '@/constants/theme';
import { syncNow } from '@/lib/sync';
import { useStore } from '@/lib/store';

import { ParentIcon, type ParentIconName } from './parent-icon';

/** The cloud badge: shows whether everything is saved, and how many logs are waiting for a connection. */
export function SyncBadge() {
  const online = useStore((s) => s.online);
  const syncing = useStore((s) => s.syncing);
  const pending = useStore((s) => s.outbox.length);

  let icon: ParentIconName = 'cloud-check';
  let label = 'Saved';
  let bg: string = C.mintSoft;
  let fg: string = '#1F9D74';
  if (!online) {
    icon = 'cloud-off';
    label = pending ? `Offline · ${pending} waiting` : 'Offline';
    bg = C.sunSoft;
    fg = '#B7791F';
  } else if (pending || syncing) {
    icon = 'cloud-upload';
    label = pending ? `Uploading ${pending}…` : 'Syncing…';
    bg = C.skySoft;
    fg = '#2F80ED';
  }

  return (
    <Pressable
      onPress={() => void syncNow()}
      accessibilityLabel="Sync status"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6 }}>
      <ParentIcon name={icon} size={22} />
      <Text style={{ ...font('800'), fontSize: 13, color: fg }}>{label}</Text>
    </Pressable>
  );
}
