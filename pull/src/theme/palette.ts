import { DynamicColorIOS, Platform } from 'react-native';

function dynamicColor(light: string, dark: string): string {
  if (Platform.OS !== 'ios') {
    return dark;
  }
  return DynamicColorIOS({ light, dark }) as unknown as string;
}

export const darkPalette = {
  // Neutrals — lifted off true black so cards read on LCD / in bright light and
  // the mood stays calm rather than high-drama. Consistent blue-violet undertone
  // (blue channel always highest); even elevation ramp bg → surface → surface2.
  bg: '#0b0b11',
  surface: '#16161f',
  surface2: '#20202c',
  line: '#2c2c3d',
  text: '#f5f5ff',
  textMute: '#8b8b95',
  textSoft: '#b1b1bc',
  // Warm brand accent — reserve for the single primary action per screen.
  brass: '#d7c18e',
  brassSoft: 'rgba(215, 193, 142, 0.08)',
  // Secondaries, slightly muted to sit with the editorial brass + neutrals.
  green: '#57b98a', // success / "focusing now" (live)
  rose: '#e0738f',
  // Semantic token — one source of truth for destructive actions / errors.
  danger: '#d46a6a',
} as const;

export type Palette = Record<keyof typeof darkPalette, string>;

export const lightPalette: Palette = {
  // Warm paper neutrals. Raised surfaces go lighter (toward white); recessed /
  // selected go a touch darker — the inverse of the dark ramp, but same logic.
  bg: '#f4f1e9',
  surface: '#ffffff',
  surface2: '#ece4d4',
  line: '#d6cbb4',
  text: '#1a1712',
  // Darkened from the old values so 10–13px labels clear AA contrast on paper.
  textMute: '#6e6757',
  textSoft: '#544f45',
  // The dark-mode gold (#d7c18e) is invisible on light — use a rich antique gold
  // that reads as both accent text and a solid button fill on white/cream.
  brass: '#8a6a28',
  brassSoft: 'rgba(138, 106, 40, 0.12)',
  // Secondaries deepened for contrast on light surfaces.
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
