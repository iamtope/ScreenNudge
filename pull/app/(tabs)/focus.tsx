import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { useFocus } from '@/src/state/focus';
import { usePacer } from '@/src/state/pacer';
import { useAchievements } from '@/src/state/achievements';
import { PacerAvatar } from '@/src/components/PacerAvatar';
import { PACER_BOTS, botRoomSession, type PacerBot, type PacerRoomSession } from '@/src/domain/pacer';
import { friendlyAccountError } from '@/src/lib/network';
import { palette } from '@/src/theme/palette';

/** One-tap durations. Steppers below cover anything in between, up to 24h. */
const QUICK_PRESETS = [25, 50, 90, 240, 480];
const MIN_MINUTES = 5;
const MAX_MINUTES = 24 * 60; // 24 hours

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function clampMinutes(value: number): number {
  return Math.min(Math.max(value, MIN_MINUTES), MAX_MINUTES);
}

function Stepper({
  value,
  unit,
  onMinus,
  onPlus,
}: {
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnLabel}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>
        {value}
        <Text style={styles.stepUnit}>{unit}</Text>
      </Text>
      <Pressable onPress={onPlus} hitSlop={8} style={styles.stepBtn}>
        <Text style={styles.stepBtnLabel}>+</Text>
      </Pressable>
    </View>
  );
}

function FocusContent() {
  const { activeSession, isFocusing, enforced, roomMembers, start, end } = useFocus();
  const { enabled: pacerEnabled } = usePacer();
  const { evaluate } = useAchievements();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endingRef = useRef(false);

  // Tick the timer + clock only while the tab is focused; recompute on resume.
  useFocusEffect(
    useCallback(() => {
      setNowMs(Date.now());
      const tick = setInterval(() => setNowMs(Date.now()), 1000);
      const appSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          setNowMs(Date.now());
        }
      });
      return () => {
        clearInterval(tick);
        appSub.remove();
      };
    }, []),
  );

  const remainingMs = activeSession ? toMs(activeSession.expectedEndAt) - nowMs : minutes * 60_000;

  // Finalise the session when the countdown reaches zero while the screen is open.
  useEffect(() => {
    if (isFocusing && remainingMs <= 0 && !endingRef.current) {
      endingRef.current = true;
      void end('completed').finally(() => {
        endingRef.current = false;
        void evaluate();
      });
    }
  }, [isFocusing, remainingMs, end, evaluate]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await start(minutes);
    } catch (startError) {
      setError(friendlyAccountError(startError, 'Could not start focus. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  }, [minutes, start]);

  const handleEnd = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await end('manual');
      void evaluate();
    } finally {
      setBusy(false);
    }
  }, [end, evaluate]);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const adjust = useCallback((delta: number) => {
    setMinutes((current) => clampMinutes(current + delta));
  }, []);

  // The bots are disclosed, not friends: they keep the room from being empty for
  // a solo user. Liveness ticks with nowMs (recomputed every second).
  const activeBots: { bot: PacerBot; session: PacerRoomSession }[] = [];
  if (pacerEnabled) {
    for (const bot of PACER_BOTS) {
      const session = botRoomSession(bot, new Date(nowMs));
      if (session) activeBots.push({ bot, session });
    }
  }
  const focusingCount = roomMembers.length + activeBots.length;

  return (
    <>
      <Text style={styles.eyebrow}>Focus room</Text>
      <Text style={styles.title}>
        {focusingCount > 0 ? (
          <>
            {`${focusingCount} `}
            <Text style={styles.accent}>focusing now.</Text>
          </>
        ) : (
          <>
            Friends <Text style={styles.accent}>are quiet right now.</Text>
          </>
        )}
      </Text>

      <View style={styles.timerCard}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Text style={styles.timer}>{formatClock(remainingMs)}</Text>
          </View>
        </View>

        {isFocusing ? (
          <>
            <Pressable
              onPress={handleEnd}
              disabled={busy}
              style={[styles.start, busy && styles.startBusy]}
            >
              <Text style={styles.startLabel}>End focus</Text>
            </Pressable>
            <Text style={styles.status}>In focus</Text>
            {!enforced ? (
              <Text style={styles.note}>Apps aren’t blocked on this device</Text>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.presets}>
              {QUICK_PRESETS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMinutes(value)}
                  style={[styles.preset, minutes === value && styles.presetActive]}
                >
                  <Text style={[styles.presetLabel, minutes === value && styles.presetLabelActive]}>
                    {durationLabel(value)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.steppers}>
              <Stepper value={hours} unit="h" onMinus={() => adjust(-60)} onPlus={() => adjust(60)} />
              <Stepper value={mins} unit="m" onMinus={() => adjust(-5)} onPlus={() => adjust(5)} />
            </View>

            <Pressable
              onPress={handleStart}
              disabled={busy}
              style={[styles.start, busy && styles.startBusy]}
            >
              <Text style={styles.startLabel}>Start {durationLabel(minutes)}</Text>
            </Pressable>
            <Text style={styles.status}>Tap to begin</Text>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {activeBots.map(({ bot, session }) => {
        const elapsed = Math.max(session.elapsedMin, Math.floor((nowMs - toMs(session.startedAt)) / 60_000));
        return (
          <View key={bot.id} style={styles.row}>
            <PacerAvatar size={36} color={bot.color} glyph={bot.glyph} />
            <View style={{ flex: 1 }}>
              <Text style={styles.member}>
                {bot.name}
                <Text style={[styles.pacerTag, { color: bot.color }]}> · {bot.tag}</Text>
              </Text>
              <Text style={styles.meta}>{elapsed} min in</Text>
            </View>
            <Text style={styles.focus}>Focus</Text>
          </View>
        );
      })}

      {roomMembers.map((member) => {
        const elapsed = Math.max(member.elapsedMin, Math.floor((nowMs - toMs(member.startedAt)) / 60_000));
        return (
          <View key={member.sessionId} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: member.tone }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.member}>{member.displayName}</Text>
              <Text style={styles.meta}>{elapsed} min in</Text>
            </View>
            <Text style={styles.focus}>Focus</Text>
          </View>
        );
      })}

      {roomMembers.length === 0 && activeBots.length === 0 ? (
        <Text style={styles.empty}>No one else is focusing right now.</Text>
      ) : null}
    </>
  );
}

