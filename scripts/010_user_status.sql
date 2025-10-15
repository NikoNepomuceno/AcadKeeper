-- Add status column to user_profiles and create audit trail for status changes
-- 13.1: Add "status" field in database (Active, Suspended)
alter table if exists public.user_profiles
add column if not exists status text not null default 'Active' check (status in ('Active', 'Suspended'));
-- 13.5: Audit trail table for status changes
create table if not exists public.user_status_audit (
    id uuid primary key default gen_random_uuid(),
    target_user_id uuid not null references auth.users(id) on delete cascade,
    changed_by_user_id uuid not null references auth.users(id) on delete cascade,
    old_status text not null check (old_status in ('Active', 'Suspended')),
    new_status text not null check (new_status in ('Active', 'Suspended')),
    notes text,
    created_at timestamptz not null default timezone('utc'::text, now())
);
-- Enable RLS on audit table
alter table public.user_status_audit enable row level security;
-- Only allow reads to authenticated users (you may tighten later if needed)
drop policy if exists "authenticated_read_user_status_audit" on public.user_status_audit;
create policy "authenticated_read_user_status_audit" on public.user_status_audit for
select to authenticated using (true);
-- Inserts are performed by backend using service role
drop policy if exists "service_role_insert_user_status_audit" on public.user_status_audit;
create policy "service_role_insert_user_status_audit" on public.user_status_audit for
insert to service_role with check (true);
-- Helpful indexes
create index if not exists idx_user_status_audit_target on public.user_status_audit(target_user_id);
create index if not exists idx_user_status_audit_changed_by on public.user_status_audit(changed_by_user_id);
create index if not exists idx_user_status_audit_created_at on public.user_status_audit(created_at desc);