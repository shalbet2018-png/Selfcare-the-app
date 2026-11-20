// Shows the page only to the Selfcare team; everyone else gets a short explanation instead.
import type { ReactNode } from 'react';

import { LoadingView } from './not-found';
import { Screen } from './screen';
import { SignInPrompt } from './sign-in-prompt';
import { Btn, Glass, T } from './ui';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { BACKEND_ON } from '@/lib/supabase';
import { STATUS_TONES } from '@/lib/theme';
import type { Verification } from '@/lib/store';

export function AdminGate({ next, children }: { next: string; children: ReactNode }) {
  const { userId, ready } = useAuth();
  const { isAdmin, loading } = useIsAdmin();

  if (!BACKEND_ON) {
    return (
      <Screen theme="business">
        <T v="h1">Review businesses</T>
        <Glass style={{ padding: 22, gap: 10, maxWidth: 560 }}>
          <T muted>This preview runs on demo data, so there is nothing to review. Connect the app to its backend first.</T>
        </Glass>
      </Screen>
    );
  }
  if (ready && !userId) {
    return <SignInPrompt next={next} title="Review businesses" body="Sign in with your Selfcare team email to review businesses." />;
  }
  if (!ready || loading) return <LoadingView />;
  if (!isAdmin) {
    return (
      <Screen theme="business">
        <T v="h1">Review businesses</T>
        <Glass style={{ padding: 22, gap: 14, maxWidth: 560 }}>
          <T muted>This page is for the Selfcare team.</T>
          <Btn label="Go home" href="/" />
        </Glass>
      </Screen>
    );
  }
  return <>{children}</>;
}

/** [background, text] colours for a verification status. */
export function verifyTone(v: Verification): readonly [string, string] {
  if (v === 'approved') return STATUS_TONES.good;
  if (v === 'rejected') return STATUS_TONES.bad;
  return STATUS_TONES.waiting;
}
