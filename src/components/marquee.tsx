// A strip of dreamy image tiles that glides sideways on its own, looping forever.
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { CardArt } from './card-art';
import { useLoop } from './parallax';
import type { Category } from '@/lib/data';
import { C, CATEGORY_GLOW, F } from '@/lib/theme';

const TILE_W = 168;
const TILE_H = 210;
const GAP = 12;

function Tile({ c, n, hidden }: { c: Category; n: number; hidden?: boolean }) {
  const glow = CATEGORY_GLOW[c.id] ?? C.gold;
  const tile = (
    <View style={{
      width: TILE_W, height: TILE_H, borderRadius: 22, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderTopColor: C.softEdge,
      boxShadow: `0 12px 30px ${C.shadow}, 0 0 22px ${glow}22`,
    }}>
      <CardArt category={c.id} seed="marquee" />
      <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: F.body500, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.92)' }}>{String(n).padStart(2, '0')}</Text>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: glow, boxShadow: `0 0 8px ${glow}` }} />
      </View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, gap: 2 }}>
        <Text style={{ fontFamily: F.display400, fontSize: 22, color: '#FFFFFF', textShadowColor: glow, textShadowRadius: 12 }}>{c.label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{c.blurb}</Text>
      </View>
    </View>
  );
  // The second copy only exists to make the loop seamless, so keep it out of screen readers and tab order.
  if (hidden) return <View aria-hidden>{tile}</View>;
  return (
    <Link href={{ pathname: '/search', params: { cat: c.id } }} asChild>
      <Pressable role="link" accessibilityLabel={`Browse ${c.label}`}>{tile}</Pressable>
    </Link>
  );
}

export function ImageMarquee({ items, seconds = 40 }: { items: Category[]; seconds?: number }) {
  const t = useLoop(seconds * 1000);
  const span = items.length * (TILE_W + GAP);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -t.value * span }] }));
  return (
    <View style={{ marginHorizontal: -20, overflow: 'hidden', paddingVertical: 6 }}>
      <Animated.View style={[{ flexDirection: 'row', gap: GAP, paddingLeft: 20 }, style]}>
        {items.map((c, i) => <Tile key={c.id} c={c} n={i + 1} />)}
        {items.map((c, i) => <Tile key={`dup-${c.id}`} c={c} n={i + 1} hidden />)}
      </Animated.View>
    </View>
  );
}
