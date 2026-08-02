import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/src/components/Screen';
import {
  ScreenTimeReport,
  addDays,
  screenTimeDayKey,
} from '@/modules/screen-time-report';
import { palette } from '@/src/theme/palette';

type Mode = 'day' | 'week' | 'month';

const MODES: { id: Mode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

/** How far back the day strip goes. Screen Time keeps roughly a month of history. */
const DAY_STRIP_LENGTH = 30;

/**
 * The report gets a screen of its own on purpose. It renders out-of-process, and
 * putting a tall remote view inside another ScrollView made scrolling fight back —
 * here it fills the screen and does its own scrolling, with nothing to compete with.
 */
export default function ScreenTimeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('day');
  const [dayOffset, setDayOffset] = useState(0);

  const today = useMemo(() => new Date(), []);

  // Oldest first so the strip reads left-to-right and ends on today.
  const days = useMemo(
    () =>
      Array.from({ length: DAY_STRIP_LENGTH }, (_, index) =>
        addDays(today, -(DAY_STRIP_LENGTH - 1 - index)),
      ),
    [today],
  );

  const range = useMemo(() => {
    if (mode === 'day') {
      const day = screenTimeDayKey(addDays(today, dayOffset));
      return { startDay: day, endDay: day };
    }
    const span = mode === 'week' ? 6 : 29;
    return {
      startDay: screenTimeDayKey(addDays(today, -span)),
      endDay: screenTimeDayKey(today),
    };
  }, [mode, dayOffset, today]);

  const selectedLabel = useMemo(() => {
    if (mode === 'day') {
      if (dayOffset === 0) return 'Today';
      if (dayOffset === -1) return 'Yesterday';
      return addDays(today, dayOffset).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    return mode === 'week' ? 'Last 7 days' : 'Last 30 days';
  }, [mode, dayOffset, today]);

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={palette.text} />
        </Pressable>
        <Text style={styles.title}>Screen Time</Text>
      </View>

      <View style={styles.tabs}>
        {MODES.map((option) => {
          const active = option.id === mode;
          return (
            <Pressable
              key={option.id}
              onPress={() => setMode(option.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'day' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          ref={(node) => node?.scrollToEnd({ animated: false })}
        >
          {days.map((date) => {
            const offset = -Math.round(
              (new Date(screenTimeDayKey(today)).getTime() -
                new Date(screenTimeDayKey(date)).getTime()) /
                86_400_000,
            );
            const active = offset === dayOffset;
            return (
              <Pressable
                key={screenTimeDayKey(date)}
                onPress={() => setDayOffset(offset)}
                style={[styles.day, active && styles.dayActive]}
              >
                <Text style={[styles.dayName, active && styles.dayTextActive]}>
                  {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
                </Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Text style={styles.selected}>{selectedLabel}</Text>

      <ScreenTimeReport
        startDay={range.startDay}
        endDay={range.endDay}
        style={styles.report}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  back: { padding: 4 },
  title: { color: palette.text, fontSize: 22, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: palette.brassSoft },
  tabLabel: { color: palette.textMute, fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: palette.brass },
  strip: { paddingHorizontal: 20, paddingTop: 14, gap: 8 },
  day: {
    width: 45,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    gap: 2,
  },
  dayActive: { backgroundColor: palette.brassSoft, borderColor: palette.brass },
  dayName: { color: palette.textMute, fontSize: 11, textTransform: 'uppercase' },
  dayNum: { color: palette.textSoft, fontSize: 16, fontWeight: '700' },
  dayTextActive: { color: palette.brass },
  selected: {
    color: palette.textMute,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  // flex, not a fixed height: the report scrolls internally, so it just takes the
  // space that is left rather than needing its content measured.
  report: { flex: 200, width: '100%', marginTop: 8 },
});
