-- Gift edits from the phone dashboard, read by the public guide.
-- Run in the SQL editor on the same project as the morning door alerts.
-- Safe to re-run. Does not read or write vault rows.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.guide_catalog (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.guide_catalog enable row level security;
revoke all on table public.guide_catalog from public, anon, authenticated;
grant all on table public.guide_catalog to service_role;

create or replace function public.guide_catalog_list()
returns table (id text, body jsonb)
language sql
security definer
set search_path = public
as $$
  select c.id, c.body
  from public.guide_catalog c
  order by c.updated_at desc;
$$;

create or replace function public.guide_catalog_save(
  p_pass text,
  p_id text,
  p_body jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  gift_id text := trim(coalesce(p_id, ''));
  n text := trim(coalesce(p_body->>'n', ''));
  u text := trim(coalesce(p_body->>'u', ''));
  s text := trim(coalesce(p_body->>'s', ''));
  g text := trim(coalesce(p_body->>'g', ''));
  v text := trim(coalesce(p_body->>'v', ''));
  why text := nullif(trim(coalesce(p_body->>'why', '')), '');
  tn text := nullif(trim(coalesce(p_body->>'tn', '')), '');
  remote text := nullif(trim(coalesce(p_body->>'remote', '')), '');
  gift_code text := nullif(trim(coalesce(p_body->>'code', '')), '');
  gift_save text := nullif(trim(coalesce(p_body->>'save', '')), '');
  gift_link text := nullif(trim(coalesce(p_body->>'linkSave', '')), '');
  price numeric;
  who jsonb := p_body->'w';
  member text;
  clean jsonb;
begin
  if encode(extensions.digest(coalesce(p_pass, ''), 'sha256'), 'hex')
     is distinct from '462421efb3acba669660241bba7a12524a3aa3df951002d3bae1fd83258eea45' then
    raise exception 'Invalid password';
  end if;
  if gift_id !~ '^p[0-9]{2}_[0-9]{2}$' then
    raise exception 'Invalid gift';
  end if;
  if length(n) < 1 or length(n) > 160 or n ~ '[<>]' then
    raise exception 'Invalid gift';
  end if;
  if u !~ '^https://' or length(u) > 500 or u ~ '[<> ]' then
    raise exception 'Invalid gift';
  end if;
  if s not in (
    'My Top Picks','Experiences','White Elephant','Stocking Stuffers','Women','Men','Littles','Home','Big Ticket',
    'Holiday Fun','Holiday Treats','Holiday Scents'
  ) then
    raise exception 'Invalid gift';
  end if;
  if length(g) < 1 or length(g) > 80 or g ~ '[<>]' then
    raise exception 'Invalid gift';
  end if;
  if v not in (
    'self-care','cozy','wellness','kitchen','style','learning','pretend play','creative','game night',
    'outdoors','little ones','holiday magic','treats','funny','stocking'
  ) then
    raise exception 'Invalid gift';
  end if;
  if who is null or jsonb_typeof(who) <> 'array' or jsonb_array_length(who) < 1 or jsonb_array_length(who) > 12 then
    raise exception 'Invalid gift';
  end if;
  for member in select jsonb_array_elements_text(who) loop
    if member not in (
      'her','him','teens','big kids','little kids','baby','family','home','host','teachers + neighbors','white elephant'
    ) then
      raise exception 'Invalid gift';
    end if;
  end loop;
  if p_body ? 'price' and p_body->'price' is not null and jsonb_typeof(p_body->'price') = 'null' then
    price := null;
  elsif p_body ? 'price' and nullif(p_body->>'price', '') is not null then
    price := (p_body->>'price')::numeric;
    if price < 0 or price > 100000 then
      raise exception 'Invalid gift';
    end if;
  else
    price := null;
  end if;
  if why is not null and (length(why) > 500 or why ~ '[<>]') then
    raise exception 'Invalid gift';
  end if;
  if tn is not null and (length(tn) > 500 or tn ~ '[<>]') then
    raise exception 'Invalid gift';
  end if;
  if gift_code is not null and (length(gift_code) > 40 or gift_code ~ '[<>]') then
    raise exception 'Invalid gift';
  end if;
  if gift_save is not null and (length(gift_save) > 40 or gift_save ~ '[<>]') then
    raise exception 'Invalid gift';
  end if;
  if gift_link is not null and (length(gift_link) > 40 or gift_link ~ '[<>]') then
    raise exception 'Invalid gift';
  end if;
  if remote is not null and (
    length(remote) > 700000
    or remote ~ '[<>]'
    or not (remote ~ '^https://' or remote ~ '^data:image/(webp|png|jpeg);base64,')
  ) then
    raise exception 'Invalid gift';
  end if;
  clean := jsonb_build_object(
    'n', n,
    'u', u,
    's', s,
    'g', g,
    'w', who,
    'v', v,
    'price', to_jsonb(price),
    'why', to_jsonb(why),
    'tn', to_jsonb(tn),
    'remote', to_jsonb(remote),
    'code', to_jsonb(gift_code),
    'save', to_jsonb(gift_save),
    'linkSave', to_jsonb(gift_link)
  );
  insert into public.guide_catalog (id, body, updated_at)
  values (gift_id, clean, now())
  on conflict (id) do update
    set body = excluded.body, updated_at = now();
  return gift_id;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Invalid gift';
end;
$$;

revoke all on function public.guide_catalog_list() from public;
revoke all on function public.guide_catalog_save(text, text, jsonb) from public;
grant execute on function public.guide_catalog_list() to anon, authenticated;
grant execute on function public.guide_catalog_save(text, text, jsonb) to anon, authenticated;
