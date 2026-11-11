// Responsive navigation: bottom tab bar on phones, icon rail on tablets,
// labelled sidebar on laptops and desktops.
import { router, usePathname, type Href } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icon';
import { useLayout } from '@/lib/layout';
import { C, F } from '@/lib/theme';

type Item = { href: Href; label: string; icon: IconName; match: (p: string) => boolean };

const CLIENT: Item[] = [
  { href: '/', label: 'Home', icon: 'home', match: (p) => p === '/' },
  { href: '/search', label: 'Search', icon: 'search', match: (p) => /^\/(search|provider|book)(\/|$)/.test(p) },
  { href: '/bookings', label: 'Bookings', icon: 'calendar', match: (p) => /^\/booking/.test(p) },
  { href: '/profile', label: 'Profile', icon: 'user', match: (p) => p === '/profile' },
];
const BUSINESS: Item[] = [
  { href: '/biz', label: 'Dashboard', icon: 'grid', match: (p) => p === '/biz' },
  { href: '/biz/services', label: 'Services', icon: 'list', match: (p) => p === '/biz/services' },
  { href: '/biz/account', label: 'Account', icon: 'user', match: (p) => p === '/biz/account' || p === '/biz/register' },
];

export function Nav() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { size } = useLayout();
  const biz = path.startsWith('/biz');
  const items = biz ? BUSINESS : CLIENT;
  const fg = C.gold;
  const fgMuted = C.muted;
  const onBg = C.goldSoft;
  const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)' } as object) : null;

  if (size === 'phone') {
    return (
      <View role="navigation" aria-label="Main" style={[blur, {
        position: 'absolute', left: 12, right: 12, bottom: 12 + insets.bottom, height: 68, borderRadius: 24,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8,
        backgroundColor: 'rgba(24,18,31,0.82)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
        boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
      }]}>
        {items.map((it) => {
          const on = it.match(path);
          return (
            <Pressable key={it.label} role="link" aria-current={on ? 'page' : undefined} accessibilityLabel={it.label}
              onPress={() => router.navigate(it.href)}
              style={{ minWidth: 64, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? onBg : 'transparent' }}>
              <Icon name={it.icon} color={on ? fg : fgMuted} />
              <Text style={{ fontSize: 11, fontFamily: on ? F.body600 : F.body, color: on ? fg : fgMuted }}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const desktop = size === 'desktop';
  return (
    <View role="navigation" aria-label="Main" style={{
      width: desktop ? 240 : 96, paddingTop: 28 + insets.top, paddingHorizontal: desktop ? 16 : 10, gap: 8,
      alignItems: desktop ? 'stretch' : 'center',
      backgroundColor: 'rgba(20,15,26,0.92)',
      borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)',
    }}>
      <Pressable role="link" accessibilityLabel={biz ? 'Selfcare for Business home' : 'Selfcare home'} onPress={() => router.navigate(biz ? '/biz' : '/')} style={{ marginBottom: 18, paddingHorizontal: desktop ? 12 : 0 }}>
        {desktop ? (
          <View>
            <Text style={{ fontFamily: F.display500, fontSize: 26, color: C.ink, letterSpacing: 0.5 }}>selfcare</Text>
            {biz ? <Text style={{ fontFamily: F.body, fontSize: 13, color: fgMuted }}>for Business</Text> : null}
          </View>
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display500, fontSize: 28, color: C.onGold, marginTop: -3 }}>s</Text>
          </View>
        )}
      </Pressable>
      {items.map((it) => {
        const on = it.match(path);
        return (
          <Pressable key={it.label} role="link" aria-current={on ? 'page' : undefined} accessibilityLabel={it.label}
            onPress={() => router.navigate(it.href)}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
              flexDirection: desktop ? 'row' : 'column', alignItems: 'center', gap: desktop ? 12 : 2,
              width: desktop ? undefined : 72, minHeight: desktop ? 48 : 64, paddingHorizontal: desktop ? 14 : 0,
              justifyContent: desktop ? 'flex-start' : 'center', borderRadius: 14,
              backgroundColor: on ? onBg : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
            })}>
            <Icon name={it.icon} color={on ? fg : fgMuted} />
            <Text style={{ fontSize: desktop ? 15 : 12, fontFamily: on ? F.body600 : F.body, color: on ? fg : fgMuted }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
