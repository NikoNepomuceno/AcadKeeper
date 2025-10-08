-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Create trigger for inventory table
drop trigger if exists set_updated_at on public.inventory;
create trigger set_updated_at
  before update on public.inventory
  for each row
  execute function public.handle_updated_at();
