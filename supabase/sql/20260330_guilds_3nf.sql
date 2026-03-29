-- 3NF Guild Domain Schema for GymeQuest
-- Date: 2026-03-30
--
-- This migration keeps your existing profiles table intact and adds a normalized
-- guild model: guilds, memberships, raids, and raid participation.
--
-- Run in Supabase SQL editor after your profiles schema is in place.

create extension if not exists pgcrypto;

-- Enum types keep role/status values normalized and constrained.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'guild_role') then
    create type public.guild_role as enum ('owner', 'officer', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'guild_membership_status') then
    create type public.guild_membership_status as enum ('active', 'left', 'kicked');
  end if;

  if not exists (select 1 from pg_type where typname = 'guild_raid_status') then
    create type public.guild_raid_status as enum ('active', 'completed', 'failed');
  end if;
end
$$;

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level integer not null default 1 check (level >= 1),
  exp integer not null default 0 check (exp >= 0),
  max_members integer not null default 50 check (max_members between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists guilds_name_lower_unique
  on public.guilds ((lower(name)));

create table if not exists public.guild_memberships (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.guild_role not null default 'member',
  status public.guild_membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (guild_id, user_id)
);

-- A user can belong to only one active guild at a time.
create unique index if not exists guild_memberships_one_active_guild_per_user
  on public.guild_memberships (user_id)
  where status = 'active';

-- Each guild has exactly one active owner.
create unique index if not exists guild_memberships_one_active_owner_per_guild
  on public.guild_memberships (guild_id)
  where role = 'owner' and status = 'active';

create index if not exists guild_memberships_guild_status_idx
  on public.guild_memberships (guild_id, status);

create table if not exists public.guild_raids (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  boss_name text not null,
  description text,
  target_reps integer not null check (target_reps > 0),
  completed_reps integer not null default 0 check (completed_reps >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status public.guild_raid_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guild_raids_time_window_check check (ends_at > starts_at),
  constraint guild_raids_progress_check check (completed_reps <= target_reps)
);

create index if not exists guild_raids_guild_status_end_idx
  on public.guild_raids (guild_id, status, ends_at);

create table if not exists public.guild_raid_members (
  raid_id uuid not null references public.guild_raids(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reps_contributed integer not null default 0 check (reps_contributed >= 0),
  joined_at timestamptz not null default now(),
  primary key (raid_id, user_id)
);

create index if not exists guild_raid_members_user_idx
  on public.guild_raid_members (user_id);

create or replace function public.is_active_guild_member(
  p_guild_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_memberships gm
    where gm.guild_id = p_guild_id
      and gm.user_id = coalesce(p_user_id, auth.uid())
      and gm.status = 'active'
  );
$$;

create or replace function public.is_guild_officer(
  p_guild_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_memberships gm
    where gm.guild_id = p_guild_id
      and gm.user_id = coalesce(p_user_id, auth.uid())
      and gm.status = 'active'
      and gm.role in ('owner', 'officer')
  );
$$;

create or replace function public.is_guild_owner(
  p_guild_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_memberships gm
    where gm.guild_id = p_guild_id
      and gm.user_id = coalesce(p_user_id, auth.uid())
      and gm.status = 'active'
      and gm.role = 'owner'
  );
$$;

revoke all on function public.is_active_guild_member(uuid, uuid) from public;
revoke all on function public.is_guild_officer(uuid, uuid) from public;
revoke all on function public.is_guild_owner(uuid, uuid) from public;

grant execute on function public.is_active_guild_member(uuid, uuid) to authenticated;
grant execute on function public.is_guild_officer(uuid, uuid) to authenticated;
grant execute on function public.is_guild_owner(uuid, uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guilds_set_updated_at on public.guilds;
create trigger guilds_set_updated_at
before update on public.guilds
for each row execute function public.set_updated_at();

drop trigger if exists guild_raids_set_updated_at on public.guild_raids;
create trigger guild_raids_set_updated_at
before update on public.guild_raids
for each row execute function public.set_updated_at();

alter table public.guilds enable row level security;
alter table public.guild_memberships enable row level security;
alter table public.guild_raids enable row level security;
alter table public.guild_raid_members enable row level security;

-- Guild visibility: any authenticated user can read guild basics, so they can search/join.
drop policy if exists "Guilds select for members" on public.guilds;
drop policy if exists "Guilds select authenticated" on public.guilds;
create policy "Guilds select authenticated"
on public.guilds for select
to authenticated
using (true);

drop policy if exists "Guilds insert authenticated" on public.guilds;

-- No direct inserts through RLS. Guild creation must go through
-- create_guild_with_owner() to keep guild + owner membership atomic.

-- Only active owner can update or delete guild metadata.
drop policy if exists "Guilds update owner" on public.guilds;
create policy "Guilds update owner"
on public.guilds for update
using (public.is_guild_owner(guilds.id))
with check (public.is_guild_owner(guilds.id));

drop policy if exists "Guilds delete owner" on public.guilds;
create policy "Guilds delete owner"
on public.guilds for delete
using (public.is_guild_owner(guilds.id));

-- Memberships are visible to members of the same guild.
drop policy if exists "Guild memberships select by guild member" on public.guild_memberships;
create policy "Guild memberships select by guild member"
on public.guild_memberships for select
using (public.is_active_guild_member(guild_memberships.guild_id));

drop policy if exists "Guild memberships insert self member" on public.guild_memberships;

-- No direct membership inserts through RLS in this baseline.
-- Membership rows should be created by trusted server-side logic.

-- Users may leave their own guild; owners/officers can manage memberships.
drop policy if exists "Guild memberships update self or officers" on public.guild_memberships;
create policy "Guild memberships update self or officers"
on public.guild_memberships for update
using (
  auth.uid() = user_id
  or public.is_guild_officer(guild_memberships.guild_id)
)
with check (
  auth.uid() = user_id
  or public.is_guild_officer(guild_memberships.guild_id)
);

-- Raids: visible to active guild members.
drop policy if exists "Guild raids select by guild member" on public.guild_raids;
create policy "Guild raids select by guild member"
on public.guild_raids for select
using (public.is_active_guild_member(guild_raids.guild_id));

-- Raids can be created/updated by owner or officer only.
drop policy if exists "Guild raids insert by officers" on public.guild_raids;
create policy "Guild raids insert by officers"
on public.guild_raids for insert
with check (
  public.is_guild_officer(guild_raids.guild_id)
  and created_by = auth.uid()
);

drop policy if exists "Guild raids update by officers" on public.guild_raids;
create policy "Guild raids update by officers"
on public.guild_raids for update
using (public.is_guild_officer(guild_raids.guild_id))
with check (public.is_guild_officer(guild_raids.guild_id));

drop policy if exists "Guild raids delete by owner" on public.guild_raids;
create policy "Guild raids delete by owner"
on public.guild_raids for delete
using (public.is_guild_owner(guild_raids.guild_id));

-- Raid participants are visible to guild members.
drop policy if exists "Guild raid members select by guild member" on public.guild_raid_members;
create policy "Guild raid members select by guild member"
on public.guild_raid_members for select
using (
  exists (
    select 1
    from public.guild_raids gr
    where gr.id = guild_raid_members.raid_id
      and public.is_active_guild_member(gr.guild_id)
  )
);

-- Users can update only their own contribution row.
drop policy if exists "Guild raid members insert self" on public.guild_raid_members;
create policy "Guild raid members insert self"
on public.guild_raid_members for insert
with check (auth.uid() = user_id);

drop policy if exists "Guild raid members update self" on public.guild_raid_members;
create policy "Guild raid members update self"
on public.guild_raid_members for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Atomic function used by the app when creating a guild from GuildScreen.
create or replace function public.create_guild_with_owner(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_guild_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_name := trim(regexp_replace(coalesce(p_name, ''), '\\s+', ' ', 'g'));

  if char_length(v_name) < 3 then
    raise exception 'Guild name must be at least 3 characters';
  end if;

  if char_length(v_name) > 32 then
    raise exception 'Guild name must be at most 32 characters';
  end if;

  if exists (
    select 1
    from public.guild_memberships gm
    where gm.user_id = v_user_id
      and gm.status = 'active'
  ) then
    raise exception 'User already belongs to an active guild';
  end if;

  insert into public.guilds (name)
  values (v_name)
  returning id into v_guild_id;

  insert into public.guild_memberships (guild_id, user_id, role, status)
  values (v_guild_id, v_user_id, 'owner', 'active');

  return v_guild_id;
end;
$$;

revoke all on function public.create_guild_with_owner(text) from public;
grant execute on function public.create_guild_with_owner(text) to authenticated;

-- Function to allow users to join an existing guild by name
create or replace function public.join_guild(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_guild_id uuid;
  v_existing_status public.guild_membership_status;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- find guild (case insensitive)
  select id into v_guild_id
  from public.guilds
  where lower(name) = lower(trim(p_name));

  if v_guild_id is null then
    raise exception 'Guild not found';
  end if;

  -- check if user is already in an active guild
  if exists (
    select 1 from public.guild_memberships
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'You are already in an active guild';
  end if;

  -- check if user was previously in this guild
  select status into v_existing_status
  from public.guild_memberships
  where user_id = v_user_id and guild_id = v_guild_id;

  if v_existing_status = 'left' or v_existing_status = 'kicked' then
    update public.guild_memberships
    set status = 'active', role = 'member', joined_at = now()
    where user_id = v_user_id and guild_id = v_guild_id;
  elsif v_existing_status is null then
    insert into public.guild_memberships (guild_id, user_id, role, status)
    values (v_guild_id, v_user_id, 'member', 'active');
  end if;
end;
$$;

revoke all on function public.join_guild(text) from public;
grant execute on function public.join_guild(text) to authenticated;

