create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_user();

create table if not exists public.books (
  sku text primary key,
  title text not null,
  file_path text,
  kind text not null check(kind in ('digital','physical')),
  active boolean not null default true,
  asset_ready boolean not null default false
);
insert into public.books(sku,title,file_path,kind) values
 ('crypto-signals','Crypto Signals Handbook','crypto-signals.pdf','digital'),
 ('stocks-from-zero','Stocks from Zero','stocks-from-zero.pdf','digital'),
 ('forex-mastery','Forex Mastery','forex-mastery.pdf','physical'),
 ('trading-psychology','Trading Psychology','psychology.pdf','physical')
on conflict(sku) do nothing;

create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 stripe_session_id text not null unique, stripe_customer_id text, stripe_payment_intent_id text, stripe_subscription_id text,
 status text not null check(status in ('paid','pending','refunded','failed')),
 amount_total bigint not null default 0, currency text not null default 'usd',
 customer_email text not null, items jsonb not null default '[]'::jsonb, promo_code text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);

create table if not exists public.entitlements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 plan text not null check(plan in ('foundation','pro','elite')), status text not null default 'active',
 stripe_subscription_id text unique, current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 2 and 120), notes text not null check(length(notes) between 5 and 4000),
 market text, trade_date date, created_at timestamptz not null default now()
);
create index if not exists journals_user_created_idx on public.journal_entries(user_id,created_at desc);

create table if not exists public.community_invites (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 email text not null, plan text not null, status text not null default 'pending' check(status in ('pending','sent','revoked')),
 telegram_url text, discord_url text, created_at timestamptz not null default now(), unique(user_id,plan)
);

create table if not exists public.stripe_events (
 id uuid primary key default gen_random_uuid(), stripe_event_id text not null unique, event_type text not null,
 status text not null default 'processing' check(status in ('processing','processed','failed')),
 error_message text, processed_at timestamptz, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.journal_entries enable row level security;
alter table public.community_invites enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "profile read self" on public.profiles;
create policy "profile read self" on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists "profile update own display name" on public.profiles;
create policy "profile update own display name" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "books visible to signed in users" on public.books;
create policy "books visible to signed in users" on public.books for select to authenticated using(active=true);
drop policy if exists "orders read own" on public.orders;
create policy "orders read own" on public.orders for select to authenticated using(user_id=auth.uid());
drop policy if exists "entitlements read own" on public.entitlements;
create policy "entitlements read own" on public.entitlements for select to authenticated using(user_id=auth.uid());
drop policy if exists "journals select own" on public.journal_entries;
create policy "journals select own" on public.journal_entries for select to authenticated using(user_id=auth.uid());
drop policy if exists "journals insert own" on public.journal_entries;
create policy "journals insert own" on public.journal_entries for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "journals update own" on public.journal_entries;
create policy "journals update own" on public.journal_entries for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "journals delete own" on public.journal_entries;
create policy "journals delete own" on public.journal_entries for delete to authenticated using(user_id=auth.uid());
drop policy if exists "community invites read own" on public.community_invites;
create policy "community invites read own" on public.community_invites for select to authenticated using(user_id=auth.uid());
-- No browser write policies exist for orders, entitlements, webhook events, or admin flags.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('book-files','book-files',false,52428800,array['application/pdf'])
on conflict(id) do update set public=false;
-- Private book objects are served by the authenticated app after entitlement checks. No public object policy.

create table if not exists public.fulfillment_requests (
 id uuid primary key default gen_random_uuid(), stripe_session_id text not null unique references public.orders(stripe_session_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete restrict, customer_email text not null, skus text[] not null,
 status text not null default 'pending' check(status in ('pending','processing','shipped','cancelled')),
 tracking_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.fulfillment_requests enable row level security;
drop policy if exists "fulfillment read own" on public.fulfillment_requests;
create policy "fulfillment read own" on public.fulfillment_requests for select to authenticated using(user_id=auth.uid());

-- Prevent self-escalation through profiles.is_admin. Users can update only display_name.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
revoke all on public.stripe_events from anon, authenticated;
revoke all on public.fulfillment_requests from anon, authenticated;
grant select on public.fulfillment_requests to authenticated;
