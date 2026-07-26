import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/src/components/Screen';
import { useThemePreference } from '@/src/state/theme';

type MaterialIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type SettingsScaffoldProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string | null;
  children: React.ReactNode;
};

export function SettingsScaffold({
  title,
  eyebrow = 'Settings',
  subtitle,
  children,
}: SettingsScaffoldProps) {
  const router = useRouter();
  const { colors } = useThemePreference();
  const styles = createStyles(colors);

  return (
    <Screen edges={['top']} style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textMute} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.meta}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </Screen>
  );
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useThemePreference();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function SettingsNavRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: MaterialIcon;
  label: string;
  value?: string | null;
  onPress: () => void;
}) {
  const { colors } = useThemePreference();
  const styles = createStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.navRow}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons name={icon} size={19} color={colors.brass} />
        <Text style={styles.linkLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMute} />
      </View>
    </Pressable>
  );
}

export function SettingsInfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useThemePreference();
  const styles = createStyles(colors);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function SettingsActionRow({
  icon,
  label,
  danger = false,
  disabled = false,
  onPress,
}: {
  icon: MaterialIcon;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemePreference();
  const styles = createStyles(colors);
  const color = danger ? colors.danger : colors.brass;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.actionRow, disabled && styles.disabled]}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsNote({ children }: { children: React.ReactNode }) {
  const { colors } = useThemePreference();
  const styles = createStyles(colors);

  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

export function useSettingsColors() {
  return useThemePreference().colors;
}

function createStyles(colors: ReturnType<typeof useThemePreference>['colors']) {
  return StyleSheet.create({
    content: { padding: 20, paddingBottom: 32, gap: 10 },
    back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4 },
    backLabel: { color: colors.textMute, fontSize: 15 },
    eyebrow: { color: colors.textMute, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
    title: { color: colors.text, fontSize: 34, fontWeight: '700' },
    meta: { color: colors.brass, fontSize: 13, letterSpacing: 1, marginBottom: 8 },
    section: { gap: 8, marginTop: 14 },
    sectionTitle: { color: colors.textMute, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.4 },
    sectionBody: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      overflow: 'hidden',
    },
    navRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      gap: 12,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: 1 },
    rowLabel: { color: colors.textSoft, fontSize: 16 },
    linkLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
    rowValue: { color: colors.textMute, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    actionLabel: { fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    note: { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
    noteText: { color: colors.textMute, fontSize: 13, lineHeight: 19 },
  });
}
