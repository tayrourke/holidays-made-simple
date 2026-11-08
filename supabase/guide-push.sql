-- Holidays Made Simple — morning door alerts
-- Run in the SQL editor on the EXISTING Hearthkeep Supabase project.
-- Safe to re-run. Does not read or write vault rows.
--
-- Uses the VAPID keys and pg_net / pg_cron already set up for Hearthkeep.
-- Sends at 8:00am in each phone's own time zone. The job runs every hour
-- and only pings the phones whose local time is 8am on a door day.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Fill the Hearthkeep push wiring only when it is still blank.
update public.hearthkeep_push_config
set supabase_url = 'https://gyikvutzwzbeqircjeru.supabase.co',
    anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5aWt2dXR6d3piZXFpcmNqZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MDcyMDEsImV4cCI6MjEwMDA4MzIwMX0.Pbl3gX3PQnSjXmmuamMmneF6QmuOhzFnlzsMZ09N51s',
    updated_at = now()
where id = 1
  and length(trim(coalesce(supabase_url, ''))) < 12;

-- ── phones that asked for a morning ping (no account) ─────
create table if not exists public.guide_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guide_push_subscriptions
  add column if not exists tz text not null default 'America/Los_Angeles';

alter table public.guide_push_subscriptions enable row level security;
revoke all on table public.guide_push_subscriptions from public, anon, authenticated;
grant all on table public.guide_push_subscriptions to service_role;

-- ── one send per door, so a retry cannot ping twice ───────
create table if not exists public.guide_push_deliveries (
  event_key text primary key,
  created_at timestamptz not null default now()
);

alter table public.guide_push_deliveries enable row level security;
revoke all on table public.guide_push_deliveries from public, anon, authenticated;
grant all on table public.guide_push_deliveries to service_role;

-- ── what each morning says ────────────────────────────────
create table if not exists public.guide_door_pings (
  day date primary key,
  n integer not null,
  title text not null
);

alter table public.guide_door_pings enable row level security;
revoke all on table public.guide_door_pings from public, anon, authenticated;
grant all on table public.guide_door_pings to service_role;

insert into public.guide_door_pings (day, n, title) values
  ('2026-11-23', 1, 'the thanksgiving recipes I make every year'),
  ('2026-11-24', 2, 'all my codes, in one place'),
  ('2026-11-25', 3, 'thankful place cards'),
  ('2026-11-26', 4, 'pack the leftovers the simple way'),
  ('2026-11-27', 5, 'it''s officially black friday'),
  ('2026-11-28', 6, 'swap your holiday candles'),
  ('2026-11-29', 7, 'set up a story advent'),
  ('2026-11-30', 8, 'a cyber monday gift from me'),
  ('2026-12-01', 9, 'salt dough ornament day'),
  ('2026-12-02', 10, 'make a stovetop simmer pot'),
  ('2026-12-03', 11, 'free printable gift tags'),
  ('2026-12-04', 12, 'camp-in by the tree'),
  ('2026-12-05', 13, 'upgrade cocoa night'),
  ('2026-12-06', 14, 'my free toxin audit'),
  ('2026-12-07', 15, 'swap your candy canes'),
  ('2026-12-08', 16, 'pinecone bird feeders'),
  ('2026-12-09', 17, 'wrap it the simple way'),
  ('2026-12-10', 18, 'a cozy-season gift from me'),
  ('2026-12-11', 19, 'fewer, better toys'),
  ('2026-12-12', 20, 'the gratitude ornament'),
  ('2026-12-13', 21, 'a gift you can finish tonight'),
  ('2026-12-14', 22, 'make a dried orange garland'),
  ('2026-12-15', 23, 'christmas lights drive'),
  ('2026-12-16', 24, 'last call')
on conflict (day) do update set n = excluded.n, title = excluded.title;

-- Only real push services. Stops the public signup from storing a random URL.
create or replace function public.guide_push_endpoint_ok(ep text)
returns boolean
language sql
immutable
as $$
  select ep ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[^/]+\.notify\.windows\.com)/'
     and length(ep) between 20 and 2000;
