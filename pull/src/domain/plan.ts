import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Free accounts guard up to this many apps; Pull+ is unlimited. */
export const FREE_GUARDED_APP_LIMIT = 2;

export type PlanFeature = {
  icon: Glyph;
  label: string;
  /** Short cell value for the Free column ('' = not included). */
  free: string;
  /** Short cell value for the Pull+ column. */
  plus: string;
};

/** The Pull vs Pull+ differentiator, shared by the home card, paywall, and onboarding. */
export const PLUS_FEATURES: PlanFeature[] = [
  { icon: 'cellphone-lock', label: 'Guarded apps', free: 'Up to 2', plus: 'Unlimited' },
  { icon: 'weather-night', label: 'Wind-Down (bedtime) blocking', free: '', plus: 'Yes' },
  { icon: 'chart-timeline-variant', label: 'Insights', free: 'Basic', plus: 'Advanced' },
  { icon: 'meditation', label: 'Custom intercepts & breathing', free: '', plus: 'Yes' },
  { icon: 'hand-heart', label: 'Priority rescues', free: '', plus: 'Yes' },
];
