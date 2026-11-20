-- Selfcare backend, step 2: bookings. Run after schema.sql.
--
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run again after edits: it only creates what is missing and replaces rules and functions.
--
-- Rules the database enforces:
--   * A client books through create_booking(), which looks up the real price and adds the fees.
--     Nobody can write a booking row or a price directly.
--   * Every booking starts as a request the business accepts or declines.
--   * Status moves one step at a time through set_booking_status(): the business accepts, heads
--     out, arrives and finishes; the client can cancel, with a fee once the business has arrived.
--   * A client sees only their own bookings, a business only bookings for its listing, admins all.
--
-- Fees must match src/lib/config.ts: SERVICE_FEE, TRAVEL_FEE_BASE and ARRIVED_CANCEL_FEE.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  -- Copies taken at booking time, so the booking still reads right if the listing changes later.
  provider_name text not null,
  service_name text not null,
  mins integer not null,
  mode text not null check (mode in ('shop', 'home')),
  asap boolean not null default false,
  starts_at timestamptz,
  staff text not null default '',
  address text not null default '',
  client_name text not null default '',
  client_phone text not null default '',
  pay_method text not null check (pay_method in ('mpesa', 'card', 'paypal')),
  price integer not null check (price >= 0),
  travel_fee integer not null default 0 check (travel_fee >= 0),
  service_fee integer not null default 0 check (service_fee >= 0),
  total integer not null check (total >= 0),
  cancel_fee integer not null default 0 check (cancel_fee >= 0),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'on-the-way', 'arrived', 'done', 'cancelled')),
  cancelled_by text check (cancelled_by in ('client', 'provider')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_has_time check (asap or starts_at is not null),
  constraint asap_is_home check (not asap or mode = 'home'),
  constraint home_has_address check (mode <> 'home' or char_length(trim(address)) > 0)
);
create index if not exists bookings_client_idx on public.bookings (client_id, created_at desc);
create index if not exists bookings_provider_idx on public.bookings (provider_id, created_at desc);
create index if not exists bookings_service_idx on public.bookings (service_id);

