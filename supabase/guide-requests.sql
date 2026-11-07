-- Looking-for messages from the public guide.
-- Run in the SQL editor on the same project as the morning door alerts.
-- Safe to re-run. Does not read or write vault rows.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.guide_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.guide_requests enable row level security;
revoke all on table public.guide_requests from public, anon, authenticated;
grant all on table public.guide_requests to service_role;

create or replace function public.guide_request_add(
  p_name text,
  p_contact text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  nm text := trim(coalesce(p_name, ''));
  ct text := trim(coalesce(p_contact, ''));
  msg text := trim(coalesce(p_message, ''));
begin
  if length(nm) < 2 or length(nm) > 80
     or length(ct) < 3 or length(ct) > 120
     or length(msg) < 8 or length(msg) > 500
     or nm ~ '[<>]' or ct ~ '[<>]' or msg ~ '[<>]' then
    raise exception 'Invalid request';
  end if;
  insert into public.guide_requests (name, contact, message)
  values (nm, ct, msg)
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.guide_requests_list(p_pass text)
returns table (
  id uuid,
  name text,
  contact text,
  message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if encode(extensions.digest(coalesce(p_pass, ''), 'sha256'), 'hex')
     is distinct from '462421efb3acba669660241bba7a12524a3aa3df951002d3bae1fd83258eea45' then
    raise exception 'Invalid password';
  end if;
  return query
    select r.id, r.name, r.contact, r.message, r.created_at
    from public.guide_requests r
    order by r.created_at desc
    limit 100;
end;
$$;

revoke all on function public.guide_request_add(text, text, text) from public;
revoke all on function public.guide_requests_list(text) from public;
grant execute on function public.guide_request_add(text, text, text) to anon, authenticated;
grant execute on function public.guide_requests_list(text) to anon, authenticated;
