import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { palette } from '@/src/theme/palette';

export const SCREEN_TOP_GAP = 16;

type ScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  innerStyle?: ViewStyle;
};

export function Screen({ children, edges = ['top', 'bottom'], style, innerStyle }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.inner, innerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  inner: { flex: 1, paddingTop: SCREEN_TOP_GAP },
});
