import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

type Glyph = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const FREE_GUARDED_APP_LIMIT = 2;

export type PlanFeature = {
  icon: Glyph;
  label: string;
  free: string;
  plus: string;
  /** One line of why it matters. Used on the paywall, where a table row is not enough. */
  blurb: string;
};

export const PLUS_FEATURES: PlanFeature[] = [
  {
    icon: 'cellphone-lock',
    label: 'Guard every app',
    free: 'Up to 2',
    plus: 'Unlimited',
    blurb: 'Free lets you protect two apps. Upgrade to protect every app that competes for your attention.',
  },
  {
    icon: 'weather-night',
    label: 'Wind-Down',
    free: '',
    plus: 'Yes',
    blurb: 'Your apps block themselves at bedtime, so the night stops disappearing into a feed.',
  },
  {
    icon: 'chart-timeline-variant',
    label: 'Deeper insights',
    free: 'Basic',
    plus: 'Advanced',
    blurb: `Track the time you've reclaimed and uncover your scrolling habits.`,
  },
  {
    icon: 'meditation',
    label: 'Custom pauses',
    free: '',
    plus: 'Yes',
    blurb: 'Tune the breathing, the delay and the challenge until the pause actually stops you.',
  },
];
