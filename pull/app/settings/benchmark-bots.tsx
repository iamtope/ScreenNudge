import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PacerAvatar } from '@/src/components/PacerAvatar';
import {
  SettingsNote,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import { PACER_BOTS } from '@/src/domain/pacer';
import { usePacer } from '@/src/state/pacer';

export default function BenchmarkBotsSettingsScreen() {
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const { enabled, setEnabled } = usePacer();

  return (
    <SettingsScaffold title="Benchmark bots">
      <SettingsSection title="Visibility">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Show bots</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.line, true: colors.brass }}
            thumbColor={colors.text}
          />
        </View>
        <SettingsNote>
          Pacer and Rival are disclosed automated benchmarks, not real people. They keep the
          leaderboard and focus room from being empty and disappear the moment you turn them off.
        </SettingsNote>
      </SettingsSection>

      <SettingsSection title="Bots">
        {PACER_BOTS.map((bot) => (
          <View key={bot.id} style={styles.botRow}>
            <PacerAvatar size={32} color={bot.color} glyph={bot.glyph} />
            <View style={styles.botCopy}>
              <Text style={styles.botName}>{bot.name}</Text>
              <Text style={styles.botMeta}>{bot.tag}</Text>
            </View>
          </View>
        ))}
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      gap: 12,
    },
    rowLabel: { color: colors.textSoft, fontSize: 16 },
    botRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    botCopy: { flex: 1 },
    botName: { color: colors.text, fontSize: 16, fontWeight: '700' },
    botMeta: { color: colors.textMute, fontSize: 14, marginTop: 2 },
  });
}
