#!/bin/bash

# Add states for available guilds
sed -i '/const \[joinError, setJoinError/a \
  \
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([]);\
  const [isBrowseMode, setIsBrowseMode] = useState(false);\
  const [loadingGuilds, setLoadingGuilds] = useState(false);' screens/GuildScreen.tsx

