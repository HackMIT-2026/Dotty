import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PIN_LENGTH, PinPad } from '@/components/pin-pad';
import { Body, Button, Card, Chip, Field, H1, H2, Row, Screen, Small } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { api, authErrorText } from '@/lib/api';
import { childRegister, localTz, startSession } from '@/lib/session';
import type { User } from '@/lib/types';

type Role = 'parent' | 'child';

export default function Join() {
  const [role, setRole] = useState<Role>('parent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = role === 'child' ? !!name && code.length === 6 && pin.length === PIN_LENGTH : !!name && !!email && password.length >= 6;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (role === 'child') {
        await childRegister(name, code, pin);
      } else {
        const res = await api<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: {
            name: name.trim(),
            email: email.trim(),
            password,
            role: 'parent',
            family_code: code.trim().toUpperCase() || undefined,
            tz: localTz(),
          },
        });
        await startSession(res);
      }
    } catch (e) {
      setError(authErrorText(e));
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1 style={{ marginTop: S.md }}>Create an account</H1>
      <Row>
        <Chip label="I'm a parent" icon="account-heart" selected={role === 'parent'} onPress={() => setRole('parent')} />
        <Chip label="I'm a kid" icon="human-child" selected={role === 'child'} onPress={() => setRole('child')} />
      </Row>

      {role === 'child' ? (
        <Card>
          <H2>Join your family</H2>
          <Field label="Your first name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Maya" />
          <Field
            label="Family code (ask your grown-up)"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="ABC123"
          />
          <Small>Pick a secret number you will remember. You tap it to open Dotty.</Small>
          <PinPad value={pin} onChange={setPin} />
          {error ? <Small color={C.danger}>{error}</Small> : null}
          <Button title="Start playing" icon="rocket-launch" size="lg" onPress={submit} loading={busy} disabled={!ready} />
          <Small>No email needed — Dotty only needs your family code and your secret number.</Small>
        </Card>
      ) : (
        <Card>
          <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry />
          <Field
            label="Family code (only to join an existing family)"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="ABC123"
          />
          {!code ? <Small>A new family is created for you. Share its code with your child and your care team.</Small> : null}
          {error ? <Small color={C.danger}>{error}</Small> : null}
          <Button title="Create account" onPress={submit} loading={busy} disabled={!ready} />
        </Card>
      )}

      <View style={{ alignItems: 'center' }}>
        <Button title="Back to log in" variant="ghost" onPress={() => router.back()} />
      </View>
      <Body color={C.inkSoft} style={{ fontSize: 13, textAlign: 'center' }}>
        Clinicians sign up in the Dotty clinician portal.
      </Body>
    </Screen>
  );
}
