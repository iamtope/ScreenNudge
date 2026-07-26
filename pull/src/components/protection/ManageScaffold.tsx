import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { palette } from '@/src/theme/palette';

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  step?: number;
  totalSteps?: number;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  onBack?: () => void;
};

export function ManageScaffold({
  title,
  subtitle,
  step,
  totalSteps,
  children,
  footer,
  scroll = true,
  onBack,
}: Props) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { style: styles.body, contentContainerStyle: styles.bodyContent, showsVerticalScrollIndicator: false }
    : { style: [styles.body, styles.bodyContent] };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {step && totalSteps ? (
          <Text style={styles.stepLabel}>
            Step {step} of {totalSteps}
          </Text>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>

      {step && totalSteps ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <Body {...(bodyProps as object)}>{children}</Body>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <Text style={styles.accent}>{children}</Text>;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  back: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  backText: { color: palette.textMute, fontSize: 14 },
  backSpacer: { width: 52 },
  stepLabel: { color: palette.textMute, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  progressTrack: {
    height: 4,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 99,
    backgroundColor: palette.surface2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 99, backgroundColor: palette.brass },
  header: { paddingHorizontal: 20, gap: 8 },
  title: { color: palette.text, fontSize: 34, lineHeight: 39, fontWeight: '700' },
  accent: { color: palette.brass, fontStyle: 'italic' },
  subtitle: { color: palette.textSoft, fontSize: 16, lineHeight: 22 },
  body: { flex: 1, marginTop: 14 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6, gap: 8 },
});
