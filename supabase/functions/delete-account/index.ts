// Deletes the signed-in person's Selfcare account: their files first (ID documents and listing
// photos), then the account itself. The database removes the rest through its foreign keys.
// Called from the app with the person's own sign-in token; runs with the project's secret key.
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['provider-documents', 'provider-photos'];
const ACTIVE = ['requested', 'confirmed', 'on-the-way', 'arrived'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// The server key, which bypasses row rules; Supabase provides it to every function. The tables
// must also grant the service_role access (see the end of schema.sql and bookings.sql).
function secretKey() {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) return JSON.parse(keys).default as string;
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Sign in first.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } });
  const { data: who, error: whoError } = await admin.auth.getUser(token);
  if (whoError || !who.user) return reply(401, { error: 'Sign in again, then try once more.' });
  const uid = who.user.id;

  // Don't strand the other side of a booking that is still under way.
  const { data: mine } = await admin.from('providers').select('id').eq('owner_id', uid);
  const providerIds = (mine ?? []).map((p) => p.id as string);
  let active = admin.from('bookings').select('id', { count: 'exact', head: true }).in('status', ACTIVE);
  active = providerIds.length
    ? active.or(`client_id.eq.${uid},provider_id.in.(${providerIds.join(',')})`)
    : active.eq('client_id', uid);
  const { count, error: countError } = await active;
  if (countError) return reply(500, { error: 'Could not check your bookings. Try again.' });
  if (count) {
    return reply(409, { error: 'You have bookings in progress. Finish or cancel them, then delete your account.' });
  }

  // Every file lives in a folder named after its owner's user id.
  for (const bucket of BUCKETS) {
    for (;;) {
      const { data: files, error } = await admin.storage.from(bucket).list(uid, { limit: 100 });
      if (error) return reply(500, { error: 'Could not remove your files. Try again.' });
      if (!files?.length) break;
      const { error: removeError } = await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
      if (removeError) return reply(500, { error: 'Could not remove your files. Try again.' });
      if (files.length < 100) break;
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) return reply(500, { error: 'Could not delete your account. Try again.' });
  return reply(200, { deleted: true });
});
