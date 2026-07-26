// Legacy shape for old local snapshots created before Screen Time became the
// only app-selection path. New selections come from Apple's Screen Time picker.
export type DiscoveredApp = {
  id: string;
  name: string;
  group?: string;
  glyph?: string;
};

export const websiteBlocklist = [
  'tiktok.com',
  'www.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'x.com',
  'twitter.com',
  'www.twitter.com',
  'reddit.com',
  'www.reddit.com',
  'youtube.com',
  'www.youtube.com',
  'facebook.com',
  'www.facebook.com',
  'pinterest.com',
  'www.pinterest.com',
];
