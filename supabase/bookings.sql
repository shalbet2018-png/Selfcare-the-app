-- Selfcare backend, step 2: bookings. Run after schema.sql.
--
-- How to use: Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run again after edits: it only creates what is missing, replaces rules and functions,
-- and moves data from older versions of this file.
--
-- Rules the database enforces:
--   * A client books through create_booking(), which looks up the real price and adds the fees.
--     Nobody can write a booking row or a price directly, and nobody can book their own listing.
--   * A time can only be booked while the business has room: as many overlapping bookings as it
--     has staff (at least one), and none for a staff member who is already booked then.
--   * Every booking starts as a request the business accepts or declines.
--   * Status moves one step at a time through set_booking_status(): the business accepts, heads
--     out, arrives and finishes; the client can cancel, with a fee once the business has arrived.
--   * A client sees only their own bookings, a business only bookings for its listing, admins all.
--   * The client's address and phone live in booking_contacts. The business sees them only from
--     accepting until the job ends; before accepting, after declining and after the job, they are hidden.
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
  client_name text not null default '',
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
  constraint asap_is_home check (not asap or mode = 'home')
);
create index if not exists bookings_client_idx on public.bookings (client_id, created_at desc);
create index if not exists bookings_provider_idx on public.bookings (provider_id, created_at desc);
create index if not exists bookings_service_idx on public.bookings (service_id);
create index if not exists bookings_provider_time_idx on public.bookings (provider_id, starts_at);

-- The client's contact details for one booking, kept apart so they can be hidden on their own.
create table if not exists public.booking_contacts (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  address text not null default '',
  client_phone text not null default ''
);
-- Where the client shared their location for a home visit (private, like the address).
alter table public.booking_contacts add column if not exists lat double precision;
alter table public.booking_contacts add column if not exists lng double precision;
-- How far the business travels for a home visit, in km. Shown to the business before it accepts.
alter table public.bookings add column if not exists distance_km numeric(5, 1);

-- Straight-line distance in km between two points (haversine).
create or replace function private.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Older versions kept address and phone on bookings: move them across once, then drop them.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'bookings' and column_name = 'address') then
    execute $m$
      insert into public.booking_contacts (booking_id, address, client_phone)
      select id, address, client_phone from public.bookings
      on conflict (booking_id) do nothing
    $m$;
    alter table public.bookings drop constraint if exists home_has_address;
    alter table public.bookings drop column address;
    alter table public.bookings drop column if exists client_phone;
  end if;
end;
$$;

-- True when the signed-in person may see this booking's address and phone.
create or replace function private.can_see_booking_contact(p_booking uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking
      and (b.client_id = (select auth.uid())
           or (private.owns_provider(b.provider_id) and b.status in ('confirmed', 'on-the-way', 'arrived'))
           or private.is_admin())
  );
$$;

-- ---------------------------------------------------------------------------------------
-- Booking: the only way to create one
-- ---------------------------------------------------------------------------------------
-- Earlier versions took no client location; remove that signature so only the current one exists.
drop function if exists public.create_booking(uuid, text, boolean, timestamptz, text, text, text, text, text);

