-- Verum notifications schema (R1 framework + R2 daily reminder).
-- Run in the Supabase SQL editor. RLS stays enabled with no policies on
-- verum_* tables; all access is via the service-role key (server-only).
--
-- Preference fields for later use cases (rescue / weekly / quote / backup) are
-- included now so the schema does not churn when those releases land. Only
-- timezone / daily_* are wired up to product behaviour in R1/R2.

create table if not exists verum_notification_preferences (
  id boolean primary key default true,
  timezone text not null default 'Europe/London',

  daily_enabled boolean not null default true,
  daily_time time not null default '20:30',

  rescue_enabled boolean not null default false,
  rescue_time time not null default '22:00',
  rescue_min_streak int not null default 3,

  quote_reward_enabled boolean not null default false,

  weekly_enabled boolean not null default false,
  weekly_day int not null default 0,
  weekly_time time not null default '18:00',

  backup_enabled boolean not null default false,
  backup_day_of_month int not null default 1,
  backup_time time not null default '10:00',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint singleton_preferences check (id = true)
);

insert into verum_notification_preferences (id)
values (true)
on conflict (id) do nothing;

create table if not exists verum_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  failure_count int not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verum_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references verum_notification_subscriptions(id) on delete cascade,
  notification_type text not null,
  logical_day date,
  logical_week text,
  logical_month text,
  payload jsonb not null default '{}',
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now()
);

create unique index if not exists verum_notification_one_daily_delivery
on verum_notification_deliveries(subscription_id, notification_type, logical_day)
where logical_day is not null;

create unique index if not exists verum_notification_one_weekly_delivery
on verum_notification_deliveries(subscription_id, notification_type, logical_week)
where logical_week is not null;

create unique index if not exists verum_notification_one_monthly_delivery
on verum_notification_deliveries(subscription_id, notification_type, logical_month)
where logical_month is not null;

-- Match the other verum_* tables: RLS enabled with no policies, so the anon key
-- cannot read or write. All access is via the service-role key (server-only),
-- which bypasses RLS.
alter table verum_notification_preferences enable row level security;
alter table verum_notification_subscriptions enable row level security;
alter table verum_notification_deliveries enable row level security;
