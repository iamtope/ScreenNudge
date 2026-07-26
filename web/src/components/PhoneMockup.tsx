import type { CSSProperties } from 'react';

/* Device screens intentionally keep the app's own committed palette (dark/light),
   independent of the site theme — they represent a real iPhone screen. Screen copy
   stays in English to mirror the shipping app UI. */

function StatusBar() {
  return (
    <div className="screen__status">
      <span>9:41</span>
      <span className="icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.4-1.5A11 11 0 0 0 8 0 11 11 0 0 0 .4 3.2l1.4 1.5A8.7 8.7 0 0 1 8 2.2Z" />
          <path d="M8 6c1.3 0 2.5.5 3.4 1.4l1.4-1.5A7 7 0 0 0 8 3.9a7 7 0 0 0-4.8 2l1.4 1.5A4.8 4.8 0 0 1 8 6Z" />
          <circle cx="8" cy="10" r="1.8" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".5" />
          <rect x="2" y="2" width="16.5" height="8" rx="1.6" fill="currentColor" />
          <rect x="23" y="3.5" width="1.6" height="5" rx="0.8" fill="currentColor" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}

const s = (styles: CSSProperties) => styles;
const mockBtn = s({ width: '100%', background: 'var(--s-brass)', color: 'var(--s-bg)', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 99, textAlign: 'center' });

function PauseScreen() {
  return (
    <div className="screen screen--dark">
      <div className="screen__island" />
      <StatusBar />
      <div className="screen__body">
        <div className="pm-rowbetween">
          <span className="pm-eyebrow brass">Second attempt</span>
          <span style={{ color: 'var(--s-mute)', fontSize: 11, letterSpacing: 1 }}>2 / 3</span>
        </div>
        <span className="pm-eyebrow">Balanced · Breathe</span>
        <h3 className="pm-title">
          Unlock <em>Instagram?</em>
        </h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ color: 'var(--s-soft)', fontSize: 12.5, textAlign: 'center', maxWidth: '22ch' }}>
            Breathe with the circle. Let the urge settle.
          </p>
          <div className="pm-breathe">
            <span>4</span>
          </div>
        </div>
        <div style={mockBtn}>Breathe… 4s</div>
        <p style={{ margin: '2px auto 0', color: 'var(--s-mute)', fontSize: 12, textDecoration: 'underline' }}>I&apos;ll stay off</p>
      </div>
    </div>
  );
}

type Row = { rank: string; rankColor: string; initial: string; avatar: string; name: string; you?: boolean; pacer?: boolean; live?: boolean; meta?: string; pts: number; fill: number };

const circleRows: Row[] = [
  { rank: '♛', rankColor: 'var(--s-brass)', initial: 'M', avatar: '#c96f8a', name: 'Maya', live: true, pts: 312, fill: 100 },
  { rank: '🥈', rankColor: '#c7ccd6', initial: 'A', avatar: '#7a8a9a', name: 'Alex', you: true, meta: '5 resists · 3h 20m', pts: 287, fill: 92 },
  { rank: '🥉', rankColor: '#cd9b6a', initial: 'S', avatar: '#5a8f7b', name: 'Sam', meta: '3 resists · 2h 45m', pts: 240, fill: 77 },
  { rank: '4', rankColor: 'var(--s-mute)', initial: '✦', avatar: 'rgba(215,193,142,.18)', name: 'Nova', pacer: true, meta: '2 resists · 2h 10m', pts: 198, fill: 63 },
];

