import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { MODE_LABELS } from '../../server/types';
import { Button } from '../components/Button';
import { ScreenShell } from '../components/ScreenShell';
import { useSession } from '../state/session';

export function BriefingPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) navigate('/');
  }, [loading, session, navigate]);

  if (!session) return null;
  const { brief, config, persona } = session;

  return (
    <ScreenShell>
      <div className="screen-head anim-in">
        <span className="t-label">Step 1 of 3 · Briefing</span>
        <h1 className="t-display">Your interview brief</h1>
        <p className="t-secondary">
          {MODE_LABELS[config.mode]} · {config.topic} · {config.difficulty} level ·{' '}
          {session.questions.length} questions
        </p>
      </div>

      <div className="stack stack--loose">
        <section className="card card--raised anim-in anim-in--late stack" style={{ gap: '1rem' }}>
          <p className="t-secondary">{brief.roleSummary}</p>
          <div className="row row--wrap">
            {brief.focusAreas.map((area) => (
              <span key={area} className="chip">
                {area}
              </span>
            ))}
          </div>
          <p className="t-small t-muted">{brief.expectations}</p>
        </section>

        <section className="card anim-in anim-in--later stack" style={{ gap: '0.9rem' }}>
          <h2 className="t-label">You'll be scored on</h2>
          <ul className="brief-list t-secondary">
            {brief.rubric.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {session.llm === 'mock' && (
          <div className="notice notice--warning anim-in anim-in--later">
            Running without a GROQ_API_KEY — questions and the final report use the built-in
            offline coach instead of the LLM.
          </div>
        )}

        <div className="row anim-in anim-in--later">
          <Button variant="primary" size="lg" onClick={() => navigate('/mic-check')}>
            Continue to mic check
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Change setup
          </Button>
        </div>
        <p className="t-small t-muted">
          Interviewer: {persona.name}, {persona.title} — you'll meet them after the mic check.
        </p>
      </div>
    </ScreenShell>
  );
}
