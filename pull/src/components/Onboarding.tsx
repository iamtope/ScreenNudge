import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/src/theme/palette';
import { SCREEN_TOP_GAP } from '@/src/components/Screen';

export const ONBOARDING_STEPS = [
  'questions',
  'select-apps',
  'limits',
  'protection-style',
  'plan',
  'activate',
  'circle',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function stepNumber(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function ProgressBar({ step }: { step: OnboardingStep }) {
  const current = stepNumber(step);
  const pct = (current / TOTAL_STEPS) * 100;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        Step {current} of {TOTAL_STEPS}
      </Text>
    </View>
  );
}

type ScaffoldProps = {
  step?: OnboardingStep;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
};

export function OnboardingScaffold({
  step,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: ScaffoldProps) {
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { style: styles.body, contentContainerStyle: styles.bodyContent, showsVerticalScrollIndicator: false }
    : { style: [styles.body, styles.bodyContent] };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {step ? <ProgressBar step={step} /> : null}
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Body {...(bodyProps as any)}>{children}</Body>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <Text style={styles.accent}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        disabled && styles.primaryDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondary, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: ButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

export type DropdownOption = { label: string; value: string };

export function Dropdown({
  value,
  options,
  onSelect,
  placeholder = 'Select',
}: {
  value: string | null;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.dropdown}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.dropdownField}>
        <Text style={[styles.dropdownValue, !selected && styles.dropdownPlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.dropdownChevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                >
                  <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                    {option.label}
                  </Text>
                  {active ? <Text style={styles.dropdownCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function EditLaterNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 20 },
  header: { paddingTop: SCREEN_TOP_GAP, gap: 4 },
  eyebrow: {
    color: palette.brass,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
  },
  title: { color: palette.text, fontSize: 34, lineHeight: 39, fontWeight: '700', marginTop: 8 },
  accent: { color: palette.brass, fontStyle: 'italic' },
  subtitle: { color: palette.textSoft, marginTop: 10, fontSize: 16, lineHeight: 22 },
  body: { flex: 1, marginTop: 14 },
  bodyContent: { paddingBottom: 16, gap: 12 },
  footer: { paddingTop: 8, paddingBottom: 6, gap: 8 },
  progressWrap: { gap: 6, marginBottom: 2 },
  progressTrack: { height: 4, borderRadius: 99, backgroundColor: palette.surface2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 99, backgroundColor: palette.brass },
  progressLabel: { color: palette.textMute, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  primary: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: palette.brass },
  primaryDisabled: { opacity: 0.35 },
  primaryLabel: { color: palette.bg, fontWeight: '700', fontSize: 17 },
  secondary: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  secondaryLabel: { color: palette.text, fontWeight: '600', fontSize: 16 },
  ghost: { paddingVertical: 13, alignItems: 'center' },
  ghostLabel: { color: palette.textMute, fontSize: 15 },
  pressed: { opacity: 0.85 },
  note: { backgroundColor: palette.brassSoft, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  noteText: { color: palette.textSoft, fontSize: 14, lineHeight: 19 },
  dropdown: { position: 'relative' },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 120,
  },
  dropdownValue: { color: palette.text, fontSize: 17, fontWeight: '700' },
  dropdownPlaceholder: { color: palette.textMute, fontWeight: '500' },
  dropdownChevron: { color: palette.textMute, fontSize: 15, marginLeft: 10 },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 196 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  dropdownItemActive: { backgroundColor: palette.brassSoft },
  dropdownItemText: { color: palette.textSoft, fontSize: 16 },
  dropdownItemTextActive: { color: palette.brass, fontWeight: '700' },
  dropdownCheck: { color: palette.brass, fontSize: 15, fontWeight: '800' },
});
