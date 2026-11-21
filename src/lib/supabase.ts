// Connection to the Supabase backend.
//
// The app reads two public values at build time (put them in a git-ignored .env.local file,
// see .env.example). Without them the app runs on the built-in demo data, as before.
//   EXPO_PUBLIC_SUPABASE_URL              https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY  sb_publishable_... (never the secret key)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key
  ? createClient(url, key, {
    auth: {
      // AsyncStorage keeps people signed in across launches, on phones and on web.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  : null;

/** True when the app is connected to a real backend; false means demo data on this device. */
export const BACKEND_ON = !!supabase;

/** Public web address of a listing photo in the provider-photos bucket. */
export function photoUrl(path: string) {
  return supabase ? supabase.storage.from('provider-photos').getPublicUrl(path).data.publicUrl : '';
}

type PhotoRow = { path: string; sort: number; created_at: string };
/** Photo addresses in display order: cover (lowest sort) first, then oldest first. */
export function orderedPhotos(rows: PhotoRow[] | null | undefined) {
  return [...(rows ?? [])]
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
    .map((r) => photoUrl(r.path));
}

// On phones, only refresh the sign-in token while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turns a Supabase error into a sentence a person can act on. */
export function friendly(error: unknown): string {
  const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  if (/network|fetch/i.test(msg)) return 'No connection to Selfcare. Check your internet and try again.';
  if (/rate limit|60 seconds|security purposes/i.test(msg)) return 'Please wait a minute before asking for another code.';
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg)) return 'That code is wrong or has expired. Ask for a new one.';
  return msg;
}
