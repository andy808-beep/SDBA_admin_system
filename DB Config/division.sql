-- ============================================
-- Divisions: add sort_order + is_corporate and seed data
-- Safe to run multiple times
-- ============================================

create extension if not exists pgcrypto;

-- Create table if missing (includes new columns).
-- If your table already exists, we add the columns below.
create table if not exists public.division_config_general (
  div_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  div_code_prefix text unique not null,
  div_short_ref text not null,
  div_main_name_en text not null,
  div_main_name_tc text,
  div_sub_name_en text,
  div_sub_name_tc text,
  div_colour_code_hex text check (div_colour_code_hex ~ '^[0-9A-Fa-f]{6}$'),
  by_invitation_only boolean not null default false,
  status text not null check (status in ('active','inactive')),
  -- NEW
  sort_order int not null default 0,
  is_corporate boolean not null default false
);

-- If the table existed already without the new columns, add them.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='division_config_general' and column_name='sort_order'
  ) then
    alter table public.division_config_general add column sort_order int not null default 0;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='division_config_general' and column_name='is_corporate'
  ) then
    alter table public.division_config_general add column is_corporate boolean not null default false;
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_division_config_event_type on public.division_config_general(event_type);
create index if not exists idx_division_config_status on public.division_config_general(status);
create index if not exists idx_division_config_event_sort on public.division_config_general(event_type, sort_order);

-- ======================
-- Seed / Upsert rows
-- Note: we upsert on div_code_prefix (unique)
-- ======================

-- Warm-Up Race Divisions (sort_order 1..9)
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('warm_up', 'WM',  'Men Std',    'Standard Boat', '標準龍', 'Men',    '男子', '0070C0', false, 'active', 1, false),
('warm_up', 'WL',  'Ladies Std', 'Standard Boat', '標準龍', 'Ladies', '女子', 'FF0000', false, 'active', 2, false),
('warm_up', 'WX',  'Mixed Std',  'Standard Boat', '標準龍', 'Mixed',  '混合', '99CC00', false, 'active', 3, false),
('warm_up', 'WPM', 'Men SB',     'Small Boat',    '小籠',   'Men',    '男子', 'CCFFFF', false, 'active', 4, false),
('warm_up', 'WPL', 'Ladies SB',  'Small Boat',    '小籠',   'Ladies', '女子', 'FF99CC', false, 'active', 5, false),
('warm_up', 'WPX', 'Mixed SB',   'Small Boat',    '小籠',   'Mixed',  '混合', 'CCFFCC', false, 'active', 6, false),
('warm_up', 'Y',   'Youth Grp Open','Standard Boat','標準龍', 'Hong Kong Youth Group - Open','青少年團體 - 公開', 'CC99FF', true,  'active', 7, false),
('warm_up', 'YL',  'Youth Grp Ladies','Standard Boat','標準龍', 'Hong Kong Youth Group - Ladies','青少年團體 - 女子', 'CC99FF', true,  'active', 8, false),
('warm_up', 'D',   'Disc Force', 'Standard Boat', '標準龍', 'Disciplinary Forces', '紀律部隊', 'C0C0C0', true, 'active', 9, false)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;

-- Main Race Divisions (sort_order 1..4) — Mixed Corp is_corporate = true
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('main_race', 'M', 'Men Open',    'Open Division',  '公開組', 'Men',    '男子', '00133A', false, 'active', 1, false),
('main_race', 'L', 'Ladies Open', 'Open Division',  '公開組', 'Ladies', '女子', 'FF0000', false, 'active', 2, false),
('main_race', 'X', 'Mixed Open',  'Mixed Division', '混合組', 'Open',   '公開', 'C6E0B4', false, 'active', 3, false),
('main_race', 'C', 'Mixed Corp',  'Mixed Division', '混合組', 'Corporate','商行','008000', false, 'active', 4, true)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;

-- Short Course Divisions (sort_order 1..9)
insert into public.division_config_general (
  event_type, div_code_prefix, div_short_ref,
  div_main_name_en, div_main_name_tc,
  div_sub_name_en, div_sub_name_tc,
  div_colour_code_hex, by_invitation_only, status,
  sort_order, is_corporate
) values
('short_course', 'SM',  'Men Std',   'Standard Boat', '標準龍', 'Men',     '男子', '000080', false, 'active', 1, false),
('short_course', 'SL',  'Ladies Std','Standard Boat', '標準龍', 'Ladies',  '女子', 'FF0000', false, 'active', 2, false),
('short_course', 'SX',  'Mixed Std', 'Standard Boat', '標準龍', 'Mixed',   '混合', '008000', false, 'active', 3, false),
('short_course', 'SU',  'Post-Sec',  'Standard Boat', '標準龍', 'Post-Secondary','大專', 'FFFF99', true,  'active', 4, false),
('short_course', 'HKU', 'HKU',       'Standard Boat', '標準龍', 'HKU Invitational Cup','香港大學邀請賽', 'FFCC00', true,  'active', 5, false),
('short_course', 'SPM', 'Men SB',    'Small Boat',    '小籠',   'Men',     '男子', '99CCFF', false, 'active', 6, false),
('short_course', 'SPL', 'Ladies SB', 'Small Boat',    '小籠',   'Ladies',  '女子', 'FF99CC', false, 'active', 7, false),
('short_course', 'SPX', 'Mixed SB',  'Small Boat',    '小籠',   'Mixed',   '混合', '99CC00', false, 'active', 8, false)
on conflict (div_code_prefix) do update
set event_type = excluded.event_type,
    div_short_ref = excluded.div_short_ref,
    div_main_name_en = excluded.div_main_name_en,
    div_main_name_tc = excluded.div_main_name_tc,
    div_sub_name_en = excluded.div_sub_name_en,
    div_sub_name_tc = excluded.div_sub_name_tc,
    div_colour_code_hex = excluded.div_colour_code_hex,
    by_invitation_only = excluded.by_invitation_only,
    status = excluded.status,
    sort_order = excluded.sort_order,
    is_corporate = excluded.is_corporate;
