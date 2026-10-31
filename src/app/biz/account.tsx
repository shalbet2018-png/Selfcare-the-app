import { router } from 'expo-router';

import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, Glass, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { IS_BUSINESS_APP } from '@/lib/variant';

const VERIFY = { 'not-started': 'Not started', submitted: 'Submitted', 'in-review': 'In review', approved: 'Approved' } as const;

export default function Account() {
  const { state } = useStore();
  const biz = state.business;
  return (
    <Screen theme="business">
      <T v="h1">Account</T>
      <CardGrid min={300} maxCols={2}>
        {[
          <Glass key="details" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">{biz.name || 'Not registered yet'}</T>
            <T v="small" muted>
              {biz.kind === 'freelancer' ? 'Freelancer' : 'Business'}{biz.area ? ` · ${biz.area}` : ''} · Verification: {VERIFY[biz.verification]}
            </T>
            <Btn small kind="light" label={biz.registered ? 'Edit details' : 'Register'} href="/biz/register" />
          </Glass>,
          ...(IS_BUSINESS_APP ? [] : [
          <Glass key="switch" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">Booking for yourself?</T>
            <Btn kind="outline" icon="swap" label="Switch to Selfcare" onPress={() => router.navigate('/')} />
          </Glass>,
          ]),
        ]}
      </CardGrid>
    </Screen>
  );
}
