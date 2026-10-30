import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CardGrid, ProviderCard } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Back, Btn, Field, Glass, Pill, PillRow, T } from '@/components/ui';
import { money } from '@/lib/config';
import { CATEGORIES, fromPrice, PROVIDERS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { themeForCategory } from '@/lib/theme';

type Where = 'any' | 'shop' | 'home';
type Sort = 'distance' | 'price' | 'rating';
const PRICES = [['', 'Any price'], ['1000', money(1000)], ['2000', money(2000)], ['3000', money(3000)], ['5000', money(5000)]] as const;
const WHERE: [Where, string][] = [['any', 'Shop or home'], ['shop', 'At the shop'], ['home', 'Come to me']];
const SORTS: [Sort, string][] = [['distance', 'Nearest'], ['price', 'Lowest price'], ['rating', 'Top rated']];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default function Search() {
  const params = useLocalSearchParams();
  const { state } = useStore();
  const [q, setQ] = useState(one(params.q));
  const [cat, setCat] = useState(one(params.cat));
  const [max, setMax] = useState(one(params.max));
  const [where, setWhere] = useState<Where>((one(params.mode) as Where) || state.serviceMode);
  const [sort, setSort] = useState<Sort>((one(params.sort) as Sort) || 'distance');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const by: Record<Sort, (a: (typeof PROVIDERS)[number], b: (typeof PROVIDERS)[number]) => number> = {
      distance: (a, b) => a.km - b.km,
      price: (a, b) => fromPrice(a) - fromPrice(b),
      rating: (a, b) => b.rating - a.rating,
    };
    return PROVIDERS.filter((p) =>
      (!cat || p.category === cat) &&
      (!max || fromPrice(p) <= Number(max)) &&
      (where === 'any' || p.modes.includes(where)) &&
      (!term || p.name.toLowerCase().includes(term) || p.category.includes(term) || p.services.some((s) => s.name.toLowerCase().includes(term))),
    ).sort(by[sort]);
  }, [q, cat, max, where, sort]);

  // Keep the address bar (web) and deep links in step with the filters.
  const update = (patch: Record<string, string>) => router.setParams(patch);

  const catTitle = CATEGORIES.find((c) => c.id === cat)?.label;

  return (
    <Screen theme={cat ? themeForCategory(cat) : 'lashes'}>
      <Back href="/" label="Home" />
      <T v="h1">{catTitle ?? 'Find a service'}</T>

      <Glass style={{ padding: 16, gap: 14 }}>
        <Field label="Search" value={q} onChangeText={(t) => { setQ(t); update({ q: t }); }} placeholder="Service or provider" returnKeyType="search" />
        <View style={{ gap: 6 }}>
          <T v="label" muted>Category</T>
          <PillRow label="Category">
            <Pill label="All" selected={!cat} onPress={() => { setCat(''); update({ cat: '' }); }} />
            {CATEGORIES.map((c) => <Pill key={c.id} label={c.label} selected={cat === c.id} onPress={() => { setCat(c.id); update({ cat: c.id }); }} />)}
          </PillRow>
        </View>
        <View style={{ gap: 6 }}>
          <T v="label" muted>Price up to</T>
          <PillRow label="Price up to">
            {PRICES.map(([v, l]) => <Pill key={l} label={l} selected={max === v} onPress={() => { setMax(v); update({ max: v }); }} />)}
          </PillRow>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          <View style={{ gap: 6 }}>
            <T v="label" muted>Where</T>
            <PillRow label="Where">
              {WHERE.map(([v, l]) => <Pill key={v} label={l} selected={where === v} onPress={() => { setWhere(v); update({ mode: v }); }} />)}
            </PillRow>
          </View>
          <View style={{ gap: 6 }}>
            <T v="label" muted>Sort by</T>
            <PillRow label="Sort by">
              {SORTS.map(([v, l]) => <Pill key={v} label={l} selected={sort === v} onPress={() => { setSort(v); update({ sort: v }); }} />)}
            </PillRow>
          </View>
        </View>
      </Glass>

      {results.length ? (
        <View style={{ gap: 10 }}>
          <T v="small" muted>{results.length} provider{results.length === 1 ? '' : 's'}</T>
          <CardGrid>{results.map((p) => <ProviderCard key={p.id} p={p} />)}</CardGrid>
        </View>
      ) : (
        <Glass style={{ padding: 24, gap: 10, alignItems: 'flex-start' }}>
          <T v="h3">No matches yet</T>
          <T muted>Try a higher price limit, another category, or switch between shop and home service.</T>
          <Btn label="Clear filters" kind="ghost" small onPress={() => { setQ(''); setCat(''); setMax(''); setWhere('any'); router.setParams({ q: '', cat: '', max: '', mode: 'any' }); }} />
        </Glass>
      )}
    </Screen>
  );
}
