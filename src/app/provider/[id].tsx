import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PhotoPlaceholder } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Back, Badge, Btn, Chip, Glass, T } from '@/components/ui';
import { CITY, money } from '@/lib/config';
import { modeLabel, providerById } from '@/lib/data';
import { useLayout } from '@/lib/layout';
import { C, themeForCategory } from '@/lib/theme';
import { NotFoundView as NotFound } from '@/components/not-found';

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wide, phone } = useLayout();
  const p = providerById(id);
  if (!p) return <NotFound />;

  const facts: [string, string][] = [
    ['Hours', p.hours],
    ['Area', `${p.area}, ${CITY}`],
    ...(p.staff.length ? [['Team', p.staff.join(', ')] as [string, string]] : []),
    ['Verification', 'Permit checked by Selfcare'],
  ];

  return (
    <Screen theme={themeForCategory(p.category)}>
      <Back href="/search" label="Results" />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 14 }}>
          <PhotoPlaceholder category={p.category} height={phone ? 200 : 280} label="Portfolio photos" radius={22} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <T v="h1">{p.name}</T>
            <Badge />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <T muted>{p.type === 'freelancer' ? 'Freelancer' : 'Business'} · {p.area} · {p.km.toFixed(1)} km · </T>
            <Icon name="star" size={14} color={C.muted} />
            <T muted>{p.rating.toFixed(1)}</T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {p.modes.map((m) => <Chip key={m} label={modeLabel(m)} />)}
          </View>

          <T v="h3" style={{ marginTop: 8 }}>Services</T>
          {p.services.map((s) => (
            <Glass key={s.id} style={{ borderRadius: 18, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexShrink: 1 }}>
                <T v="strong">{s.name}</T>
                <T v="small" muted>{s.mins} min</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <T v="strong">{money(s.price)}</T>
                <Btn small label="Book" a11y={`Book ${s.name}`} href={{ pathname: '/book/[providerId]/[serviceId]', params: { providerId: p.id, serviceId: s.id } }} />
              </View>
            </Glass>
          ))}
        </View>

        <Glass style={{ width: wide ? 320 : undefined, alignSelf: wide ? 'flex-start' : 'stretch', padding: 22, gap: 12 }}>
          <T v="h3">About</T>
          {facts.map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 14 }}>
              <T v="small" muted style={{ width: 92 }}>{k}</T>
              <T v="small" style={{ flex: 1 }}>{v}</T>
            </View>
          ))}
          <T v="h3" style={{ marginTop: 6 }}>Reviews</T>
          <T v="small" muted>Reviews appear here after completed bookings.</T>
        </Glass>
      </View>
    </Screen>
  );
}
