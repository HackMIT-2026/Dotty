import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BORDER, C, R, S, font, shadow } from '@/constants/theme';
import { EFFECT_STYLES, SONGS, playSfx } from '@/lib/sounds';
import { useStore } from '@/lib/store';

import { Icon } from './icon';

/**
 * The round ♪ button. Tapping it opens a small popup under the button (not a whole screen) where the child
 * switches background music and sound effects on or off separately, and picks a song.
 */
export function SoundButton() {
  const { width, height } = useWindowDimensions();
  const ref = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const musicOn = useStore((s) => s.musicOn);
  const soundOn = useStore((s) => s.soundOn);
  const song = useStore((s) => s.song);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const setSoundOn = useStore((s) => s.setSoundOn);
  const setSong = useStore((s) => s.setSong);
  const sfxStyle = useStore((s) => s.sfxStyle);
  const setSfxStyle = useStore((s) => s.setSfxStyle);
  const anyOn = musicOn || soundOn;

  function open() {
    ref.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }));
  }

  const cardWidth = Math.min(300, width - 2 * S.md);
  const left = anchor ? Math.max(S.md, Math.min(anchor.x + anchor.w - cardWidth, width - cardWidth - S.md)) : S.md;
  const top = anchor ? Math.min(anchor.y + anchor.h + 8, height - 460) : 0;

  return (
    <>
      <View ref={ref} collapsable={false}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel="Music and sound settings"
          hitSlop={8}
          style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Icon name={anyOn ? 'music' : 'music-off'} size={20} color={anyOn ? C.primaryDark : C.inkSoft} />
        </Pressable>
      </View>

      <Modal visible={anchor !== null} transparent animationType="none" onRequestClose={() => setAnchor(null)}>
        {/* the dark-free backdrop only catches the tap that closes the popup */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAnchor(null)} accessibilityLabel="Close music and sound settings" />
        <Animated.View entering={FadeIn.duration(140)} style={[styles.card, { left, top, width: cardWidth }]}>
          <Text style={styles.title}>Music and sounds</Text>

          <View style={styles.row}>
            <Icon name="music" size={22} color={C.primaryDark} />
            <Text style={styles.rowText}>Background music</Text>
            <Switch value={musicOn} onValueChange={setMusicOn} />
          </View>
          <View style={styles.row}>
            <Icon name="volume-high" size={22} color={C.primaryDark} />
            <Text style={styles.rowText}>Sound effects</Text>
            <Switch
              value={soundOn}
              onValueChange={(v) => {
                setSoundOn(v);
                if (v) setTimeout(() => playSfx('select'), 60);
              }}
            />
          </View>

          <Text style={styles.songTitle}>Button sound style</Text>
          <View style={styles.songs}>
            {EFFECT_STYLES.map((e) => {
              const on = e.id === sfxStyle;
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSfxStyle(e.id);
                    setSoundOn(true);
                    setTimeout(() => playSfx('success'), 60); // a preview of the style just picked
                  }}
                  style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.pillText, on && { color: C.ink }]}>{e.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.songTitle}>Song</Text>
          <View style={styles.songs}>
            {SONGS.map((s) => {
              const on = s.id === song;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSong(s.id);
                    setMusicOn(true);
                  }}
                  style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.pillText, on && { color: C.ink }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow },
  card: {
    position: 'absolute',
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: BORDER,
    borderColor: C.line,
    borderBottomWidth: 4,
    padding: S.md,
    gap: S.sm,
    ...shadow,
  },
  title: { ...font('900'), fontSize: 18, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 44 },
  rowText: { ...font('800'), fontSize: 16, color: C.ink, flex: 1, flexShrink: 1 },
  songTitle: { ...font('800'), fontSize: 13, color: C.inkSoft, marginTop: 2 },
  songs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  pillOn: { backgroundColor: C.sun, borderColor: C.sun },
  pillText: { ...font('800'), fontSize: 13, color: C.inkSoft },
});
