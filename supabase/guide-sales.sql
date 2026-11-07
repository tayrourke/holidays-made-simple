-- Holiday sales edited from the phone dashboard.
-- Run in the SQL editor on the same project as the gift saves.
-- Safe to re-run.

create table if not exists public.guide_sales (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.guide_sales enable row level security;
revoke all on table public.guide_sales from public, anon, authenticated;
grant all on table public.guide_sales to service_role;

create or replace function public.guide_sales_list()
returns table (id text, body jsonb)
language sql
security definer
set search_path = public
as $$
  select s.id, s.body
  from public.guide_sales s
  order by s.updated_at desc;
$$;

create or replace function public.guide_sales_save(
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
  sale_id text := trim(coalesce(p_id, ''));
  brand text := trim(coalesce(p_body->>'brand', ''));
  headline text := trim(coalesce(p_body->>'headline', ''));
  url text := trim(coalesce(p_body->>'url', ''));
  code text := nullif(trim(coalesce(p_body->>'code', '')), '');
  savings text := nullif(trim(coalesce(p_body->>'save', '')), '');
  link_save text := nullif(trim(coalesce(p_body->>'linkSave', '')), '');
  note text := nullif(trim(coalesce(p_body->>'note', '')), '');
  starts text := nullif(trim(coalesce(p_body->>'starts', '')), '');
  ends text := nullif(trim(coalesce(p_body->>'ends', '')), '');
  featured boolean := coalesce((p_body->>'featured')::boolean, false);
  active boolean := coalesce((p_body->>'active')::boolean, true);
  clean jsonb;
begin
  if encode(extensions.digest(coalesce(p_pass, ''), 'sha256'), 'hex')
     is distinct from '462421efb3acba669660241bba7a12524a3aa3df951002d3bae1fd83258eea45' then
    raise exception 'Invalid password';
  end if;
  if sale_id !~ '^[a-z0-9][a-z0-9-]{0,40}$' then
    raise exception 'Invalid sale';
  end if;
  if length(brand) < 1 or length(brand) > 80 or brand ~ '[<>]' then
    raise exception 'Invalid sale';
  end if;
  if length(headline) < 1 or length(headline) > 180 or headline ~ '[<>]' then
    raise exception 'Invalid sale';
  end if;
  if url !~ '^https://' or length(url) > 500 or url ~ '[<> ]' then
    raise exception 'Invalid sale';
  end if;
  if code is not null and (length(code) > 40 or code ~ '[<>]') then
    raise exception 'Invalid sale';
  end if;
  if savings is not null and (length(savings) > 40 or savings ~ '[<>]') then
    raise exception 'Invalid sale';
  end if;
  if link_save is not null and (length(link_save) > 40 or link_save ~ '[<>]') then
    raise exception 'Invalid sale';
  end if;
  if note is not null and (length(note) > 240 or note ~ '[<>]') then
    raise exception 'Invalid sale';
  end if;
  if starts is not null and starts !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid sale';
  end if;
  if ends is not null and ends !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid sale';
  end if;
  clean := jsonb_build_object(
    'brand', brand,
    'headline', headline,
    'url', url,
    'code', to_jsonb(code),
    'save', to_jsonb(savings),
    'linkSave', to_jsonb(link_save),
    'note', to_jsonb(note),
    'starts', to_jsonb(starts),
    'ends', to_jsonb(ends),
    'featured', to_jsonb(featured),
    'active', to_jsonb(active)
  );
  insert into public.guide_sales (id, body, updated_at)
  values (sale_id, clean, now())
  on conflict (id) do update
    set body = excluded.body, updated_at = now();
  return sale_id;
exception
  when invalid_text_representation then
    raise exception 'Invalid sale';
end;
$$;

revoke all on function public.guide_sales_list() from public;
revoke all on function public.guide_sales_save(text, text, jsonb) from public;
grant execute on function public.guide_sales_list() to anon, authenticated;
grant execute on function public.guide_sales_save(text, text, jsonb) to anon, authenticated;
