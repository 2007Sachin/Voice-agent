import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/Button';
import { ScreenShell } from '../components/ScreenShell';
import { useMicLevel } from '../hooks/useMicLevel';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSession } from '../state/session';

const BAR_COUNT = 14;

export function MicCheckPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const mic = useMicLevel();
  const stt = useSpeechRecognition();

  useEffect(() => {
    if (!loading && !session) navigate('/');
  }, [loading, session, navigate]);

  // Per-bar emphasis so the meter reads as a waveform, not a block.
  const barShape = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        const center = (BAR_COUNT - 1) / 2;
        return 1 - Math.abs(i - center) / (center + 1.5);
      }),
    [],
  );

  if (!session) return null;

  const micReady = mic.status === 'active';
  const heardSomething = stt.transcript.trim().length > 0;

  function startCheck() {
    void mic.start();
    if (stt.supported) {
      stt.reset();
      stt.start();
    }
  }

  function proceed() {
    stt.stop();
    navigate('/meet');
  }

  return (
    <ScreenShell>
      <div className="screen-head anim-in">
        <span className="t-label">Step 2 of 3 · Mic check</span>
        <h1 className="t-display">Let's hear you</h1>
        <p className="t-secondary">
          Grant microphone access, then say a sentence — for example, “I'm ready to start the
          interview.”
        </p>
      </div>

      <div className="stack stack--loose anim-in anim-in--late">
        <section className="card card--raised stack">
          <div className="meter" aria-hidden="true">
            {barShape.map((emphasis, i) => (
              <i
                key={i}
                style={{
                  transform: `scaleY(${Math.max(0.08, Math.min(1, mic.level * 1.6 * emphasis + 0.04))})`,
                }}
              />
            ))}
          </div>

          {mic.status === 'idle' && (
            <Button variant="primary" onClick={startCheck}>
              Enable microphone
            </Button>
          )}
          {mic.status === 'requesting' && <p className="t-small t-muted">Waiting for permission…</p>}
          {mic.status === 'denied' && (
            <div className="notice notice--danger">
              Microphone access was blocked. Allow it in your browser's site settings, then reload
              this page.
            </div>
          )}
          {mic.status === 'unsupported' && (
            <div className="notice notice--danger">
              This browser can't capture audio. Try Chrome or Edge.
            </div>
          )}

          {micReady && (
            <>
              <div className="transcript-test" aria-live="polite">
                {heardSomething || stt.interim ? (
                  <>
                    {stt.transcript}
                    {stt.interim && <span className="transcript__interim"> {stt.interim}</span>}
                  </>
                ) : (
                  <span className="transcript__placeholder">
                    {stt.supported
                      ? 'Listening — your words will appear here…'
                      : 'Speech recognition is not available in this browser; you can type your answers during the interview instead.'}
                  </span>
                )}
              </div>
              {heardSomething && (
                <div className="notice notice--success">Loud and clear — you're all set.</div>
              )}
            </>
          )}
        </section>

        <div className="row">
          <Button
            variant="primary"
            size="lg"
            onClick={proceed}
            disabled={!micReady && mic.status !== 'unsupported'}
          >
            {heardSomething || !stt.supported ? 'Meet your interviewer' : 'Skip ahead anyway'}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/briefing')}>
            Back to briefing
          </Button>
        </div>
      </div>
    </ScreenShell>
  );
}
