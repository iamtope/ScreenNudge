import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { getAttemptEvents, type AttemptEvent } from '@/src/services/attempts';
import { getCircleFocusStats, type FocusStatWindow } from '@/src/services/focus';
import { useSession } from '@/src/state/session';
import { useAccess } from '@/src/state/access';
import { computeTimeSaved, formatTimeSaved } from '@/src/domain/timeSaved';
import { palette } from '@/src/theme/palette';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type WindowId = 'today' | 'yesterday' | 'week' | 'month';

type WindowOption = {
  id: WindowId;
  label: string;
  focusWindow: FocusStatWindow;
};

type Summary = {
  attempts: number;
  opens: number;
  resists: number;
  decisions: number;
  successRate: number | null;
};

type Bucket = {
  date: string;
  label: string;
  attempts: number;
  resists: number;
};

type PeriodStat = {
  id: string;
  name: string;
  hint: string;
  attempts: number;
  opens: number;
  resists: number;
  rate: number | null;
};

/** A compact, gamified insight tile. */
type Tile = {
  icon: Glyph;
  label: string;
  value: string;
  sub: string;
  tone: string;
};

const WINDOW_OPTIONS: WindowOption[] = [
  { id: 'today', label: 'Today', focusWindow: 'today' },
  { id: 'yesterday', label: 'Yesterday', focusWindow: 'yesterday' },
  { id: 'week', label: 'Week', focusWindow: 'week' },
  { id: 'month', label: 'Month', focusWindow: 'month' },
];

/** Number of days of history to load (covers the widest window). */
const LOAD_DAYS = 31;

type Range = { since: number; until: number };

/** Local time range for each window (since inclusive, until exclusive). */
function windowRange(id: WindowId): Range {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const todayStart = midnight.getTime();
  const DAY = 24 * 60 * 60 * 1000;
  switch (id) {
    case 'today':
      return { since: todayStart, until: Infinity };
    case 'yesterday':
      return { since: todayStart - DAY, until: todayStart };
    case 'week':
      return { since: todayStart - 6 * DAY, until: Infinity };
    case 'month':
      return { since: todayStart - 29 * DAY, until: Infinity };
  }
}

const PERIODS = [
  { id: 'morning', label: 'Morning', hint: '5a–12p' },
  { id: 'afternoon', label: 'Afternoon', hint: '12p–5p' },
  { id: 'evening', label: 'Evening', hint: '5p–10p' },
  { id: 'late', label: 'Late night', hint: '10p–5a' },
] as const;

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filterByRange(events: AttemptEvent[], range: Range): AttemptEvent[] {
  return events.filter((event) => {
    const t = new Date(event.occurredAt).getTime();
    return t >= range.since && t < range.until;
  });
}

function summarize(events: AttemptEvent[]): Summary {
  const attempts = events.filter((event) => event.outcome === 'attempt').length;
  const opens = events.filter((event) => event.outcome === 'open').length;
  const resists = events.filter((event) => event.outcome === 'comeback').length;
  const decisions = opens + resists;
  return {
    attempts,
    opens,
    resists,
    decisions,
    successRate: decisions > 0 ? Math.round((resists / decisions) * 100) : null,
  };
}

function periodForHour(hour: number): (typeof PERIODS)[number]['id'] {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late';
}

function periodStats(events: AttemptEvent[]): PeriodStat[] {
  return PERIODS.map((period) => {
    const periodEvents = events.filter((event) => periodForHour(event.hour) === period.id);
    const attempts = periodEvents.filter((event) => event.outcome === 'attempt').length;
    const opens = periodEvents.filter((event) => event.outcome === 'open').length;
    const resists = periodEvents.filter((event) => event.outcome === 'comeback').length;
    const decisions = opens + resists;
    return {
      id: period.id,
      name: period.label,
      hint: period.hint,
      attempts,
      opens,
      resists,
      rate: decisions > 0 ? Math.round((resists / decisions) * 100) : null,
    };
  });
}

function buildBuckets(events: AttemptEvent[]): Bucket[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const dayEvents = events.filter((event) => event.date === key);
    return {
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3),
      attempts: dayEvents.filter((event) => event.outcome === 'attempt').length,
      resists: dayEvents.filter((event) => event.outcome === 'comeback').length,
    };
  });
}