function CircleScreen() {
  return (
    <div className="screen screen--dark">
      <div className="screen__island" />
      <StatusBar />
      <div className="screen__body">
        <span className="pm-eyebrow">Your circle</span>
        <h3 className="pm-title">
          The race <em>this week.</em>
        </h3>
        <div style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
          {['Today', 'This week', 'All'].map((t) => (
            <span
              key={t}
              style={{
                flex: 1, textAlign: 'center', fontSize: 11.5, padding: 7, borderRadius: 99,
                border: '1px solid var(--s-line)',
                color: t === 'This week' ? 'var(--s-text)' : 'var(--s-mute)',
                background: t === 'This week' ? 'var(--s-surface-2)' : 'transparent',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        {circleRows.map((r) => (
          <div
            key={r.name}
            className="pm-card"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              ...(r.you ? { background: 'var(--s-brass-soft)', borderColor: 'var(--s-brass)' } : {}),
            }}
          >
            <span style={{ width: 18, textAlign: 'center', color: r.rankColor, fontWeight: 700 }}>{r.rank}</span>
            <span className="pm-avatar" style={{ width: 32, height: 32, fontSize: 13, background: r.avatar, color: r.pacer ? 'var(--s-brass)' : '#fff' }}>{r.initial}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>
                {r.name}
                {r.you && <span style={{ color: 'var(--s-brass)' }}> · you</span>}
                {r.pacer && <span style={{ color: 'var(--s-brass)' }}> · pacer</span>}
              </div>
              {r.live ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span className="pm-dot" />
                  <span className="pm-live">Focusing now</span>
                </div>
              ) : (
                <div style={{ color: 'var(--s-mute)', fontSize: 11.5, marginTop: 1 }}>{r.meta}</div>
              )}
              <div className="pm-track">
                <div className="pm-fill" style={{ width: `${r.fill}%` }} />
              </div>
            </div>
            <span className="pm-pts">
              {r.pts}
              <span> pts</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const trend = [
  { d: 'M', a: 52, r: 40 },
  { d: 'T', a: 70, r: 60 },
  { d: 'W', a: 44, r: 38 },
  { d: 'T', a: 60, r: 46 },
  { d: 'F', a: 36, r: 33 },
  { d: 'S', a: 66, r: 58 },
  { d: 'S', a: 50, r: 44 },
];

function InsightsScreen() {
  return (
    <div className="screen screen--light">
      <div className="screen__island" />
      <StatusBar />
      <div className="screen__body">
        <span className="pm-eyebrow">Today</span>
        <h3 className="pm-title">
          What your <em>attention shows.</em>
        </h3>

        <div className="pm-brasscard" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
          <div>
            <span className="pm-eyebrow">Resist rate</span>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>82%</div>
            <div style={{ color: 'var(--s-soft)', fontSize: 12, marginTop: 3 }}>14 resisted · 3 opened</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '1px solid var(--s-green)', borderRadius: 13, padding: '11px 13px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--s-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span style={{ color: 'var(--s-green)', fontSize: 12, fontWeight: 800 }}>Strong</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { l: 'Attempts', v: '17' },
            { l: 'Resists', v: '14' },
            { l: 'Saved', v: '3h' },
          ].map((stat) => (
            <div key={stat.l} className="pm-card" style={{ flex: 1, borderRadius: 12 }}>
              <div className="pm-eyebrow">{stat.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{stat.v}</div>
            </div>
          ))}
        </div>

        <div className="pm-card" style={{ borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Last 7 days</span>
            <span style={{ display: 'flex', gap: 9, fontSize: 10, color: 'var(--s-mute)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--s-rose)' }} />Attempts</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--s-green)' }} />Resists</span>
            </span>
          </div>
          <div className="pm-chart">
            {trend.map((col, i) => (
              <div key={i} className="pm-bcol">
                <div className="pm-brose" style={{ height: col.a }}>
                  <div className="pm-bgrn" style={{ height: col.r }} />
                </div>
                <span>{col.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const screens = {
  pause: PauseScreen,
  circle: CircleScreen,
  insights: InsightsScreen,
};

export function PhoneMockup({ variant }: { variant: keyof typeof screens }) {
  const Screen = screens[variant];
  return (
    <div className="phone">
      <Screen />
    </div>
  );
}
