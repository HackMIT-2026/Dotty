import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Dotty } from '@/components/pet/dotty';
import { PetScene } from '@/components/pet/scene';
import { Button, Chip, H1, Row, Screen, Small } from '@/components/ui';
import { C, FONT, R, S } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { BADGES, DEFAULT_EQUIPPED } from '@/lib/pet';
import { useStore } from '@/lib/store';
import type { Pet, ShopItem, Slot } from '@/lib/types';

const SLOTS: { id: Slot; label: string; emoji: string }[] = [
  { id: 'hat', label: 'Hats', emoji: '🎩' },
  { id: 'accessory', label: 'Extras', emoji: '🕶️' },
  { id: 'color', label: 'Colors', emoji: '🎨' },
  { id: 'background', label: 'Places', emoji: '🏝️' },
];

const RARITY_COLOR = { common: C.inkSoft, rare: C.sky, epic: C.primary } as const;

export default function Shop() {
  const pet = useStore((s) => s.pet);
  const shop = useStore((s) => s.shop);
  const setShop = useStore((s) => s.setShop);
  const setPet = useStore((s) => s.setPet);
  const pushToast = useStore((s) => s.pushToast);
  const bumpCheer = useStore((s) => s.bumpCheer);
  const [slot, setSlot] = useState<Slot>('hat');
  const [tryOn, setTryOn] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api<ShopItem[]>('/shop')
        .then(setShop)
        .catch(() => {});
    }, [setShop]),
  );

  const equipped = pet?.equipped ?? DEFAULT_EQUIPPED;
  const preview = tryOn ? { ...equipped, [tryOn.slot]: tryOn.id } : equipped;
  const items = shop.filter((i) => i.slot === slot);

  async function act(item: ShopItem) {
    if (!pet) return;
    setBusy(true);
    try {
      const owned = pet.owned_items.includes(item.id);
      if (!owned) {
        await api<Pet>(`/pet/${pet.id}/buy`, { method: 'POST', body: { item_id: item.id } });
        pushToast({ kind: 'reward', text: `You got the ${item.name}!` });
      }
      const wearing = equipped[item.slot] === item.id;
      const removable = item.slot === 'hat' || item.slot === 'accessory';
      const next = await api<Pet>(`/pet/${pet.id}/equip`, {
        method: 'POST',
        body: { slot: item.slot, item_id: wearing && owned && removable ? null : item.id },
      });
      setPet(next);
      setTryOn(null);
      bumpCheer();
    } catch (e) {
      pushToast({ kind: 'info', text: 'Hmm, not yet', sub: errorText(e).replace('do this', 'open the shop') });
    } finally {
      setBusy(false);
    }
  }

  function buttonFor(item: ShopItem) {
    const owned = pet?.owned_items.includes(item.id);
    const wearing = equipped[item.slot] === item.id;
    const locked = item.unlock_badge && !pet?.badges.includes(item.unlock_badge);
    if (wearing) {
      const removable = item.slot === 'hat' || item.slot === 'accessory';
      return <Button title={removable ? 'Take off' : 'Wearing'} variant="secondary" disabled={!removable} onPress={() => act(item)} loading={busy} />;
    }
    if (owned) return <Button title="Wear it" variant="mint" onPress={() => act(item)} loading={busy} />;
    if (locked) return <Button title={`🔒 ${BADGES[item.unlock_badge!]?.name ?? 'Badge'} badge`} variant="secondary" disabled onPress={() => {}} />;
    const affordable = (pet?.dots ?? 0) >= item.price;
    return <Button title={`Buy for ${item.price} Dots`} variant="sun" disabled={!affordable} onPress={() => act(item)} loading={busy} />;
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Shop</H1>
        <View style={styles.wallet}>
          <Text style={styles.walletText}>🔵 {pet?.dots ?? 0} Dots</Text>
        </View>
      </Row>

      <PetScene background={preview.background} style={styles.preview}>
        <Dotty equipped={preview} size={170} />
      </PetScene>

      {tryOn ? (
        <View style={styles.tryOn}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{tryOn.name}</Text>
            <Small color={RARITY_COLOR[tryOn.rarity]}>{tryOn.rarity}</Small>
          </View>
          {buttonFor(tryOn)}
        </View>
      ) : (
        <Small style={{ textAlign: 'center' }}>Tap an item to try it on Dotty</Small>
      )}

      <Row style={{ flexWrap: 'wrap' }}>
        {SLOTS.map((s) => (
          <Chip key={s.id} label={s.label} emoji={s.emoji} selected={slot === s.id} onPress={() => { setSlot(s.id); setTryOn(null); }} />
        ))}
      </Row>

      {shop.length === 0 ? (
        <Small style={{ textAlign: 'center' }}>Connect to the internet to open the shop.</Small>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => {
            const owned = pet?.owned_items.includes(item.id);
            const wearing = equipped[item.slot] === item.id;
            const locked = item.unlock_badge && !pet?.badges.includes(item.unlock_badge);
            const mini = { ...equipped, [item.slot]: item.id };
            return (
              <Pressable
                key={item.id}
                onPress={() => setTryOn(item)}
                style={[styles.item, tryOn?.id === item.id && styles.itemOn, wearing && styles.itemWearing]}>
                <PetScene background={mini.background} style={styles.itemScene}>
                  <Dotty equipped={mini} size={78} animated={false} />
                </PetScene>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Small color={wearing ? C.mint : owned ? C.primaryDark : locked ? C.inkSoft : C.ink}>
                  {wearing ? 'Wearing' : owned ? 'Owned' : locked ? '🔒 Badge' : `🔵 ${item.price}`}
                </Small>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6 },
  walletText: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: C.primaryDark },
  preview: { height: 200, borderRadius: R.lg },
  tryOn: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.lg, padding: S.sm, paddingLeft: S.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  item: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: S.sm, borderWidth: 3, borderColor: 'transparent' },
  itemOn: { borderColor: C.primary },
  itemWearing: { backgroundColor: C.mintSoft },
  itemScene: { width: '100%', height: 84, borderRadius: R.sm },
  itemName: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.ink, marginTop: 4 },
});
