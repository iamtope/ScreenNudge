import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScaffold, Accent, PrimaryButton, GhostButton } from '@/src/components/Onboarding';
import { personalizationQuestions } from '@/src/domain/onboarding';
import { useOnboarding } from '@/src/state/onboarding';
import { palette } from '@/src/theme/palette';

export default function QuestionsScreen() {
  const router = useRouter();
  const { answers, setAnswer } = useOnboarding();

  const answered = personalizationQuestions.filter((q) => answers[q.id]).length;
  const allAnswered = answered === personalizationQuestions.length;

  return (
    <OnboardingScaffold
      step="questions"
      title={
        <Text>
          A few things about <Accent>your scrolling.</Accent>
        </Text>
      }
      subtitle="Answer these so Pull can personalize your protection. You can change anything later."
      footer={
        <>
          <PrimaryButton
            label={allAnswered ? 'Continue' : `Answer all ${personalizationQuestions.length}`}
            onPress={() => router.push('/onboarding/select-apps')}
            disabled={!allAnswered}
          />
          <GhostButton label="Back" onPress={() => router.back()} />
        </>
      }
    >
      {personalizationQuestions.map((question, index) => {
        const selected = answers[question.id];
        return (
          <View key={question.id} style={styles.block}>
            <Text style={styles.prompt}>
              <Text style={styles.number}>{index + 1}. </Text>
              {question.prompt}
            </Text>
            <View style={styles.options}>
              {question.options.map((option) => {
                const active = selected === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAnswer(question.id, option.id)}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
                    <View style={[styles.radio, active && styles.radioActive]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, marginBottom: 8 },
  prompt: { color: palette.text, fontSize: 19, fontWeight: '700', lineHeight: 25 },
  number: { color: palette.brass },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  optionActive: { borderColor: palette.brass, backgroundColor: palette.brassSoft },
  optionLabel: { color: palette.textSoft, fontSize: 17, fontWeight: '600' },
  optionLabelActive: { color: palette.text },
  radio: { width: 18, height: 18, borderRadius: 99, borderWidth: 1, borderColor: palette.textMute },
  radioActive: { backgroundColor: palette.brass, borderColor: palette.brass },
});
