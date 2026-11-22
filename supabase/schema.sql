-- Selfcare backend, step 1: accounts, providers, services, verification documents and photos.
--
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run again after edits: it only creates what is missing and replaces rules and functions.
--
-- The rules below are enforced by the database itself, so they hold even if someone
-- talks to the backend without going through the app:
--   * Everyone can see approved providers, their services and photos. Nothing else.
--   * A provider can edit only their own listing, services, photos and documents.
--   * Nobody can approve themselves: verification status changes only through
--     submit_for_verification() (owner) and review_provider() (admins).
--   * Nobody can make themselves an admin: the role column cannot be written from the app.
--   * Verification documents are readable only by their owner and by admins.

-- ---------------------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- Every new sign-up gets a profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper checks used by the rules below live in their own "private" area, which the app's
-- public web address does not expose, so nobody can call them directly from outside.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- ---------------------------------------------------------------------------------------
-- Providers (businesses and freelancers)
-- ---------------------------------------------------------------------------------------
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('business', 'freelancer')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  category text not null check (category in ('hair', 'lashes', 'nails', 'pedicure', 'massage', 'brows', 'makeup', 'skincare')),
  area text not null check (char_length(trim(area)) between 1 and 80),
  radius_km numeric not null default 10 check (radius_km between 0 and 50),
  hours text not null default '',
  staff text[] not null default '{}',
  lat double precision,
  lng double precision,
  verification text not null default 'not-started'
    check (verification in ('not-started', 'submitted', 'in-review', 'approved', 'rejected')),
  online boolean not null default false,
  created_at timestamptz not null default now(),
  -- Only approved providers can be online.
  constraint online_needs_approval check (not online or verification = 'approved')
);

-- Details only the owner and admins may see.
create table if not exists public.provider_private (
  provider_id uuid primary key references public.providers (id) on delete cascade,
  payout text not null default 'daily' check (payout in ('after', 'daily', 'weekly')),
  review_note text
);

create or replace function public.handle_new_provider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.provider_private (provider_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_provider_created on public.providers;
create trigger on_provider_created
  after insert on public.providers
  for each row execute function public.handle_new_provider();

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  price integer not null check (price > 0),
  mins integer not null check (mins between 5 and 720),
  where_offered text not null default 'shop' check (where_offered in ('shop', 'home', 'both')),
  created_at timestamptz not null default now()
);
create index if not exists services_provider_idx on public.services (provider_id);

create table if not exists public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  kind text not null check (kind in ('business-registration', 'operating-permit', 'id-or-passport', 'selfie')),
  path text not null, -- file path inside the private provider-documents bucket
  uploaded_at timestamptz not null default now(),
  unique (provider_id, kind)
);

create table if not exists public.provider_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  path text not null, -- file path inside the public provider-photos bucket
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists provider_photos_provider_idx on public.provider_photos (provider_id);

-- True when the signed-in user owns this provider.
create or replace function private.owns_provider(p_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.providers where id = p_provider and owner_id = (select auth.uid()));
$$;

-- True when this provider is approved, so the public may see it.
create or replace function private.provider_is_public(p_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.providers where id = p_provider and verification = 'approved');
$$;

-- ---------------------------------------------------------------------------------------
-- Verification: the only two ways the status can change
-- ---------------------------------------------------------------------------------------

-- Called by the owner once their documents are uploaded.
create or replace function public.submit_for_verification()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.providers%rowtype;
  needed text[];
  missing text[];
begin
  select * into p from public.providers where owner_id = (select auth.uid());
  if not found then
    raise exception 'Register your business first.';
  end if;
  if p.verification not in ('not-started', 'rejected') then
    return p.verification; -- already submitted or approved: nothing to do
  end if;

  needed := case p.kind
    when 'business' then array['business-registration', 'operating-permit']
    else array['id-or-passport', 'selfie']
  end;
  select array_agg(k) into missing
  from unnest(needed) as k
  where not exists (select 1 from public.provider_documents d where d.provider_id = p.id and d.kind = k);
  if missing is not null then
    raise exception 'Missing documents: %', array_to_string(missing, ', ');
  end if;

  update public.providers set verification = 'submitted' where id = p.id;
  update public.provider_private set review_note = null where provider_id = p.id;
  return 'submitted';
