-- =====================================================================
-- GetJSON — Supabase schema
-- Run this once in the SQL editor of a fresh Supabase project, or place
-- it in supabase/migrations/ and `supabase db push`.
--
-- Design notes
--   * Public reads go through the `json` edge function using the service
--     role, so RLS below only governs what a signed-in user may do to
--     their OWN rows through PostgREST (the dashboard).
--   * Anonymous bins live at most 3 days; bins owned by a signed-in user
--     live at most 6 days. Both ceilings are enforced in the database,
--     not just in the UI, so a forged API call cannot exceed them.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- table
create table if not exists public.bins (
  id           text primary key
                 check (id ~ '^[a-z0-9]{6,24}$'),
  data         jsonb       not null,
  name         text        check (name is null or char_length(name) <= 80),
  owner_id     uuid        references auth.users (id) on delete cascade,
  edit_token   text        not null,          -- sha256 hex; lets an anonymous creator edit/delete
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  views        bigint      not null default 0,
  size_bytes   integer     not null default 0
                 check (size_bytes >= 0 and size_bytes <= 262144)   -- 256 KB ceiling
);

comment on table  public.bins            is 'Short-lived public JSON documents.';
comment on column public.bins.edit_token is 'sha256 of the secret handed to an anonymous creator. Never store the secret itself.';
comment on column public.bins.expires_at is 'Hard deletion deadline. 3 days max anonymous, 6 days max signed-in.';

create index if not exists bins_owner_idx   on public.bins (owner_id, created_at desc);
create index if not exists bins_expires_idx on public.bins (expires_at);

-- --------------------------------------------------- retention ceilings
create or replace function public.bins_enforce_ttl()
returns trigger
language plpgsql
as $$
declare
  max_ttl interval;
begin
  max_ttl := case when new.owner_id is null then interval '3 days'
                                            else interval '6 days' end;

  if new.expires_at is null then
    new.expires_at := now() + max_ttl;
  end if;

  -- Never longer than the ceiling, never already in the past.
  if new.expires_at > now() + max_ttl then
    new.expires_at := now() + max_ttl;
  end if;
  if new.expires_at <= now() then
    new.expires_at := now() + interval '1 hour';
  end if;

  new.updated_at := now();
  new.size_bytes := octet_length(new.data::text);
  return new;
end;
$$;

drop trigger if exists bins_ttl on public.bins;
create trigger bins_ttl
  before insert or update on public.bins
  for each row execute function public.bins_enforce_ttl();

-- --------------------------------------------------------------- purge
-- Expired rows are filtered out on read, and physically removed by this.
create or replace function public.purge_expired_bins()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.bins where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Schedule it hourly. Enable pg_cron from Database → Extensions first.
-- select cron.schedule('purge-expired-bins', '0 * * * *', $$select public.purge_expired_bins()$$);

-- ----------------------------------------------------- view counter
-- Called by the edge function on every successful read. security definer
-- so it can bump the counter without opening the table up to RLS callers.
create or replace function public.bump_bin_views(bin_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bins set views = views + 1 where id = bin_id;
$$;

revoke all on function public.bump_bin_views(text) from public, anon, authenticated;

-- ------------------------------------------------------------ RLS
alter table public.bins enable row level security;

-- A signed-in user sees only their own, unexpired bins.
drop policy if exists bins_select_own on public.bins;
create policy bins_select_own on public.bins
  for select to authenticated
  using (owner_id = (select auth.uid()) and expires_at > now());

drop policy if exists bins_update_own on public.bins;
create policy bins_update_own on public.bins
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists bins_delete_own on public.bins;
create policy bins_delete_own on public.bins
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- No insert policy on purpose: every write goes through the edge
-- function, which uses the service role and applies the real rules.
-- The anon role has no policy at all, so PostgREST exposes nothing.

-- ------------------------------------------- optional: usage summary
create or replace view public.my_bin_stats
with (security_invoker = true) as
  select count(*) as bins,
         coalesce(sum(views), 0) as total_views,
         coalesce(sum(size_bytes), 0) as total_bytes
  from public.bins
  where owner_id = (select auth.uid()) and expires_at > now();

grant select on public.my_bin_stats to authenticated;
