-- Create logs table for tracking all inventory changes
create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references public.inventory(id) on delete cascade,
  action_type text not null, -- 'created', 'updated', 'archived', 'stock_in', 'stock_out'
  item_name text not null,
  previous_quantity integer,
  new_quantity integer,
  quantity_change integer,
  field_changed text, -- which field was updated
  old_value text,
  new_value text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inventory_logs enable row level security;

-- Create policies for logs table
create policy "Allow all operations on inventory_logs"
  on public.inventory_logs
  for all
  using (true)
  with check (true);

-- Create indexes for better query performance
create index if not exists idx_logs_inventory_id on public.inventory_logs(inventory_id);
create index if not exists idx_logs_action_type on public.inventory_logs(action_type);
create index if not exists idx_logs_created_at on public.inventory_logs(created_at desc);
