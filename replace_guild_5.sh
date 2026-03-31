#!/bin/bash

# Add Browse Guilds UI and Leave Guild Button
sed -i '/{!isCreateMode && (/i \
          {!isCreateMode && !isJoinMode && (\
            <TouchableOpacity\
              style={styles.primaryButton}\
              onPress={() => {\
                setIsBrowseMode(!isBrowseMode);\
                if (!isBrowseMode) handleFetchGuilds();\
              }}\
              activeOpacity={0.8}\
            >\
              <Text style={styles.primaryButtonText}>{isBrowseMode ? "CLOSE BROWSER" : "BROWSE GUILDS"}</Text>\
            </TouchableOpacity>\
          )}\
\
          {isBrowseMode && (\
            <View style={styles.createCard}>\
              <Text style={styles.createLabel}>Available Guilds</Text>\
              {loadingGuilds ? (\
                <ActivityIndicator size="small" color={AuthColors.navy} />\
              ) : availableGuilds.length === 0 ? (\
                <Text style={styles.helpText}>No guilds available.</Text>\
              ) : (\
                availableGuilds.map((g) => (\
                  <TouchableOpacity key={g.id} style={styles.memberCard} onPress={() => {\
                    setJoinNameInput(g.name);\
                    setIsJoinMode(true);\
                    setIsBrowseMode(false);\
                  }}>\
                    <View style={styles.memberInfo}>\
                      <Text style={styles.memberName}>{g.name} (Lv {g.level})</Text>\
                      <Text style={styles.memberStatusText}>{g.members_count || 0}/{g.max_members} Members</Text>\
                    </View>\
                  </TouchableOpacity>\
                ))\
              )}\
            </View>\
          )}\
' screens/GuildScreen.tsx

