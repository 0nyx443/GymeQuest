-- Run this in your Supabase SQL editor!

create or replace function public.get_available_guilds()
returns table (
  id uuid,
  name text,
  level int,
  exp int,
  max_members int,
  members_count bigint
) language sql security definer set search_path = public as $$
  select 
    g.id, g.name, g.level, g.exp, g.max_members,
    (select count(*) from public.guild_memberships gm where gm.guild_id = g.id and gm.status = 'active') as members_count
  from public.guilds g
  order by g.level desc
  limit 20;
$$;

revoke all on function public.get_available_guilds() from public;
grant execute on function public.get_available_guilds() to authenticated;
