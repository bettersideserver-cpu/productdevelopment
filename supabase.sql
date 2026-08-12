-- REAL ESTATE INVENTORY SYSTEM
-- Run this entire file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  floor_number text not null,
  name text not null,
  html_file text,
  created_at timestamptz not null default now(),
  unique(building_id, floor_number)
);

create table if not exists public.status_categories (
  id text primary key,
  name text not null unique,
  color text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references public.floors(id) on delete cascade,
  floor text not null,
  unit_type text not null,
  unit_number text not null,
  svg_id text not null unique,
  status_id text not null references public.status_categories(id),
  area numeric,
  price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(floor, unit_number)
);

create index if not exists units_floor_idx on public.units(floor);
create index if not exists units_status_idx on public.units(status_id);
create index if not exists units_svg_id_idx on public.units(svg_id);

insert into public.buildings (name)
select 'Demo Building'
where not exists (
  select 1 from public.buildings where name = 'Demo Building'
);

insert into public.status_categories (id, name, color, sort_order)
values
  ('available', 'Available', '#16a34a', 1),
  ('reserved', 'Reserved', '#f59e0b', 2),
  ('sold', 'Sold', '#dc2626', 3),
  ('hold', 'Hold', '#7c3aed', 4)
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- Realtime:
-- Supabase dashboard can enable Postgres Changes for public.units.
-- Or run:
alter table public.units replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.units;
  exception when duplicate_object then
    null;
  end;
end $$;

-- PUBLIC FLOOR VIEW:
-- Visitors can read inventory, but should not be able to change it.
alter table public.units enable row level security;
alter table public.status_categories enable row level security;
alter table public.floors enable row level security;
alter table public.buildings enable row level security;

drop policy if exists "public can read units" on public.units;
create policy "public can read units"
on public.units for select
to anon, authenticated
using (true);

drop policy if exists "public can read statuses" on public.status_categories;
create policy "public can read statuses"
on public.status_categories for select
to anon, authenticated
using (active = true);

drop policy if exists "public can read floors" on public.floors;
create policy "public can read floors"
on public.floors for select
to anon, authenticated
using (true);

drop policy if exists "public can read buildings" on public.buildings;
create policy "public can read buildings"
on public.buildings for select
to anon, authenticated
using (true);

-- ADMIN WRITE POLICIES:
-- Production should use Supabase Auth and restrict writes to authenticated admins.
-- This basic prototype permits authenticated users to update inventory/statuses.
-- Tighten this later with an admin role table or JWT claim.

drop policy if exists "authenticated can update units" on public.units;
create policy "authenticated can update units"
on public.units for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can insert statuses" on public.status_categories;
create policy "authenticated can insert statuses"
on public.status_categories for insert
to authenticated
with check (true);

-- Seed floors.
insert into public.floors (building_id, floor_number, name, html_file)
select b.id, x.floor_number, x.name, x.html_file
from public.buildings b
cross join (
  values
    ('01', 'Ground Floor', 'floor-01.html'),
    ('02', 'First Floor', 'floor-02.html'),
    ('03', 'Second Floor', 'floor-03.html')
) as x(floor_number, name, html_file)
where b.name = 'Demo Building'
on conflict (building_id, floor_number) do update set
  name = excluded.name,
  html_file = excluded.html_file;

-- Seed units.
with demo(floor, unit_type, unit_number, svg_id, status_id, area) as (
  values
    ('01','Apartment','A101','F01_APARTMENT_A101','available',1450::numeric),
    ('01','Apartment','A102','F01_APARTMENT_A102','sold',1520::numeric),
    ('01','Shop','S001','F01_SHOP_S001','reserved',820::numeric),
    ('01','Shop','S002','F01_SHOP_S002','available',1200::numeric),

    ('02','Apartment','B201','F02_APARTMENT_B201','available',1450::numeric),
    ('02','Apartment','B202','F02_APARTMENT_B202','reserved',1520::numeric),
    ('02','Office','B203','F02_OFFICE_B203','sold',980::numeric),
    ('02','Apartment','B204','F02_APARTMENT_B204','available',1650::numeric),

    ('03','Apartment','C301','F03_APARTMENT_C301','sold',1450::numeric),
    ('03','Apartment','C302','F03_APARTMENT_C302','available',1520::numeric),
    ('03','Office','C303','F03_OFFICE_C303','hold',980::numeric),
    ('03','Apartment','C304','F03_APARTMENT_C304','reserved',1650::numeric)
)
insert into public.units (floor_id, floor, unit_type, unit_number, svg_id, status_id, area)
select f.id, d.floor, d.unit_type, d.unit_number, d.svg_id, d.status_id, d.area
from demo d
join public.buildings b on b.name = 'Demo Building'
join public.floors f on f.building_id = b.id and f.floor_number = d.floor
on conflict (svg_id) do update set
  floor_id = excluded.floor_id,
  floor = excluded.floor,
  unit_type = excluded.unit_type,
  unit_number = excluded.unit_number,
  status_id = excluded.status_id,
  area = excluded.area,
  updated_at = now();
