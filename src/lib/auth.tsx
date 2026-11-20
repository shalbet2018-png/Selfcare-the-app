// Who is signed in. Sign-in is by email: Selfcare emails a 6-digit code, the person types it in.
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type Auth = {
  /** False until the saved session (if any) has been read. */
  ready: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth>(null as never);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<Auth>(() => ({
    ready,
    session,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    sendCode: async (email) => {
      if (!supabase) throw new Error('Selfcare is not connected to its backend yet.');
      // New emails get an account automatically; returning ones just sign in.
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
      if (error) throw error;
    },
    verifyCode: async (email, code) => {
      if (!supabase) throw new Error('Selfcare is not connected to its backend yet.');
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      if (error) throw error;
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [ready, session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
