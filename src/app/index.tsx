import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { CardGrid, ProviderCard } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, Glass, Segmented, T } from '@/components/ui';
import { CITY } from '@/lib/config';
import { CATEGORIES, MODE_OPTIONS, PROVIDERS } from '@/lib/data';
import { useStore } from '@/lib/store';
import { C, F } from '@/lib/theme';
import { IS_BUSINESS_APP } from '@/lib/variant';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  // Selfcare for Business opens straight on its dashboard.
  if (IS_BUSINESS_APP) return <Redirect href="/biz" />;
  return <ClientHome />;
}

function ClientHome() {
  const { state, set } = useStore();
  const [q, setQ] = useState('');
  const nearby = PROVIDERS.filter((p) => p.modes.includes(state.serviceMode)).sort((a, b) => a.km - b.km);
  const search = () => router.push({ pathname: '/search', params: { q } });

  return (
    <Screen theme="hair">
      <View style={{ gap: 16 }}>
        <T v="eyebrow" muted>{greeting()} · {CITY}</T>
        <T v="h1">Time for you.</T>
        <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, padding: 6, borderRadius: 18, maxWidth: 640 }}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            returnKeyType="search"
            accessibilityLabel="Search services"
            placeholder="Braids, gel nails, lash fill…"
            placeholderTextColor="#6E6875"
            style={{ flex: 1, minWidth: 0, minHeight: 44, fontFamily: F.body, fontSize: 16, color: C.ink }}
          />
          <Btn label="Search" onPress={search} style={{ borderRadius: 14, minHeight: 44 }} />
        </Glass>
        <Segmented label="Where the service happens" options={MODE_OPTIONS} value={state.serviceMode} onChange={(m) => set({ serviceMode: m })} />
      </View>

      <View style={{ gap: 14 }}>
        <T v="h2">Categories</T>
        <CardGrid min={150} gap={10}>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={{ pathname: '/search', params: { cat: c.id } }} asChild>
              <Pressable role="link" style={{ flex: 1 }}>
                <Glass style={{ padding: 16, minHeight: 100, justifyContent: 'flex-end', gap: 2, borderRadius: 20, flex: 1 }}>
                  <T v="h3" style={{ fontFamily: F.display400 }}>{c.label}</T>
                  <T v="small" muted>{c.blurb}</T>
                </Glass>
              </Pressable>
            </Link>
          ))}
        </CardGrid>
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T v="h2">{state.serviceMode === 'home' ? 'Can come to you' : 'Near you'}</T>
          <Link href="/search"><T v="small" style={{ textDecorationLine: 'underline' }}>See all</T></Link>
        </View>
        <CardGrid>{nearby.map((p) => <ProviderCard key={p.id} p={p} />)}</CardGrid>
      </View>
    </Screen>
  );
}
