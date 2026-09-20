import { useEffect } from 'react';

import { ensureMusic, stopMusic } from '@/lib/sounds';
import { useStore } from '@/lib/store';

/** Lives inside the child's tabs: plays the background music while they are open and it is switched on. */
export function MusicHost() {
  const musicOn = useStore((s) => s.musicOn);
  const song = useStore((s) => s.song);
  useEffect(() => {
    ensureMusic();
    return stopMusic;
  }, [musicOn, song]);
  return null;
}
