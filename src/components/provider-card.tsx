import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CardArt } from './card-art';
import { Icon } from './icon';
import { Badge, Chip, Glass, T } from './ui';
import { money } from '@/lib/config';
import { fromPrice, type Provider } from '@/lib/data';
import { C, F, IS_LIGHT } from '@/lib/theme';

/** Stand-in for a provider's photo until real images exist: generated soft artwork with a small tag. */
export function PhotoPlaceholder({ category, height, label = 'Photo', radius = 0, seed }: { category: string; height: number; label?: string; radius?: number; seed?: string }) {
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      <CardArt category={category} seed={seed} />
      <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: IS_LIGHT ? 'rgba(255,255,255,0.8)' : 'rgba(30,16,28,0.5)', borderWidth: 1, borderColor: C.softEdge }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.blush }} />
        <Text style={{ fontFamily: F.body500, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: C.blush }}>{label}</Text>
      </View>
    </View>
  );
}

export function ProviderCard({ p }: { p: Provider }) {
  return (
    <Link href={{ pathname: '/provider/[id]', params: { id: p.id } }} asChild>
      <Pressable role="link" accessibilityLabel={`${p.name}, ${p.area}, from ${money(fromPrice(p))}`} style={{ flex: 1 }}>
        <Glass style={{ overflow: 'hidden', flex: 1 }}>
          {p.photos?.length ? (
            <Image source={{ uri: p.photos[0] }} contentFit="cover" transition={200} accessibilityLabel={`${p.name} photo`}
              style={{ height: 150, width: '100%', backgroundColor: C.glass }} />
          ) : <PhotoPlaceholder category={p.category} height={150} seed={p.id} />}
          <View style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <T v="h3" style={{ flexShrink: 1 }} numberOfLines={1}>{p.name}</T>
              <Badge />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T v="small" muted>{p.area}{p.km != null ? ` · ${p.km.toFixed(1)} km` : ''} · </T>
              <Icon name="star" size={13} color={C.gold} />
              <T v="small" muted>{p.rating != null ? p.rating.toFixed(1) : 'New'}</T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {p.modes.map((m) => <Chip key={m} label={m === 'shop' ? 'At the shop' : 'Comes to you'} />)}
            </View>
            <T v="small" muted>From <Text style={{ fontFamily: F.body600, color: C.gold }}>{money(fromPrice(p))}</Text></T>
          </View>
        </Glass>
      </Pressable>
    </Link>
  );
}

/** Lays children out in as many equal columns as fit. */
export function CardGrid({ children, min = 280, gap = 14, maxCols = 4 }: { children: React.ReactNode[]; min?: number; gap?: number; maxCols?: number }) {
  const [width, setWidth] = useState(0);
  const cols = width ? Math.min(maxCols, Math.max(1, Math.floor((width + gap) / (min + gap)))) : 1;
  const rows: React.ReactNode[][] = [];
  children.forEach((c, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(c);
  });
  return (
    <View style={{ gap }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r.map((c, j) => <View key={j} style={{ flex: 1 }}>{c}</View>)}
          {Array.from({ length: cols - r.length }).map((_, j) => <View key={`f${j}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}
