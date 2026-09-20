import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon, IconTile, type IconName } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Body, Button, Card, Chip, H2, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font } from '@/constants/theme';
import { ACTIVITIES, FOODS } from '@/data/foods';
import { api } from '@/lib/api';
import { logGuard } from '@/lib/limits';
import { saveLog } from '@/lib/log-action';
import { CARE_ACTIONS } from '@/lib/pet';
import { useStore } from '@/lib/store';
import { useNow } from '@/lib/time';
import type { DotEvent, Intensity } from '@/lib/types';
import { parseBg, useGlucoseUnit } from '@/lib/units';

type Mode = (typeof CARE_ACTIONS)[number]['mode'];

function goHome() {
  router.navigate('/child');
}

/**
 * Dotty asks for a little time between one log and the next (lib/limits.ts, mirroring the server). The child
 * sees why the button is resting instead of tapping it ten times for Dots that would never arrive.
 */
function useGuard(type: DotEvent['type']) {
  const events = useStore((s) => s.events);
  const now = useNow();
  return logGuard(events, type, now);
}

function Resting({ message }: { message: string }) {
  return (
    <Row style={styles.resting}>
      <Icon name="sleep" size={20} color={C.primaryDark} />
      <Body color={C.primaryDark} style={{ flex: 1 }}>
        {message}
      </Body>
    </Row>
  );
}

// ---------- check-up: big number pad ----------

function CheckUp() {
  const unit = useGlucoseUnit();
  const mmol = unit === 'mmol/L';
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const mgdl = parseBg(value, unit);
  const guard = useGuard('reading');

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
      {guard.ok ? null : <Resting message={guard.message!} />}
      <Button title="Save check-up" icon="check-bold" size="lg" onPress={save} disabled={mgdl == null || !guard.ok} loading={busy} />
    </Card>
  );
}

// ---------- eat: food cards, one tap each ----------

/** A food the child typed in. `label` is what the server understood it to be; the grams stay with the grown-ups. */
interface TypedFood {
  text: string;
  label: string;
  needs_parent: boolean;
}

