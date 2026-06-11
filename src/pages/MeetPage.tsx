import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/Button';
import { InterviewerCharacter, type CharacterState } from '../components/InterviewerCharacter';
import { ScreenShell } from '../components/ScreenShell';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useSession } from '../state/session';

export function MeetPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const tts = useSpeechSynthesis();
  const [state, setState] = useState<CharacterState>('idle');

  useEffect(() => {
    if (!loading && !session) navigate('/');
  }, [loading, session, navigate]);

  if (!session) return null;
  const { persona, config } = session;

  function hearVoice() {
    setState('speaking');
    tts.speak(
      `Hi${config.candidateName ? ` ${config.candidateName}` : ''}, I'm ${persona.name}. When you're ready, we'll go through ${session!.questions.length} questions about ${config.topic}. Take your time — this is practice.`,
      () => setState('idle'),
    );
  }

  return (
    <ScreenShell>
      <div className="meet anim-in">
        <span className="t-label">Step 3 of 3 · Meet your interviewer</span>
        <InterviewerCharacter state={state} size="lg" />
        <div className="stack" style={{ gap: '0.35rem', alignItems: 'center' }}>
          <h1 className="t-display">{persona.name}</h1>
          <p className="t-secondary">{persona.title}</p>
          <p className="t-small t-muted" style={{ maxWidth: '28rem' }}>
            {persona.style}
          </p>
        </div>
        <div className="row">
          {tts.supported && (
            <Button onClick={hearVoice} disabled={state === 'speaking'}>
              Hear their voice
            </Button>
          )}
          <Button variant="primary" size="lg" onClick={() => navigate('/interview')}>
            Start the interview
          </Button>
        </div>
        <p className="t-small t-muted">
          {session.questions.length} questions · answer out loud · you can repeat or skip any
          question
        </p>
      </div>
    </ScreenShell>
  );
}
