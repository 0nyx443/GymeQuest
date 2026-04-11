import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthColors, Fonts } from '@/constants/theme';
import { supabase } from '@/utils/supabase';

type GuildRole = 'owner' | 'officer' | 'member';

interface GuildRow {
  id: string;
  name: string;
  level: number;
  exp: number;
  max_members: number;
}

interface GuildMembershipRow {
  user_id: string;
  role: GuildRole;
  joined_at: string;
  profiles:
    | {
        name: string | null;
        level: number | null;
      }
    | {
        name: string | null;
        level: number | null;
      }[]
    | null;
}

interface GuildMember {
  userId: string;
  role: GuildRole;
  joinedAt: string;
  name: string;
  level: number;
}

interface GuildRaid {
  id: string;
  boss_name: string;
  description: string | null;
  ends_at: string;
  status: 'active' | 'completed' | 'failed';
  target_reps: number;
  completed_reps: number;
}

const MIN_GUILD_NAME_LENGTH = 3;
const MAX_GUILD_NAME_LENGTH = 32;

function sanitizeGuildName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toFriendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('does not exist')) {
    return 'Guild tables are missing. Run the guild schema SQL first.';
  }
  if (lower.includes('violates row-level security') || lower.includes('permission denied')) {
    return 'Guild access policy blocked this request. Check RLS policies in Supabase.';
  }
  return message;
}

function formatTimeLeft(endsAt: string): string {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return 'UNKNOWN';

  const diff = end - Date.now();
  if (diff <= 0) return 'ENDED';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatJoinedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown date';
  return date.toLocaleDateString();
}

function getGuildProgress(level: number, totalExp: number): { percent: number; current: number; needed: number } {
  const safeLevel = Math.max(level, 1);
  const safeTotalExp = Math.max(totalExp, 0);

  const levelBase = (safeLevel - 1) * 1000;
  const nextLevelAt = safeLevel * 1000;
  const current = Math.max(0, safeTotalExp - levelBase);
  const needed = Math.max(1, nextLevelAt - levelBase);
  const percent = Math.min((current / needed) * 100, 100);

  return { percent, current, needed };
}

