import { useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { apiBase } from '@/lib/api';
import { defaultApiUrl } from '@/lib/config';
import { useStore } from '@/lib/store';

import { Button, Field, Row, Small } from './ui';

/** Where the app finds the Dotty API. On a phone this is the laptop's Wi-Fi address, e.g. http://192.168.1.20:8000 */
export function ServerField() {
  const apiUrl = useStore((s) => s.apiUrl);
  const setApiUrl = useStore((s) => s.setApiUrl);
  const [draft, setDraft] = useState(apiUrl ?? '');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  async function test() {
    const url = draft.trim().replace(/\/+$/, '');
    setApiUrl(url || null);
    setTesting(true);
    setStatus(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url || defaultApiUrl()}/health`, { signal: controller.signal });
      clearTimeout(timer);
      setStatus(res.ok ? { ok: true, text: 'Connected to Dotty' } : { ok: false, text: `Server answered ${res.status}` });
    } catch {
      setStatus({ ok: false, text: "Can't reach that address. Same Wi-Fi? Server running?" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <View style={{ gap: S.sm }}>
      <Field
        label="Server address"
        value={draft}
        onChangeText={setDraft}
        placeholder={defaultApiUrl()}
        keyboardType="url"
        autoCorrect={false}
      />
      <Row>
        <Button title="Save & test" variant="secondary" onPress={test} loading={testing} />
        <Small style={{ flex: 1 }} color={status ? (status.ok ? C.good : C.danger) : C.inkSoft}>
          {status ? status.text : `Using ${apiBase()}`}
        </Small>
      </Row>
    </View>
  );
}
