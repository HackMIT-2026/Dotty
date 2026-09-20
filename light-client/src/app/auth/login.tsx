import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Dotty } from '@/components/pet/dotty';
import { PetScene } from '@/components/pet/scene';
import { PIN_LENGTH, PinPad } from '@/components/pin-pad';
import { ServerField } from '@/components/server-field';
import { Body, Button, Card, Chip, Field, H1, H2, Row, Screen, Small } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { NetworkError, authErrorText } from '@/lib/api';
import { childLogin, login } from '@/lib/session';

type Mode = 'kid' | 'grownup';

const DEMO_FAMILY = 'DEMO42';
const DEMO_PIN = '1234';

export default function Login() {
  const [mode, setMode] = useState<Mode>('kid');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showServer, setShowServer] = useState(false);

  function fail(err: unknown) {
    setError(authErrorText(err));
    if (err instanceof NetworkError) setShowServer(true);
    setPin('');
  }

  async function submitKid(c = code, p = pin, key = 'kid') {
    setBusy(key);
    setError(null);
    try {
      await childLogin(c, p);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function submitGrownUp(e = email, p = password, key = 'form') {
    setBusy(key);
    setError(null);
    try {
      await login(e, p);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  // a full PIN signs in by itself: nothing for a child to hunt for
  useEffect(() => {
    if (mode === 'kid' && pin.length === PIN_LENGTH && code.length === 6 && busy === null) void submitKid();
  }, [pin, code, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen>
      <PetScene background="bg_underwater" style={styles.hero}>
        <Dotty equipped={{ color: 'color_sky', hat: null, accessory: null, background: 'bg_underwater' }} size={150} />
      </PetScene>
      <View style={{ alignItems: 'center' }}>
        <H1>Dotty</H1>
        <Body color={C.inkSoft} style={{ textAlign: 'center' }}>
          Look after Dotty, and Dotty looks after you.
        </Body>
      </View>

      <Row style={{ justifyContent: 'center' }}>
        <Chip label="I'm a kid" icon="human-child" art={<Image source={require('@/assets/icons/baby.png')} style={styles.roleIcon} resizeMode="contain" />} selected={mode === 'kid'} onPress={() => { setMode('kid'); setError(null); }} />
        <Chip label="I'm the parent" icon="account-heart" art={<Image source={require('@/assets/icons/old.png')} style={styles.roleIcon} resizeMode="contain" />} selected={mode === 'grownup'} onPress={() => { setMode('grownup'); setError(null); }} />
      </Row>

      {mode === 'kid' ? (
        <Card>
          <H2>Hi! What&apos;s your family code?</H2>
          <Field
            label="Family code (ask your grown-up)"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="ABC123"
          />
          <Small>Now tap your secret number</Small>
          <PinPad value={pin} onChange={setPin} />
          {error ? <Small color={C.danger}>{error}</Small> : null}
          <Button
            title="Let's go!"
            icon="login"
            size="lg"
            onPress={() => submitKid()}
            loading={busy === 'kid' || busy === 'maya'}
            disabled={code.length < 6 || pin.length < PIN_LENGTH}
          />
        </Card>
      ) : (
        <Card>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={() => submitGrownUp()} />
          {error ? <Small color={C.danger}>{error}</Small> : null}
          <Button title="Log in" onPress={() => submitGrownUp()} loading={busy === 'form'} disabled={!email || !password} />
        </Card>
      )}

      <Link href="/auth/join" asChild>
        <Pressable style={{ alignItems: 'center', paddingVertical: S.sm }}>
          <Small color={C.primaryDark}>New here? Create an account</Small>
        </Pressable>
      </Link>

      <Card tint={C.sunSoft}>
        <Small color={C.ink}>Demo</Small>
        <Row style={{ flexWrap: 'wrap' }}>
          <Button
            title="Maya (kid)"
            leading={<Image source={require('@/assets/icons/baby.png')} style={styles.demoIcon} resizeMode="contain" />}
            variant="sun"
            loading={busy === 'maya'}
            onPress={() => {
              setMode('kid');
              setCode(DEMO_FAMILY);
              setPin(DEMO_PIN);
              void submitKid(DEMO_FAMILY, DEMO_PIN, 'maya');
            }}
          />
          <Button
            title="Alex (parent)"
            leading={<Image source={require('@/assets/icons/old.png')} style={styles.demoIcon} resizeMode="contain" />}
            variant="sun"
            loading={busy === 'alex'}
            onPress={() => {
              setMode('grownup');
              void submitGrownUp('parent@dotty.demo', 'demo1234', 'alex');
            }}
          />
        </Row>
        <Small>
          Kid: family code {DEMO_FAMILY} + PIN {DEMO_PIN} · Parent: parent@dotty.demo / demo1234
        </Small>
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

const styles = StyleSheet.create({
  roleIcon: { width: 34, height: 34 },
  demoIcon: { width: 38, height: 38 },
  hero: { height: 190, borderRadius: R.lg, overflow: 'hidden' },
});
