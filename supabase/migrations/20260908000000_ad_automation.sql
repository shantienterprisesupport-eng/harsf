create extension if not exists pgcrypto;

create type public.campaign_goal as enum ('business_promo', 'channel_growth', 'movie_promotion');
create type public.campaign_status as enum ('draft', 'awaiting_payment', 'paid', 'queued', 'publishing', 'active', 'paused', 'completed', 'failed', 'refunded');
create type public.ad_platform as enum ('google_ads', 'meta_ads');
create type public.payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  business_name text,
  phone text,
  default_currency text not null default 'INR' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform public.ad_platform not null,
  external_account_id text not null,
  manager_account_id text,
  token_secret_ref text not null,
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  unique (user_id, platform, external_account_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal public.campaign_goal not null,
  name text not null check (char_length(name) between 1 and 160),
  status public.campaign_status not null default 'draft',
  platforms public.ad_platform[] not null check (cardinality(platforms) > 0),
  input jsonb not null default '{}'::jsonb,
  ai_plan jsonb,
  location_spec jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  ad_budget_minor bigint not null check (ad_budget_minor > 0),
  service_fee_minor bigint not null check (service_fee_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint generated always as (ad_budget_minor + service_fee_minor + tax_minor) stored,
  start_at timestamptz,
  end_at timestamptz,
  idempotency_key uuid not null default gen_random_uuid() unique,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

create table public.campaign_platforms (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  platform public.ad_platform not null,
  ad_account_id uuid not null references public.ad_accounts(id),
  allocated_budget_minor bigint not null check (allocated_budget_minor > 0),
  external_campaign_id text,
  external_ad_set_id text,
  external_ad_id text,
  status text not null default 'pending',
  api_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, platform)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  provider_order_id text not null unique,
  provider_payment_id text unique,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'created',
  captured_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.analytics_daily (
  id bigint generated always as identity primary key,
  campaign_platform_id uuid not null references public.campaign_platforms(id) on delete cascade,
  metric_date date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  views bigint not null default 0 check (views >= 0),
  spend_minor bigint not null default 0 check (spend_minor >= 0),
  conversions numeric(18, 4) not null default 0 check (conversions >= 0),
  raw_metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (campaign_platform_id, metric_date)
);

create index campaigns_user_created_idx on public.campaigns (user_id, created_at desc);
create index analytics_platform_date_idx on public.analytics_daily (campaign_platform_id, metric_date desc);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger campaigns_touch_updated_at before update on public.campaigns
for each row execute function public.touch_updated_at();
create trigger campaign_platforms_touch_updated_at before update on public.campaign_platforms
for each row execute function public.touch_updated_at();
create trigger payments_touch_updated_at before update on public.payments
for each row execute function public.touch_updated_at();

create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_platforms enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.analytics_daily enable row level security;

create policy "profiles owner read" on public.profiles for select using (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "ad account owner read" on public.ad_accounts for select using (auth.uid() = user_id);
create policy "campaign owner read" on public.campaigns for select using (auth.uid() = user_id);
create policy "campaign owner insert" on public.campaigns for insert with check (auth.uid() = user_id and status = 'draft');
create policy "campaign owner edits draft" on public.campaigns for update using (auth.uid() = user_id and status = 'draft') with check (auth.uid() = user_id and status in ('draft', 'awaiting_payment'));
create policy "campaign platform owner read" on public.campaign_platforms for select using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "payment owner read" on public.payments for select using (auth.uid() = user_id);
create policy "analytics owner read" on public.analytics_daily for select using (exists (select 1 from public.campaign_platforms cp join public.campaigns c on c.id = cp.campaign_id where cp.id = campaign_platform_id and c.user_id = auth.uid()));

-- No client policies intentionally exist for webhook_events or for writing payments,
-- campaign_platforms and analytics. Only trusted Edge Functions/workers using the
-- service-role key may mutate financial, publishing and reporting state.
