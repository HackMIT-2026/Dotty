import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DotCoin, Icon, IconTile, type IconName } from '@/components/icon';
import { Dotty } from '@/components/pet/dotty';
import { SettingsButton } from '@/components/page-header';
import { PetScene } from '@/components/pet/scene';
import { SyncBadge } from '@/components/sync-badge';
import { Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font, shadow } from '@/constants/theme';
import { MOOD_MESSAGES, computeQuests, lastReading, moodFor, needs } from '@/lib/derive';
import { CARE_ACTIONS, DEFAULT_EQUIPPED } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/time';

function Meter({ icon, label, value, color }: { icon: IconName; label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Row style={{ gap: 4 }}>
        <Icon name={icon} size={16} color={color} />
        <Small color={C.ink}>{label}</Small>
      </Row>
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
          <View style={styles.glass}>
            <DotCoin size={20} />
            <Text style={styles.dotsText}>{pet?.dots ?? 0}</Text>
          </View>
          <Row>
            <SyncBadge />
            <SettingsButton />
          </Row>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{MOOD_MESSAGES[mood]}</Text>
          <View style={styles.bubbleTail} />
        </View>
        <Dotty equipped={equipped} mood={mood} size={230} cheer={cheer} />
      </PetScene>

      <View style={styles.body}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <H2>{pet?.name ?? 'Dotty'}</H2>
            <Small>
              Hi {name ?? 'friend'}! Level {pet?.level ?? 1}
            </Small>
          </View>
          <View style={styles.streak}>
            <Icon name="fire" size={18} color="#E8590C" />
            <Text style={styles.streakText}>{pet?.streak_days ?? 0} day streak</Text>
          </View>
        </Row>
        <ProgressBar value={pet ? pet.level_progress / pet.dots_per_level : 0} color={C.primary} height={8} />

        <Card>
          <Row style={{ gap: S.md }}>
            <Meter icon="silverware-fork-knife" label="Tummy" value={need.belly} color="#F5A524" />
            <Meter icon="soccer" label="Fun" value={need.fun} color={C.mint} />
            <Meter icon="heart" label="Love" value={need.heart} color={C.pink} />
          </Row>
        </Card>

        <View style={styles.grid}>
          {CARE_ACTIONS.map((a) => (
            <Pressable
              key={a.mode}
              onPress={() => router.navigate({ pathname: '/child/log', params: { mode: a.mode } })}
              style={({ pressed }) => [styles.action, { backgroundColor: a.tint }, pressed && { transform: [{ scale: 0.96 }] }]}>
              <IconTile name={a.icon} color="#fff" tint={a.color} size={56} radius={R.lg} />
              <Text style={styles.actionText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.navigate('/child/quests')}>
          <Card tint={C.primarySoft}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ gap: 6 }}>
                <Icon name="trophy" size={18} color={C.primaryDark} />
                <Small color={C.primaryDark}>Today's quests</Small>
              </Row>
              <Row style={{ gap: 2 }}>
                <Small color={C.primaryDark}>
                  {questsDone}/{quests.length} done
                </Small>
                <Icon name="chevron-right" size={18} color={C.primaryDark} />
              </Row>
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
  glass: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  dotsText: { ...font('900'), fontSize: 17, color: C.ink },
  bubble: { backgroundColor: '#fff', borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: 10, maxWidth: 280, ...shadow },
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: { ...font('800'), fontSize: 16, color: C.ink, textAlign: 'center' },
  body: { padding: S.md, gap: S.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.sunSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  streakText: { ...font('800'), fontSize: 14, color: '#B7791F' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  action: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: S.md, borderRadius: R.lg, gap: S.sm },
  actionText: { ...font('800'), fontSize: 17, color: C.ink },
});
