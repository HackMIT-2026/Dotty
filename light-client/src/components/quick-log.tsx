import { useState } from 'react';

import { C } from '@/constants/theme';
import { saveLog } from '@/lib/log-action';
import { useStore } from '@/lib/store';
import { parseBg, rangeHint, useGlucoseUnit } from '@/lib/units';

import type { IconName } from './icon';
import { Button, Chip, Field, Row, Small } from './ui';

type Kind = 'reading' | 'meal' | 'bolus' | 'activity';

const KINDS: { id: Kind; label: string; icon: IconName; field: string; min: number; max: number }[] = [
  { id: 'reading', label: 'Glucose', icon: 'water', field: 'mg/dL', min: 20, max: 600 },
  { id: 'meal', label: 'Carbs', icon: 'silverware-fork-knife', field: 'grams of carbs', min: 1, max: 300 },
  { id: 'bolus', label: 'Insulin', icon: 'needle', field: 'units', min: 0.5, max: 100 },
  { id: 'activity', label: 'Activity', icon: 'run', field: 'minutes', min: 1, max: 300 },
];

/** Lets a parent log on the child's behalf. Goes through the same offline outbox as the child's logs. */
export function QuickLog() {
  const [kind, setKind] = useState<Kind>('reading');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const pushToast = useStore((s) => s.pushToast);
  const unit = useGlucoseUnit();
  const k = KINDS.find((x) => x.id === kind)!;
  const field = kind === 'reading' ? unit : k.field;
  const n = Number(value.replace(',', '.'));
  const bgMgdl = kind === 'reading' ? parseBg(value, unit) : null;
  const valid = kind === 'reading' ? bgMgdl != null : value !== '' && !Number.isNaN(n) && n >= k.min && n <= k.max;

  async function save() {
    setBusy(true);
    const data =
      kind === 'reading'
        ? { bg_mgdl: bgMgdl, context: 'parent', entered: `${value} ${unit}` }
        : kind === 'meal'
          ? { carbs_g: Math.round(n), items: [] }
          : kind === 'bolus'
            ? { units: n, reason: 'manual' }
            : { kind: 'activity', minutes: Math.round(n), intensity: 'moderate' };
    await saveLog(kind, data);
    if (useStore.getState().online) pushToast({ kind: 'info', text: 'Logged', sub: `${k.label}: ${value} ${field}` });
    setValue('');
    setBusy(false);
  }

  return (
    <>
      <Row style={{ flexWrap: 'wrap' }}>
        {KINDS.map((x) => (
          <Chip key={x.id} label={x.label} icon={x.icon} selected={kind === x.id} onPress={() => { setKind(x.id); setValue(''); }} />
        ))}
      </Row>
      <Field label={field} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0" onSubmitEditing={() => valid && save()} />
      {value !== '' && !valid ? (
        <Small color={C.danger}>Enter a value between {kind === 'reading' ? rangeHint(unit) : `${k.min} and ${k.max}`}.</Small>
      ) : null}
      <Button title="Save" onPress={save} disabled={!valid} loading={busy} />
    </>
  );
}
