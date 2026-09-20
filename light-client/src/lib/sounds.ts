/**
 * Dotty's sound effects and background music for the child's screens (synthesised by scripts/make_sounds.py).
 * Both can be switched off, and the choice is saved on the device. Nothing plays for a parent, and a phone that
 * blocks audio until you touch it (web) just stays quiet until the first tap.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { useStore } from './store';

const STYLE_FILES = {
  bubbles: {
    tap: require('@/assets/sounds/sfx-bubbles-tap.wav'),
    select: require('@/assets/sounds/sfx-bubbles-select.wav'),
    success: require('@/assets/sounds/sfx-bubbles-success.wav'),
    coin: require('@/assets/sounds/sfx-bubbles-coin.wav'),
    open: require('@/assets/sounds/sfx-bubbles-open.wav'),
    pop: require('@/assets/sounds/sfx-bubbles-pop.wav'),
  },
  chimes: {
    tap: require('@/assets/sounds/sfx-chimes-tap.wav'),
    select: require('@/assets/sounds/sfx-chimes-select.wav'),
    success: require('@/assets/sounds/sfx-chimes-success.wav'),
    coin: require('@/assets/sounds/sfx-chimes-coin.wav'),
    open: require('@/assets/sounds/sfx-chimes-open.wav'),
    pop: require('@/assets/sounds/sfx-chimes-pop.wav'),
  },
  retro: {
    tap: require('@/assets/sounds/sfx-retro-tap.wav'),
    select: require('@/assets/sounds/sfx-retro-select.wav'),
    success: require('@/assets/sounds/sfx-retro-success.wav'),
    coin: require('@/assets/sounds/sfx-retro-coin.wav'),
    open: require('@/assets/sounds/sfx-retro-open.wav'),
    pop: require('@/assets/sounds/sfx-retro-pop.wav'),
  },
  wood: {
    tap: require('@/assets/sounds/sfx-wood-tap.wav'),
    select: require('@/assets/sounds/sfx-wood-select.wav'),
    success: require('@/assets/sounds/sfx-wood-success.wav'),
    coin: require('@/assets/sounds/sfx-wood-coin.wav'),
    open: require('@/assets/sounds/sfx-wood-open.wav'),
    pop: require('@/assets/sounds/sfx-wood-pop.wav'),
  },
} as const;

/** The styles of button sounds a child can pick from (made by scripts/make_sounds.py). */
export const EFFECT_STYLES = [
  { id: 'bubbles', label: 'Bubbles' },
  { id: 'chimes', label: 'Chimes' },
  { id: 'retro', label: 'Retro' },
  { id: 'wood', label: 'Wood' },
] as const;

export type Sfx = keyof (typeof STYLE_FILES)['bubbles'];

/** The songs a child can pick from (made by scripts/make_sounds.py). */
export const SONGS = [
  { id: 'pond', label: 'Bubble Pond', mood: 'Slow and dreamy', file: require('@/assets/sounds/song-pond.wav') },
  { id: 'sunny', label: 'Sunny Skip', mood: 'Bouncy and bright', file: require('@/assets/sounds/song-sunny.wav') },
  { id: 'stars', label: 'Sleepy Stars', mood: 'A calm lullaby', file: require('@/assets/sounds/song-stars.wav') },
  { id: 'candy', label: 'Candy Dance', mood: 'Fast and playful', file: require('@/assets/sounds/song-candy.wav') },
] as const;

const MUSIC_VOLUME = 0.22; // background music sits well under the effects
const players: Record<string, AudioPlayer> = {};
let music: AudioPlayer | null = null;
let musicSong = '';

const isChild = () => useStore.getState().session?.user.role === 'child';

function quietly(fn: () => unknown) {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => {});
  } catch {
    // a device with no audio just stays silent
  }
}

function styleFiles() {
  const id = useStore.getState().sfxStyle as keyof typeof STYLE_FILES;
  return STYLE_FILES[id] ?? STYLE_FILES.bubbles;
}

/** A short effect for a tap, a pick, a reward... in the style the child picked. */
export function playSfx(name: Sfx) {
  const st = useStore.getState();
  if (!st.soundOn || !isChild()) return;
  quietly(() => {
    const key = `${st.sfxStyle}/${name}`;
    let p = players[key];
    if (!p) {
      p = createAudioPlayer(styleFiles()[name]);
      p.volume = 0.7;
      players[key] = p;
    }
    p.seekTo(0);
    p.play();
  });
  ensureMusic(); // the first touch is also what lets a web browser start the music
}

function getMusic(): AudioPlayer {
  const id = useStore.getState().song;
  // a different song was picked: throw the old player away and start a new one
  if (music && musicSong !== id) {
    quietly(() => music!.remove());
    music = null;
  }
  if (!music) {
    const song = SONGS.find((x) => x.id === id) ?? SONGS[0];
    music = createAudioPlayer(song.file);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    musicSong = song.id;
  }
  return music;
}

/** Start the music if it is switched on and a child is signed in; otherwise stop it. */
export function ensureMusic() {
  const st = useStore.getState();
  if (st.musicOn && isChild()) {
    quietly(() => {
      const m = getMusic();
      if (!m.playing) m.play();
    });
  } else {
    stopMusic();
  }
}

export function stopMusic() {
  if (music) quietly(() => music!.pause());
}
