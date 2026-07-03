-- Atomic daily-quote picker. Mirrors the original Flask selection chain:
--   1. If a pick already exists for the day, return it.
--   2. Prefer regular quotes (score < threshold) not seen within avoid_days.
--   3. Fall back to any regular quote.
--   4. Fall back to core quotes not seen within avoid_days.
--   5. Fall back to any quote at random.
-- On a fresh pick, record it in verum_quotes_daily_pick and bump last_seen_at.
create or replace function public.verum_pick_daily_quote(
  p_day             text,
  p_core_threshold  int,
  p_avoid_days      int
)
returns setof public.verum_quotes
language plpgsql
as $$
declare
  v_quote_id bigint;
  v_cutoff   timestamptz := now() - make_interval(days => p_avoid_days);
  v_ts       timestamptz := now();
begin
  -- 1. Existing pick for the day?
  select quote_id into v_quote_id
  from public.verum_quotes_daily_pick
  where day = p_day;

  if found then
    return query select * from public.verum_quotes where id = v_quote_id;
    return;
  end if;

  -- 2. Regular, not recently seen.
  select id into v_quote_id
  from public.verum_quotes
  where score < p_core_threshold
    and (last_seen_at is null or last_seen_at < v_cutoff)
  order by random()
  limit 1;

  -- 3. Any regular.
  if v_quote_id is null then
    select id into v_quote_id
    from public.verum_quotes
    where score < p_core_threshold
    order by random()
    limit 1;
  end if;

  -- 4. Core, not recently seen.
  if v_quote_id is null then
    select id into v_quote_id
    from public.verum_quotes
    where score >= p_core_threshold
      and (last_seen_at is null or last_seen_at < v_cutoff)
    order by random()
    limit 1;
  end if;

  -- 5. Anything.
  if v_quote_id is null then
    select id into v_quote_id
    from public.verum_quotes
    order by random()
    limit 1;
  end if;

  -- No quotes at all.
  if v_quote_id is null then
    return;
  end if;

  insert into public.verum_quotes_daily_pick(day, quote_id, picked_at)
  values (p_day, v_quote_id, v_ts)
  on conflict (day) do nothing;

  update public.verum_quotes
  set last_seen_at = v_ts, updated_at = v_ts
  where id = v_quote_id;

  return query select * from public.verum_quotes where id = v_quote_id;
end;
$$;
