import { DynamicColorIOS, Platform } from 'react-native';

function dynamicColor(light: string, dark: string): string {
  if (Platform.OS !== 'ios') {
    return dark;
  }
  return DynamicColorIOS({ light, dark }) as unknown as string;
}

export const darkPalette = {
  bg: '#0b0b11',
  surface: '#16161f',
  surface2: '#20202c',
  line: '#2c2c3d',
  text: '#f5f5ff',
  textMute: '#8b8b95',
  textSoft: '#b1b1bc',
  brass: '#d7c18e',
  brassSoft: 'rgba(215, 193, 142, 0.08)',
  green: '#57b98a',
  rose: '#e0738f',
  danger: '#d46a6a',
} as const;

export type Palette = Record<keyof typeof darkPalette, string>;

export const lightPalette: Palette = {
  bg: '#f4f1e9',
  surface: '#ffffff',
  surface2: '#ece4d4',
  line: '#d6cbb4',
  text: '#1a1712',
  textMute: '#6e6757',
  textSoft: '#544f45',
  brass: '#8a6a28',
  brassSoft: 'rgba(138, 106, 40, 0.12)',
  green: '#2f7d57',
  rose: '#b14e68',
  danger: '#b54a4a',
};

export const palette: Palette = {
  bg: dynamicColor(lightPalette.bg, darkPalette.bg),
  surface: dynamicColor(lightPalette.surface, darkPalette.surface),
  surface2: dynamicColor(lightPalette.surface2, darkPalette.surface2),
  line: dynamicColor(lightPalette.line, darkPalette.line),
  text: dynamicColor(lightPalette.text, darkPalette.text),
  textMute: dynamicColor(lightPalette.textMute, darkPalette.textMute),
  textSoft: dynamicColor(lightPalette.textSoft, darkPalette.textSoft),
  brass: dynamicColor(lightPalette.brass, darkPalette.brass),
  brassSoft: dynamicColor(lightPalette.brassSoft, darkPalette.brassSoft),
  green: dynamicColor(lightPalette.green, darkPalette.green),
  rose: dynamicColor(lightPalette.rose, darkPalette.rose),
  danger: dynamicColor(lightPalette.danger, darkPalette.danger),
};