export default function FocusScreen() {
  return (
    <Screen edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <FocusContent />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24, gap: 10 },
  eyebrow: { color: palette.textMute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },
  title: { color: palette.text, fontSize: 39, fontWeight: '700', lineHeight: 43, marginBottom: 6 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  timerCard: { borderWidth: 1, borderColor: palette.brass, backgroundColor: palette.brassSoft, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 14, alignItems: 'center' },
  ringOuter: { width: 200, height: 200, borderRadius: 99, borderWidth: 1, borderColor: palette.brass, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 140, height: 140, borderRadius: 99, borderWidth: 1, borderColor: palette.brass, alignItems: 'center', justifyContent: 'center' },
  timer: { color: palette.text, fontSize: 38, fontWeight: '700' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: palette.brass, backgroundColor: palette.surface },
  presetActive: { backgroundColor: palette.brass },
  presetLabel: { color: palette.brass, fontWeight: '700', fontSize: 15 },
  presetLabelActive: { color: palette.bg },
  steppers: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: palette.line, borderRadius: 99, backgroundColor: palette.surface, paddingHorizontal: 8, paddingVertical: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  stepBtnLabel: { color: palette.brass, fontSize: 24, fontWeight: '700', lineHeight: 26 },
  stepValue: { color: palette.text, fontSize: 20, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  stepUnit: { color: palette.textMute, fontSize: 14, fontWeight: '700' },
  start: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 99, backgroundColor: palette.brass },
  startBusy: { opacity: 0.5 },
  startLabel: { color: palette.bg, fontWeight: '700' },
  status: { color: palette.textMute, marginTop: 8, fontSize: 14, textTransform: 'uppercase' },
  note: { color: palette.textMute, marginTop: 4, fontSize: 13 },
  error: { color: palette.danger, marginTop: 8, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 12, gap: 10 },
  dot: { width: 36, height: 36, borderRadius: 99 },
  member: { color: palette.text, fontSize: 16 },
  pacerTag: { fontSize: 14 },
  meta: { color: palette.textMute, fontSize: 13 },
  focus: { color: palette.green, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2 },
  empty: { color: palette.textMute, fontSize: 14, textAlign: 'center', marginTop: 8 },
});
