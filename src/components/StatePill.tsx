import type { CharacterState } from './InterviewerCharacter';

const STATE_META: Record<CharacterState | 'paused', { label: string; dot: string; live: boolean }> = {
  idle: { label: 'Ready', dot: '', live: false },
  speaking: { label: 'Speaking', dot: 'pill__dot--warm', live: true },
  listening: { label: 'Listening', dot: 'pill__dot--success', live: true },
  thinking: { label: 'Thinking', dot: 'pill__dot--accent', live: true },
  paused: { label: 'Paused', dot: '', live: false },
};

export function StatePill({ state }: { state: CharacterState | 'paused' }) {
  const meta = STATE_META[state];
  return (
    <span className="pill" role="status">
      <span className={`pill__dot ${meta.dot} ${meta.live ? 'pill__dot--live' : ''}`} aria-hidden="true" />
      {/* keyed so the text cross-fades when the state changes */}
      <span key={state} className="pill__text">
        {meta.label}
      </span>
    </span>
  );
}