-- ---------------------------------------------------------------------------------------
-- Booking: the only way to create one
-- ---------------------------------------------------------------------------------------
create or replace function public.create_booking(
  p_service uuid,
  p_mode text,
  p_asap boolean,
  p_starts_at timestamptz,
  p_staff text,
  p_address text,
  p_pay text,
  p_name text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.services%rowtype;
  p public.providers%rowtype;
  v_staff text := coalesce(trim(p_staff), '');
  v_address text := coalesce(trim(p_address), '');
  v_name text := left(coalesce(trim(p_name), ''), 80);
  v_phone text := left(coalesce(trim(p_phone), ''), 30);
  v_travel integer;
  v_service_fee constant integer := 130;  -- SERVICE_FEE
  v_travel_base constant integer := 150;  -- TRAVEL_FEE_BASE (per-km pricing comes with client locations)
  v_id uuid;
begin
  if uid is null then
    raise exception 'Sign in to book.';
  end if;

  select * into s from public.services where id = p_service;
  if found then
    select * into p from public.providers where id = s.provider_id;
  end if;
  if not found or p.verification <> 'approved' then
    raise exception 'This service is not available any more.';
  end if;

  if p_mode not in ('shop', 'home')
     or (s.where_offered = 'shop' and p_mode <> 'shop')
     or (s.where_offered = 'home' and p_mode <> 'home') then
    raise exception 'This service is not offered there.';
  end if;
  if p_pay not in ('mpesa', 'card', 'paypal') then
    raise exception 'Choose how to pay.';
  end if;

  if coalesce(p_asap, false) then
    if p_mode <> 'home' then
      raise exception 'Shop bookings need a time.';
    end if;
    if not p.online then
      raise exception '% is offline right now. Pick a time instead.', p.name;
    end if;
  else
    if p_starts_at is null or p_starts_at < now() - interval '5 minutes' then
      raise exception 'Pick a time that has not passed yet.';
    end if;
    if p_starts_at > now() + interval '60 days' then
      raise exception 'Bookings can be made up to 60 days ahead.';
    end if;
  end if;

  if p_mode = 'home' then
    if v_address = '' then
      raise exception 'Add your address so they can find you.';
    end if;
    if v_phone = '' then
      raise exception 'Add a phone number so they can reach you.';
    end if;
  else
    v_address := '';
  end if;
  if char_length(v_address) > 200 then
    raise exception 'Keep the address under 200 characters.';
  end if;
  if v_staff <> '' and not (v_staff = any (p.staff)) then
    v_staff := '';
  end if;

  v_travel := case when p_mode = 'home' then v_travel_base else 0 end;

  insert into public.bookings (
    client_id, provider_id, service_id, provider_name, service_name, mins,
    mode, asap, starts_at, staff, address, client_name, client_phone, pay_method,
    price, travel_fee, service_fee, total
  ) values (
    uid, p.id, s.id, p.name, s.name, s.mins,
    p_mode, coalesce(p_asap, false), case when coalesce(p_asap, false) then null else p_starts_at end,
    v_staff, v_address, v_name, v_phone, p_pay,
    s.price, v_travel, v_service_fee, s.price + v_travel + v_service_fee
  )
  returning id into v_id;

  -- Remember the name and phone for next time.
  update public.profiles
  set full_name = coalesce(nullif(v_name, ''), full_name),
      phone = coalesce(nullif(v_phone, ''), phone)
  where id = uid;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Status: the only way to change one. Returns the new status.
--   Business: requested -> confirmed or cancelled (declined)
--             confirmed -> on-the-way (home), done (shop) or cancelled
--             on-the-way -> arrived -> done
--   Client:   cancel any time before done; once the business has arrived a fee applies.
-- ---------------------------------------------------------------------------------------
create or replace function public.set_booking_status(p_booking uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings%rowtype;
  as_provider boolean;
  as_client boolean;
  provider_ok boolean;
  client_ok boolean;
  v_cancel_fee constant integer := 300;  -- ARRIVED_CANCEL_FEE
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'Booking not found.';
  end if;
  as_provider := private.owns_provider(b.provider_id);
  as_client := b.client_id = uid;
  if not (as_provider or as_client) then
    raise exception 'Booking not found.';
  end if;

  provider_ok := as_provider and (
       (b.status = 'requested' and p_status in ('confirmed', 'cancelled'))
    or (b.status = 'confirmed' and p_status = 'cancelled')
    or (b.status = 'confirmed' and b.mode = 'home' and p_status = 'on-the-way')
    or (b.status = 'confirmed' and b.mode = 'shop' and p_status = 'done')
    or (b.status = 'on-the-way' and p_status = 'arrived')
    or (b.status = 'arrived' and p_status = 'done'));
  client_ok := as_client
    and p_status = 'cancelled'
    and b.status in ('requested', 'confirmed', 'on-the-way', 'arrived');

  if not (provider_ok or client_ok) then
    raise exception 'That change is not possible now.';
  end if;

  update public.bookings
  set status = p_status,
      cancelled_by = case when p_status = 'cancelled' then (case when provider_ok then 'provider' else 'client' end) end,
      cancel_fee = case when p_status = 'cancelled' and not provider_ok and b.status = 'arrived' then v_cancel_fee else 0 end,
      updated_at = now()
  where id = b.id;
  return p_status;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Who may do what
-- ---------------------------------------------------------------------------------------
revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

revoke execute on function public.create_booking(uuid, text, boolean, timestamptz, text, text, text, text, text),
  public.set_booking_status(uuid, text) from public, anon;
grant execute on function public.create_booking(uuid, text, boolean, timestamptz, text, text, text, text, text),
  public.set_booking_status(uuid, text) to authenticated;

alter table public.bookings enable row level security;

drop policy if exists "see own bookings" on public.bookings;
create policy "see own bookings" on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or private.owns_provider(provider_id) or private.is_admin());

-- Live updates: the app listens for changes to bookings it is allowed to see.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end;
$$;