function Eat() {
  const [picked, setPicked] = useState<string[]>([]);
  const [typed, setTyped] = useState<TypedFood[]>([]);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const guard = useGuard('meal');
  const count = picked.length + typed.length;
  const askedFor = help || typed.some((f) => f.needs_parent);

  function toggle(id: string) {
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function clear() {
    setPicked([]);
    setTyped([]);
    setHelp(false);
  }

  /** Add whatever the child typed. The server names it back ("Mac and cheese") and says if a grown-up is needed. */
  async function add() {
    const what = text.trim();
    if (!what || adding) return;
    setAdding(true);
    let food: TypedFood = { text: what, label: what, needs_parent: true };
    try {
      const seen = await api<{ label: string; needs_parent: boolean; known: boolean }>('/food/estimate', {
        method: 'POST',
        body: { text: what },
      });
      food = { text: what, label: seen.label || what, needs_parent: seen.needs_parent };
    } catch {
      // offline: keep the words, the server works them out when this uploads
    }
    setTyped((list) => [...list, food]);
    setText('');
    setAdding(false);
  }

  async function save() {
    setBusy(true);
    await saveLog('meal', {
      items: [...picked.map((id) => ({ id })), ...typed.map((f) => ({ text: f.text }))],
      ...(askedFor ? { help: true } : {}),
    });
    setBusy(false);
    clear();
    goHome();
  }

  return (
    <Card>
      <H2>What are you eating?</H2>
      <Small>Tap everything on your plate. Tap again to take it off.</Small>

      <View style={styles.foods}>
        {FOODS.map((f) => {
          const on = picked.includes(f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => toggle(f.id)}
              style={({ pressed }) => [styles.food, on && styles.foodOn, pressed && { transform: [{ scale: 0.95 }] }]}>
              <IconTile name={f.icon} color={f.color} tint={on ? '#fff' : `${f.color}1F`} size={38} radius={R.sm} />
              <Text style={styles.foodName} numberOfLines={1}>
                {f.name}
              </Text>
              {on && (
                <View style={styles.check}>
                  <Icon name="check-bold" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Row style={styles.addRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          placeholder="Something else? Type it here"
          placeholderTextColor="#A9A5C4"
          returnKeyType="done"
          style={styles.input}
        />
        <Button title="Add" icon="plus" variant="secondary" onPress={add} disabled={!text.trim()} loading={adding} />
      </Row>

      {/* The plate keeps its size whatever is on it, so nothing below ever jumps. */}
      <View style={styles.plate}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Small>On the plate</Small>
          <Pressable onPress={clear} disabled={count === 0} hitSlop={8} style={count === 0 && { opacity: 0 }}>
            <Small color={C.primaryDark}>Clear</Small>
          </Pressable>
        </Row>
        <View style={styles.plateItems}>
          {count === 0 ? (
            <Small>Nothing yet — tap a food above.</Small>
          ) : (
            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              {picked.map((id) => {
                const f = FOODS.find((x) => x.id === id)!;
                return <Chip key={id} label={f.name} icon="close" selected onPress={() => toggle(id)} />;
              })}
              {typed.map((f, i) => (
                <Chip
                  key={`${f.text}-${i}`}
                  label={f.label}
                  icon={f.needs_parent ? 'help-circle-outline' : 'close'}
                  selected
                  onPress={() => setTyped((list) => list.filter((_, j) => j !== i))}
                />
              ))}
            </Row>
          )}
        </View>
      </View>

      {guard.ok ? null : <Resting message={guard.message!} />}
      <Button title="Eat with Dotty" icon="silverware-fork-knife" size="lg" onPress={save} disabled={count === 0 || !guard.ok} loading={busy} />
      <Pressable onPress={() => setHelp((v) => !v)} disabled={count === 0} style={({ pressed }) => [styles.ask, pressed && { opacity: 0.7 }, count === 0 && { opacity: 0.4 }]}>
        <Icon name={askedFor ? 'account-heart' : 'account-heart-outline'} size={18} color={C.primaryDark} />
        <Small color={C.primaryDark}>{askedFor ? 'A grown-up will check this one' : 'Not sure? Ask a grown-up'}</Small>
      </Pressable>
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
  const guard = useGuard('activity');

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
          <Chip key={a.id} label={a.name} icon={a.icon} selected={kind === a.id} onPress={() => setKind(a.id)} />
        ))}
      </Row>
      <Small>For how long?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {[15, 30, 45, 60, 90].map((m) => (
          <Chip key={m} label={`${m} min`} icon="timer-outline" selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Row>
      <Small>How hard?</Small>
      <Row style={{ flexWrap: 'wrap' }}>
        {INTENSITY.map((i) => (
          <Chip key={i.id} label={i.label} icon={i.icon} selected={intensity === i.id} onPress={() => setIntensity(i.id)} />
        ))}
      </Row>
      {guard.ok ? null : <Resting message={guard.message!} />}
      <Button title="Play with Dotty" icon="party-popper" size="lg" onPress={save} loading={busy} disabled={!guard.ok} />
    </Card>
  );
}

// ---------- medicine ----------

function Medicine() {
  const [busy, setBusy] = useState(false);
  const guard = useGuard('bolus');

  async function save() {
    setBusy(true);
    await saveLog('bolus', { reason: 'child_confirmed' });
    setBusy(false);
    goHome();
  }
  return (
    <Card>
      <H2>Medicine time</H2>
      <Body color={C.inkSoft}>Did you and your grown-up do your insulin? Tell Dotty!</Body>
      {guard.ok ? null : <Resting message={guard.message!} />}
      <Button title="I did my medicine" icon="water-check" size="lg" variant="mint" onPress={save} loading={busy} disabled={!guard.ok} />
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
    <Screen>
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
    height: 74, // fixed, so selecting a food never resizes the grid
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: R.md,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
  },
  foodOn: { borderColor: C.sun, backgroundColor: C.sunSoft },
  foodName: { ...font('700'), fontSize: 11, color: C.ink, textAlign: 'center' },
  check: { position: 'absolute', top: -5, right: -5, backgroundColor: C.sun, borderRadius: R.pill, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  plate: { gap: 6, padding: 10, borderRadius: R.md, backgroundColor: C.bg, borderWidth: 2, borderColor: C.line },
  plateItems: { minHeight: 38, justifyContent: 'center' },
  ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  addRow: { gap: S.sm },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: R.md,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.line,
    ...font('600'),
    fontSize: 15,
    color: C.ink,
  },
  resting: { gap: 8, padding: 10, borderRadius: R.md, backgroundColor: C.primarySoft },
});
