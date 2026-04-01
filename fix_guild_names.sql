-- Run this in your Supabase SQL editor!

-- 1) Fix "Unnamed Adventurer" by allowing members to read profiles
alter table public.profiles enable row level security;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
on public.profiles for select
to authenticated
using (true);

-- 2) The Leave Guild function (with random member handoff) fixed for unique constraint
create or replace function public.leave_guild(p_guild_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_role public.guild_role;
  v_member_count int;
  v_new_owner_id uuid;
begin
  select role into v_user_role from public.guild_memberships where user_id = auth.uid() and guild_id = p_guild_id and status = 'active';                        
  
  if v_user_role is null then
    raise exception 'You are not an active member of this guild';
  end if;

  select count(*) into v_member_count from public.guild_memberships where guild_id = p_guild_id and status = 'active';                                          

  -- 1. First mark the leaving user as left to avoid unique owner constraint violation
  update public.guild_memberships 
  set status = 'left', left_at = now() 
  where user_id = auth.uid() and guild_id = p_guild_id and status = 'active';

  -- 2. If the leaving user was the owner and there are remaining members, assign a new owner
  if v_user_role = 'owner' then
    if v_member_count > 1 then
      select user_id into v_new_owner_id 
      from public.guild_memberships 
      where guild_id = p_guild_id and status = 'active'
      order by joined_at asc 
      limit 1;
      
      update public.guild_memberships 
      set role = 'owner' 
      where user_id = v_new_owner_id and guild_id = p_guild_id;                                                  
    end if;
  end if;
end;
$$;

revoke all on function public.leave_guild(uuid) from public;
grant execute on function public.leave_guild(uuid) to authenticated;
