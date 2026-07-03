-- Security lint 0011 (function_search_path_mutable): pin search_path so the
-- function cannot be swayed by a caller's search_path. Safe because the
-- function body schema-qualifies every table reference (public.*).
alter function public.verum_pick_daily_quote(text, int, int)
  set search_path = '';
