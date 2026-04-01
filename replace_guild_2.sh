#!/bin/bash

# Add handleFetchGuilds function
sed -i '/const handleJoinGuild/i \
  const handleFetchGuilds = useCallback(async () => {\
    setLoadingGuilds(true);\
    const { data, error } = await supabase.from("guilds").select("id, name, level, exp, max_members").order("level", { ascending: false }).limit(20);\
    if (!error && data) {\
      setAvailableGuilds(data);\
    }\
    setLoadingGuilds(false);\
  }, []);\
' screens/GuildScreen.tsx

