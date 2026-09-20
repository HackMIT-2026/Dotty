import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DotCoin, Icon } from '@/components/icon';
import { Dotty } from '@/components/pet/dotty';
import { SettingsButton } from '@/components/page-header';
import { SoundButton } from '@/components/sound-button';
import { SceneBackdrop } from '@/components/pet/scene';
import { SpeechBubble } from '@/components/speech-bubble';
import { StreakCalendar } from '@/components/streak-calendar';
import { SyncBadge } from '@/components/sync-badge';
import { Card, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { BORDER, C, MAX_WIDTH, R, S, font, shadow } from '@/constants/theme';
import { computeQuests, dottyState, needs } from '@/lib/derive';
import { CARE_ACTIONS, DEFAULT_EQUIPPED } from '@/lib/pet';
import { playSfx } from '@/lib/sounds';
import { useStore } from '@/lib/store';
import { childPlan, planToday } from '@/lib/tasks';
import { useNow } from '@/lib/time';

function Meter({ image, label, value, color }: { image: ImageSourcePropType; label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Row style={{ gap: 4 }}>
        <Image source={image} style={styles.meterIcon} resizeMode="contain" />
        <Small color={C.ink}>{label}</Small>
      </Row>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

/** Space under the speech bubble: small, but enough that a hat does not poke into it. */
function hatGap(hat: string | null): number {
  if (!hat) return 8;
  return ['hat_party', 'hat_crown', 'hat_wizard'].includes(hat) ? 54 : 30;
}

export default function ChildHome() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const now = useNow();
  const pet = useStore((s) => s.pet);
  const events = useStore((s) => s.events);
  const cheer = useStore((s) => s.cheer);
  const tasks = useStore((s) => s.tasks);

  const today = planToday(tasks, events, now);
  const plan = childPlan(today.items);
  const { mood, message, celebrate } = dottyState(events, now, today.items.some((i) => i.status === 'missed'));
  const need = needs(events, now, tasks);
  const habits = computeQuests(events, now, tasks.some((t) => t.kind === 'check'));
  const quests = plan.total > 0 ? { done: plan.done, total: plan.total, label: "Dotty's big quests" } : { done: habits.filter((q) => q.done).length, total: habits.length, label: "Today's quests" };
  const equipped = pet?.equipped ?? DEFAULT_EQUIPPED;

  const left = quests.total - quests.done;
  const heroHeight = Math.max(380, Math.round(height * 0.46));

  return (
    <View style={styles.page}>
      <View style={styles.column}>
        <SceneBackdrop background={equipped.background} />
        <Screen bleed background="transparent">
          <View style={[styles.hero, { height: heroHeight, paddingTop: insets.top }]}>
            <View style={[styles.topBar, { top: insets.top + S.sm }]}>
              <View style={styles.glass}>
                <DotCoin size={20} />
                <Text style={styles.dotsText}>{pet?.dots ?? 0}</Text>
              </View>
              <Row>
                <SyncBadge />
                <SoundButton />
                <SettingsButton />
              </Row>
            </View>
            <SpeechBubble text={message} gap={hatGap(equipped.hat)} />
            <Dotty equipped={equipped} mood={mood} size={230} cheer={cheer} celebrate={celebrate} muteCheer={!celebrate && (mood === 'shaky' || mood === 'sluggish')} />
          </View>

          <View style={styles.body}>
            <Card tint={C.glass} style={styles.glassCard}>
              <StreakCalendar
                events={events}
                now={now}
                streak={pet?.streak_days ?? 0}
                level={pet?.level ?? 1}
                levelProgress={pet ? pet.level_progress / pet.dots_per_level : 0}
              />
            </Card>

            <Card tint={C.glass} style={styles.glassCard}>
              <Row style={{ gap: S.md }}>
                <Meter image={require('@/assets/icons/tummy.png')} label="Tummy" value={need.belly} color="#F5A524" />
                <Meter image={require('@/assets/icons/fun.png')} label="Fun" value={need.fun} color={C.mint} />
                <Meter image={require('@/assets/icons/love.png')} label="Love" value={need.heart} color={C.pink} />
              </Row>
            </Card>

            <Pressable onPress={() => router.navigate('/child/quests')}>
              <Card tint={C.glass} style={styles.glassCard}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 6, flex: 1 }}>
                    <Image source={require('@/assets/icons/trophy.png')} style={styles.trophy} resizeMode="contain" />
                    <Text style={styles.goalsText}>{left > 0 ? `${left} ${left === 1 ? 'quest' : 'quests'} left today!` : 'All quests done. Great job!'}</Text>
                  </Row>
                  <Row style={{ gap: 2 }}>
                    <Small color={C.primaryDark}>
                      {quests.done}/{quests.total} done
                    </Small>
                    <Icon name="chevron-right" size={18} color={C.primaryDark} />
                  </Row>
                </Row>
                <ProgressBar value={quests.total ? quests.done / quests.total : 0} color={C.primary} />
              </Card>
            </Pressable>

            <View style={styles.list}>
              {CARE_ACTIONS.map((a) => (
                <Pressable
                  key={a.mode}
                  onPress={() => {
                    playSfx('select');
                    router.navigate({ pathname: '/child/log', params: { mode: a.mode } });
                  }}
                  style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <Image source={a.image} style={styles.actionIcon} resizeMode="contain" />
                  <Text style={styles.actionText}>{a.label}</Text>
                  <View style={styles.go}>
                    <Icon name="chevron-right" size={26} color={C.ink} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Screen>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', overflow: 'hidden' },
  hero: { alignItems: 'center', justifyContent: 'flex-end' },
  topBar: { position: 'absolute', left: S.md, right: S.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  dotsText: { ...font('900'), fontSize: 17, color: C.ink },
  body: { padding: S.md, gap: S.md, width: '100%', paddingBottom: S.xl },
  glassCard: { borderColor: C.glassLine, borderRadius: R.lg },
  goalsText: { ...font('800'), fontSize: 17, color: C.primaryDark, flexShrink: 1 },
  meterIcon: { width: 28, height: 28 },
  trophy: { width: 32, height: 32 },
  actionIcon: { width: 56, height: 56 },
  list: { gap: S.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: BORDER,
    borderColor: C.glassLine,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    ...shadow,
  },
  actionText: { ...font('800'), fontSize: 19, color: C.ink, flex: 1 },
  go: { width: 48, height: 48, borderRadius: R.md, backgroundColor: C.sand, borderBottomWidth: 4, borderBottomColor: C.sandEdge, alignItems: 'center', justifyContent: 'center' },
});
