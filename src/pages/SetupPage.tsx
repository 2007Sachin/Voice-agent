import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Difficulty, InterviewMode } from '../../server/types';
import { Button } from '../components/Button';
import { InterviewerCharacter } from '../components/InterviewerCharacter';
import { ScreenShell } from '../components/ScreenShell';
import { useSession } from '../state/session';

const MODES: { id: InterviewMode; title: string; desc: string; placeholder: string }[] = [
  {
    id: 'skill',
    title: 'Skill deep-dive',
    desc: 'Technical questions on one skill, from fundamentals to trade-offs.',
    placeholder: 'e.g. React, Python, SQL…',
  },
  {
    id: 'behavioral',
    title: 'Behavioral',
    desc: 'STAR-style questions about experience, conflict, and ownership.',
    placeholder: 'Target role, e.g. Frontend Engineer',
  },
  {
    id: 'system-design',
    title: 'System design',
    desc: 'Architecture, data, scaling, and failure modes for one system.',
    placeholder: 'e.g. a URL shortener, a chat app…',
  },
];

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid-level' },
  { id: 'senior', label: 'Senior' },
];

export function SetupPage() {
  const navigate = useNavigate();
  const { create } = useSession();
  const [mode, setMode] = useState<InterviewMode>('skill');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('mid');
  const [questionCount, setQuestionCount] = useState(5);
  const [candidateName, setCandidateName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMode = MODES.find((m) => m.id === mode)!;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!topic.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await create({
        mode,
        topic: topic.trim(),
        difficulty,
        questionCount,
        candidateName: candidateName.trim() || undefined,
      });
      navigate('/briefing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <ScreenShell>
        <div className="generating">
          <InterviewerCharacter state="thinking" size="lg" />
          <div className="stack" style={{ gap: '0.4rem' }}>
            <h1 className="t-title">Preparing your interview…</h1>
            <p className="t-secondary">Writing questions and briefing the interviewer.</p>
          </div>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <div className="screen-head anim-in">
        <span className="t-label">Voice interview practice</span>
        <h1 className="t-display">Rehearse out loud. Get a real verdict.</h1>
        <p className="t-secondary">
          A voice-driven mock interview with spoken questions, live transcription, and a SWOT
          performance report at the end.
        </p>
      </div>

      <form className="setup-form anim-in anim-in--late" onSubmit={handleSubmit}>
        <div className="stack" style={{ gap: '0.75rem' }}>
          <span className="t-label">Interview mode</span>
          <div className="mode-grid">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="mode-card"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
              >
                <span className="mode-card__title">{m.title}</span>
                <span className="mode-card__desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="t-label">
            {mode === 'skill' ? 'Skill' : mode === 'behavioral' ? 'Target role' : 'System to design'}
          </span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={selectedMode.placeholder}
            maxLength={120}
            required
          />
        </label>

        <div className="row row--wrap" style={{ gap: '2rem' }}>
          <div className="field">
            <span className="t-label">Level</span>
            <div className="segmented" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="segmented__option"
                  aria-pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="t-label">Questions</span>
            <div className="segmented" role="group" aria-label="Number of questions">
              {[3, 5, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="segmented__option"
                  aria-pressed={questionCount === n}
                  onClick={() => setQuestionCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="field">
          <span className="t-label">Your name (optional)</span>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="So the interviewer can greet you"
            maxLength={60}
          />
        </label>

        {error && <div className="notice notice--danger">{error}</div>}

        <div>
          <Button variant="primary" size="lg" type="submit" disabled={!topic.trim()}>
            Create my interview
          </Button>
        </div>
      </form>
    </ScreenShell>
  );
}
