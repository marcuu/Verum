-- TD-3: automated monthly backups land in a private Storage bucket instead
-- of relying on a human answering a push notification.
--
-- The bucket is private (public = false) and storage RLS has no policies for
-- it, so the anon key can neither list nor read backups; the server-side
-- service-role key (which bypasses RLS) does the writing.

insert into storage.buckets (id, name, public)
values ('verum-backups', 'verum-backups', false)
on conflict (id) do nothing;
