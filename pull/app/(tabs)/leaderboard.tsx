import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { GatedScreen } from '@/src/components/GatedPreview';
import { CircleInviteSection } from '@/src/components/CircleInviteSection';
import { useUnlockNavigation } from '@/src/hooks/useUnlockNavigation';
import { useSession } from '@/src/state/session';
import { useHiddenMembers } from '@/src/state/hiddenMembers';
import { getCircleFocusStats, getRoomActiveSessions, type FocusStatRow } from '@/src/services/focus';
import { getCircleUsageStats, type UsageStatRow } from '@/src/services/usage';
import { usePacer } from '@/src/state/pacer';
import { PacerAvatar } from '@/src/components/PacerAvatar';
import { PACER_BOTS, botRoomSession, botStats, type PacerBot } from '@/src/domain/pacer';
import { palette } from '@/src/theme/palette';

/** The leaderboard only ranks over these windows. */
type LeaderWindow = 'today' | 'week' | 'all';

/** A leaderboard row — a real member (`bot: null`) or a disclosed bot. */
type Player = {
  id: string;
  name: string;
  initial: string;
  you: boolean;
  bot: PacerBot | null;
  focusMinutes: number;
  resists: number;
  live: boolean;
  score: number;
};

/** Points = focus minutes + each resist worth 5 min of focus. */
const RESIST_POINTS = 5;

const MEDAL_SILVER = '#c7ccd6';
const MEDAL_BRONZE = '#cd9b6a';

