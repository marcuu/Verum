-- R5 monthly backup: add a dedicated logical_month period for monthly dedupe.
-- Run once in the Supabase SQL editor (idempotent).

alter table verum_notification_deliveries
add column if not exists logical_month text;

create unique index if not exists verum_notification_one_monthly_delivery
on verum_notification_deliveries(subscription_id, notification_type, logical_month)
where logical_month is not null;
