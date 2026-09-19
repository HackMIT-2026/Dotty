import { StyleSheet, Text, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Card, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { computeQuests } from '@/lib/derive';
import { BADGES } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/time';

const QUEST_ICON: Record<string, { icon: IconName; color: string; tint: string }> = {
  checks: { icon: 'heart-pulse', color: '#E0518D', tint: C.pinkSoft },
  lunch: { icon: 'food-apple', color: '#D97706', tint: C.sunSoft },
  play: { icon: 'soccer', color: '#1F9D74', tint: C.mintSoft },
};

export default function Quests() {
  const now = useNow();
  const pet = useStore((s) => s.pet);
  const events = useStore((s) => s.events);
  const quests = computeQuests(events, now);
  const allDone = quests.every((q) => q.done);

  return (
    <Screen>
      <PageHeader title="Quests" />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Today</H2>
          <Small color={allDone ? C.mint : C.inkSoft}>{allDone ? 'All done! +50 bonus' : 'Finish all 3 for +50 Dots'}</Small>
        </Row>
        {quests.map((q) => {
          const look = QUEST_ICON[q.id];
          return (
            <View key={q.id} style={styles.quest}>
              {q.done ? (
                <IconTile name="check-bold" color="#fff" tint={C.mint} size={44} />
              ) : (
                <IconTile name={look.icon} color={look.color} tint={look.tint} size={44} />
              )}
              <View style={{ flex: 1, gap: 6 }}>
                <Body style={q.done ? { color: C.inkSoft } : undefined}>{q.title}</Body>
                <ProgressBar value={q.progress / q.target} color={q.done ? C.mint : C.primary} />
              </View>
              <Small>
                {q.progress}/{q.target}
              </Small>
            </View>
          );
        })}
      </Card>

      <Card tint={C.sunSoft}>
        <Row style={{ gap: S.md }}>
          <IconTile name="fire" color="#fff" tint="#F76707" size={52} radius={R.lg} />
          <View style={{ flex: 1 }}>
            <H2>{pet?.streak_days ?? 0} day streak</H2>
            <Small color={C.ink}>3 check-ups a day keeps your streak going. 3, 7 and 30 days earn big bonuses!</Small>
          </View>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Level {pet?.level ?? 1}</H2>
          <Icon name="star-circle" size={26} color={C.primary} />
        </Row>
        <ProgressBar value={pet ? pet.level_progress / pet.dots_per_level : 0} color={C.primary} />
        <Small>{pet ? `${pet.dots_per_level - pet.level_progress} more Dots to level ${pet.level + 1}` : 'Log something to start leveling up'}</Small>
      </Card>

      <H2>Badges</H2>
      <View style={styles.badges}>
        {Object.entries(BADGES).map(([id, b]) => {
          const earned = pet?.badges.includes(id);
          return (
            <View key={id} style={[styles.badge, earned ? { borderColor: b.color, backgroundColor: b.tint } : null]}>
              <View style={{ opacity: earned ? 1 : 0.35 }}>
                <IconTile name={earned ? b.icon : 'lock-outline'} color={earned ? '#fff' : C.inkSoft} tint={earned ? b.color : C.line} size={58} radius={29} />
              </View>
              <Text style={styles.badgeName}>{b.name}</Text>
              <Text style={styles.badgeHow}>{earned ? 'Earned!' : b.how}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quest: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  badge: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', padding: S.md, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, gap: 4 },
  badgeName: { ...font('800'), fontSize: 15, color: C.ink, marginTop: 4 },
  badgeHow: { ...font('600'), fontSize: 12, color: C.inkSoft, textAlign: 'center' },
});
