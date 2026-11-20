// The providers clients can browse: approved listings from the backend, or the demo list
// when the app is not connected to one.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { PROVIDERS, type Mode, type Provider } from './data';
import { supabase } from './supabase';

type Where = 'shop' | 'home' | 'both';
type Row = {
  id: string; kind: 'business' | 'freelancer'; name: string; category: string; area: string;
  hours: string; staff: string[]; online: boolean;
  services: { id: string; name: string; price: number; mins: number; where_offered: Where }[];
};

/** Which modes a provider offers, worked out from where each of their services happens. */
export function modesFrom(services: { where_offered: Where }[]): Mode[] {
  const modes: Mode[] = [];
  if (services.some((s) => s.where_offered !== 'home')) modes.push('shop');
  if (services.some((s) => s.where_offered !== 'shop')) modes.push('home');
  return modes;
}

function toProvider(r: Row): Provider {
  return {
    id: r.id, name: r.name, type: r.kind, category: r.category, area: r.area,
    reviews: 0, hours: r.hours || 'Hours not listed yet', staff: r.staff ?? [], online: r.online,
    modes: modesFrom(r.services),
    services: r.services.map(({ id, name, price, mins }) => ({ id, name, price, mins })),
  };
}

type Ctx = {
  providers: Provider[];
  /** True while the first load from the backend is still running. */
  loading: boolean;
  error: string;
  live: boolean;
  reload: () => void;
};
const ProvidersCtx = createContext<Ctx>(null as never);

export function ProvidersProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>(supabase ? [] : PROVIDERS);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    if (!supabase) return;
    supabase
      .from('providers')
      .select('id, kind, name, category, area, hours, staff, online, services(id, name, price, mins, where_offered)')
      // The database already hides unapproved listings from other people; this also hides your own.
      .eq('verification', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError('Could not load providers. Pull to refresh or try again later.');
        else {
          setError('');
          // A listing with no services has nothing to book yet.
          setProviders((data as Row[]).filter((r) => r.services.length).map(toProvider));
        }
        setLoading(false);
      });
  }, []);

  useEffect(reload, [reload]);

  const value = useMemo(() => ({ providers, loading, error, live: !!supabase, reload }), [providers, loading, error, reload]);
  return <ProvidersCtx.Provider value={value}>{children}</ProvidersCtx.Provider>;
}

export function useProviders() {
  return useContext(ProvidersCtx);
}

/** One provider by id, from the loaded list. */
export function useProvider(id: string | undefined) {
  const { providers, loading } = useProviders();
  return { provider: providers.find((p) => p.id === id), loading };
}
