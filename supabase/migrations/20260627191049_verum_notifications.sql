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
