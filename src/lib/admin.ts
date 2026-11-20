// The Selfcare team's tools: who is an admin, the list of providers to review, and the review itself.
// The database decides what an admin may see and do (see supabase/schema.sql); these hooks only ask.
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { DocKind } from './business';
import type { Verification } from './store';
import { supabase } from './supabase';

export type ReviewStatus = Extract<Verification, 'in-review' | 'approved' | 'rejected'>;

export type QueueItem = {
  id: string; name: string; kind: 'business' | 'freelancer'; category: string; area: string;
  verification: Verification; created_at: string;
  services: { count: number }[];
  provider_documents: { kind: DocKind }[];
};

export type ReviewDoc = { kind: DocKind; path: string; uploaded_at: string; url: string | null; isPdf: boolean };

export type ReviewItem = {
  id: string; name: string; kind: 'business' | 'freelancer'; category: string; area: string; radius_km: number;
  verification: Verification; online: boolean; created_at: string;
  owner: { full_name: string | null; phone: string | null } | null;
  services: { id: string; name: string; price: number; mins: number; where_offered: 'shop' | 'home' | 'both' }[];
  reviewNote: string | null;
  docs: ReviewDoc[];
};

/** Signed links to private documents stop working after this many seconds. */
const DOC_LINK_SECONDS = 10 * 60;

/** True when the signed-in person is on the Selfcare team. */
export function useIsAdmin() {
  const { userId, ready } = useAuth();
  const [result, setResult] = useState<{ uid: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (!supabase || !ready || !userId) return;
    let stale = false;
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (!stale) setResult({ uid: userId, admin: data?.role === 'admin' }); });
    return () => { stale = true; };
  }, [ready, userId]);

  const known = !supabase || (ready && (!userId || result?.uid === userId));
  return { isAdmin: !!userId && result?.uid === userId && result.admin, loading: !known };
}

type Loaded<V> = { data: V; error: '' } | { data: undefined; error: string };

async function loadQueue(): Promise<Loaded<QueueItem[]>> {
  const { data, error } = await supabase!
    .from('providers')
    .select('id, name, kind, category, area, verification, created_at, services(count), provider_documents(kind)')
    .order('created_at', { ascending: false });
  return error ? { data: undefined, error: error.message } : { data: data as QueueItem[], error: '' };
}

/** Every provider the admin can see, newest first. */
export function useReviewQueue() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState('');

  const apply = useCallback((r: Loaded<QueueItem[]>) => {
    setError(r.error);
    if (r.data) setItems(r.data);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let stale = false;
    loadQueue().then((r) => { if (!stale) apply(r); });
    return () => { stale = true; };
  }, [apply]);

  const reload = useCallback(async () => { if (supabase) apply(await loadQueue()); }, [apply]);
  return { items, error, reload };
}

type ItemRow = Omit<ReviewItem, 'owner' | 'reviewNote' | 'docs'> & {
  profiles: ReviewItem['owner'] | ReviewItem['owner'][];
  provider_private: { review_note: string | null } | { review_note: string | null }[] | null;
  provider_documents: { kind: DocKind; path: string; uploaded_at: string }[];
};

const one = <V,>(v: V | V[] | null): V | null => (Array.isArray(v) ? v[0] ?? null : v);

/** null data means there is no such provider (or this person may not see it). */
async function loadItem(id: string): Promise<Loaded<ReviewItem | null>> {
  const db = supabase!;
  const { data, error } = await db
    .from('providers')
    .select('id, name, kind, category, area, radius_km, verification, online, created_at, '
      + 'profiles(full_name, phone), services(id, name, price, mins, where_offered), '
      + 'provider_private(review_note), provider_documents(kind, path, uploaded_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: undefined, error: error.message };
  if (!data) return { data: null, error: '' };
  const row = data as unknown as ItemRow;

  const paths = row.provider_documents.map((d) => d.path);
  const links = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from('provider-documents').createSignedUrls(paths, DOC_LINK_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
  }

  const { profiles, provider_private, provider_documents, ...rest } = row;
  return {
    error: '',
    data: {
      ...rest,
      owner: one(profiles),
      reviewNote: one(provider_private)?.review_note ?? null,
      docs: provider_documents.map((d) => ({ ...d, url: links.get(d.path) ?? null, isPdf: d.path.toLowerCase().endsWith('.pdf') })),
    },
  };
}

/** One provider with its services and documents, each document with a short-lived private link. */
export function useReviewItem(id: string | undefined) {
  // undefined while loading, null when not found.
  const [item, setItem] = useState<ReviewItem | null | undefined>(undefined);
  const [error, setError] = useState('');

  const apply = useCallback((r: Loaded<ReviewItem | null>) => {
    setError(r.error);
    if (r.data !== undefined) setItem(r.data);
  }, []);

  useEffect(() => {
    if (!supabase || !id) return;
    let stale = false;
    loadItem(id).then((r) => { if (!stale) apply(r); });
    return () => { stale = true; };
  }, [id, apply]);

  const reload = useCallback(async () => { if (supabase && id) apply(await loadItem(id)); }, [id, apply]);
  return { item, error, reload };
}

/** Records the team's decision. A rejection needs a note telling the provider what to fix. */
export async function reviewProvider(id: string, status: ReviewStatus, note?: string) {
  if (!supabase) throw new Error('Selfcare is not connected to its backend yet.');
  const { error } = await supabase.rpc('review_provider', { p_provider: id, p_status: status, p_note: note?.trim() || null });
  if (error) throw error;
}
