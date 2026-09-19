import { Link } from 'expo-router';
import type { IconName } from '@/components/icon';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Dotty } from '@/components/pet/dotty';
import { ServerField } from '@/components/server-field';
import { Body, Button, Card, Field, H1, Row, Screen, Small } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { NetworkError, authErrorText } from '@/lib/api';
import { login } from '@/lib/session';

const DEMO: { label: string; email: string; icon: IconName }[] = [
  { label: 'Maya (child)', email: 'child@dotty.demo', icon: 'human-child' },
  { label: 'Alex (parent)', email: 'parent@dotty.demo', icon: 'account-heart' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showServer, setShowServer] = useState(false);

  async function submit(e = email, p = password, key = 'form') {
    setBusy(key);
    setError(null);
    try {
      await login(e, p);
    } catch (err) {
      setError(authErrorText(err));
      if (err instanceof NetworkError) setShowServer(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: S.lg }}>
        <Dotty equipped={{ color: 'color_sky', hat: null, accessory: null, background: 'bg_day' }} size={150} />
        <H1 style={{ marginTop: S.sm }}>Dotty</H1>
        <Body color={C.inkSoft} style={{ textAlign: 'center' }}>
          Look after Dotty, and Dotty looks after you.
        </Body>
      </View>

      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={() => submit()} />
        {error ? <Small color={C.danger}>{error}</Small> : null}
        <Button title="Log in" onPress={() => submit()} loading={busy === 'form'} disabled={!email || !password} />
        <Link href="/auth/join" asChild>
          <Pressable style={{ alignItems: 'center', paddingVertical: S.sm }}>
            <Small color={C.primaryDark}>New here? Create an account</Small>
          </Pressable>
        </Link>
      </Card>

      <Card tint={C.sunSoft}>
        <Small color={C.ink}>Demo accounts (password demo1234)</Small>
        <Row style={{ flexWrap: 'wrap' }}>
          {DEMO.map((d) => (
            <Button
              key={d.email}
              title={d.label}
              icon={d.icon}
              variant="sun"
              loading={busy === d.email}
              onPress={() => submit(d.email, 'demo1234', d.email)}
            />
          ))}
        </Row>
      </Card>

      <Pressable onPress={() => setShowServer((v) => !v)}>
        <Small style={{ textAlign: 'center' }}>{showServer ? 'Hide server settings' : 'Server settings'}</Small>
      </Pressable>
      {showServer && (
        <Card>
          <ServerField />
        </Card>
      )}
    </Screen>
  );
}
