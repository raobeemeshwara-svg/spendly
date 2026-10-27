-- Run after supabase.sql. Prevents duplicate emails and schedules the job every 15 minutes.
create table public.reminder_log(user_id uuid references auth.users on delete cascade, slot text, day date, primary key(user_id,slot,day));
alter table public.reminder_log enable row level security; -- no policies: only the server can use it
revoke all on public.reminder_log from anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('spendly-reminders','*/15 * * * *',$$
  select net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers:='{"x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb);
$$);
