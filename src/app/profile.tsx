import { router } from 'expo-router';
import { View } from 'react-native';

import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, Glass, T } from '@/components/ui';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useConfirm, useToast } from '@/lib/feedback';
import { useStore } from '@/lib/store';
import { BACKEND_ON, friendly } from '@/lib/supabase';

export default function Profile() {
  const { state, reset } = useStore();
  const { email, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const toast = useToast();
  const confirmAsync = useConfirm();
  const clear = async () => {
    if (await confirmAsync('Clear saved data?', 'This removes the bookings and demo business details saved on this device. Your account is not affected.', 'Clear')) {
      reset();
      toast('Cleared');
      router.navigate('/');
    }
  };
  return (
    <Screen theme="spa">
      <T v="h1">Profile</T>
      <CardGrid min={300} maxCols={3}>
        {[
          ...(BACKEND_ON ? [
            <Glass key="account" style={{ padding: 22, gap: 10, flex: 1 }}>
              <T v="h3">Your account</T>
              <T muted>{email ? `Signed in as ${email}` : 'Sign in with your email to keep your details safe across devices.'}</T>
              <View>
                {email
                  ? <Btn label="Sign out" kind="ghost" onPress={() => signOut().then(() => toast('Signed out'), (e) => toast(friendly(e)))} />
                  : <Btn label="Sign in" href={{ pathname: '/sign-in', params: { next: '/profile' } }} />}
              </View>
            </Glass>,
          ] : []),
          ...(isAdmin ? [
            <Glass key="team" style={{ padding: 22, gap: 10, flex: 1 }}>
              <T v="h3">Selfcare team</T>
              <T muted>Check new businesses’ documents and approve them, or ask for changes.</T>
              <Btn label="Review businesses" icon="shield" onPress={() => router.navigate('/admin')} />
            </Glass>,
          ] : []),
          <Glass key="addr" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">Saved address</T>
            <T muted>{state.address || 'None yet. It is saved after your first home-service booking.'}</T>
          </Glass>,
          <Glass key="biz" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">Run a salon, spa or freelance business?</T>
            <T muted>Switch to Selfcare for Business to list your services and take bookings.</T>
            <Btn label="Switch to Business" icon="swap" onPress={() => router.navigate('/biz')} />
          </Glass>,
          <Glass key="demo" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">{BACKEND_ON ? 'Saved on this device' : 'Demo data'}</T>
            <T muted>{BACKEND_ON ? 'Bookings are still kept on this device for now.' : 'This preview keeps everything on this device.'}</T>
            <View><Btn label={BACKEND_ON ? 'Clear device data' : 'Clear demo data'} kind="ghost" onPress={clear} /></View>
          </Glass>,
        ]}
      </CardGrid>
    </Screen>
  );
}
