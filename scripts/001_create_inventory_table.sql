-- Create inventory table for school supplies
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text not null,
  quantity integer not null default 0,
  unit text not null,
  minimum_stock integer not null default 0,
  location text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inventory enable row level security;

-- Create policies for inventory table (public access for simplicity, adjust as needed)
create policy "Allow all operations on inventory"
  on public.inventory
  for all
  using (true)
  with check (true);

-- Create index for better query performance
create index if not exists idx_inventory_archived on public.inventory(is_archived);
create index if not exists idx_inventory_category on public.inventory(category);
