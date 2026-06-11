import type { ReactNode } from 'react';

import type { SwotAnalysis } from '../../server/types';

interface SwotCardSpec {
  key: keyof SwotAnalysis;
  title: string;
  hint: string;
  icon: ReactNode;
}

const ICONS = {
  bolt: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z" />
    </svg>
  ),
  flag: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 3h2v18H5V3zm4 1h10l-2.5 4L19 12H9V4z" />
    </svg>
  ),
  compass: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4 6-2.5 5.5L8 16l2.5-5.5L16 8z" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5.5V11c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5.5L12 2zm-1 13.5-3-3 1.4-1.4 1.6 1.6 4.1-4.1L16.5 10 11 15.5z" />
    </svg>
  ),
};

const CARDS: SwotCardSpec[] = [
  { key: 'strengths', title: 'Strengths', hint: 'What worked — keep doing this', icon: ICONS.bolt },
  { key: 'weaknesses', title: 'Weaknesses', hint: 'Where answers fell short', icon: ICONS.flag },
  { key: 'opportunities', title: 'Opportunities', hint: 'Small effort, big improvement', icon: ICONS.compass },
  { key: 'threats', title: 'Threats', hint: 'Habits that cost you in real interviews', icon: ICONS.shield },
];

/** The SWOT analysis as a 2x2 grid of toned cards. */
export function SwotGrid({ swot }: { swot: SwotAnalysis }) {
  return (
    <section aria-label="SWOT analysis" className="swot-grid">
      {CARDS.map((card, i) => (
        <article
          key={card.key}
          className={`swot-card swot-card--${card.key} anim-in`}
          style={{ animationDelay: `${90 + i * 70}ms` }}
        >
          <header className="swot-card__head">
            <span className="swot-card__icon">{card.icon}</span>
            <div>
              <h2 className="t-small" style={{ fontWeight: 650 }}>
                {card.title}
              </h2>
              <span className="t-label">{card.hint}</span>
            </div>
          </header>
          <ul>
            {swot[card.key].map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
