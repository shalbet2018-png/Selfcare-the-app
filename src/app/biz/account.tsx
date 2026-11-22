import { router } from 'expo-router';
import { View } from 'react-native';

import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { Btn, Glass, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useBusiness, VERIFY_LABEL as VERIFY } from '@/lib/business';
import { useConfirm, useToast } from '@/lib/feedback';
import { friendly } from '@/lib/supabase';
import { IS_BUSINESS_APP } from '@/lib/variant';

export default function Account() {
  const { biz, live, photos } = useBusiness();
  const { email, signOut, deleteAccount } = useAuth();
  const toast = useToast();
  const confirmAsync = useConfirm();
  const removeAccount = async () => {
    if (await confirmAsync('Delete your account?',
      'This permanently deletes your login, your business listing, services, photos and verification documents, and your bookings history. It cannot be undone.',
      'Delete for good')) {
      try {
        await deleteAccount();
        toast('Your account has been deleted');
        router.navigate('/biz');
      } catch (e) {
        toast(friendly(e));
      }
    }
  };
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
          ...(live && biz.registered ? [
          <Glass key="photos" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">Photos</T>
            <T v="small" muted>{photos.length ? `${photos.length} on your listing.` : 'None yet. Photos of your shop and work help clients choose you.'}</T>
            <Btn small kind="light" label={photos.length ? 'Manage photos' : 'Add photos'} href="/biz/photos" />
          </Glass>,
          ] : []),
          ...(live ? [
          <Glass key="signin" style={{ padding: 22, gap: 10, flex: 1 }}>
            <T v="h3">Your login</T>
            <T v="small" muted>{email ? `Signed in as ${email}` : 'Not signed in'}</T>
            {email
              ? (
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <Btn small kind="outline" label="Sign out" onPress={() => signOut().then(() => toast('Signed out'), (e) => toast(friendly(e)))} />
                  <Btn small kind="ghost" label="Delete my account" onPress={removeAccount} />
                </View>
              )
              : <Btn small kind="light" label="Sign in" href={{ pathname: '/sign-in', params: { next: '/biz/account' } }} />}
          </Glass>,
          ] : []),
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
