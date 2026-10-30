import { Link } from 'expo-router';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from './icon';
import { Badge, Chip, Glass, T } from './ui';
import { money } from '@/lib/config';
import { fromPrice, type Provider } from '@/lib/data';
import { C, F, PHOTO_TINTS } from '@/lib/theme';

/** Stand-in for a provider's photo until real images exist. */
export function PhotoPlaceholder({ category, height, label = 'Photo', radius = 0 }: { category: string; height: number; label?: string; radius?: number }) {
  const [a, b] = PHOTO_TINTS[category] ?? PHOTO_TINTS.hair;
  const gid = `ph${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={10} height={10} fill={`url(#${gid})`} />
      </Svg>
      <Text style={{ fontFamily: F.body, fontSize: 12, color: C.ink }}>{label}</Text>
    </View>
  );
}

export function ProviderCard({ p }: { p: Provider }) {
  return (
    <Link href={{ pathname: '/provider/[id]', params: { id: p.id } }} asChild>
      <Pressable role="link" accessibilityLabel={`${p.name}, ${p.area}, from ${money(fromPrice(p))}`} style={{ flex: 1 }}>
        <Glass style={{ overflow: 'hidden', flex: 1 }}>
          <PhotoPlaceholder category={p.category} height={150} />
          <View style={{ padding: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <T v="h3" style={{ flexShrink: 1 }} numberOfLines={1}>{p.name}</T>
              <Badge />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T v="small" muted>{p.area} · {p.km.toFixed(1)} km · </T>
              <Icon name="star" size={13} color={C.muted} />
              <T v="small" muted>{p.rating.toFixed(1)}</T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {p.modes.map((m) => <Chip key={m} label={m === 'shop' ? 'At the shop' : 'Comes to you'} />)}
            </View>
            <T v="small">From <Text style={{ fontFamily: F.body600 }}>{money(fromPrice(p))}</Text></T>
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