export default function GuildScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guild, setGuild] = useState<GuildRow | null>(null);
  const [myRole, setMyRole] = useState<GuildRole | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [raids, setRaids] = useState<GuildRaid[]>([]);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [guildNameInput, setGuildNameInput] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [isJoinMode, setIsJoinMode] = useState(false);
  const [joinNameInput, setJoinNameInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([]);
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [loadingGuilds, setLoadingGuilds] = useState(false);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedProfileData, setSelectedProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = async (userId: string) => {
    setSelectedProfileId(userId);
    setLoadingProfile(true);
    setSelectedProfileData(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('name, str, agi, sta, victories, total_reps, level') // victories = monsters defeated
      .eq('id', userId)
      .single();
    if (!error && data) {
      setSelectedProfileData(data);
    }
    setLoadingProfile(false);
  };

  const loadGuildContext = useCallback(async () => {
    setScreenError(null);

    const { data: userData, error: authError } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    if (authError || !userId) {
      setCurrentUserId(null);
      setGuild(null);
      setMyRole(null);
      setMembers([]);
      setRaids([]);
      setScreenError('You need to sign in to load guild data.');
      return;
    }

    setCurrentUserId(userId);

    const { data: membershipData, error: membershipError } = await supabase
      .from('guild_memberships')
      .select('guild_id, role')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError) {
      setGuild(null);
      setMyRole(null);
      setMembers([]);
      setRaids([]);
      setScreenError(toFriendlyError(membershipError.message));
      return;
    }

    if (!membershipData) {
      setGuild(null);
      setMyRole(null);
      setMembers([]);
      setRaids([]);
      return;
    }

    const guildId = membershipData.guild_id as string;
    const role = membershipData.role as GuildRole;
    setMyRole(role);

    const [guildResponse, membersResponse, raidsResponse] = await Promise.all([
      supabase
        .from('guilds')
        .select('id, name, level, exp, max_members')
        .eq('id', guildId)
        .single(),
      supabase
        .from('guild_memberships')
        .select('user_id, role, joined_at, profiles(name, level)')
        .eq('guild_id', guildId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true }),
      supabase
        .from('guild_raids')
        .select('id, boss_name, description, ends_at, status, target_reps, completed_reps')
        .eq('guild_id', guildId)
        .eq('status', 'active')
        .gte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true }),
    ]);

    const firstError = guildResponse.error ?? membersResponse.error ?? raidsResponse.error;
    if (firstError) {
      setGuild(null);
      setMembers([]);
      setRaids([]);
      setScreenError(toFriendlyError(firstError.message));
      return;
    }

    if (!guildResponse.data) {
      setGuild(null);
      setMembers([]);
      setRaids([]);
      setScreenError('Guild record was not found.');
      return;
    }

    setGuild(guildResponse.data as GuildRow);

    const mappedMembers = ((membersResponse.data ?? []) as GuildMembershipRow[]).map((member) => {
      const profile = Array.isArray(member.profiles)
        ? member.profiles[0] ?? null
        : member.profiles;

      return {
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        name: profile?.name?.trim() ? profile.name : 'Unnamed Adventurer',
        level: profile?.level ?? 1,
      };
    });

    mappedMembers.sort((a, b) => b.level - a.level);
    setMembers(mappedMembers);
    setRaids((raidsResponse.data ?? []) as GuildRaid[]);
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      await loadGuildContext();
      if (mounted) {
        setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [loadGuildContext]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGuildContext();
    setRefreshing(false);
  }, [loadGuildContext]);

  const handleCreateGuild = useCallback(async () => {
    const cleanName = sanitizeGuildName(guildNameInput);
    if (cleanName.length < MIN_GUILD_NAME_LENGTH) {
      setCreateError(`Guild name must be at least ${MIN_GUILD_NAME_LENGTH} characters.`);
      return;
    }
    if (cleanName.length > MAX_GUILD_NAME_LENGTH) {
      setCreateError(`Guild name must be at most ${MAX_GUILD_NAME_LENGTH} characters.`);
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    const { error } = await supabase.rpc('create_guild_with_owner', {
      p_name: cleanName,
    });

    if (error) {
      setCreateLoading(false);
      setCreateError(toFriendlyError(error.message));
      return;
    }

    setGuildNameInput('');
    setIsCreateMode(false);
    await loadGuildContext();
    setCreateLoading(false);
  }, [guildNameInput, loadGuildContext]);

  const handleFetchGuilds = useCallback(async () => {
    setLoadingGuilds(true);
    const { data: guildsData, error } = await supabase.rpc('get_available_guilds');
      
    if (!error && guildsData) {
      setAvailableGuilds(guildsData);
    } else {
      setAvailableGuilds([]);
    }
    setLoadingGuilds(false);
  }, []);

  const handleJoinGuild = useCallback(async () => {
    const cleanName = sanitizeGuildName(joinNameInput);
    if (!cleanName) {
      setJoinError('Please enter a guild name.');
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    const { error } = await supabase.rpc('join_guild', {
      p_name: cleanName,
    });

    if (error) {
      setJoinLoading(false);
      setJoinError(toFriendlyError(error.message));
      return;
    }

    setJoinNameInput('');
    setIsJoinMode(false);
    await loadGuildContext();
    setJoinLoading(false);
  }, [joinNameInput, loadGuildContext]);

  const handleLeaveGuild = useCallback(async () => {
    if (!guild) return;
    try {
      const { error } = await supabase.rpc("leave_guild", { p_guild_id: guild.id });
      if (error) {
        setScreenError("Failed to leave guild: " + toFriendlyError(error.message));
        return;
      }
      await loadGuildContext();
    } catch (err: any) {
      setScreenError("Failed to leave guild: " + err.message);
    }
  }, [guild, loadGuildContext]);

  const guildProgress = useMemo(
    () => getGuildProgress(guild?.level ?? 1, guild?.exp ?? 0),
    [guild?.level, guild?.exp],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FDF1E6" />
        <ActivityIndicator size="large" color={AuthColors.navy} />
        <Text style={styles.loadingText}>Loading guild data...</Text>
      </View>
    );
  }

  if (!guild) {
    return (
      <View style={styles.screenEmpty}>
        <StatusBar barStyle="dark-content" backgroundColor="#FDF1E6" />
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void onRefresh();
              }}
              tintColor={AuthColors.navy}
            />
          )}
        >
          <View style={styles.emptyIconPlaceholder} />

          <Text style={styles.emptyTitle}>LONE WOLF?</Text>
          <Text style={styles.emptySubtitle}>
            You are not currently in a guild. Create one now and pick your own guild name, or join an existing one by name.
          </Text>

          {screenError ? <Text style={styles.inlineErrorText}>{screenError}</Text> : null}

          {!isJoinMode && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsCreateMode((value) => !value);
                setCreateError(null);
                setGuildNameInput('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isCreateMode ? 'CANCEL CREATE' : 'CREATE GUILD'}</Text>
            </TouchableOpacity>
          )}

          {isCreateMode ? (
            <View style={styles.createCard}>
              <Text style={styles.createLabel}>Guild Name</Text>
              <TextInput
                style={styles.guildInput}
                value={guildNameInput}
                onChangeText={(value) => {
                  setGuildNameInput(value);
                  if (createError) setCreateError(null);
                }}
                placeholder="Enter guild name"
                placeholderTextColor="#90A4AE"
                autoCapitalize="words"
                maxLength={MAX_GUILD_NAME_LENGTH}
              />

              <Text style={styles.inputHint}>
                {guildNameInput.trim().length}/{MAX_GUILD_NAME_LENGTH} characters
              </Text>

              {createError ? <Text style={styles.inlineErrorText}>{createError}</Text> : null}

              <TouchableOpacity
                style={[styles.secondaryButton, createLoading ? styles.buttonDisabled : null]}
                onPress={() => {
                  void handleCreateGuild();
                }}
                activeOpacity={0.8}
                disabled={createLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  {createLoading ? 'CREATING...' : 'CONFIRM CREATE'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!isCreateMode && !isJoinMode && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsBrowseMode(!isBrowseMode);
                if (!isBrowseMode) handleFetchGuilds();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isBrowseMode ? "CLOSE BROWSER" : "BROWSE GUILDS"}</Text>
            </TouchableOpacity>
          )}

          {isBrowseMode && (
            <View style={styles.createCard}>
              <Text style={styles.createLabel}>Available Guilds</Text>
              {loadingGuilds ? (
                <ActivityIndicator size="small" color={AuthColors.navy} />
              ) : availableGuilds.length === 0 ? (
                <Text style={styles.helpText}>No guilds available.</Text>
              ) : (
                availableGuilds.map((g) => (
                  <TouchableOpacity key={g.id} style={styles.memberCard} onPress={() => {
                    setJoinNameInput(g.name);
                    setIsJoinMode(true);
                    setIsBrowseMode(false);
                  }}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{g.name} (Lv {g.level})</Text>
                      <Text style={styles.memberStatusText}>{g.members_count || 0}/{g.max_members} Members</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {!isCreateMode && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setIsJoinMode((value) => !value);
                setJoinError(null);
                setJoinNameInput('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{isJoinMode ? 'CANCEL JOIN' : 'JOIN BY NAME'}</Text>
            </TouchableOpacity>
          )}

          {isJoinMode ? (
            <View style={styles.createCard}>
              <Text style={styles.createLabel}>Join Guild</Text>
              <TextInput
                style={styles.guildInput}
                value={joinNameInput}
                onChangeText={(value) => {
                  setJoinNameInput(value);
                  if (joinError) setJoinError(null);
                }}
                placeholder="Enter exact guild name"
                placeholderTextColor="#90A4AE"
                autoCapitalize="words"
              />

              {joinError ? <Text style={styles.inlineErrorText}>{joinError}</Text> : null}

              <TouchableOpacity
                style={[styles.secondaryButton, joinLoading ? styles.buttonDisabled : null]}
                onPress={() => {
                  void handleJoinGuild();
                }}
                activeOpacity={0.8}
                disabled={joinLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  {joinLoading ? 'JOINING...' : 'CONFIRM JOIN'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.helpText}>You can join a friend's guild by entering their exact guild name above.</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screenGuild}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3FAFF" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={AuthColors.navy}
          />
        )}
      >
        {screenError ? <Text style={styles.inlineErrorText}>{screenError}</Text> : null}

        <View style={styles.guildBanner}>
          <View style={styles.emblemContainer}>
            <View style={styles.emblemIconMain} />
            <View style={styles.emblemBadge} />
          </View>

          <Text style={styles.guildName}>{guild.name}</Text>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 16, backgroundColor: AuthColors.crimson, borderColor: AuthColors.crimson }]}
            onPress={() => {
              handleLeaveGuild();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: AuthColors.white }]}>LEAVE GUILD</Text>
          </TouchableOpacity>

          <View style={styles.guildStatsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>LVL {guild.level}</Text>
            </View>
            <View style={[styles.statPill, { width: 152 }]}>
              <Text style={styles.statPillText}>{members.length}/{guild.max_members} MEM</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>{(myRole ?? 'member').toUpperCase() === 'OWNER' ? 'LEADER' : (myRole ?? 'member').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>GUILD XP</Text>
            <Text style={styles.progressValue}>{Math.round(guildProgress.percent)}%</Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarInner, { width: `${guildProgress.percent}%` }]} />
          </View>
          <Text style={styles.progressMetaText}>
            {guildProgress.current}/{guildProgress.needed} XP to next level
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>ACTIVE RAIDS</Text>
          </View>

          {raids.length === 0 ? (
            <View style={styles.emptySectionCard}>
              <Text style={styles.emptySectionText}>No active raids for this guild right now.</Text>
            </View>
          ) : (
            raids.map((raid) => {
              const repPercent = raid.target_reps > 0
                ? Math.min((raid.completed_reps / raid.target_reps) * 100, 100)
                : 0;

              return (
                <View key={raid.id} style={styles.raidCard}>
                  <View style={styles.raidImageContainer}>
                    <View style={styles.raidGradient} />
                    <View style={styles.raidTextOverlay}>
                      <Text style={styles.raidSubtitle}>WORLD BOSS SPOTTED</Text>
                      <Text style={styles.raidTitle}>{raid.boss_name.toUpperCase()}</Text>
                      {raid.description ? <Text style={styles.raidDescription}>{raid.description}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.raidActionRowStack}>
                    <View style={styles.raidActionInfo}>
                      <Text style={styles.raidTimeLabel}>TIME LEFT</Text>
                      <Text style={styles.raidTimeValue}>{formatTimeLeft(raid.ends_at)}</Text>
                    </View>

                    <Text style={styles.raidRepsText}>
                      {raid.completed_reps}/{raid.target_reps} reps
                    </Text>

                    <View style={styles.raidProgressOuter}>
                      <View style={[styles.raidProgressInner, { width: `${repPercent}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>LEADERBOARD (MEMBER LIST)</Text>
          </View>

          {members.length === 0 ? (
            <View style={styles.emptySectionCard}>
              <Text style={styles.emptySectionText}>No active members found.</Text>
            </View>
          ) : (
            members.map((member, index) => (
              <View key={member.userId} style={styles.memberCard}>
                <View style={[styles.rankBadge, index === 0 && styles.rank1, index === 1 && styles.rank2, index === 2 && styles.rank3]}>
                  <Text style={[styles.rankText, index < 3 && styles.topRankText]}>#{index + 1}</Text>
                </View>
                <View style={styles.memberAvatarBox}>
                  <Text style={styles.memberInitial}>{member.name.slice(0, 1).toUpperCase()}</Text>
                  <View style={styles.memberLevelBadge}>
                    <Text style={styles.memberLevelText}>L{member.level}</Text>
                  </View>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.memberRow}>
                    <Text style={styles.memberName}>
                      {member.name}
                      {member.userId === currentUserId ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.memberClass}>{member.role.toUpperCase() === 'OWNER' ? 'LEADER' : member.role.toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberRow}>
                    <Text style={styles.memberStatusText}>Joined {formatJoinedDate(member.joinedAt)}</Text>
                    <TouchableOpacity 
                      style={styles.viewProfileBtn}
                      onPress={() => fetchProfile(member.userId)}
                    >
                      <Text style={styles.viewProfileText}>VIEW</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Member Profile Modal */}
      <Modal visible={!!selectedProfileId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingProfile ? (
              <ActivityIndicator size="large" color={AuthColors.navy} />
            ) : selectedProfileData ? (
              <>
                <Text style={styles.modalTitle}>{selectedProfileData.name}</Text>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Level</Text>
                  <Text style={styles.statValue}>{selectedProfileData.level || 1}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Strength</Text>
                  <Text style={styles.statValue}>{selectedProfileData.str || 0}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Agility</Text>
                  <Text style={styles.statValue}>{selectedProfileData.agi || 0}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Stamina</Text>
                  <Text style={styles.statValue}>{selectedProfileData.sta || 0}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Monsters Defeated</Text>
                  <Text style={styles.statValue}>{selectedProfileData.victories || 0}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Reps</Text>
                  <Text style={styles.statValue}>{selectedProfileData.total_reps || 0}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.closeProfileBtn}
                  onPress={() => {
                    setSelectedProfileId(null);
                    setSelectedProfileData(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeProfileText}>CLOSE PROFILE</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.helpText}>Could not load profile.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: AuthColors.navy,
  },
  screenEmpty: {
    flex: 1,
    backgroundColor: '#FDF1E6',
  },
  emptyContainer: {
    flexGrow: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconPlaceholder: {
    width: 96,
    height: 96,
    backgroundColor: '#EBEBEB',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    marginBottom: 24,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 24,
    color: AuthColors.crimson,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#3D494C',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inlineErrorText: {
    width: '100%',
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: AuthColors.crimson,
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: AuthColors.crimson,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.white,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  secondaryButtonText: {
    fontFamily: Fonts.pixel,
    fontSize: 14,
    color: AuthColors.navy,
  },
  createCard: {
    width: '100%',
    backgroundColor: AuthColors.white,
    borderWidth: 3,
    borderColor: AuthColors.navy,
    padding: 16,
    marginBottom: 16,
    shadowColor: AuthColors.navy,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  createLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 22,
    color: AuthColors.navy,
    marginBottom: 8,
  },
  guildInput: {
    width: '100%',
    borderWidth: 3,
    borderColor: AuthColors.navy,
    backgroundColor: '#F3FAFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: AuthColors.navy,
    marginBottom: 8,
  },
  inputHint: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#607D8B',
    marginBottom: 12,
  },
  helpText: {
    marginTop: 16,
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  screenGuild: {
    flex: 1,
    backgroundColor: '#F3FAFF',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  guildBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#123441',
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    position: 'relative',
  },
  emblemContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#CCEDFE',
    borderWidth: 3,
    borderColor: '#765A05',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emblemIconMain: {
    width: 40,
    height: 50,
    backgroundColor: '#BB152C',
    zIndex: 0,
  },
  emblemBadge: {
    position: 'absolute',
    width: 25,
    height: 25,
    backgroundColor: '#123441',
    bottom: -10,
    right: -10,
    zIndex: 1,
  },
  guildName: {
    fontFamily: Fonts.vt323,
    fontSize: 36,
    color: '#123441',
    textAlign: 'center',
    marginBottom: 16,
  },
  guildStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statPill: {
    height: 36,
    backgroundColor: '#E6F6FF',
    borderWidth: 2,
    borderColor: '#BCC9CC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statPillText: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#3D494C',
  },

  /* Guild Progress */
  progressSection: {
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#001F29',
    textTransform: 'uppercase',
  },
  progressValue: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    fontWeight: '700',
    color: '#006A60',
  },
  progressMetaText: {
    marginTop: 8,
    fontFamily: Fonts.vt323,
    fontSize: 22,
    color: '#3D494C',
  },
  progressBarOuter: {
    height: 32,
    backgroundColor: '#CCEDFE',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#006A60',
    borderRightWidth: 3,
    borderColor: '#123441',
  },

  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    backgroundColor: '#123441',
    paddingVertical: 4,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    minWidth: 200,
  },
  sectionHeaderText: {
    fontFamily: Fonts.vt323,
    fontSize: 30,
    color: '#F3FAFF',
    textTransform: 'uppercase',
  },
  emptySectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#123441',
    padding: 16,
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptySectionText: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#3D494C',
  },

  raidCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#123441',
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  raidImageContainer: {
    height: 198,
    backgroundColor: '#271216',
    position: 'relative',
  },
  raidGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 52, 65, 0.6)',
  },
  raidTextOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 8,
  },
  raidSubtitle: {
    fontFamily: Fonts.pixel,
    fontSize: 10,
    color: '#FFD700',
    textTransform: 'uppercase',
  },
  raidTitle: {
    fontFamily: Fonts.pixel,
    fontSize: 18,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  raidDescription: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#F3FAFF',
  },
  raidActionRowStack: {
    padding: 16,
    borderTopWidth: 3,
    borderColor: '#123441',
    gap: 8,
  },
  raidActionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  raidTimeLabel: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#3D494C',
  },
  raidTimeValue: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#BB152C',
    fontWeight: '700',
  },
  raidRepsText: {
    fontFamily: Fonts.vt323,
    fontSize: 24,
    color: '#123441',
  },
  raidProgressOuter: {
    height: 20,
    backgroundColor: '#D8F2FF',
    borderWidth: 3,
    borderColor: '#123441',
  },
  raidProgressInner: {
    height: '100%',
    backgroundColor: AuthColors.crimson,
  },

  memberCard: {
    backgroundColor: '#CCEDFE',
    borderWidth: 3,
    borderColor: '#123441',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#123441',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderWidth: 3,
    borderColor: '#123441',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }]
  },
  rank1: { backgroundColor: AuthColors.gold },
  rank2: { backgroundColor: '#C0C0C0' },
  rank3: { backgroundColor: '#CD7F32' },
  rankText: { fontFamily: Fonts.vt323, fontSize: 18, color: '#123441' },
  topRankText: { color: AuthColors.white },
  memberAvatarBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#123441',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontFamily: Fonts.pixel,
    fontSize: 18,
    color: AuthColors.navy,
  },
  memberLevelBadge: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    backgroundColor: '#765A05',
    borderWidth: 2,
    borderColor: '#123441',
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  memberLevelText: {
    fontFamily: Fonts.vt323,
    fontSize: 14,
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontFamily: Fonts.vt323,
    fontSize: 22,
    color: '#001F29',
    flex: 1,
  },
  memberClass: {
    fontFamily: Fonts.vt323,
    fontSize: 20,
    color: '#006A60',
  },
  memberStatusText: {
    fontFamily: Fonts.vt323,
    fontSize: 18,
    color: '#3D494C',
  },
  viewProfileBtn: { backgroundColor: "#CC2B3E", paddingHorizontal: 12, paddingVertical: 4, borderWidth: 2, borderColor: "#123441" },
  viewProfileText: { fontFamily: Fonts.vt323, fontSize: 16, color: "#FFF" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", backgroundColor: "#FDF1E6", borderWidth: 4, borderColor: "#123441", padding: 20 },
  modalTitle: { fontFamily: Fonts.pixel, fontSize: 18, color: "#123441", marginBottom: 16, textAlign: "center" },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(18,52,65,0.1)", paddingBottom: 4 },
  statLabel: { fontFamily: Fonts.vt323, fontSize: 20, color: "#3D494C" },
  statValue: { fontFamily: Fonts.vt323, fontSize: 20, color: "#006A60" },
  closeProfileBtn: { backgroundColor: "#123441", padding: 12, borderWidth: 2, borderColor: "#000", marginTop: 20, alignItems: "center" },
  closeProfileText: { fontFamily: Fonts.pixel, fontSize: 14, color: "#FFF" }
});
