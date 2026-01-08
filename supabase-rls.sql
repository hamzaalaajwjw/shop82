
-- Enable RLS
alter table posts enable row level security;

-- Public read
create policy "public read posts"
on posts for select
using ( true );

-- Owner write
create policy "owner write posts"
on posts for update using ( auth.uid() = owner );

-- Admin override
create policy "admin full access"
on posts for all
using (
  exists (
    select 1 from admins where admins.uid = auth.uid()
  )
);