function formatMinutes(min: number): string {
  if (min <= 0) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function Avatar({ player, size = 34 }: { player: Player; size?: number }) {
  if (player.bot) {
    return <PacerAvatar size={size} color={player.bot.color} glyph={player.bot.glyph} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      <Text style={styles.avatarText}>{player.initial}</Text>
    </View>
  );
}

function LeaderboardContent() {
  const router = useRouter();
  const [tab, setTab] = useState<LeaderWindow>('week');
  const { user, circle, refreshCircle } = useSession();
  const { enabled: pacerEnabled } = usePacer();
  const { hidden, hide } = useHiddenMembers();
  const circleId = circle?.circleId ?? null;
  const [focus, setFocus] = useState<FocusStatRow[]>([]);
  const [usage, setUsage] = useState<UsageStatRow[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());

  // Refetch whenever the tab regains focus (and when the window/circle changes),
  // so switching back to the leaderboard always shows current numbers.
  useFocusEffect(
    useCallback(() => {
      // Keep circle membership fresh (a friend may have joined) now that the
      // home screen no longer does this.
      if (user) void refreshCircle();
      if (!circleId) {
        setFocus([]);
        setUsage([]);
        setLiveIds(new Set());
        return;
      }
      let cancelled = false;
      void (async () => {
        const [focusRows, usageRows, room] = await Promise.all([
          getCircleFocusStats(circleId, tab),
          getCircleUsageStats(circleId, tab),
          getRoomActiveSessions(circleId),
        ]);
        if (cancelled) return;
        setFocus(focusRows);
        setUsage(usageRows);
        setLiveIds(new Set(room.map((m) => m.userId)));
      })();
      return () => {
        cancelled = true;
      };
    }, [circleId, tab, user, refreshCircle]),
  );

  // Build every player (real members + disclosed bots), unranked.
  const allPlayers = useMemo(() => {
    const members = circle?.members ?? [];
    const focusBy = new Map(focus.map((r) => [r.userId, r]));
    const usageBy = new Map(usage.map((r) => [r.userId, r]));
    const players: Player[] = members.map((member) => {
      const focusMinutes = focusBy.get(member.id)?.focusMinutes ?? 0;
      const resists = usageBy.get(member.id)?.resists ?? 0;
      return {
        id: member.id,
        name: member.displayName,
        initial: member.initial,
        you: member.id === user?.id,
        bot: null,
        focusMinutes,
        resists,
        live: liveIds.has(member.id),
        score: focusMinutes + resists * RESIST_POINTS,
      };
    });

    if (pacerEnabled) {
      for (const bot of PACER_BOTS) {
        const stats = botStats(bot, tab);
        players.push({
          id: bot.id,
          name: bot.name,
          initial: bot.name.charAt(0).toUpperCase(),
          you: false,
          bot,
          focusMinutes: stats.focusMinutes,
          resists: stats.resists,
          live: botRoomSession(bot) != null,
          score: stats.focusMinutes + stats.resists * RESIST_POINTS,
        });
      }
    }
    return players;
  }, [circle?.members, focus, usage, liveIds, user?.id, pacerEnabled, tab]);

  // Hidden members never occupy ranks; ranking is over the visible set only.
  const data = useMemo(
    () =>
      allPlayers
        .filter((p) => !hidden.has(p.id))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .map((player, index) => ({ ...player, rank: index + 1 })),
    [allPlayers, hidden],
  );
  const topScore = data[0]?.score ?? 0;
  const focusingNow = data.filter((p) => p.live).length;
  const windowLabel = tab === 'week' ? 'this week' : tab === 'today' ? 'today' : 'all time';

  const confirmHide = useCallback(
    (player: Player) => {
      Alert.alert(
        `Hide ${player.name}?`,
        'They’ll be removed from your leaderboard. Unhide anytime in Settings → Hidden friends.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Hide', style: 'destructive', onPress: () => hide(player.id) },
        ],
      );
    },
    [hide],
  );

  return (
    <>
      <Text style={styles.eyebrow}>Your circle</Text>
      <Text style={styles.title}>
        {focusingNow > 0 ? (
          <>
            {focusingNow} <Text style={styles.accent}>focusing now.</Text>
          </>
        ) : (
          <>
            The race <Text style={styles.accent}>{windowLabel}.</Text>
          </>
        )}
      </Text>

      <View style={styles.tabs}>
        {(['today', 'week', 'all'] as const).map((value) => (
          <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === value && styles.tabLabelActive]}>
              {value === 'week' ? 'This week' : value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {data.map((player) => {
          const pct = topScore > 0 && player.score > 0 ? Math.max(5, Math.round((player.score / topScore) * 100)) : 0;
          return (
            <Pressable
              key={player.id}
              onLongPress={player.you ? undefined : () => confirmHide(player)}
              delayLongPress={350}
              style={[styles.row, player.you && styles.rowYou]}
            >
              <View style={styles.rank}>
                {player.rank === 1 ? (
                  <MaterialCommunityIcons name="crown" size={20} color={palette.brass} />
                ) : player.rank === 2 ? (
                  <MaterialCommunityIcons name="medal" size={18} color={MEDAL_SILVER} />
                ) : player.rank === 3 ? (
                  <MaterialCommunityIcons name="medal" size={18} color={MEDAL_BRONZE} />
                ) : (
                  <Text style={styles.rankText}>{player.rank}</Text>
                )}
              </View>
              <Avatar player={player} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {player.name}
                  {player.you ? <Text style={styles.you}> · you</Text> : null}
                  {player.bot ? (
                    <Text style={[styles.pacerTag, { color: player.bot.color }]}> · {player.bot.tag}</Text>
                  ) : null}
                </Text>
                {player.live ? (
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Focusing now</Text>
                  </View>
                ) : (
                  <Text style={styles.meta}>
                    {player.resists} resist{player.resists === 1 ? '' : 's'} · {formatMinutes(player.focusMinutes)}
                  </Text>
                )}
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <Text style={styles.score}>{player.score}<Text style={styles.pts}> pts</Text></Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>Long-press anyone to hide them. Unhide in Settings → Hidden friends.</Text>

      <View style={styles.inviteSection}>
        <Text style={styles.sectionEyebrow}>Grow your circle</Text>
        <CircleInviteSection
          compact
          canInvite={Boolean(user)}
          onRequireSignIn={() => router.push('/auth/sign-in')}
        />
      </View>
    </>
  );
}

export default function LeaderboardScreen() {
  const { unlocked, blockedBy, onUnlock } = useUnlockNavigation('circle');

  return (
    <Screen edges={['top']}>
      <GatedScreen requirement="circle" unlocked={unlocked} blockedBy={blockedBy} onUnlock={onUnlock}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <LeaderboardContent />
        </ScrollView>
      </GatedScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  eyebrow: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 39, fontWeight: '700', lineHeight: 43, marginTop: 8, marginBottom: 16 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  tabActive: { backgroundColor: palette.surface2 },
  tabLabel: { color: palette.textMute, fontSize: 14, textTransform: 'capitalize' },
  tabLabelActive: { color: palette.text },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 12, gap: 10 },
  rowYou: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  rank: { width: 22, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: palette.textMute, fontWeight: '700' },
  avatar: { borderRadius: 99, backgroundColor: '#7a8a9a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { color: palette.text, fontSize: 16 },
  you: { color: palette.brass },
  pacerTag: { fontSize: 14 },
  meta: { color: palette.textMute, fontSize: 13, marginTop: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: palette.green },
  liveText: { color: palette.green, fontSize: 13, fontWeight: '700' },
  barTrack: { height: 4, borderRadius: 99, backgroundColor: palette.surface2, marginTop: 7, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 99, backgroundColor: palette.brass },
  score: { color: palette.text, fontWeight: '800', fontSize: 17 },
  pts: { color: palette.textMute, fontWeight: '600', fontSize: 13 },
  hint: { color: palette.textMute, fontSize: 13, marginTop: 10, textAlign: 'center' },
  sectionEyebrow: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  inviteSection: { marginTop: 24, gap: 10 },
});