function topTarget(events: AttemptEvent[]): { name: string; count: number } | null {
  const attempts = events.filter((event) => event.outcome === 'attempt');
  const counts = new Map<string, number>();
  for (const event of attempts) {
    const name = event.appName === 'this app' ? 'Guarded apps' : event.appName;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const [name, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return name ? { name, count } : null;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatRate(rate: number | null): string {
  return rate === null ? '--' : `${rate}%`;
}

function plural(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

/** Gamified tier earned by the resist rate. */
function resistTier(rate: number | null): { label: string; icon: Glyph; color: string } {
  if (rate === null) return { label: 'No data yet', icon: 'progress-question', color: palette.textMute };
  if (rate >= 90) return { label: 'Unscrollable', icon: 'shield-star', color: palette.brass };
  if (rate >= 70) return { label: 'Strong', icon: 'shield-check', color: palette.green };
  if (rate >= 45) return { label: 'Holding', icon: 'shield-half-full', color: palette.brass };
  return { label: 'Warming up', icon: 'shield-alert-outline', color: palette.rose };
}

export default function InsightsScreen() {
  const router = useRouter();
  const { circle, user } = useSession();
  const { isPullPlus } = useAccess();
  const [windowId, setWindowId] = useState<WindowId>('today');
  const [events, setEvents] = useState<AttemptEvent[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const windowOption = WINDOW_OPTIONS.find((option) => option.id === windowId) ?? WINDOW_OPTIONS[1];

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      void (async () => {
        const loadedEvents = await getAttemptEvents(LOAD_DAYS);
        let nextFocusMinutes = 0;
        if (circle?.circleId && user?.id) {
          const rows = await getCircleFocusStats(circle.circleId, windowOption.focusWindow);
          nextFocusMinutes = rows.find((row) => row.userId === user.id)?.focusMinutes ?? 0;
        }
        if (active) {
          setEvents(loadedEvents);
          setFocusMinutes(nextFocusMinutes);
          setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [circle?.circleId, user?.id, windowOption.focusWindow]),
  );

  const windowEvents = useMemo(() => filterByRange(events, windowRange(windowId)), [events, windowId]);
  const summary = useMemo(() => summarize(windowEvents), [windowEvents]);
  const buckets = useMemo(() => buildBuckets(events), [events]);
  const periods = useMemo(() => periodStats(windowEvents), [windowEvents]);
  const target = useMemo(() => topTarget(windowEvents), [windowEvents]);
  const overLimitAttempts = useMemo(
    () => windowEvents.filter((event) => event.outcome === 'attempt' && event.opensOver).length,
    [windowEvents],
  );
  const peak = periods.filter((period) => period.attempts > 0).sort((a, b) => b.attempts - a.attempts)[0];
  const best = periods
    .filter((period) => period.rate !== null && period.opens + period.resists > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

  const hasData = summary.attempts > 0 || summary.decisions > 0 || focusMinutes > 0;
  const tier = resistTier(summary.successRate);
  const timeSaved = useMemo(() => computeTimeSaved(windowEvents), [windowEvents]);

  const tiles: Tile[] = [
    {
      icon: 'lightning-bolt',
      label: 'Peak pressure',
      value: peak ? peak.name : '—',
      sub: peak ? plural(peak.attempts, 'attempt') : 'No pattern yet',
      tone: peak?.id === 'late' ? palette.rose : palette.brass,
    },
    {
      icon: 'cellphone-lock',
      label: 'Top temptation',
      value: target ? target.name : '—',
      sub: target ? plural(target.count, 'pull') : 'No target yet',
      tone: palette.brass,
    },
    {
      icon: 'arm-flex',
      label: 'Best window',
      value: best ? best.name : '—',
      sub: best?.rate != null ? `${best.rate}% back` : 'Not enough data',
      tone: palette.green,
    },
    {
      icon: 'alert-circle-outline',
      label: 'Over budget',
      value: String(overLimitAttempts),
      sub: overLimitAttempts > 0 ? 'past your opens' : 'none — nice',
      tone: overLimitAttempts > 0 ? palette.rose : palette.green,
    },
  ];

  return (
    <Screen edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{loading ? 'Refreshing' : windowOption.label}</Text>
          <Text style={styles.title}>
            What your <Text style={styles.accent}>attention shows.</Text>
          </Text>
        </View>

        <View style={styles.tabs}>
          {WINDOW_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setWindowId(option.id)}
              style={[styles.tab, windowId === option.id && styles.tabActive]}
            >
              <Text numberOfLines={1} style={[styles.tabLabel, windowId === option.id && styles.tabLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Gamified resist-rate hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>Resist rate</Text>
            <Text style={styles.heroPercent}>{formatRate(summary.successRate)}</Text>
            <Text style={styles.heroSub}>
              {summary.resists} resisted · {summary.opens} opened
            </Text>
          </View>
          <View style={[styles.tierBadge, { borderColor: tier.color }]}>
            <MaterialCommunityIcons name={tier.icon} size={26} color={tier.color} />
            <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
          </View>
        </View>

        {/* Estimated time saved — Pull+ (locked teaser for free) */}
        {isPullPlus ? (
          <View style={styles.savedCard}>
            <View style={styles.savedIcon}>
              <MaterialCommunityIcons name="timer-sand" size={20} color={palette.brass} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedLabel}>Estimated time saved</Text>
              <Text style={styles.savedValue}>{formatTimeSaved(timeSaved.minutes)}</Text>
              <Text style={styles.savedSub}>
                {timeSaved.episodes} resisted episode{timeSaved.episodes === 1 ? '' : 's'} 
              </Text>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push('/premium')} style={styles.savedLocked}>
            <View style={styles.savedIcon}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={palette.brass} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedLabel}>Estimated time saved</Text>
              <Text style={styles.savedLockedTitle}>See the time you’ve won back</Text>
              <Text style={styles.savedUpgrade}>Unlock with Pull+</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={palette.textMute} />
          </Pressable>
        )}

        <View style={styles.stats}>
          <Stat label="Attempts" value={String(summary.attempts)} />
          <Stat label="Resists" value={String(summary.resists)} />
          <Stat label="Opens" value={String(summary.opens)} />
          <Stat label="Focus" value={formatMinutes(focusMinutes)} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Last 7 days</Text>
            <View style={styles.legend}>
              <Legend color={palette.rose} label="Attempts" />
              <Legend color={palette.green} label="Resists" />
            </View>
          </View>
          <TrendChart buckets={buckets} />
        </View>

        {hasData ? (
          <View style={styles.tileGrid}>
            {tiles.map((tile) => (
              <InsightTile key={tile.label} tile={tile} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={palette.textMute} />
            <Text style={styles.emptyText}>
              Your pressure pattern and best recovery windows show up here after a few protected moments.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const maxAttempts = Math.max(1, ...buckets.map((bucket) => bucket.attempts));
  return (
    <View style={styles.chart}>
      {buckets.map((bucket) => {
        const attemptHeight = bucket.attempts > 0 ? Math.max(8, (bucket.attempts / maxAttempts) * 82) : 2;
        const resistHeight = bucket.resists > 0 ? Math.max(6, (bucket.resists / maxAttempts) * 82) : 0;
        return (
          <View key={bucket.date} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: attemptHeight, backgroundColor: palette.rose }]} />
              {resistHeight > 0 ? (
                <View style={[styles.barFill, styles.barResist, { height: resistHeight }]} />
              ) : null}
            </View>
            <Text style={styles.barLabel}>{bucket.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function InsightTile({ tile }: { tile: Tile }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: `${tile.tone}1f` }]}>
        <MaterialCommunityIcons name={tile.icon} size={18} color={tile.tone} />
      </View>
      <Text style={styles.tileLabel}>{tile.label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {tile.value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={1}>
        {tile.sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24, gap: 12 },
  header: { gap: 6 },
  eyebrow: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 39, fontWeight: '700', lineHeight: 43 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 4,
    backgroundColor: palette.surface,
    gap: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
  tabActive: { backgroundColor: palette.surface2 },
  tabLabel: { color: palette.textMute, fontSize: 14, fontWeight: '700' },
  tabLabelActive: { color: palette.text },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 14,
  },
  savedLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.brassSoft,
    borderRadius: 16,
    padding: 14,
  },
  savedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.brassSoft,
    borderWidth: 1,
    borderColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedLabel: { color: palette.textMute, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  savedValue: { color: palette.text, fontSize: 28, fontWeight: '700', marginTop: 2 },
  savedSub: { color: palette.textSoft, fontSize: 12, marginTop: 2 },
  savedLockedTitle: { color: palette.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  savedUpgrade: { color: palette.brass, fontSize: 13, fontWeight: '700', marginTop: 2 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.brass,
    backgroundColor: palette.brassSoft,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  heroLeft: { flex: 1, gap: 2 },
  heroEyebrow: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  heroPercent: { color: palette.text, fontSize: 48, fontWeight: '800', lineHeight: 52 },
  heroSub: { color: palette.textSoft, fontSize: 14 },
  tierBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 104,
  },
  tierLabel: { fontSize: 14, fontWeight: '800' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    width: '48.8%',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.surface,
    padding: 12,
    minHeight: 82,
  },
  statLabel: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: palette.text, fontSize: 32, fontWeight: '700', marginTop: 6 },
  card: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: palette.text, fontSize: 20, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 99 },
  legendText: { color: palette.textMute, fontSize: 12 },
  chart: { height: 118, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 6 },
  barColumn: { flex: 1, alignItems: 'center', gap: 7 },
  barTrack: {
    height: 86,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barFill: {
    width: '72%',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    opacity: 0.85,
  },
  barResist: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: palette.green,
    opacity: 0.95,
  },
  barLabel: { color: palette.textMute, fontSize: 12 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48.8%',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.surface,
    padding: 12,
    gap: 4,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileLabel: { color: palette.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  tileValue: { color: palette.text, fontSize: 20, fontWeight: '800' },
  tileSub: { color: palette.textSoft, fontSize: 13 },
  emptyCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  emptyText: { color: palette.textSoft, fontSize: 15, lineHeight: 21, textAlign: 'center' },
});
