-- 2026 toxin free gift guide: holiday sales + click tracking
-- paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- safe to run more than once.

-- 1) who can use the dashboard ------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;   -- no policies: nobody can read it from the app

-- >>> change this to the email of the Supabase Auth user you'll sign in with <<<
insert into public.admins (email) values ('taylor@swapsmadesimple.com')
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) holiday sales --------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (char_length(brand) <= 80),
  headline text not null check (char_length(headline) <= 120),
  url text not null check (url ~* '^https?://'),
  code text check (char_length(code) <= 40),
  note text check (char_length(note) <= 200),
  starts date,
  ends date,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sales enable row level security;

drop policy if exists "anyone can read live sales" on public.sales;
create policy "anyone can read live sales" on public.sales
  for select using (
    public.is_admin()
    or (active and (starts is null or starts <= current_date) and (ends is null or ends >= current_date))
  );

drop policy if exists "admin manages sales" on public.sales;
create policy "admin manages sales" on public.sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) click tracking -------------------------------------------------------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,
  item text not null,
  name text,
  visitor text
);
create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_type_idx on public.events (type, item);
alter table public.events enable row level security;

drop policy if exists "anyone can log a tap" on public.events;
create policy "anyone can log a tap" on public.events
  for insert to anon, authenticated with check (
    type in ('visit','view','shop','save','sale','copy-code','signup','quiz','build-add','share','swipe','install','advent')
    and char_length(item) <= 120
    and char_length(coalesce(name,'')) <= 160
    and char_length(coalesce(visitor,'')) <= 40
  );
-- no select policy: visitors can add taps but never read them. only gift_stats() below reads them.

-- 4) the numbers your dashboard shows ------------------------------------
create or replace function public.gift_stats(since timestamptz)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select json_build_object(
    'visitors', (select count(distinct visitor) from events where created_at >= since),
    'totals', coalesce((select json_object_agg(type, n) from (
        select type, count(*) n from events where created_at >= since group by type) t), '{}'::json),
    'top', coalesce((select json_object_agg(type, rows) from (
        select type, json_agg(json_build_object('item', item, 'name', name, 'n', n) order by n desc) rows
        from (
          select type, item, max(name) name, count(*) n,
                 row_number() over (partition by type order by count(*) desc) rk
          from events where created_at >= since and type <> 'visit'
          group by type, item
        ) ranked where rk <= 20
        group by type) t), '{}'::json),
    'daily', coalesce((select json_agg(d order by d.day) from (
        select to_char(date_trunc('day', created_at at time zone 'America/Los_Angeles'), 'YYYY-MM-DD') as day,
               count(*) filter (where type = 'shop') as shop,
               count(*) filter (where type = 'view') as view,
               count(distinct visitor) as visitors
        from events where created_at >= greatest(since, now() - interval '45 days')
        group by 1) d), '[]'::json)
  ) into result;
  return result;
end;
$$;
grant execute on function public.gift_stats(timestamptz) to authenticated;
