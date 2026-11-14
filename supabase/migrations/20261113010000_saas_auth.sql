-- Real SaaS tenancy: each auth user owns one workspace snapshot keyed by user id.
alter table public.workspace_state
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists workspace_state_user_idx on public.workspace_state (user_id);

-- Realtime sends row data to the browser; full identity keeps updates well formed.
alter table public.workspace_state replica identity full;

alter table public.workspace_state enable row level security;

drop policy if exists "workspace owner can read" on public.workspace_state;
create policy "workspace owner can read"
  on public.workspace_state for select
  using (auth.uid()::text = id);

drop policy if exists "workspace owner can insert" on public.workspace_state;
create policy "workspace owner can insert"
  on public.workspace_state for insert
  with check (auth.uid()::text = id);

drop policy if exists "workspace owner can update" on public.workspace_state;
create policy "workspace owner can update"
  on public.workspace_state for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

drop policy if exists "workspace owner can delete" on public.workspace_state;
create policy "workspace owner can delete"
  on public.workspace_state for delete
  using (auth.uid()::text = id);
