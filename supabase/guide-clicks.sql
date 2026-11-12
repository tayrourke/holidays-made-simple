-- Clicks from every phone that opens the guide.
-- The guide can add a tap. Only the dashboard password can read the totals.
-- Safe to re-run.

create table if not exists public.guide_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null,
  item text not null,
  name text,
  visitor text
);

create index if not exists guide_events_created_idx on public.guide_events (created_at);
create index if not exists guide_events_type_idx on public.guide_events (type, item);

alter table public.guide_events enable row level security;
revoke all on table public.guide_events from public, anon, authenticated;
grant all on table public.guide_events to service_role;

create or replace function public.guide_event_add(
  p_type text,
  p_item text,
  p_name text,
  p_visitor text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text := lower(trim(coalesce(p_type, '')));
  item text := left(trim(coalesce(p_item, '')), 120);
  label text := left(trim(coalesce(p_name, '')), 160);
  who text := left(trim(coalesce(p_visitor, '')), 40);
begin
  if kind not in ('visit','view','shop','save','sale','copy-code','signup','quiz','build-add','share','swipe','install','advent') then
    return;
  end if;
  if item = '' or item ~ '[<>]' or label ~ '[<>]' then
    return;
  end if;
  insert into public.guide_events (type, item, name, visitor)
  values (kind, item, nullif(label, ''), nullif(who, ''));
end;
$$;

create or replace function public.guide_click_stats(p_pass text, p_days int)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  days int := coalesce(p_days, 0);
  since timestamptz;
  result json;
begin
  if encode(extensions.digest(coalesce(p_pass, ''), 'sha256'), 'hex')
     is distinct from '462421efb3acba669660241bba7a12524a3aa3df951002d3bae1fd83258eea45' then
    raise exception 'Invalid password';
  end if;
  if days <= 0 then
    since := '-infinity'::timestamptz;
  else
    since := (date_trunc('day', timezone('America/Los_Angeles', now())) - make_interval(days => greatest(days, 1) - 1)) at time zone 'America/Los_Angeles';
  end if;
  select json_build_object(
    'visitors', (select count(distinct visitor) from public.guide_events where created_at >= since and visitor is not null),
    'shop', (select count(*) from public.guide_events where created_at >= since and type = 'shop'),
    'view', (select count(*) from public.guide_events where created_at >= since and type = 'view'),
    'save', (select count(*) from public.guide_events where created_at >= since and type = 'save'),
    'advent', (select count(*) from public.guide_events where created_at >= since and type = 'advent'),
    'sale', (select count(*) from public.guide_events where created_at >= since and type = 'sale'),
    'shopTop', coalesce((
      select json_agg(json_build_object('item', item, 'name', name, 'n', n) order by n desc)
      from (
        select item, max(name) as name, count(*)::int as n
        from public.guide_events
        where created_at >= since and type = 'shop'
        group by item
        order by count(*) desc
        limit 8
      ) shop_rows
    ), '[]'::json),
    'saleTop', coalesce((
      select json_agg(json_build_object('item', item, 'name', name, 'n', n) order by n desc)
      from (
        select item, max(name) as name, count(*)::int as n
        from public.guide_events
        where created_at >= since and type = 'sale'
        group by item
        order by count(*) desc
        limit 8
      ) sale_rows
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

revoke all on function public.guide_event_add(text, text, text, text) from public;
revoke all on function public.guide_click_stats(text, int) from public;
grant execute on function public.guide_event_add(text, text, text, text) to anon, authenticated;
grant execute on function public.guide_click_stats(text, int) to anon, authenticated;

notify pgrst, 'reload schema';
