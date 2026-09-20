import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { DotCoin, Icon, type IconName } from '@/components/icon';
import { Dotty } from '@/components/pet/dotty';
import { PetScene } from '@/components/pet/scene';
import { PageHeader } from '@/components/page-header';
import { Button, Chip, Row, Screen, Small } from '@/components/ui';
import { C, R, S, font, shadow } from '@/constants/theme';
import { api, errorText } from '@/lib/api';
import { BADGES, DEFAULT_EQUIPPED } from '@/lib/pet';
import { useStore } from '@/lib/store';
import type { Pet, ShopItem, Slot } from '@/lib/types';

const SLOTS: { id: Slot; label: string; icon: IconName; image: ImageSourcePropType }[] = [
  { id: 'hat', label: 'Hats', icon: 'hat-fedora', image: require('@/assets/icons/hat.png') },
  { id: 'accessory', label: 'Extras', icon: 'glasses', image: require('@/assets/icons/extras.png') },
  { id: 'color', label: 'Colors', icon: 'palette', image: require('@/assets/icons/colors.png') },
  { id: 'background', label: 'Places', icon: 'image-filter-hdr', image: require('@/assets/icons/places.png') },
];

const RARITY_COLOR = { common: C.inkSoft, rare: C.sky, epic: C.primary } as const;

export default function Shop() {
  const pet = useStore((s) => s.pet);
  const shop = useStore((s) => s.shop);
  const setShop = useStore((s) => s.setShop);
  const setPet = useStore((s) => s.setPet);
  const pushToast = useStore((s) => s.pushToast);
  const bumpCheer = useStore((s) => s.bumpCheer);
  const params = useLocalSearchParams<{ slot?: string; t?: string }>();
  const [slot, setSlot] = useState<Slot>('hat');
  const [tryOn, setTryOn] = useState<ShopItem | null>(null);

  // the Shop tab's menu opens this page on the shelf the child picked (`t` changes on every pick)
  useEffect(() => {
    const picked = SLOTS.find((s) => s.id === params.slot);
    if (picked) {
      setSlot(picked.id);
      setTryOn(null);
    }
  }, [params.slot, params.t]);
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
    if (owned) return <Button title="Wear it" icon="hanger" variant="mint" onPress={() => act(item)} loading={busy} />;
    if (locked) return <Button title={`${BADGES[item.unlock_badge!]?.name ?? 'Badge'} badge`} icon="lock-outline" variant="secondary" disabled onPress={() => {}} />;
    const affordable = (pet?.dots ?? 0) >= item.price;
    return <Button title={`Buy for ${item.price}`} leading={<DotCoin size={22} />} variant="sun" disabled={!affordable} onPress={() => act(item)} loading={busy} />;
  }

  const footer = (
    <View style={styles.footer}>
      {tryOn ? (
        <View style={styles.tryOn}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{tryOn.name}</Text>
            <Small color={RARITY_COLOR[tryOn.rarity]}>{tryOn.rarity}</Small>
          </View>
          {buttonFor(tryOn)}
        </View>
      ) : (
        <Small color={C.ink} style={{ textAlign: 'center', paddingVertical: S.sm }}>Tap an item to try it on Dotty</Small>
      )}
    </View>
  );

  return (
    <Screen background={C.pageShop} footer={footer}>
      <PageHeader title="Shop">
        <View style={styles.wallet}>
          <DotCoin size={18} />
          <Text style={styles.walletText}>{pet?.dots ?? 0}</Text>
        </View>
      </PageHeader>

      <PetScene background={preview.background} style={styles.preview}>
        <Dotty equipped={preview} size={170} />
      </PetScene>

      <Row style={{ flexWrap: 'wrap' }}>
        {SLOTS.map((s) => (
          <Chip key={s.id} label={s.label} icon={s.icon} image={s.image} selected={slot === s.id} onPress={() => { setSlot(s.id); setTryOn(null); }} />
        ))}
      </Row>

      {shop.length === 0 ? (
        <Small color={C.ink} style={{ textAlign: 'center' }}>Connect to the internet to open the shop.</Small>
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
                <View style={styles.price}>
                  {wearing ? (
                    <Icon name="check-circle" size={15} color={C.mint} />
                  ) : locked ? (
                    <Icon name="lock-outline" size={15} color={C.inkSoft} />
                  ) : !owned ? (
                    <DotCoin size={15} />
                  ) : null}
                  <Small color={wearing ? C.mint : owned ? C.primaryDark : locked ? C.inkSoft : C.ink}>
                    {wearing ? 'Wearing' : owned ? 'Owned' : locked ? 'Badge' : String(item.price)}
                  </Small>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6 },
  walletText: { ...font('800'), fontSize: 16, color: C.primaryDark },
  preview: { height: 200, borderRadius: R.lg },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: C.pageShop },
  tryOn: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.lg, padding: S.sm, paddingLeft: S.md, ...shadow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  item: { width: '31.6%', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: S.sm, borderWidth: 3, borderColor: 'transparent' },
  itemOn: { borderColor: C.primary },
  itemWearing: { backgroundColor: C.mintSoft },
  itemScene: { width: '100%', height: 84, borderRadius: R.sm },
  itemName: { ...font('800'), fontSize: 13, color: C.ink, marginTop: 4 },
});
