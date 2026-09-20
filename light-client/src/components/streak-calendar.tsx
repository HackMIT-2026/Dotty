import { StyleSheet, Text, View } from 'react-native';

import { BORDER, C, R, S, font } from '@/constants/theme';
import { dateKey } from '@/lib/tasks';
import type { DotEvent } from '@/lib/types';

import { Icon } from './icon';
import { ParentIcon } from './parent-icon';
import { ProgressBar } from './ui';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Same rule as the server (STREAK_MIN_READINGS in gamification.py): a day counts with this many check-ups. */
export const STREAK_MIN_CHECKUPS = 3;

interface Props {
  events: DotEvent[];
  now: number;
  streak: number;
  level: number;
  levelProgress: number; // 0 to 1
}

/**
 * This week as a little calendar: a mint check on each day with 3 check-ups (the rule for the streak, same as the
 * server), a ring around today, and the days still to come left blank. Missed days are just left plain, never marked.
 * A line under the week says how to keep the streak, and how far along today is.
 */
export function StreakCalendar({ events, now, streak, level, levelProgress }: Props) {
  const today = new Date(now);
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  // check-ups per day, counted the way the server counts the streak
  const checkups = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'reading' || e.source === 'simulator') continue;
    const k = dateKey(new Date(e.ts).getTime());
    checkups.set(k, (checkups.get(k) ?? 0) + 1);
  }
  const todayCount = checkups.get(dateKey(now)) ?? 0;
  const month = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.month}>{month}</Text>
        <View style={styles.streak}>
          <ParentIcon name="fire" size={20} />
          <Text style={styles.streakText}>{streak} day streak</Text>
        </View>
      </View>

      <View style={styles.week}>
        {LETTERS.map((letter, i) => {
          const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
          const key = dateKey(day.getTime());
          const isToday = key === dateKey(now);
          const future = day.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const done = (checkups.get(key) ?? 0) >= STREAK_MIN_CHECKUPS;
          return (
            <View key={i} style={styles.day} accessibilityLabel={`${day.toDateString()}${done ? ', streak day' : ''}`}>
              <Text style={styles.letter}>{letter}</Text>
              <View style={[styles.circle, done && styles.circleDone, isToday && styles.circleToday, future && { opacity: 0.55 }]}>
                {done ? <Icon name="check-bold" size={18} color={C.ink} /> : <Text style={styles.date}>{day.getDate()}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.rule}>
        <Icon name="information-outline" size={16} color={C.inkSoft} />
        <Text style={styles.ruleText}>
          {todayCount >= STREAK_MIN_CHECKUPS
            ? `Today's check-ups are done! ${todayCount} of ${STREAK_MIN_CHECKUPS}`
            : `Do ${STREAK_MIN_CHECKUPS} check-ups in a day to keep your streak. Today: ${todayCount} of ${STREAK_MIN_CHECKUPS}`}
        </Text>
      </View>

      <View style={styles.level}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={{ flex: 1 }}>
          <ProgressBar value={levelProgress} color={C.sun} height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  month: { ...font('900'), fontSize: 19, color: C.ink, flexShrink: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.sunSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 },
  streakText: { ...font('800'), fontSize: 14, color: '#B7791F' },
  week: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  letter: { ...font('800'), fontSize: 12, color: C.inkSoft },
  circle: {
    width: '100%',
    maxWidth: 44,
    aspectRatio: 1,
    borderRadius: R.pill,
    backgroundColor: C.card,
    borderWidth: BORDER,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: C.mint, borderColor: C.mint },
  circleToday: { borderColor: C.primary, borderWidth: 3 },
  date: { ...font('800'), fontSize: 15, color: C.ink },
  level: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  ruleText: { ...font('700'), fontSize: 13, lineHeight: 18, color: C.inkSoft, flex: 1, flexShrink: 1 },
  levelText: { ...font('800'), fontSize: 13, color: C.inkSoft },
});
