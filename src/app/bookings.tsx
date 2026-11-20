import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { LoadingView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { StatusTag } from '@/components/status';
import { Btn, Glass, T } from '@/components/ui';
import { useMyBookings, whenText } from '@/lib/bookings';

export default function Bookings() {
  const bookings = useMyBookings();
  if (bookings.needsSignIn) {
    return <SignInPrompt next="/bookings" title="Your bookings" theme="nails"
      body="Sign in with your email to see your bookings on any device." />;
  }
  if (bookings.loading) return <LoadingView />;
  const list = bookings.list;
  return (
    <Screen theme="nails">
      <T v="h1">Your bookings</T>
      {bookings.error ? (
        <Glass style={{ padding: 18, gap: 10 }}>
          <T muted>Could not load your bookings. Check your connection.</T>
          <View><Btn small kind="ghost" label="Try again" onPress={bookings.reload} /></View>
        </Glass>
      ) : null}
      {list.length ? (
        <View style={{ gap: 10 }}>
          {list.map((b) => (
            <Link key={b.id} href={{ pathname: '/booking/[id]', params: { id: b.id } }} asChild>
              <Pressable role="link">
                <Glass style={{ borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexShrink: 1, gap: 2 }}>
                    <T v="strong">{b.serviceName}</T>
                    <T v="small" muted>{b.providerName} · {b.mode === 'home' ? 'At your place' : 'At the shop'} · {whenText(b)}</T>
                  </View>
                  <StatusTag status={b.status} />
                </Glass>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : !bookings.error ? (
        <Glass style={{ padding: 24, gap: 10, alignItems: 'flex-start' }}>
          <T v="h3">No bookings yet</T>
          <T muted>When you book a service it shows up here.</T>
          <Btn label="Find a service" href="/search" />
        </Glass>
      ) : null}
    </Screen>
  );
}
