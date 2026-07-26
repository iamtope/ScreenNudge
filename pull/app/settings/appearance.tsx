import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  SettingsNote,
  SettingsScaffold,
  SettingsSection,
  useSettingsColors,
} from '@/src/components/settings/SettingsScaffold';
import {
  themePreferenceLabel,
  useThemePreference,
} from '@/src/state/theme';
import type { ThemePreference } from '@/src/lib/storage';

const OPTIONS: Array<{
  value: ThemePreference;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}> = [
  {
    value: 'system',
    title: 'System',
    body: 'Follow your iPhone appearance setting.',
    icon: 'theme-light-dark',
  },
  {
    value: 'light',
    title: 'Light',
    body: 'Use a bright interface in Pull.',
    icon: 'white-balance-sunny',
  },
  {
    value: 'dark',
    title: 'Dark',
    body: 'Use the calmer dark interface.',
    icon: 'moon-waning-crescent',
  },
];

export default function AppearanceSettingsScreen() {
  const colors = useSettingsColors();
  const styles = createStyles(colors);
  const { preference, effectiveScheme, setPreference } = useThemePreference();

  return (
    <SettingsScaffold
      title="Theme"
      subtitle={`${themePreferenceLabel(preference)} · currently ${effectiveScheme}`}
    >
      <SettingsSection title="Appearance">
        {OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => void setPreference(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <MaterialCommunityIcons name={option.icon} size={20} color={selected ? colors.brass : colors.textMute} />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionBody}>{option.body}</Text>
              </View>
              {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.brass} /> : null}
            </Pressable>
          );
        })}
        <SettingsNote>
          System is the default. Light and Dark override the app appearance until you change it back.
        </SettingsNote>
      </SettingsSection>
    </SettingsScaffold>
  );
}

function createStyles(colors: ReturnType<typeof useSettingsColors>) {
  return StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    optionSelected: { backgroundColor: colors.brassSoft },
    optionCopy: { flex: 1 },
    optionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    optionBody: { color: colors.textMute, fontSize: 14, marginTop: 2 },
  });
}
