#!/bin/bash

# Add handleLeaveGuild function
sed -i '/const guildProgress /i \
  const handleLeaveGuild = useCallback(async () => {\
    if (!guild) return;\
    try {\
      await supabase.rpc("leave_guild", { p_guild_id: guild.id });\
      await loadGuildContext();\
    } catch (err) {\
      setScreenError("Failed to leave guild.");\
    }\
  }, [guild, loadGuildContext]);\
' screens/GuildScreen.tsx

