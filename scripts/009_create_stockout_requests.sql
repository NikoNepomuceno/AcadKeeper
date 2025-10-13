-- Stock-out requests table to support staff requests and admin approvals
create table if not exists public.stockout_requests (
    id uuid primary key default gen_random_uuid(),
    inventory_id uuid not null references public.inventory(id) on delete cascade,
    requested_by uuid not null references auth.users(id) on delete cascade,
    quantity integer not null check (quantity > 0),
    notes text,
    status text not null check (status in ('pending', 'approved', 'denied')) default 'pending',
    approved_by uuid references auth.users(id) on delete
    set null,
        decision_notes text,
        created_at timestamptz not null default timezone('utc'::text, now()),
        updated_at timestamptz not null default timezone('utc'::text, now())
);
-- Keep updated_at current
create or replace function public.set_updated_at() returns trigger as $$ begin new.updated_at = timezone('utc'::text, now());
return new;
end;
$$ language plpgsql;
drop trigger if exists set_stockout_requests_updated_at on public.stockout_requests;
create trigger set_stockout_requests_updated_at before
update on public.stockout_requests for each row execute function public.set_updated_at();
-- Enable RLS
alter table public.stockout_requests enable row level security;
-- Policies
-- Staff can create their own requests
create policy "Staff can insert own stockout requests" on public.stockout_requests for
insert with check (requested_by = auth.uid());
-- Requesters can read their own requests
create policy "Users can select own stockout requests" on public.stockout_requests for
select using (requested_by = auth.uid());
-- Admins can read all requests
create policy "Admins can select all stockout requests" on public.stockout_requests for
select using (
        exists(
            select 1
            from public.user_profiles up
            where up.user_id = auth.uid()
                and up.role = 'admin'
        )
    );
-- Admins can update (approve/deny) any request
create policy "Admins can update stockout requests" on public.stockout_requests for
update using (
        exists(
            select 1
            from public.user_profiles up
            where up.user_id = auth.uid()
                and up.role = 'admin'
        )
    );
-- Indexes
create index if not exists idx_stockout_requests_status on public.stockout_requests(status);
create index if not exists idx_stockout_requests_inventory_id on public.stockout_requests(inventory_id);
create index if not exists idx_stockout_requests_requested_by on public.stockout_requests(requested_by);