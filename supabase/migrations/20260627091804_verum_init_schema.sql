-- Verum: journal + quotes, namespaced with verum_ prefix in public schema.
-- RLS enabled with NO policies => anon/authenticated keys are denied.
-- Access is exclusively via the service_role key from Next.js API routes.

create table if not exists public.verum_entries (
  id          bigint generated always as identity primary key,
  day         text not null unique,            -- YYYY-MM-DD (UTC)
  text        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.verum_quotes (
  id           bigint generated always as identity primary key,
  text         text not null,
  author       text not null default '',
  score        int  not null default 0,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint uq_verum_quotes_text_author unique (text, author)
);

create table if not exists public.verum_quotes_daily_pick (
  day        text primary key,                 -- YYYY-MM-DD (UTC)
  quote_id   bigint not null references public.verum_quotes(id) on delete cascade,
  picked_at  timestamptz not null default now()
);

create index if not exists idx_verum_quotes_score     on public.verum_quotes(score);
create index if not exists idx_verum_quotes_last_seen on public.verum_quotes(last_seen_at);

alter table public.verum_entries           enable row level security;
alter table public.verum_quotes            enable row level security;
alter table public.verum_quotes_daily_pick enable row level security;
