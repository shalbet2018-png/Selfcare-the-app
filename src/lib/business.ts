// The signed-in provider's own business: details, verification, services, payouts and online status.
// Connected: reads and writes the backend. Not connected: the demo copy saved on this device.
// Screens use one hook either way.
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { Payout } from './config';
import { useStore, type BizService, type Business, type Verification } from './store';
import { supabase } from './supabase';

export type DocKind = 'business-registration' | 'operating-permit' | 'id-or-passport' | 'selfie';
export const DOCS_FOR: Record<Business['kind'], [DocKind, string][]> = {
  business: [['business-registration', 'Business registration'], ['operating-permit', 'Operating permit']],
  freelancer: [['id-or-passport', 'National ID or passport'], ['selfie', 'Selfie']],
};

/** What the private provider-documents bucket accepts (see supabase/schema.sql). */
export const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const docTooBig = (file?: DocumentPickerAsset) => !!file?.size && file.size > DOC_MAX_BYTES;

export const VERIFY_LABEL: Record<Verification, string> = {
  'not-started': 'Not started', submitted: 'Submitted', 'in-review': 'In review', approved: 'Approved', rejected: 'Needs changes',
};

export type Details = Pick<Business, 'kind' | 'name' | 'category' | 'area' | 'radiusKm'>;

type Row = {
  id: string; kind: Business['kind']; name: string; category: string; area: string; radius_km: number;
  verification: Verification; online: boolean;
  services: { id: string; name: string; price: number; mins: number; where_offered: BizService['where'] }[];
  provider_private: { payout: Payout; review_note: string | null } | { payout: Payout; review_note: string | null }[] | null;
};

const SELECT = 'id, kind, name, category, area, radius_km, verification, online, '
  + 'services(id, name, price, mins, where_offered), provider_private(payout, review_note)';

/** Raises the Supabase error, if any, so callers can show it. */
function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

export function useBusiness() {
  const store = useStore();
  const { userId, ready: authReady } = useAuth();
  const live = !!supabase;
  // Remember whose listing was loaded, so a different (or no) sign-in never shows someone else's.
  const [loaded, setLoaded] = useState<{ uid: string; row: Row | null } | null>(null);
  const row = loaded && loaded.uid === userId ? loaded.row : null;
  const loading = live && (!authReady || (!!userId && loaded?.uid !== userId));

  const fetchMine = useCallback(async (uid: string) => {
    const { data, error } = await supabase!.from('providers').select(SELECT).eq('owner_id', uid).maybeSingle();
    if (error) throw error;
    return data as Row | null;
  }, []);

  useEffect(() => {
    if (!supabase || !authReady || !userId) return;
    let stale = false;
    fetchMine(userId)
      .then((r) => { if (!stale) setLoaded({ uid: userId, row: r }); })
      // If loading fails, show the page as unregistered rather than spinning forever.
      .catch(() => { if (!stale) setLoaded({ uid: userId, row: null }); });
    return () => { stale = true; };
  }, [authReady, userId, fetchMine]);

  const reload = useCallback(async () => {
    if (userId) setLoaded({ uid: userId, row: await fetchMine(userId) });
  }, [userId, fetchMine]);

  // ---- Demo mode: everything lives in the device store, as before. ----
  if (!supabase) {
    const biz = store.state.business;
    return {
      live, loading: false, needsSignIn: false, biz, reviewNote: null as string | null,
      saveDetails: async (d: Details) => {
        store.setBusiness({ ...d, registered: true, verification: biz.registered ? biz.verification : 'submitted' });
      },
      uploadDocument: async (_kind: DocKind, _file: DocumentPickerAsset) => {},
      submitForVerification: async () => {},
      addService: async (s: BizService) => store.setBusiness({ services: [...biz.services, s] }),
      removeService: async (index: number) => store.setBusiness({ services: biz.services.filter((_, j) => j !== index) }),
      setOnline: async (online: boolean) => store.setBusiness({ online }),
      setPayout: async (payout: Payout) => store.setBusiness({ payout }),
      demoApprove: (() => store.setBusiness({ verification: 'approved' })) as (() => void) | null,
      reload,
    };
  }

  // ---- Connected: the database is the source of truth; demo jobs still come from the device. ----
  const db = supabase;
  const priv = Array.isArray(row?.provider_private) ? row.provider_private[0] : row?.provider_private;
  const local = store.state.business;
  const biz: Business = row ? {
    registered: true, kind: row.kind, name: row.name, category: row.category, area: row.area, radiusKm: Number(row.radius_km),
    payout: priv?.payout ?? 'daily', verification: row.verification, online: row.online,
    services: row.services.map((s) => ({ id: s.id, name: s.name, price: s.price, mins: s.mins, where: s.where_offered })),
    jobs: local.jobs, requestIndex: local.requestIndex,
  } : { ...local, registered: false, services: [], verification: 'not-started', online: false };

  const needRow = () => {
    if (!row) throw new Error('Register your business first.');
    return row;
  };

  return {
    live, loading, needsSignIn: authReady && !userId, biz, reviewNote: priv?.review_note ?? null,

    saveDetails: async (d: Details) => {
      const fields = { kind: d.kind, name: d.name, category: d.category, area: d.area, radius_km: d.radiusKm };
      if (row) check(await db.from('providers').update(fields).eq('id', row.id));
      else check(await db.from('providers').insert({ ...fields, owner_id: userId }));
      await reload();
    },

    /** Uploads one verification document to the private bucket and records it, replacing any earlier one. */
    uploadDocument: async (kind: DocKind, file: DocumentPickerAsset) => {
      // Read fresh: right after a first registration the row may not be in state yet.
      const { data: me } = check(await db.from('providers').select('id').eq('owner_id', userId!).maybeSingle());
      if (!me) throw new Error('Register your business first.');
      if (docTooBig(file)) throw new Error(`${file.name} is over 10 MB. Choose a smaller file.`);
      if (file.mimeType && !DOC_TYPES.includes(file.mimeType)) throw new Error(`${file.name} is not a JPG, PNG, WebP or PDF.`);
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const body = await (await fetch(file.uri)).arrayBuffer();
      check(await db.storage.from('provider-documents').upload(path, body, { contentType: file.mimeType ?? undefined }));
      // One document per kind: drop the old record, then add the new one.
      check(await db.from('provider_documents').delete().eq('provider_id', me.id).eq('kind', kind));
      check(await db.from('provider_documents').insert({ provider_id: me.id, kind, path }));
    },

    submitForVerification: async () => {
      check(await db.rpc('submit_for_verification'));
      await reload();
    },

    addService: async (s: BizService) => {
      const r = needRow();
      check(await db.from('services').insert({ provider_id: r.id, name: s.name, price: s.price, mins: s.mins, where_offered: s.where }));
      await reload();
    },

    removeService: async (index: number) => {
      const id = biz.services[index]?.id;
      if (id) check(await db.from('services').delete().eq('id', id));
      await reload();
    },

    setOnline: async (online: boolean) => {
      check(await db.from('providers').update({ online }).eq('id', needRow().id));
      await reload();
    },

    setPayout: async (payout: Payout) => {
      check(await db.from('provider_private').update({ payout }).eq('provider_id', needRow().id));
      await reload();
    },

    /** Approval only comes from a Selfcare admin when connected. */
    demoApprove: null as (() => void) | null,
    reload,
  };
}
