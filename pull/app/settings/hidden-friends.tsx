import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PacerAvatar } from '@/src/components/PacerAvatar';
import {
  SettingsInfoRow,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import { PACER_BOTS } from '@/src/domain/pacer';
import { useHiddenMembers } from '@/src/state/hiddenMembers';
import { useSession } from '@/src/state/session';

export default function HiddenFriendsSettingsScreen() {
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const { circle } = useSession();
  const { hidden, unhide } = useHiddenMembers();

  const membersById = new Map((circle?.members ?? []).map((m) => [m.id, m]));
  const botsById = new Map(PACER_BOTS.map((b) => [b.id, b]));
  const hiddenList = [...hidden].map((id) => {
    const member = membersById.get(id);
    if (member) {
      return { id, name: member.displayName, initial: member.initial, tone: member.tone, bot: null };
    }
    const bot = botsById.get(id);
    if (bot) {
      return { id, name: bot.name, initial: bot.name.charAt(0).toUpperCase(), tone: bot.color, bot };
    }
    return { id, name: 'Former member', initial: '?', tone: colors.line, bot: null };
  });

  return (
    <SettingsScaffold title="Hidden friends">
      <SettingsSection title="Leaderboard">
        {hiddenList.length === 0 ? (
          <SettingsInfoRow label="No one hidden" value="Long-press on Circle" />
        ) : (
          hiddenList.map((h) => (
            <View key={h.id} style={styles.hiddenRow}>
              {h.bot ? (
                <PacerAvatar size={28} color={h.bot.color} glyph={h.bot.glyph} />
              ) : (
                <View style={[styles.hiddenAvatar, { backgroundColor: h.tone }]}>
                  <Text style={styles.hiddenAvatarText}>{h.initial}</Text>
                </View>
              )}
              <Text style={styles.hiddenName} numberOfLines={1}>
                {h.name}
                {h.bot ? ` · ${h.bot.tag}` : ''}
              </Text>
              <Pressable
                onPress={() => unhide(h.id)}
                hitSlop={8}
                style={styles.unhideBtn}
                accessibilityRole="button"
                accessibilityLabel={`Unhide ${h.name}`}
              >
                <MaterialCommunityIcons name="eye-outline" size={16} color={colors.brass} />
                <Text style={styles.unhideLabel}>Unhide</Text>
              </Pressable>
            </View>
          ))
        )}
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    hiddenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    hiddenAvatar: { width: 28, height: 28, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
    hiddenAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    hiddenName: { color: colors.textSoft, fontSize: 16, flex: 1 },
    unhideBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
    unhideLabel: { color: colors.brass, fontSize: 15, fontWeight: '700' },
  });
}
