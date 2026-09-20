import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Chip, H2, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { FoodIcon } from '@/components/food-icon';
import { PlayIcon } from '@/components/play-icon';
import { ACTIVITIES, FOODS } from '@/data/foods';
import { saveLog } from '@/lib/log-action';
import { CARE_ACTIONS } from '@/lib/pet';
import type { Intensity } from '@/lib/types';
import { parseBg, useGlucoseUnit } from '@/lib/units';

type Mode = (typeof CARE_ACTIONS)[number]['mode'];

function goHome() {
  router.navigate('/child');
}

// ---------- check-up: big number pad ----------

function CheckUp() {
  const unit = useGlucoseUnit();
  const mmol = unit === 'mmol/L';
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const mgdl = parseBg(value, unit);

  const press = (k: string) => {
    if (k === 'del') return setValue((v) => v.slice(0, -1));
    setValue((v) => {
      if (k === '.') return !mmol || v.includes('.') ? v : (v || '0') + '.';
      if (mmol) {
        const [whole, dec] = (v + k).split('.');
        if (whole.length > 2 || (dec ?? '').length > 1) return v; // e.g. 12.4
        return (v + k).replace(/^0+(?=\d)/, '');
      }
      return v.length >= 3 ? v : (v + k).replace(/^0+/, ''); // e.g. 142
    });
  };

  async function save() {
    if (mgdl == null) return;
    setBusy(true);
    await saveLog('reading', { bg_mgdl: mgdl, context: 'fingerstick', entered: `${value} ${unit}` });
    setBusy(false);
    setValue('');
    goHome();
  }

  return (
    <Card>
      <H2>What does your meter say?</H2>
      <View style={styles.display}>
        <Text style={styles.displayText}>{value || '---'}</Text>
        <Small>{unit}</Small>
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', mmol ? '.' : '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable key={i} onPress={() => press(k)} style={({ pressed }) => [styles.key, styles.keyOn, pressed && { backgroundColor: C.primarySoft }]}>
              {k === 'del' ? <Icon name="backspace-outline" size={26} color={C.ink} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
      <Button title="Save check-up" icon="check-bold" size="lg" onPress={save} disabled={mgdl == null} loading={busy} />
    </Card>
  );
}

// ---------- eat: food cards ----------

function Eat() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const total = FOODS.reduce((sum, f) => sum + (counts[f.id] ?? 0) * f.carbs, 0);
  const picked = FOODS.filter((f) => counts[f.id]);

  async function save() {
    setBusy(true);
    await saveLog('meal', { carbs_g: total, items: picked.map((f) => ({ id: f.id, name: f.name, n: counts[f.id], carbs: f.carbs })) });
    setBusy(false);
    setCounts({});
    goHome();
  }

  return (
    <Card>
      <H2>What are you eating?</H2>
      <Small>Tap a food to add it. Tap again for more.</Small>
      <View style={styles.foods}>
        {FOODS.map((f) => {
          const c = counts[f.id] ?? 0;
          return (
            <Pressable
              key={f.id}
              onPress={() => setCounts((s) => ({ ...s, [f.id]: c + 1 }))}
              onLongPress={() => setCounts((s) => ({ ...s, [f.id]: Math.max(0, c - 1) }))}
              style={({ pressed }) => [styles.food, c > 0 && styles.foodOn, pressed && { transform: [{ scale: 0.95 }] }]}>
              <FoodIcon id={f.id} size={54} />
              <Text style={styles.foodName} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={styles.foodCarbs}>{f.carbs} g</Text>
              {c > 0 && (
                <View style={styles.count}>
                  <Text style={styles.countText}>{c}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body>
          Total: <Text style={font('900')}>{total} g carbs</Text>
        </Body>
        {picked.length > 0 && <Button title="Clear" variant="ghost" onPress={() => setCounts({})} />}
      </Row>
      <Button title="Eat with Dotty" icon="silverware-fork-knife" size="lg" onPress={save} disabled={total === 0} loading={busy} />
    </Card>
  );
}

// ---------- play ----------

const INTENSITY: { id: Intensity; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Easy', icon: 'turtle' },
  { id: 'moderate', label: 'Medium', icon: 'rabbit' },
  { id: 'vigorous', label: 'Super fast', icon: 'rocket-launch' },
];

function Play() {
  const [kind, setKind] = useState('soccer');
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await saveLog('activity', { kind, minutes, intensity });
    setBusy(false);
    goHome();
  }

  return (
    <Card>
      <H2>What did you play?</H2>
      <Row style={{ flexWrap: 'wrap' }}>
        {ACTIVITIES.map((a) => (
          <Chip key={a.id} label={a.name} icon={a.icon} art={<PlayIcon id={a.id} />} selected={kind === a.id} onPress={() => setKind(a.id)} />
        ))}
      </Row>
      <Small>For how long?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {[15, 30, 45, 60, 90].map((m) => (
          <Chip key={m} label={`${m} min`} icon="timer-outline" art={<PlayIcon id={`min-${m}`} />} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Row>
      <Small>How hard?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {INTENSITY.map((i) => (
          <Chip key={i.id} label={i.label} icon={i.icon} art={<PlayIcon id={i.id} />} selected={intensity === i.id} onPress={() => setIntensity(i.id)} />
        ))}
      </Row>
      <Button title="Play with Dotty" icon="party-popper" size="lg" onPress={save} loading={busy} />
    </Card>
  );
}

// ---------- medicine ----------

function Medicine() {
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    await saveLog('bolus', { reason: 'child_confirmed' });
    setBusy(false);
    goHome();
  }
  return (
    <Card>
      <H2>Medicine time</H2>
      <Body color={C.inkSoft}>Did you and your parent do your insulin? Tell Dotty!</Body>
      <Button title="I did my medicine" icon="water-check" size="lg" variant="mint" onPress={save} loading={busy} />
    </Card>
  );
}

export default function Log() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('checkup');

  useEffect(() => {
    if (params.mode && CARE_ACTIONS.some((m) => m.mode === params.mode)) setMode(params.mode as Mode);
  }, [params.mode]);

  return (
    <Screen background={C.pageCare}>
      <PageHeader title="Care" />
      <View style={styles.modes}>
        {CARE_ACTIONS.map((m) => (
          <Pressable
            key={m.mode}
            onPress={() => setMode(m.mode)}
            style={[styles.mode, { backgroundColor: m.tint }, mode === m.mode && { borderColor: m.color }]}>
            <Image source={m.image} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <Text style={styles.modeText}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'checkup' && <CheckUp />}
      {mode === 'eat' && <Eat />}
      {mode === 'play' && <Play />}
      {mode === 'medicine' && <Medicine />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: S.sm },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R.md, borderWidth: 3, borderColor: 'transparent' },
  modeText: { ...font('800'), fontSize: 13, color: C.ink },
  display: { alignItems: 'center', paddingVertical: S.sm },
  displayText: { ...font('800'), fontSize: 56, color: C.ink, letterSpacing: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  key: { width: '30%', height: 58, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  keyOn: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  keyText: { ...font('800'), fontSize: 26, color: C.ink },
  foods: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  food: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: R.md,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
  },
  foodOn: { borderColor: C.sun, backgroundColor: C.sunSoft },
  foodName: { ...font('700'), fontSize: 11, color: C.ink, marginTop: 2 },
  foodCarbs: { ...font('600'), fontSize: 11, color: C.inkSoft },
  count: { position: 'absolute', top: -6, right: -6, backgroundColor: C.primary, borderRadius: R.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', ...font('900'), fontSize: 12 },
});
