import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dotty } from '@/components/pet/dotty';
import { PetScene } from '@/components/pet/scene';
import { SyncBadge } from '@/components/sync-badge';
import { Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, FONT, R, S, shadow } from '@/constants/theme';
import { MOOD_MESSAGES, computeQuests, lastReading, moodFor, needs } from '@/lib/derive';
import { DEFAULT_EQUIPPED } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/time';

const ACTIONS = [
  { mode: 'checkup', emoji: '🩺', label: 'Check-up', bg: C.pinkSoft },
  { mode: 'eat', emoji: '🍎', label: 'Eat', bg: C.sunSoft },
  { mode: 'play', emoji: '⚽', label: 'Play', bg: C.mintSoft },
  { mode: 'medicine', emoji: '💧', label: 'Medicine', bg: C.skySoft },
] as const;

function Meter({ emoji, label, value, color }: { emoji: string; label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Small color={C.ink}>
        {emoji} {label}
      </Small>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

export default function ChildHome() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const pet = useStore((s) => s.pet);
  const events = useStore((s) => s.events);
  const cheer = useStore((s) => s.cheer);
  const name = useStore((s) => s.session?.user.name);

  const mood = moodFor(lastReading(events), now);
  const need = needs(events, now);
  const quests = computeQuests(events, now);
  const questsDone = quests.filter((q) => q.done).length;
  const equipped = pet?.equipped ?? DEFAULT_EQUIPPED;

  return (
    <Screen bleed>
      <PetScene background={equipped.background} style={{ height: 380, paddingTop: insets.top }}>
        <View style={[styles.topBar, { top: insets.top + S.sm }]}>
          <View style={styles.dots}>
            <Text style={styles.dotsText}>🔵 {pet?.dots ?? 0}</Text>
          </View>
          <Row>
            <SyncBadge />
            <Pressable onPress={() => router.push('/settings')} style={styles.gear} accessibilityLabel="Settings">
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </Pressable>
          </Row>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{MOOD_MESSAGES[mood]}</Text>
        </View>
        <Dotty equipped={equipped} mood={mood} size={230} cheer={cheer} />
      </PetScene>

      <View style={styles.body}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <H2>{pet?.name ?? 'Dotty'}</H2>
            <Small>Hi {name ?? 'friend'}! Level {pet?.level ?? 1}</Small>
          </View>
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 {pet?.streak_days ?? 0} day streak</Text>
          </View>
        </Row>
        <ProgressBar value={pet ? pet.level_progress / pet.dots_per_level : 0} color={C.primary} height={8} />

        <Card>
          <Row style={{ gap: S.md }}>
            <Meter emoji="🍽️" label="Tummy" value={need.belly} color={C.sun} />
            <Meter emoji="⚽" label="Fun" value={need.fun} color={C.mint} />
            <Meter emoji="💖" label="Love" value={need.heart} color={C.pink} />
          </Row>
        </Card>

        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.mode}
              onPress={() => router.navigate({ pathname: '/child/log', params: { mode: a.mode } })}
              style={({ pressed }) => [styles.action, { backgroundColor: a.bg }, pressed && { transform: [{ scale: 0.96 }] }]}>
              <Text style={{ fontSize: 34 }}>{a.emoji}</Text>
              <Text style={styles.actionText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.navigate('/child/quests')}>
          <Card tint={C.primarySoft}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Small color={C.primaryDark}>🏆 Today's quests</Small>
              <Small color={C.primaryDark}>
                {questsDone}/{quests.length} done
              </Small>
            </Row>
            <ProgressBar value={questsDone / quests.length} color={C.primary} />
          </Card>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: S.md, right: S.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 },
  dotsText: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.ink },
  gear: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: R.pill, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bubble: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: 10, maxWidth: 280, ...shadow },
  bubbleText: { fontFamily: FONT, fontSize: 16, fontWeight: '700', color: C.ink, textAlign: 'center' },
  body: { padding: S.md, gap: S.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  streak: { backgroundColor: C.sunSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  streakText: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: '#B7791F' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  action: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: S.md, borderRadius: R.lg, gap: 4 },
  actionText: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.ink },
});
