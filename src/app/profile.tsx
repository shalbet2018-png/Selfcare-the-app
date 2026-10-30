import { router } from 'expo-router';
import { View } from 'react-native';

import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, Glass, T } from '@/components/ui';
import { confirmAsync, useToast } from '@/lib/feedback';
import { useStore } from '@/lib/store';

export default function Profile() {
  const { state, reset } = useStore();
  const toast = useToast();
  const clear = async () => {
    if (await confirmAsync('Clear demo data?', 'This removes all bookings and business details on this device.', 'Clear')) {
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
            <T v="h3">Demo data</T>
            <T muted>This preview keeps everything on this device.</T>
            <View><Btn label="Clear demo data" kind="ghost" onPress={clear} /></View>
          </Glass>,
        ]}
      </CardGrid>
    </Screen>
  );
}