end;
$$;

-- Called by an admin from the review page.
create or replace function public.review_provider(p_provider uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can review providers.';
  end if;
  if p_status not in ('in-review', 'approved', 'rejected') then
    raise exception 'Status must be in-review, approved or rejected.';
  end if;
  if p_status = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'Give a reason when rejecting, so the provider knows what to fix.';
  end if;

  update public.providers
  set verification = p_status,
      online = case when p_status = 'approved' then online else false end
  where id = p_provider;
  if not found then
    raise exception 'Provider not found.';
  end if;
  update public.provider_private set review_note = nullif(trim(p_note), '') where provider_id = p_provider;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Who may do what
-- Step 1: remove the default "everything allowed" grants, then give back only what is needed.
-- Step 2: row rules decide which rows each person can touch.
-- ---------------------------------------------------------------------------------------
revoke all on public.profiles, public.providers, public.provider_private, public.services,
  public.provider_documents, public.provider_photos from anon, authenticated;

-- profiles: read your own; edit your name and phone only (never the role).
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- providers: verification is deliberately missing from insert and update.
grant select on public.providers to anon, authenticated;
grant insert (owner_id, kind, name, category, area, radius_km, hours, staff, lat, lng) on public.providers to authenticated;
grant update (kind, name, category, area, radius_km, hours, staff, lat, lng, online) on public.providers to authenticated;
-- Server functions (delete-account) use the service_role, which newer projects no longer grant
-- table access automatically.
grant select, insert, update, delete on public.profiles, public.providers, public.provider_private, public.services,
  public.provider_documents, public.provider_photos to service_role;

-- No direct delete: a listing goes only with its account (the delete-account function), which also
-- removes its files from storage, so no ID documents are left behind.
revoke delete on public.providers from authenticated;

-- provider_private: the owner picks a payout schedule; review notes come from admins only.
grant select on public.provider_private to authenticated;
grant update (payout) on public.provider_private to authenticated;

grant select on public.services, public.provider_photos to anon, authenticated;
grant insert, update, delete on public.services, public.provider_photos to authenticated;

grant select, insert, delete on public.provider_documents to authenticated;
grant update (path, uploaded_at) on public.provider_documents to authenticated;

revoke execute on function public.handle_new_user(), public.handle_new_provider(),
  public.submit_for_verification(), public.review_provider(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_for_verification(), public.review_provider(uuid, text, text) to authenticated;
grant execute on function private.is_admin(), private.owns_provider(uuid), private.provider_is_public(uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.provider_private enable row level security;
alter table public.services enable row level security;
alter table public.provider_documents enable row level security;
alter table public.provider_photos enable row level security;

-- profiles
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- providers
drop policy if exists "see approved providers" on public.providers;
create policy "see approved providers" on public.providers for select to anon, authenticated
  using (verification = 'approved' or owner_id = (select auth.uid()) or private.is_admin());
drop policy if exists "register own provider" on public.providers;
create policy "register own provider" on public.providers for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists "edit own provider" on public.providers;
create policy "edit own provider" on public.providers for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "delete own provider" on public.providers;

-- An approved (or waiting) listing whose identity changes goes back to Selfcare for review:
-- a new name, main service or area waits for re-approval; switching between business and
-- freelancer also needs that kind's documents again. It is hidden from clients meanwhile.
create or replace function private.recheck_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.verification in ('submitted', 'in-review', 'approved')
     and (new.kind is distinct from old.kind or new.name is distinct from old.name
          or new.category is distinct from old.category or new.area is distinct from old.area) then
    new.verification := case when new.kind is distinct from old.kind then 'not-started' else 'submitted' end;
    new.online := false;
  end if;
  return new;
end;
$$;

drop trigger if exists recheck_listing on public.providers;
create trigger recheck_listing
  before update on public.providers
  for each row execute function private.recheck_listing();

-- provider_private
drop policy if exists "read own private details" on public.provider_private;
create policy "read own private details" on public.provider_private for select to authenticated
  using (private.owns_provider(provider_id) or private.is_admin());
drop policy if exists "edit own private details" on public.provider_private;
create policy "edit own private details" on public.provider_private for update to authenticated
  using (private.owns_provider(provider_id)) with check (private.owns_provider(provider_id));

-- services
drop policy if exists "see services" on public.services;
create policy "see services" on public.services for select to anon, authenticated
  using (private.provider_is_public(provider_id) or private.owns_provider(provider_id) or private.is_admin());
-- One rule per action (not "for all"), so reading is decided by "see services" alone.
drop policy if exists "manage own services" on public.services;
drop policy if exists "add own services" on public.services;
create policy "add own services" on public.services for insert to authenticated
  with check (private.owns_provider(provider_id));
drop policy if exists "edit own services" on public.services;
create policy "edit own services" on public.services for update to authenticated
  using (private.owns_provider(provider_id)) with check (private.owns_provider(provider_id));
drop policy if exists "remove own services" on public.services;
create policy "remove own services" on public.services for delete to authenticated
  using (private.owns_provider(provider_id));

-- provider_photos
drop policy if exists "see photos" on public.provider_photos;
create policy "see photos" on public.provider_photos for select to anon, authenticated
  using (private.provider_is_public(provider_id) or private.owns_provider(provider_id) or private.is_admin());
drop policy if exists "manage own photos" on public.provider_photos;
drop policy if exists "add own photos" on public.provider_photos;
-- A record may only point at a file inside the owner's own folder ("<user id>/...").
create policy "add own photos" on public.provider_photos for insert to authenticated
  with check (private.owns_provider(provider_id) and (storage.foldername(path))[1] = (select auth.uid())::text);
drop policy if exists "edit own photos" on public.provider_photos;
create policy "edit own photos" on public.provider_photos for update to authenticated
  using (private.owns_provider(provider_id))
  with check (private.owns_provider(provider_id) and (storage.foldername(path))[1] = (select auth.uid())::text);
drop policy if exists "remove own photos" on public.provider_photos;
create policy "remove own photos" on public.provider_photos for delete to authenticated
  using (private.owns_provider(provider_id));

-- provider_documents: never visible to the public or to other providers.
drop policy if exists "read own documents" on public.provider_documents;
create policy "read own documents" on public.provider_documents for select to authenticated
  using (private.owns_provider(provider_id) or private.is_admin());
drop policy if exists "add own documents" on public.provider_documents;
create policy "add own documents" on public.provider_documents for insert to authenticated
  with check (private.owns_provider(provider_id) and (storage.foldername(path))[1] = (select auth.uid())::text);
drop policy if exists "replace own documents" on public.provider_documents;
create policy "replace own documents" on public.provider_documents for update to authenticated
  using (private.owns_provider(provider_id))
  with check (private.owns_provider(provider_id) and (storage.foldername(path))[1] = (select auth.uid())::text);
drop policy if exists "remove own documents" on public.provider_documents;
create policy "remove own documents" on public.provider_documents for delete to authenticated
  using (private.owns_provider(provider_id));

-- ---------------------------------------------------------------------------------------
-- File storage
-- Every file lives in a folder named after its owner's user id: "<user id>/<file name>".
-- ---------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('provider-documents', 'provider-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('provider-photos', 'provider-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents: owner or admin reads" on storage.objects;
create policy "documents: owner or admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'provider-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin()));
drop policy if exists "documents: owner uploads" on storage.objects;
create policy "documents: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "documents: owner replaces" on storage.objects;
create policy "documents: owner replaces" on storage.objects for update to authenticated
  using (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "documents: owner deletes" on storage.objects;
create policy "documents: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Photos are served publicly by the bucket itself; these rules cover uploading and managing them.
drop policy if exists "photos: owner lists" on storage.objects;
create policy "photos: owner lists" on storage.objects for select to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos: owner uploads" on storage.objects;
create policy "photos: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos: owner replaces" on storage.objects;
create policy "photos: owner replaces" on storage.objects for update to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos: owner deletes" on storage.objects;
create policy "photos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Earlier versions of this file put the helper checks in the public area. Remove those copies
-- (every rule above now uses the private ones).
drop function if exists public.is_admin();
drop function if exists public.owns_provider(uuid);
drop function if exists public.provider_is_public(uuid);

-- ---------------------------------------------------------------------------------------
-- Making yourself the first admin (run separately, once, after you have signed up in the app):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- ---------------------------------------------------------------------------------------
