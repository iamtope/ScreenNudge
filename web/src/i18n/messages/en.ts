/**
 * English — the source dictionary.
 *
 * Text wrapped in *asterisks* is rendered as an italic brass accent (see <Rich/>).
 * Tokens like {ios} and {year} are substituted at render time.
 *
 * This is the shape every other language mirrors. Other locale files only need to
 * override the keys they translate; anything omitted falls back to this English.
 */
export const en = {
  nav: { about: 'About', faq: 'FAQ', contact: 'Contact', cta: 'Get ScreenNudge' },

  a11y: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    chooseLanguage: 'Choose language',
    home: 'ScreenNudge — home',
  },

  home: {
    hero: {
      eyebrow: 'Screen time, without the willpower',
      title: 'Put a breath between you and the *scroll*.',
      subhead:
        'ScreenNudge guards the apps that distract you, then gives you one calm moment to choose again — backed by a circle of friends who make it stick.',
      ctaPrimary: 'Get ScreenNudge for iPhone',
      ctaSecondary: 'See how it works',
      tags: ['The pause', 'Wind-Down', 'The circle', 'Insights'],
    },
    problem: {
      eyebrow: 'The three-second reach',
      title: 'You just wanted to check *one thing*.',
      body: 'Then twenty minutes were gone. These apps are engineered to keep you scrolling, so willpower alone was never a fair fight. ScreenNudge changes the moment you reach — not just the number at the end of the day.',
    },
    how: {
      eyebrow: 'How it works',
      title: 'Four steps, one calmer *habit*.',
      steps: [
        {
          title: 'Guard the apps',
          body: 'Pick the apps that distract you. ScreenNudge protects them with Apple Screen Time — nothing ever leaves your device.',
        },
        {
          title: 'Hit the pause',
          body: 'Reach for a guarded app and ScreenNudge steps in first: breathe, take a few steps, wait it out, or answer a quick prompt.',
        },
        {
          title: 'Choose again',
          body: 'Still want it? Open anyway. Changed your mind? Stay off and bank the win. Either way it was your call — not a reflex.',
        },
        {
          title: 'Earn your place',
          body: "Every resist and every focused minute earns points in your circle's weekly race. Progress you can actually feel.",
        },
      ],
    },
    features: {
      eyebrow: 'What you get',
      title: 'One calm system for the apps that *never let go*.',
      items: [
        {
          name: 'The pause',
          body: 'Breathe, step, wait, or solve a quick challenge before a guarded app opens. Gentle, balanced, or strong — you set the resistance.',
        },
        {
          name: 'Wind-Down',
          body: "Guarded apps block themselves at bedtime, so the night doesn't vanish into a feed. Set it once.",
        },
        {
          name: 'The circle',
          body: 'A small, private group of friends. Resist urges and stack focus minutes to climb a friendly weekly leaderboard.',
        },
        {
          name: 'Focus room',
          body: 'Start a timer and your guarded apps lock for the session. See who else in your circle is heads-down right now.',
        },
        {
          name: 'Attention insights',
          body: "Your resist rate, your peak-pressure hours, and the real time you've won back — week over week.",
        },
        {
          name: 'Pacers',
          body: 'Flying solo? Friendly pacer profiles keep the leaderboard and focus room alive until your friends arrive.',
        },
      ],
    },
    circle: {
      eyebrow: 'Better together',
      title: 'Willpower is easier as a *team sport*.',
      body: "Alone, it's you against an infinite feed. With a circle, every resisted urge and focused minute becomes points on a leaderboard your friends can see. A little friendly pressure goes a long way — and no one ever sees which apps you guard.",
    },
    insights: {
      eyebrow: 'See the pattern',
      title: 'Know what your *attention* is doing.',
      body: 'ScreenNudge turns each pause into a quiet data point: how often you reached, how often you came back, when the pressure peaks, and the hours you reclaimed. Clarity, not guilt.',
    },
    privacy: {
      eyebrow: 'Yours, and only yours',
      title: 'Private by *design*.',
      points: [
        'App protection runs on-device through Apple Screen Time. ScreenNudge never sees your messages, your browsing, or the content inside your apps.',
        "We don't sell or rent your data. Ever.",
        'Your circle sees your points and live focus status — never which apps you guard or what you do in them.',
      ],
    },
    mission: {
      eyebrow: 'Why we built ScreenNudge',
      title: 'We wanted our evenings *back*.',
      // TODO: personalise this with your own founder story.
      body: 'ScreenNudge began as a personal fix for a familiar problem: reaching for the phone on reflex and losing hours we meant to spend elsewhere. Hard blockers felt like punishment; doing nothing felt like giving up. So we built the gentle in-between — one honest pause, plus the friends who want you to win.',
    },
    cta: {
      title: 'Come back before the scroll *takes over*.',
      subhead: 'ScreenNudge is built for iPhone, and free to start.',
      button: 'Get ScreenNudge for iPhone',
      soon: 'Coming soon to the App Store.',
      requirement: 'Requires iOS {ios} or later.',
    },
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Questions, *answered*.',
    subhead:
      'Everything worth knowing before you start. Still stuck? The Contact page is one tap away.',
    items: [
      {
        q: 'What is ScreenNudge?',
        a: 'ScreenNudge is a screen-time app for iPhone that puts one calm pause between you and the apps that distract you. Instead of a hard block, you get a moment to breathe and choose — plus a circle of friends who turn staying off into a friendly game.',
      },
      {
        q: 'How is that different from just blocking an app?',
        a: "Hard blocks are easy to resent and easy to switch off. ScreenNudge adds friction at the exact moment you reach — a breath, a few steps, a short wait — so opening becomes a real choice instead of a reflex. You can always open anyway; most of the time you'll find you don't want to.",
      },
      {
        q: 'Does ScreenNudge actually block apps?',
        a: "Yes. ScreenNudge uses Apple's Screen Time (Family Controls) to shield your guarded apps, and can block them completely during Wind-Down or a Focus session. Everything runs on your own device.",
      },
      {
        q: 'Which apps can I guard, and how many?',
        a: 'Any app you choose. The free version guards up to two apps; ScreenNudge+ makes it unlimited.',
      },
      {
        q: 'What is the “circle”?',
        a: 'Your circle is a small, private group of friends. You each earn points for resisting urges and for focused minutes, and you climb a shared weekly leaderboard. You can hide anyone at any time, and no one ever sees which apps you guard.',
      },
      {
        q: 'Can I use ScreenNudge on my own?',
        a: "Absolutely. Friendly “pacer” profiles keep the leaderboard and focus room active so solo users still feel a little healthy pressure, and you can invite friends whenever you're ready.",
      },
      {
        q: 'Is my data private?',
        a: "Yes. App protection runs on-device through Screen Time — ScreenNudge never sees your messages, browsing, or the content inside your apps. We don't sell your data, and your circle only ever sees your points and live focus status.",
      },
      {
        q: 'What is Wind-Down?',
        a: "Wind-Down automatically blocks your guarded apps during the hours you set — usually bedtime — so late-night scrolling stops before it starts. It's part of ScreenNudge+.",
      },
      {
        q: 'What does it cost?',
        a: 'ScreenNudge is free to start, including the pause and a two-app guard. ScreenNudge+ unlocks unlimited guarded apps, Wind-Down, advanced insights, and custom intercepts. You can see current pricing in the App Store and inside the app.',
      },
      {
        q: 'Does ScreenNudge work on Android?',
        a: "ScreenNudge is currently built for iPhone (iOS 16.4 and later), because it relies on Apple's Screen Time, which has no direct Android equivalent. Android interest is noted — tell us on the Contact page.",
      },
      {
        q: 'How do I manage or cancel ScreenNudge+?',
        a: 'ScreenNudge+ is billed through your Apple ID. You can manage or cancel it anytime in iPhone Settings → your name → Subscriptions.',
      },
      {
        q: 'How do I get help or send feedback?',
        a: "We'd genuinely love to hear from you — use the Contact page or email us directly. We read everything.",
      },
    ],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Say *hello*.',
    subhead: 'Questions, feedback, press, or partnerships — we read every message.',
    emailHeading: 'Email us directly',
    responseNote: 'We usually reply within a couple of days.',
    faqHeading: 'Looking for a quick answer?',
    faqLink: 'Browse the FAQ',
    form: {
      name: 'Your name',
      email: 'Your email',
      subject: 'Subject',
      message: 'Message',
      send: 'Send message',
      hint: 'This opens your email app with the message ready to send.',
      subjectDefault: 'Hello ScreenNudge',
    },
  },

  footer: {
    tagline: 'Come back before the scroll takes over.',
    builtFor: 'Built for iPhone · iOS {ios}+',
    rights: '© {year} ScreenNudge. All rights reserved.',
    sectionsLabel: 'Pages',
    legalNote:
      'ScreenNudge is not affiliated with Apple Inc. Apple, iPhone, and Screen Time are trademarks of Apple Inc.',
  },
};

export type Dictionary = typeof en;
