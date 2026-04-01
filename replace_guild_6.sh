#!/bin/bash

# Add Leave Guild Button
sed -i '/<View style={styles.guildStatsRow}>/i \
          <TouchableOpacity\
            style={[styles.secondaryButton, { marginTop: 16, backgroundColor: AuthColors.crimson, borderColor: AuthColors.crimson }]}\
            onPress={() => {\
              handleLeaveGuild();\
            }}\
            activeOpacity={0.8}\
          >\
            <Text style={[styles.secondaryButtonText, { color: AuthColors.white }]}>LEAVE GUILD</Text>\
          </TouchableOpacity>\
' screens/GuildScreen.tsx

