#!/bin/bash

# Make sure we import MaterialCommunityIcons
sed -i '1s/^/import { MaterialCommunityIcons } from "@expo\/vector-icons";\n/' screens/GuildScreen.tsx

