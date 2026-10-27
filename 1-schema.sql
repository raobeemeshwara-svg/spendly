-- Run in Supabase > SQL Editor
create table public.profiles(id uuid primary key references auth.users on delete cascade, display_name text check(char_length(display_name)<=60), currency text not null default 'INR', created_at timestamptz default now());
create table public.transactions(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, type text not null check(type in('income','expense')), amount numeric(12,2) not null check(amount>0), category text not null check(char_length(category)<=40), note text check(char_length(note)<=200), date date not null, created_at timestamptz default now());
create table public.budgets(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, category text not null, monthly_limit numeric(12,2) not null check(monthly_limit>0), unique(user_id,category));
create table public.goals(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, name text not null check(char_length(name)<=80), target numeric(12,2) not null check(target>0), saved numeric(12,2) not null default 0 check(saved>=0), created_at timestamptz default now());
create table public.recurring_payments(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, name text not null, amount numeric(12,2) not null check(amount>0), category text not null, day_of_month int check(day_of_month between 1 and 31), created_at timestamptz default now());
create table public.notification_prefs(user_id uuid primary key default auth.uid() references auth.users on delete cascade, email_enabled boolean not null default true, push_enabled boolean not null default false, morning_time time not null default '08:30', evening_time time not null default '20:30', timezone text default 'Asia/Kolkata');
create index on public.transactions(user_id,date desc);

-- RLS + grants (no access for anon)
do $$ declare t text; begin
foreach t in array array['transactions','budgets','goals','recurring_payments','notification_prefs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy "own select" on public.%I for select to authenticated using (auth.uid()=user_id)',t);
 execute format('create policy "own insert" on public.%I for insert to authenticated with check (auth.uid()=user_id)',t);
 execute format('create policy "own update" on public.%I for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id)',t);
 execute format('create policy "own delete" on public.%I for delete to authenticated using (auth.uid()=user_id)',t);
end loop; end $$;
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select,insert,update on public.profiles to authenticated;
create policy "own select" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "own insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own update" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

-- Auto-create profile + prefs on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id, left(coalesce(new.raw_user_meta_data->>'full_name',''),60));
 insert into public.notification_prefs(user_id) values(new.id);
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