create or replace function public.create_booking(
  p_service uuid,
  p_mode text,
  p_asap boolean,
  p_starts_at timestamptz,
  p_staff text,
  p_address text,
  p_pay text,
  p_name text,
  p_phone text,
  p_lat double precision default null,
  p_lng double precision default null
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
  v_asap boolean := coalesce(p_asap, false);
  v_staff text := coalesce(trim(p_staff), '');
  v_address text := coalesce(trim(p_address), '');
  v_name text := left(coalesce(trim(p_name), ''), 80);
  v_phone text := left(coalesce(trim(p_phone), ''), 30);
  v_end timestamptz;
  v_capacity integer;
  v_busy integer;
  v_travel integer;
  v_km numeric(5, 1);
  v_local timestamp;
  v_day text;
  v_open jsonb;
  v_service_fee constant integer := 130;  -- SERVICE_FEE
  v_travel_base constant integer := 150;  -- TRAVEL_FEE_BASE
  v_travel_per_km constant integer := 50; -- TRAVEL_FEE_PER_KM
  v_active constant text[] := array['requested', 'confirmed', 'on-the-way', 'arrived'];
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
  if p.owner_id = uid then
    raise exception 'You cannot book your own listing.';
  end if;

  if p_mode not in ('shop', 'home')
     or (s.where_offered = 'shop' and p_mode <> 'shop')
     or (s.where_offered = 'home' and p_mode <> 'home') then
    raise exception 'This service is not offered there.';
  end if;
  if p_pay not in ('mpesa', 'card', 'paypal') then
    raise exception 'Choose how to pay.';
  end if;

  if v_asap then
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

  -- Opening hours (Nairobi time). {} means the business has not set them yet: any time is fine.
  if not v_asap and p.open_hours <> '{}'::jsonb then
    v_local := p_starts_at at time zone 'Africa/Nairobi';
    v_day := lower(to_char(v_local, 'Dy'));
    v_open := p.open_hours -> v_day;
    if v_open is null then
      raise exception '% is closed on that day. Pick another day.', p.name;
    end if;
    if v_local::time < (v_open ->> 0)::time
       or (v_local + make_interval(mins => s.mins))::date <> v_local::date
       or (v_local + make_interval(mins => s.mins))::time > (v_open ->> 1)::time then
      raise exception '% is open % to % that day, and this service takes % minutes. Pick a time inside those hours.',
        p.name, v_open ->> 0, v_open ->> 1, s.mins;
    end if;
  end if;

  if p_mode = 'home' then
    if v_address = '' then
      raise exception 'Add your address so they can find you.';
    end if;
    if v_phone = '' then
      raise exception 'Add a phone number so they can reach you.';
    end if;
    -- Home visits need both locations, so the distance and travel fee are real.
    if p.lat is null or p.lng is null then
      raise exception '% has not set their location yet, so home visits are not available. Book at the shop instead.', p.name;
    end if;
    if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'Share your location so we can check they can reach you.';
    end if;
    v_km := round(private.km_between(p.lat, p.lng, p_lat, p_lng)::numeric, 1);
    if v_km > p.radius_km then
      raise exception '% travels up to % km for home visits, and you are % km away. Try a business closer to you, or book at the shop.',
        p.name, p.radius_km, v_km;
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

  -- One booking at a time per business, so two clients cannot take the same last slot.
  perform pg_advisory_xact_lock(hashtextextended(p.id::text, 0));
  v_capacity := greatest(1, coalesce(array_length(p.staff, 1), 0));
  if v_asap then
    select count(*) into v_busy from public.bookings b
    where b.provider_id = p.id and b.asap and b.status = any (v_active);
    if v_busy >= v_capacity then
      raise exception '% is busy with other requests right now. Pick a time instead.', p.name;
    end if;
  else
    v_end := p_starts_at + make_interval(mins => s.mins);
    if v_staff <> '' and exists (
      select 1 from public.bookings b
      where b.provider_id = p.id and b.staff = v_staff and not b.asap and b.status = any (v_active)
        and b.starts_at < v_end and b.starts_at + make_interval(mins => b.mins) > p_starts_at
    ) then
      raise exception '% is already booked at that time. Pick another time or anyone.', v_staff;
    end if;
    select count(*) into v_busy from public.bookings b
    where b.provider_id = p.id and not b.asap and b.status = any (v_active)
      and b.starts_at < v_end and b.starts_at + make_interval(mins => b.mins) > p_starts_at;
    if v_busy >= v_capacity then
      raise exception '% is fully booked at that time. Pick another time.', p.name;
    end if;
  end if;

  v_travel := case when p_mode = 'home' then round(v_travel_base + v_travel_per_km * v_km)::integer else 0 end;

  insert into public.bookings (
    client_id, provider_id, service_id, provider_name, service_name, mins,
    mode, asap, starts_at, staff, client_name, pay_method,
    price, travel_fee, service_fee, total, distance_km
  ) values (
    uid, p.id, s.id, p.name, s.name, s.mins,
    p_mode, v_asap, case when v_asap then null else p_starts_at end,
    v_staff, v_name, p_pay,
    s.price, v_travel, v_service_fee, s.price + v_travel + v_service_fee,
    case when p_mode = 'home' then v_km end
  )
  returning id into v_id;

  insert into public.booking_contacts (booking_id, address, client_phone, lat, lng)
  values (v_id, v_address, v_phone,
          case when p_mode = 'home' then p_lat end, case when p_mode = 'home' then p_lng end);

  -- Remember the name and phone for next time.
  update public.profiles
  set full_name = coalesce(nullif(v_name, ''), full_name),
      phone = coalesce(nullif(v_phone, ''), phone)
  where id = uid;

  return v_id;
end;
$$;

-- When a business is taken, for the booking form to hide those times. Times only: no names or contacts.
create or replace function public.busy_times(p_provider uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, mins integer, staff text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.starts_at, b.mins, b.staff
  from public.bookings b
  join public.providers p on p.id = b.provider_id and p.verification = 'approved'
  where b.provider_id = p_provider
    and not b.asap
    and b.status in ('requested', 'confirmed', 'on-the-way', 'arrived')
    and b.starts_at < p_to
    and b.starts_at + make_interval(mins => b.mins) > p_from
    and p_to - p_from <= interval '62 days';
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
revoke all on public.bookings, public.booking_contacts from anon, authenticated;
grant select on public.bookings, public.booking_contacts to authenticated;
-- Server functions (delete-account) use the service_role; newer projects don't grant it table access.
grant select, insert, update, delete on public.bookings, public.booking_contacts to service_role;

revoke execute on function public.create_booking(uuid, text, boolean, timestamptz, text, text, text, text, text, double precision, double precision),
  public.set_booking_status(uuid, text) from public, anon;
grant execute on function public.create_booking(uuid, text, boolean, timestamptz, text, text, text, text, text, double precision, double precision),
  public.set_booking_status(uuid, text) to authenticated;
revoke execute on function public.busy_times(uuid, timestamptz, timestamptz) from public;
grant execute on function public.busy_times(uuid, timestamptz, timestamptz) to anon, authenticated;

alter table public.bookings enable row level security;
alter table public.booking_contacts enable row level security;

drop policy if exists "see own bookings" on public.bookings;
create policy "see own bookings" on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or private.owns_provider(provider_id) or private.is_admin());

drop policy if exists "see contact when allowed" on public.booking_contacts;
create policy "see contact when allowed" on public.booking_contacts for select to authenticated
  using (private.can_see_booking_contact(booking_id));

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