$$;

drop function if exists public.guide_push_subscribe(text, text, text);

create or replace function public.guide_push_subscribe(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_tz text default 'America/Los_Angeles'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  ep text := trim(coalesce(p_endpoint, ''));
  zone text := trim(coalesce(p_tz, ''));
begin
  if not public.guide_push_endpoint_ok(ep)
     or length(trim(coalesce(p_p256dh, ''))) < 8
     or length(trim(coalesce(p_auth, ''))) < 8
     or length(p_p256dh) > 400
     or length(p_auth) > 400 then
    raise exception 'Invalid subscription';
  end if;
  if zone = '' or length(zone) > 64 or zone !~ '^[A-Za-z0-9_+\-/]+$' then
    zone := 'America/Los_Angeles';
  end if;
  begin
    perform timezone(zone, now());
  exception when others then
    zone := 'America/Los_Angeles';
  end;
  insert into public.guide_push_subscriptions as s (endpoint, p256dh, auth, tz)
  values (ep, trim(p_p256dh), trim(p_auth), zone)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        tz = excluded.tz,
        updated_at = now()
  returning s.id into rid;
  return rid;
end;
$$;

create or replace function public.guide_push_unsubscribe(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.guide_push_subscriptions
  where endpoint = trim(coalesce(p_endpoint, ''));
end;
$$;

revoke all on function public.guide_push_subscribe(text, text, text, text) from public;
revoke all on function public.guide_push_unsubscribe(text) from public;
grant execute on function public.guide_push_subscribe(text, text, text, text) to anon, authenticated;
grant execute on function public.guide_push_unsubscribe(text) to anon, authenticated;

-- 8am in each phone's time zone. No door that local day: skip that phone.
create or replace function public.guide_dispatch_morning()
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  cfg record;
  push_secret text;
  door record;
  zone text;
  local_now timestamp;
begin
  select * into cfg from public.hearthkeep_push_config where id = 1;
  if cfg is null or length(trim(coalesce(cfg.supabase_url, ''))) < 12 or length(trim(coalesce(cfg.anon_key, ''))) < 20 then
    raise warning 'guide push: hearthkeep_push_config is empty';
    return;
  end if;
  select s.secret into push_secret from public.hearthkeep_push_dispatch_secret s where s.id = 1;
  if push_secret is null or length(push_secret) < 16 then
    raise warning 'guide push: missing dispatch secret';
    return;
  end if;
  for zone in
    select distinct coalesce(nullif(trim(tz), ''), 'America/Los_Angeles')
    from public.guide_push_subscriptions
  loop
    begin
      local_now := timezone(zone, now());
    exception when others then
      continue;
    end;
    if extract(hour from local_now)::int <> 8 then
      continue;
    end if;
    select * into door from public.guide_door_pings where day = local_now::date;
    if not found then
      continue;
    end if;
    perform net.http_post(
      url := rtrim(trim(cfg.supabase_url), '/') || '/functions/v1/guide-send-push',
      body := jsonb_build_object(
        'event', 'guide',
        'event_key', 'guide:' || to_char(door.day, 'YYYY-MM-DD') || ':' || zone,
        'tz', zone,
        'title', 'day ' || door.n,
        'body', 'open the app to unwrap today''s advent',
        'url', './#advent',
        'tag', 'guide-' || to_char(door.day, 'YYYY-MM-DD')
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || trim(cfg.anon_key),
        'apikey', trim(cfg.anon_key),
        'x-push-secret', push_secret
      )
    );
  end loop;
exception when others then
  raise warning 'guide push http: %', sqlerrm;
end;
$$;

revoke all on function public.guide_dispatch_morning() from public, anon, authenticated;
grant execute on function public.guide_dispatch_morning() to service_role;

do $$
begin
  perform cron.unschedule('guide-morning-door');
exception when others then
  null;
end $$;

select cron.schedule(
  'guide-morning-door',
  '0 * * * *',
  $$select public.guide_dispatch_morning();$$
);
