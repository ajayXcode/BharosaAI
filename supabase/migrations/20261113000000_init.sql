-- Bharosa AI · paytm-hackathon
-- Server-only demo schema. All access goes through the Next.js server using the
-- service-role key; RLS is enabled with no public policies.

create extension if not exists pgcrypto;

create table if not exists public.documents (
  id text primary key,
  slug text not null,
  name text not null,
  issuer text not null,
  type text not null check (type in ('health_insurance', 'loan', 'credit_card')),
  pages integer not null default 1,
  status text not null default 'analysed' check (status in ('uploaded', 'parsed', 'analysed')),
  created_at timestamptz not null default now()
);

create table if not exists public.clauses (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  page integer not null,
  section text not null,
  body text not null,
  keywords text[] not null default '{}'
);

create table if not exists public.analyses (
  document_id text not null references public.documents (id) on delete cascade,
  lang text not null check (lang in ('en', 'hi', 'hinglish')),
  summary text not null,
  facts jsonb not null default '[]',
  red_flags jsonb not null default '[]',
  calc jsonb not null default '{}',
  citations_checked integer not null default 0,
  citations_verified integer not null default 0,
  engine text not null default 'rules',
  created_at timestamptz not null default now(),
  primary key (document_id, lang)
);

create table if not exists public.chat_messages (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  role text not null check (role in ('user', 'bharosa')),
  body text not null,
  citations jsonb not null default '[]',
  grounded boolean not null default true,
  lang text not null,
  engine text not null default 'rules',
  created_at timestamptz not null default now()
);

create table if not exists public.payment_intents (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  payee text not null,
  purpose text not null,
  status text not null check (status in ('awaiting_approval', 'paid')),
  token text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  channel text not null check (channel in ('in-app', 'whatsapp')),
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.escalations (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id text primary key,
  actor text not null check (actor in ('user', 'system', 'bharosa')),
  event text not null,
  meta text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.stress_tests (
  id text primary key,
  document_id text not null references public.documents (id) on delete cascade,
  scenario text not null check (scenario in ('hospitalization', 'prepay', 'revolve')),
  input jsonb not null default '{}',
  result jsonb not null,
  narrative text,
  engine text not null default 'rules',
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id text primary key,
  purpose text not null,
  granted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Durable demo snapshot: the engine can hydrate from this after a restart.
create table if not exists public.workspace_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists clauses_document_idx on public.clauses (document_id);
create index if not exists chat_document_idx on public.chat_messages (document_id, created_at desc);
create index if not exists audit_created_idx on public.audit_events (created_at desc);
create index if not exists stress_document_idx on public.stress_tests (document_id, created_at desc);
create index if not exists payments_document_idx on public.payment_intents (document_id);

alter table public.documents enable row level security;
alter table public.clauses enable row level security;
alter table public.analyses enable row level security;
alter table public.chat_messages enable row level security;
alter table public.payment_intents enable row level security;
alter table public.reminders enable row level security;
alter table public.escalations enable row level security;
alter table public.audit_events enable row level security;
alter table public.stress_tests enable row level security;
alter table public.consents enable row level security;
alter table public.workspace_state enable row level security;

create or replace view public.metrics_summary
with (security_invoker = true) as
select
  (select count(*) from public.analyses)::int as documents_analysed,
  coalesce((select sum(citations_checked) from public.analyses), 0)::int as citations_checked,
  coalesce((select sum(citations_verified) from public.analyses), 0)::int as citations_verified,
  (select count(*) from public.chat_messages where role = 'bharosa')::int as questions,
  (select count(*) from public.chat_messages where role = 'bharosa' and grounded = false)::int as not_available,
  coalesce((select sum(amount_paise) from public.payment_intents where status = 'paid'), 0)::int as payments_paise,
  (select count(*) from public.stress_tests)::int as stress_tests,
  (select count(*) from public.escalations where status = 'open')::int as open_escalations;

comment on table public.workspace_state is 'Demo workspace snapshot; source of truth is the app engine, mirrored here for durability.';
comment on table public.consents is 'Consent purposes captured before analysis, chat and Act steps.';

-- Enable Realtime for live SaaS updates (chat, audit, payments, stress, workspace state).
do $$
begin
  alter publication supabase_realtime add table public.workspace_state;
  alter publication supabase_realtime add table public.chat_messages;
  alter publication supabase_realtime add table public.audit_events;
  alter publication supabase_realtime add table public.payment_intents;
  alter publication supabase_realtime add table public.stress_tests;
  alter publication supabase_realtime add table public.escalations;
exception when duplicate_object then null;
end $$;
