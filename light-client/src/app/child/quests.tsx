import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, H1, H2, ProgressBar, Row, Screen, Small } from '@/components/ui';
import { C, FONT, R, S } from '@/constants/theme';
import { computeQuests } from '@/lib/derive';
import { BADGES } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/time';

const QUEST_EMOJI: Record<string, string> = { checks: '🩺', lunch: '🥪', play: '⚽' };

export default function Quests() {
  const now = useNow();
  const pet = useStore((s) => s.pet);
  const events = useStore((s) => s.events);
  const quests = computeQuests(events, now);
  const allDone = quests.every((q) => q.done);

  return (
    <Screen>
      <H1>Quests</H1>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Today</H2>
          <Small color={allDone ? C.mint : C.inkSoft}>{allDone ? 'All done! +50 bonus' : 'Finish all 3 for +50 Dots'}</Small>
        </Row>
        {quests.map((q) => (
          <View key={q.id} style={styles.quest}>
            <Text style={{ fontSize: 28 }}>{q.done ? '✅' : QUEST_EMOJI[q.id]}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Body style={q.done ? { color: C.inkSoft } : undefined}>{q.title}</Body>
              <ProgressBar value={q.progress / q.target} color={q.done ? C.mint : C.primary} />
            </View>
            <Small>
              {q.progress}/{q.target}
            </Small>
          </View>
        ))}
      </Card>

      <Card tint={C.sunSoft}>
        <Row>
          <Text style={{ fontSize: 36 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <H2>{pet?.streak_days ?? 0} day streak</H2>
            <Small color={C.ink}>3 check-ups a day keeps your streak going. 3, 7 and 30 days earn big bonuses!</Small>
          </View>
        </Row>
      </Card>

      <Card>
        <H2>Level {pet?.level ?? 1}</H2>
        <ProgressBar value={pet ? pet.level_progress / pet.dots_per_level : 0} color={C.primary} />
        <Small>{pet ? `${pet.dots_per_level - pet.level_progress} more Dots to level ${pet.level + 1}` : 'Log something to start leveling up'}</Small>
      </Card>

      <H2>Badges</H2>
      <View style={styles.badges}>
        {Object.entries(BADGES).map(([id, b]) => {
          const earned = pet?.badges.includes(id);
          return (
            <View key={id} style={[styles.badge, earned ? styles.badgeOn : null]}>
              <Text style={{ fontSize: 34, opacity: earned ? 1 : 0.3 }}>{b.emoji}</Text>
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
  badge: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', padding: S.md, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 2, borderColor: C.line },
  badgeOn: { borderColor: C.sun, backgroundColor: C.sunSoft },
  badgeName: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 4 },
  badgeHow: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.inkSoft, textAlign: 'center' },
});
