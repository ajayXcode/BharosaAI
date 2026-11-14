-- SaaS subscription plans managed from the Bharosa AI admin panel.
-- Service-role only: RLS is enabled with no public policies.

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;

create index if not exists user_plans_plan_idx on public.user_plans (plan);

comment on table public.user_plans is 'Subscription plan per account, set by the Bharosa AI admin panel.';
