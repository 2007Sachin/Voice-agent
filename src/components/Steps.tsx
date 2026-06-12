import { Link } from 'react-router-dom';

export type StepKey = 'setup' | 'briefing' | 'mic' | 'meet' | 'interview';

const STEPS: { key: StepKey; label: string; to: string }[] = [
  { key: 'setup', label: 'Setup', to: '/' },
  { key: 'briefing', label: 'Briefing', to: '/briefing' },
  { key: 'mic', label: 'Mic check', to: '/mic-check' },
  { key: 'meet', label: 'Meet', to: '/meet' },
  { key: 'interview', label: 'Interview', to: '/interview' },
];

/**
 * Persistent step indicator across the setup flow. Past steps are
 * clickable so users can jump backwards; the current and future
 * steps are static text.
 */
export function Steps({ current }: { current: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="steps" aria-label="Progress">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        const content = (
          <>
            <span className="steps__num">{i + 1}</span>
            <span>{step.label}</span>
          </>
        );
        return (
          <span key={step.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.9rem' }}>
            {state === 'done' ? (
              <Link className="steps__item" data-state={state} to={step.to}>
                {content}
              </Link>
            ) : (
              <span className="steps__item" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                {content}
              </span>
            )}
            {i < STEPS.length - 1 && <span className="steps__sep" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
