-- TD-6: durable login throttle. The in-memory limiter resets on every cold
-- start, so a distributed brute force sees weaker limits than intended; this
-- table gives the counter a single durable home. (Vercel WAF rate limiting
-- is unavailable on the Hobby plan, so the guarantee lives in Postgres.)
--
-- RLS on, no policies: same posture as every other verum_* table.

create table if not exists public.verum_login_throttle (
  key text primary key,
  failures int not null default 0,
  reset_at timestamptz not null
);

alter table public.verum_login_throttle enable row level security;

-- Atomically record a failed attempt and return the failure count in the
-- current window. Expired windows restart the count instead of accumulating.
create or replace function public.verum_login_failure(
  p_key text,
  p_window_seconds int
) returns int
language plpgsql
set search_path = ''
as $$
declare
  v_failures int;
begin
  insert into public.verum_login_throttle as t (key, failures, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set failures = case
          when t.reset_at <= now() then 1
          else t.failures + 1
        end,
        reset_at = case
          when t.reset_at <= now() then now() + make_interval(secs => p_window_seconds)
          else t.reset_at
        end
  returning t.failures into v_failures;

  -- Opportunistic prune so stale keys don't accumulate forever.
  delete from public.verum_login_throttle
  where reset_at <= now() - interval '1 day';

  return v_failures;
end;
$$;
